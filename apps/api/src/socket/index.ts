import { Server as SocketServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from '@/config/env.js';
import { prisma } from '@/lib/prisma.js';
import { redis } from '@/lib/redis.js';
import { logger } from '@/lib/logger.js';
import type { JwtPayload, AuthUser } from '@/middleware/auth.js';

interface AuthenticatedSocket extends Socket {
  user?: AuthUser;
}

export function setupSocketHandlers(io: SocketServer) {
  // Authentication middleware for all namespaces
  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
      
      if (!token) {
        return next(new Error('Authentication required'));
      }
      
      const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtPayload;
      
      if (decoded.type !== 'access') {
        return next(new Error('Invalid token type'));
      }
      
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        include: { roles: true },
      });
      
      if (!user || user.isSuspended) {
        return next(new Error('Invalid user'));
      }
      
      socket.user = {
        id: user.id,
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        isSeller: user.isSeller,
        isAdmin: user.isAdmin,
        roles: user.roles.map(r => r.role),
      };
      
      next();
    } catch (error) {
      next(new Error('Authentication failed'));
    }
  });

  // Chat namespace
  const chatNs = io.of('/chat');
  
  chatNs.on('connection', async (socket: AuthenticatedSocket) => {
    const userId = socket.user!.id;
    logger.info(`User ${userId} connected to chat`);
    
    // Join user's personal room
    socket.join(`user:${userId}`);
    
    // Join all conversation rooms
    const conversations = await prisma.conversation.findMany({
      where: {
        OR: [
          { buyerId: userId },
          { sellerId: userId },
        ],
      },
      select: { id: true },
    });
    
    conversations.forEach(conv => {
      socket.join(`conv:${conv.id}`);
    });
    
    // Update online status
    await redis.sadd('online_users', userId);
    
    // Handle new message
    socket.on('message:send', async (data: { conversationId: string; content: string; type?: string }) => {
      try {
        const { conversationId, content, type = 'TEXT' } = data;
        
        // Verify user is part of this conversation
        const conversation = await prisma.conversation.findFirst({
          where: {
            id: conversationId,
            OR: [
              { buyerId: userId },
              { sellerId: userId },
            ],
          },
        });
        
        if (!conversation) {
          socket.emit('error', { message: 'Conversation not found' });
          return;
        }
        
        // Create message
        const message = await prisma.message.create({
          data: {
            conversationId,
            senderId: userId,
            content,
            type: type as any,
            deliveredAt: new Date(),
          },
          include: {
            sender: {
              select: {
                id: true,
                username: true,
                firstName: true,
                lastName: true,
                avatar: true,
              },
            },
          },
        });
        
        // Update conversation
        const recipientId = conversation.buyerId === userId ? conversation.sellerId : conversation.buyerId;
        const unreadField = conversation.buyerId === userId ? 'unreadSellerCount' : 'unreadBuyerCount';
        
        await prisma.conversation.update({
          where: { id: conversationId },
          data: {
            lastMessageAt: new Date(),
            [unreadField]: { increment: 1 },
            // Update first response time if seller responding for first time
            ...(conversation.sellerId === userId && !conversation.firstResponseAt
              ? { firstResponseAt: new Date() }
              : {}),
          },
        });
        
        // Emit to conversation room
        chatNs.to(`conv:${conversationId}`).emit('message:new', message);
        
        // Emit delivery confirmation to sender
        socket.emit('message:delivered', { messageId: message.id });
        
      } catch (error) {
        logger.error('Error sending message:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });
    
    // Handle message read
    socket.on('message:read', async (data: { conversationId: string; messageId: string }) => {
      try {
        const { conversationId, messageId } = data;
        
        await prisma.message.update({
          where: { id: messageId },
          data: { readAt: new Date() },
        });
        
        // Reset unread count for this user
        const conversation = await prisma.conversation.findUnique({
          where: { id: conversationId },
        });
        
        if (conversation) {
          const unreadField = conversation.buyerId === userId ? 'unreadBuyerCount' : 'unreadSellerCount';
          await prisma.conversation.update({
            where: { id: conversationId },
            data: { [unreadField]: 0 },
          });
        }
        
        chatNs.to(`conv:${conversationId}`).emit('message:read_ack', { 
          messageId, 
          readAt: new Date() 
        });
        
      } catch (error) {
        logger.error('Error marking message as read:', error);
      }
    });
    
    // Handle typing indicators
    socket.on('typing:start', (data: { conversationId: string }) => {
      socket.to(`conv:${data.conversationId}`).emit('typing:update', {
        conversationId: data.conversationId,
        userId,
        isTyping: true,
      });
    });
    
    socket.on('typing:stop', (data: { conversationId: string }) => {
      socket.to(`conv:${data.conversationId}`).emit('typing:update', {
        conversationId: data.conversationId,
        userId,
        isTyping: false,
      });
    });
    
    // Handle disconnect
    socket.on('disconnect', async () => {
      logger.info(`User ${userId} disconnected from chat`);
      await redis.srem('online_users', userId);
    });
  });

  // CRM namespace (for sellers)
  const crmNs = io.of('/crm');
  
  crmNs.on('connection', async (socket: AuthenticatedSocket) => {
    const userId = socket.user!.id;
    
    if (!socket.user!.isSeller) {
      socket.disconnect();
      return;
    }
    
    logger.info(`Seller ${userId} connected to CRM`);
    
    socket.join(`crm:${userId}`);
    socket.join(`pipeline:${userId}`);
    
    socket.on('disconnect', () => {
      logger.info(`Seller ${userId} disconnected from CRM`);
    });
  });

  // Notifications namespace
  const notifNs = io.of('/notifications');
  
  notifNs.on('connection', (socket: AuthenticatedSocket) => {
    const userId = socket.user!.id;
    logger.info(`User ${userId} connected to notifications`);
    
    socket.join(`notifications:${userId}`);
    
    socket.on('disconnect', () => {
      logger.info(`User ${userId} disconnected from notifications`);
    });
  });

  // Presence namespace
  const presenceNs = io.of('/presence');
  
  presenceNs.on('connection', async (socket: AuthenticatedSocket) => {
    const userId = socket.user!.id;
    
    // Get online users
    socket.on('get:online', async (userIds: string[]) => {
      const online = await redis.smembers('online_users');
      const onlineSet = new Set(online);
      
      const result = userIds.reduce((acc, id) => {
        acc[id] = onlineSet.has(id);
        return acc;
      }, {} as Record<string, boolean>);
      
      socket.emit('online:status', result);
    });
    
    socket.on('disconnect', () => {
      logger.info(`User ${userId} disconnected from presence`);
    });
  });

  // Redis Pub/Sub for cross-server communication
  const subscriber = redis.duplicate();
  
  subscriber.subscribe('chat:message', 'crm:update', 'notification:new');
  
  subscriber.on('message', (channel, message) => {
    try {
      const data = JSON.parse(message);
      
      switch (channel) {
        case 'chat:message':
          chatNs.to(`conv:${data.conversationId}`).emit('message:new', data.message);
          break;
        case 'crm:update':
          crmNs.to(`crm:${data.sellerId}`).emit(data.event, data.data);
          break;
        case 'notification:new':
          notifNs.to(`notifications:${data.userId}`).emit('notification:new', data.notification);
          break;
      }
    } catch (error) {
      logger.error('Redis pub/sub error:', error);
    }
  });

  logger.info('Socket.io handlers initialized');
}
