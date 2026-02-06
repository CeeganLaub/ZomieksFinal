/**
 * WebSocket client for Cloudflare Workers Durable Objects
 * Handles Chat, Presence, and CRM notifications via native WebSockets
 */

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8787';

type MessageHandler = (data: any) => void;
type ConnectionHandler = () => void;

interface WebSocketConnection {
  socket: WebSocket | null;
  url: string;
  reconnectAttempts: number;
  maxReconnectAttempts: number;
  reconnectDelay: number;
  handlers: Map<string, Set<MessageHandler>>;
  onConnect?: ConnectionHandler;
  onDisconnect?: ConnectionHandler;
}

class DurableObjectSocket {
  private connection: WebSocketConnection;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor(url: string) {
    this.connection = {
      socket: null,
      url,
      reconnectAttempts: 0,
      maxReconnectAttempts: 10,
      reconnectDelay: 1000,
      handlers: new Map(),
    };
  }

  connect(): void {
    if (this.connection.socket?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      this.connection.socket = new WebSocket(this.connection.url);

      this.connection.socket.onopen = () => {
        console.log(`WebSocket connected: ${this.connection.url}`);
        this.connection.reconnectAttempts = 0;
        this.startHeartbeat();
        this.connection.onConnect?.();
      };

      this.connection.socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const type = data.type || 'message';
          
          // Call registered handlers
          const handlers = this.connection.handlers.get(type);
          if (handlers) {
            handlers.forEach(handler => handler(data));
          }
          
          // Also call 'all' handlers
          const allHandlers = this.connection.handlers.get('*');
          if (allHandlers) {
            allHandlers.forEach(handler => handler(data));
          }
        } catch (err) {
          console.error('WebSocket message parse error:', err);
        }
      };

      this.connection.socket.onclose = () => {
        console.log(`WebSocket disconnected: ${this.connection.url}`);
        this.stopHeartbeat();
        this.connection.onDisconnect?.();
        this.attemptReconnect();
      };

      this.connection.socket.onerror = (error) => {
        console.error(`WebSocket error: ${this.connection.url}`, error);
      };
    } catch (err) {
      console.error('WebSocket connection error:', err);
      this.attemptReconnect();
    }
  }

  disconnect(): void {
    this.stopHeartbeat();
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (this.connection.socket) {
      this.connection.socket.close();
      this.connection.socket = null;
    }
  }

  send(data: any): void {
    if (this.connection.socket?.readyState === WebSocket.OPEN) {
      this.connection.socket.send(JSON.stringify(data));
    }
  }

  on(type: string, handler: MessageHandler): () => void {
    if (!this.connection.handlers.has(type)) {
      this.connection.handlers.set(type, new Set());
    }
    this.connection.handlers.get(type)!.add(handler);
    
    // Return unsubscribe function
    return () => {
      this.connection.handlers.get(type)?.delete(handler);
    };
  }

  off(type: string, handler?: MessageHandler): void {
    if (handler) {
      this.connection.handlers.get(type)?.delete(handler);
    } else {
      this.connection.handlers.delete(type);
    }
  }

  onConnect(handler: ConnectionHandler): void {
    this.connection.onConnect = handler;
  }

  onDisconnect(handler: ConnectionHandler): void {
    this.connection.onDisconnect = handler;
  }

  get isConnected(): boolean {
    return this.connection.socket?.readyState === WebSocket.OPEN;
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      this.send({ type: 'heartbeat' });
    }, 30000);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private attemptReconnect(): void {
    if (this.connection.reconnectAttempts >= this.connection.maxReconnectAttempts) {
      console.log('Max reconnection attempts reached');
      return;
    }

    const delay = this.connection.reconnectDelay * Math.pow(2, this.connection.reconnectAttempts);
    this.connection.reconnectAttempts++;

    this.reconnectTimeout = setTimeout(() => {
      console.log(`Reconnecting... Attempt ${this.connection.reconnectAttempts}`);
      this.connect();
    }, Math.min(delay, 30000));
  }
}

class SocketClient {
  private userId: string | null = null;
  private username: string | null = null;
  private chatSockets: Map<string, DurableObjectSocket> = new Map();
  private presenceSocket: DurableObjectSocket | null = null;
  private crmSocket: DurableObjectSocket | null = null;

  setUser(userId: string, username: string): void {
    this.userId = userId;
    this.username = username;
  }

  // General connect - sets up presence connection
  connect(): void {
    // This is a no-op placeholder for compatibility
    // Actual connections happen via joinConversation, connectPresence, etc.
    // We don't auto-connect presence here to avoid issues when user data isn't ready
    console.log('[Socket] connect() called - connections will be made on demand');
  }

