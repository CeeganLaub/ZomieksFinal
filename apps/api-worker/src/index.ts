import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { secureHeaders } from 'hono/secure-headers';
import { createDb } from '@zomieks/db';
import type { Env } from './types';

// Routes
import authRoutes from './routes/auth';
import serviceRoutes from './routes/services';
import orderRoutes from './routes/orders';
import userRoutes from './routes/users';
import conversationRoutes from './routes/conversations';
import paymentRoutes from './routes/payments';
import subscriptionRoutes from './routes/subscriptions';
import uploadRoutes from './routes/uploads';
import webhookRoutes from './routes/webhooks';
import adminRoutes from './routes/admin';

// Durable Objects
export { ChatRoom } from './durable-objects/ChatRoom';
export { Presence } from './durable-objects/Presence';
export { CrmNotifications } from './durable-objects/CrmNotifications';

// Services
import { processEmailQueue } from './services/email';

const app = new Hono<{ Bindings: Env }>();

// Global middleware
app.use('*', logger());
app.use('*', secureHeaders());
app.use('*', cors({
  origin: (origin, c) => {
    const allowed = [
      c.env.FRONTEND_URL,
      'http://localhost:5173',
      'http://localhost:3000',
    ];
    return allowed.includes(origin) ? origin : '';
  },
  credentials: true,
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposeHeaders: ['X-Total-Count', 'X-Page', 'X-Per-Page'],
}));

// Inject database into context
app.use('*', async (c, next) => {
  const db = createDb(c.env.DB);
  c.set('db', db);
  await next();
});

