/**
 * CrmNotifications Durable Object
 * Handles real-time notifications for sellers' CRM dashboard
 */

interface Notification {
  id: string;
  type: 'new_message' | 'new_order' | 'order_update' | 'review' | 'payout' | 'system';
  title: string;
  body: string;
  data?: Record<string, any>;
  read: boolean;
  createdAt: number;
}

interface NotificationPayload {
  type: 'notification' | 'read' | 'clear';
  notification?: Notification;
  notificationId?: string;
}

export class CrmNotifications {
  private connections: Map<string, WebSocket> = new Map(); // connectionId -> socket
  private notifications: Notification[] = [];
  private state: DurableObjectState;
  private env: any;
  private sellerId: string | null = null;

  constructor(state: DurableObjectState, env: any) {
    this.state = state;
    this.env = env;
    
    // Load stored notifications on wake
    this.state.blockConcurrencyWhile(async () => {
      const stored = await this.state.storage.get<Notification[]>('notifications');
      if (stored) {
        this.notifications = stored;
      }
      
      const id = await this.state.storage.get<string>('sellerId');
      if (id) {
        this.sellerId = id;
      }
    });
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    
    // WebSocket upgrade
    if (request.headers.get('Upgrade') === 'websocket') {
      return this.handleWebSocket(request);
    }
    
    switch (url.pathname) {
      case '/push': {
        // Push a new notification (from queue or direct call)
        if (request.method !== 'POST') {
          return new Response('Method not allowed', { status: 405 });
        }
        
        const notification = await request.json() as Omit<Notification, 'id' | 'read' | 'createdAt'>;
        await this.pushNotification(notification);
        return Response.json({ success: true });
      }
      
      case '/list': {
        // List notifications
        const unreadOnly = url.searchParams.get('unread') === 'true';
        const limit = parseInt(url.searchParams.get('limit') || '50');
        
        let filtered = this.notifications;
        if (unreadOnly) {
          filtered = filtered.filter(n => !n.read);
        }
        
        return Response.json({
          notifications: filtered.slice(0, limit),
          unreadCount: this.notifications.filter(n => !n.read).length,
        });
      }
      
      case '/read': {
        // Mark notification as read
        const notificationId = url.searchParams.get('id');
        if (!notificationId) {
          return new Response('Missing notification id', { status: 400 });
        }
        
        await this.markAsRead(notificationId);
        return Response.json({ success: true });
      }
      
      case '/read-all': {
        // Mark all as read
        await this.markAllAsRead();
        return Response.json({ success: true });
      }
      
      case '/clear': {
        // Clear old notifications
        const olderThan = parseInt(url.searchParams.get('olderThan') || '604800000'); // 7 days
        await this.clearOld(olderThan);
        return Response.json({ success: true });
      }
      
      case '/init': {
        // Initialize with seller ID
        if (request.method !== 'POST') {
          return new Response('Method not allowed', { status: 405 });
        }
        
        const { sellerId } = await request.json();
        this.sellerId = sellerId;
        await this.state.storage.put('sellerId', sellerId);
        return Response.json({ success: true });
      }
      
      default:
        return new Response('Not Found', { status: 404 });
    }
  }

  private async handleWebSocket(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const connectionId = url.searchParams.get('connectionId') || crypto.randomUUID();
    
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    
    this.state.acceptWebSocket(server);
    this.connections.set(connectionId, server);
    
    // Send initial notifications
    server.send(JSON.stringify({
      type: 'initial',
      notifications: this.notifications.slice(0, 50),
      unreadCount: this.notifications.filter(n => !n.read).length,
    }));
    
    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
    try {
      const data = JSON.parse(message as string) as NotificationPayload;
      
      switch (data.type) {
        case 'read':
          if (data.notificationId) {
            await this.markAsRead(data.notificationId);
          }
          break;
        
        case 'clear':
          await this.markAllAsRead();
          break;
      }
    } catch (err) {
      console.error('CRM notification message error:', err);
    }
  }

  async webSocketClose(ws: WebSocket) {
    for (const [id, socket] of this.connections) {
      if (socket === ws) {
        this.connections.delete(id);
        break;
      }
    }
  }

  async webSocketError(ws: WebSocket) {
    for (const [id, socket] of this.connections) {
      if (socket === ws) {
        this.connections.delete(id);
        break;
      }
    }
  }

  private async pushNotification(data: Omit<Notification, 'id' | 'read' | 'createdAt'>) {
    const notification: Notification = {
      id: crypto.randomUUID(),
      type: data.type,
      title: data.title,
      body: data.body,
      data: data.data,
      read: false,
      createdAt: Date.now(),
    };
    
    // Add to beginning of list
    this.notifications.unshift(notification);
    
    // Keep only last 100 notifications
    if (this.notifications.length > 100) {
      this.notifications = this.notifications.slice(0, 100);
    }
    
    // Persist
    await this.state.storage.put('notifications', this.notifications);
    
    // Broadcast to all connected clients
    this.broadcast({
      type: 'notification',
      notification,
    });
  }

  private async markAsRead(notificationId: string) {
    const notification = this.notifications.find(n => n.id === notificationId);
    if (notification) {
      notification.read = true;
      await this.state.storage.put('notifications', this.notifications);
      
      this.broadcast({
        type: 'read',
        notificationId,
      });
    }
  }

  private async markAllAsRead() {
    for (const notification of this.notifications) {
      notification.read = true;
    }
    await this.state.storage.put('notifications', this.notifications);
    
    this.broadcast({ type: 'clear' });
  }

  private async clearOld(olderThanMs: number) {
    const threshold = Date.now() - olderThanMs;
    this.notifications = this.notifications.filter(n => n.createdAt > threshold || !n.read);
    await this.state.storage.put('notifications', this.notifications);
  }

  private broadcast(payload: any) {
    const message = JSON.stringify(payload);
    
    for (const [id, socket] of this.connections) {
      try {
        socket.send(message);
      } catch {
        this.connections.delete(id);
      }
    }
  }
}