  // Chat methods
  joinConversation(conversationId: string): DurableObjectSocket {
    if (!this.userId || !this.username) {
      throw new Error('User not set. Call setUser() first.');
    }

    if (this.chatSockets.has(conversationId)) {
      return this.chatSockets.get(conversationId)!;
    }

    const url = `${WS_URL}/ws/chat/${conversationId}?userId=${this.userId}&username=${encodeURIComponent(this.username)}`;
    const socket = new DurableObjectSocket(url);
    socket.connect();
    this.chatSockets.set(conversationId, socket);

    return socket;
  }

  leaveConversation(conversationId: string): void {
    const socket = this.chatSockets.get(conversationId);
    if (socket) {
      socket.disconnect();
      this.chatSockets.delete(conversationId);
    }
  }

  sendMessage(conversationId: string, content: string, messageId?: string): void {
    const socket = this.chatSockets.get(conversationId);
    if (socket) {
      socket.send({ type: 'message', content, messageId });
    }
  }

  sendTyping(conversationId: string): void {
    const socket = this.chatSockets.get(conversationId);
    if (socket) {
      socket.send({ type: 'typing' });
    }
  }

  markRead(conversationId: string, messageId: string): void {
    const socket = this.chatSockets.get(conversationId);
    if (socket) {
      socket.send({ type: 'read', messageId });
    }
  }

  onChatMessage(conversationId: string, handler: MessageHandler): () => void {
    const socket = this.chatSockets.get(conversationId);
    if (socket) {
      return socket.on('message', handler);
    }
    return () => {};
  }

  onTyping(conversationId: string, handler: MessageHandler): () => void {
    const socket = this.chatSockets.get(conversationId);
    if (socket) {
      return socket.on('typing', handler);
    }
    return () => {};
  }

  onPresenceChange(conversationId: string, handler: MessageHandler): () => void {
    const socket = this.chatSockets.get(conversationId);
    if (socket) {
      return socket.on('presence', handler);
    }
    return () => {};
  }

  // Presence methods
  connectPresence(watchUserIds?: string[]): DurableObjectSocket {
    if (!this.userId) {
      throw new Error('User not set. Call setUser() first.');
    }

    if (this.presenceSocket) {
      return this.presenceSocket;
    }

    const watchParam = watchUserIds?.length ? `&watch=${watchUserIds.join(',')}` : '';
    const url = `${WS_URL}/ws/presence?userId=${this.userId}${watchParam}`;
    this.presenceSocket = new DurableObjectSocket(url);
    this.presenceSocket.connect();

    // Send online status
    this.presenceSocket.onConnect(() => {
      this.presenceSocket?.send({ type: 'online', userId: this.userId, username: this.username });
    });

    return this.presenceSocket;
  }

  disconnectPresence(): void {
    if (this.presenceSocket) {
      this.presenceSocket.send({ type: 'offline', userId: this.userId });
      this.presenceSocket.disconnect();
      this.presenceSocket = null;
    }
  }

  onUserOnline(handler: MessageHandler): () => void {
    if (this.presenceSocket) {
      return this.presenceSocket.on('update', handler);
    }
    return () => {};
  }

  // CRM Notifications (for sellers)
  connectCRM(sellerId: string): DurableObjectSocket {
    if (this.crmSocket) {
      return this.crmSocket;
    }

    const url = `${WS_URL}/ws/crm/${sellerId}`;
    this.crmSocket = new DurableObjectSocket(url);
    this.crmSocket.connect();

    return this.crmSocket;
  }

  disconnectCRM(): void {
    if (this.crmSocket) {
      this.crmSocket.disconnect();
      this.crmSocket = null;
    }
  }

  onNotification(handler: MessageHandler): () => void {
    if (this.crmSocket) {
      return this.crmSocket.on('notification', handler);
    }
    return () => {};
  }

  onInitialNotifications(handler: MessageHandler): () => void {
    if (this.crmSocket) {
      return this.crmSocket.on('initial', handler);
    }
    return () => {};
  }

  markNotificationRead(notificationId: string): void {
    if (this.crmSocket) {
      this.crmSocket.send({ type: 'read', notificationId });
    }
  }

  clearNotifications(): void {
    if (this.crmSocket) {
      this.crmSocket.send({ type: 'clear' });
    }
  }

  // Cleanup
  disconnect(): void {
    // Disconnect all chat sockets
    for (const [, socket] of this.chatSockets) {
      socket.disconnect();
    }
    this.chatSockets.clear();

    // Disconnect presence
    this.disconnectPresence();

    // Disconnect CRM
    this.disconnectCRM();
  }
}

export const socketClient = new SocketClient();