// Health check
app.get('/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }));

// API routes (v1)
const v1 = new Hono<{ Bindings: Env }>();
v1.route('/auth', authRoutes);
v1.route('/services', serviceRoutes);
v1.route('/orders', orderRoutes);
v1.route('/users', userRoutes);
v1.route('/conversations', conversationRoutes);
v1.route('/payments', paymentRoutes);
v1.route('/subscriptions', subscriptionRoutes);
v1.route('/uploads', uploadRoutes);
v1.route('/webhooks', webhookRoutes);
v1.route('/admin', adminRoutes);

app.route('/api/v1', v1);

// 404 handler
app.notFound((c) => {
  return c.json({ success: false, error: { message: 'Not found' } }, 404);
});

// Error handler
app.onError((err, c) => {
  console.error('Error:', err);
  
  // Handle Zod validation errors
  if (err.name === 'ZodError') {
    return c.json({
      success: false,
      error: {
        message: 'Validation error',
        details: (err as any).errors,
      },
    }, 400);
  }
  
  // Handle known errors
  if ('statusCode' in err && typeof (err as any).statusCode === 'number') {
    return c.json({
      success: false,
      error: { message: err.message },
    }, (err as any).statusCode);
  }
  
  // Generic error
  return c.json({
    success: false,
    error: {
      message: c.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
    },
  }, 500);
});

// WebSocket route for chat
app.get('/ws/chat/:conversationId', async (c) => {
  const conversationId = c.req.param('conversationId');
  const userId = c.req.query('userId');
  const username = c.req.query('username');
  
  if (!userId || !username) {
    return c.json({ error: 'Missing userId or username' }, 400);
  }
  
  const id = c.env.CHAT_ROOMS.idFromName(conversationId);
  const chatRoom = c.env.CHAT_ROOMS.get(id);
  
  return chatRoom.fetch(
    new Request(`http://internal/websocket?userId=${userId}&username=${encodeURIComponent(username)}`, {
      headers: c.req.raw.headers,
    })
  );
});

// WebSocket route for presence
app.get('/ws/presence', async (c) => {
  const userId = c.req.query('userId');
  const watch = c.req.query('watch');
  
  if (!userId) {
    return c.json({ error: 'Missing userId' }, 400);
  }
  
  // Global presence DO (single instance)
  const id = c.env.PRESENCE.idFromName('global');
  const presence = c.env.PRESENCE.get(id);
  
  return presence.fetch(
    new Request(`http://internal/websocket?userId=${userId}${watch ? `&watch=${watch}` : ''}`, {
      headers: c.req.raw.headers,
    })
  );
});

// WebSocket route for seller CRM notifications
app.get('/ws/crm/:sellerId', async (c) => {
  const sellerId = c.req.param('sellerId');
  
  const id = c.env.CRM_NOTIFICATIONS.idFromName(sellerId);
  const crm = c.env.CRM_NOTIFICATIONS.get(id);
  
  return crm.fetch(
    new Request('http://internal/websocket', {
      headers: c.req.raw.headers,
    })
  );
});

// Queue handler
interface QueueMessage {
  type: string;
  [key: string]: any;
}

async function handleQueue(batch: MessageBatch<QueueMessage>, env: Env) {
  const queueName = batch.queue;
  
  for (const message of batch.messages) {
    try {
      const data = message.body;
      
      // Handle email queue separately
      if (queueName === 'email-queue') {
        const success = await processEmailQueue({
          type: data.type,
          to: data.to,
          data: data.data || data,
        });
        
        if (success) {
          message.ack();
        } else {
          message.retry();
        }
        continue;
      }
      
      // Handle notification queue
      switch (data.type) {
        case 'order_paid':
        case 'new_order':
        case 'order_update':
        case 'order_delivered':
        case 'order_completed': {
          // Send notification to seller's CRM DO
          const sellerId = data.sellerId;
          if (sellerId) {
            const id = env.CRM_NOTIFICATIONS.idFromName(sellerId);
            const crm = env.CRM_NOTIFICATIONS.get(id);
            await crm.fetch('http://internal/push', {
              method: 'POST',
              body: JSON.stringify({
                type: 'order_update',
                title: getNotificationTitle(data.type),
                body: getNotificationBody(data),
                data,
              }),
            });
          }
          break;
        }
        
        case 'new_message': {
          // Send notification to recipient's CRM DO (if seller)
          const { recipientId, senderId, conversationId, preview } = data;
          const id = env.CRM_NOTIFICATIONS.idFromName(recipientId);
          const crm = env.CRM_NOTIFICATIONS.get(id);
          await crm.fetch('http://internal/push', {
            method: 'POST',
            body: JSON.stringify({
              type: 'new_message',
              title: 'New Message',
              body: preview || 'You have a new message',
              data: { senderId, conversationId },
            }),
          });
          break;
        }
        
        case 'new_review': {
          const { sellerId, rating, comment, orderNumber } = data;
          if (sellerId) {
            const id = env.CRM_NOTIFICATIONS.idFromName(sellerId);
            const crm = env.CRM_NOTIFICATIONS.get(id);
            await crm.fetch('http://internal/push', {
              method: 'POST',
              body: JSON.stringify({
                type: 'review',
                title: `New ${rating}★ Review`,
                body: comment?.substring(0, 100) || 'A buyer left a review',
                data: { orderNumber, rating },
              }),
            });
          }
          break;
        }
      }
      
      message.ack();
    } catch (error) {
      console.error('Queue processing error:', error);
      message.retry();
    }
  }
}

function getNotificationTitle(type: string): string {
  switch (type) {
    case 'order_paid':
    case 'new_order':
      return 'New Order!';
    case 'order_delivered':
      return 'Delivery Submitted';
    case 'order_completed':
      return 'Order Completed';
    case 'order_update':
      return 'Order Update';
    default:
      return 'Notification';
  }
}

function getNotificationBody(data: any): string {
  const orderNumber = data.orderNumber || data.orderId;
  switch (data.type) {
    case 'order_paid':
    case 'new_order':
      return `You have a new order${orderNumber ? ` #${orderNumber}` : ''}`;
    case 'order_delivered':
      return `Delivery submitted for order #${orderNumber}`;
    case 'order_completed':
      return `Order #${orderNumber} has been completed`;
    default:
      return 'You have a new notification';
  }
}

// Export with queue handler
export default {
  fetch: app.fetch,
  queue: handleQueue,
};
