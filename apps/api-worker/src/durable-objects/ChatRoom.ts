/**
 * ChatRoom Durable Object
 * Handles WebSocket connections for real-time messaging in a conversation
 */

interface Session {
  socket: WebSocket;
  userId: string;
  username: string;
  joinedAt: number;
}

interface ChatMessage {
  type: 'message' | 'typing' | 'read' | 'presence' | 'system';
  senderId?: string;
  username?: string;
  content?: string;
  messageId?: string;
  timestamp: number;
}

export class ChatRoom {
  private sessions: Map<string, Session> = new Map();
  private state: DurableObjectState;
  private env: any;

  constructor(state: DurableObjectState, env: any) {
    this.state = state;
    this.env = env;
    
    // Restore sessions on wake
    this.state.blockConcurrencyWhile(async () => {
      const stored = await this.state.storage.get<string[]>('active_users');
      if (stored) {
        // Sessions will be empty on wake, users need to reconnect
      }
    });
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    
    // Handle WebSocket upgrade
    if (request.headers.get('Upgrade') === 'websocket') {
      return this.handleWebSocket(request);
    }
    
    // HTTP endpoints for state queries
    if (url.pathname === '/participants') {
      const participants = Array.from(this.sessions.values()).map(s => ({
        userId: s.userId,
        username: s.username,
        joinedAt: s.joinedAt,
      }));
      return Response.json({ participants });
    }
    
    if (url.pathname === '/broadcast' && request.method === 'POST') {
      const message = await request.json() as ChatMessage;
      this.broadcast(message);
      return Response.json({ success: true });
    }
    
    return new Response('Not Found', { status: 404 });
  }

  private async handleWebSocket(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');
    const username = url.searchParams.get('username');
    
    if (!userId || !username) {
      return new Response('Missing userId or username', { status: 400 });
    }
    
    // Create WebSocket pair
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    
    // Accept the WebSocket
    this.state.acceptWebSocket(server);
    
    // Store session
    const session: Session = {
      socket: server,
      userId,
      username,
      joinedAt: Date.now(),
    };
    this.sessions.set(userId, session);
    
    // Notify others of join
    this.broadcast({
      type: 'presence',
      senderId: userId,
      username,
      content: 'joined',
      timestamp: Date.now(),
    }, userId);
    
    // Store active users
    await this.updateActiveUsers();
    
    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
    const session = this.findSession(ws);
    if (!session) return;
    
    try {
      const data = JSON.parse(message as string) as ChatMessage;
      
      switch (data.type) {
        case 'message':
          // Broadcast message to all participants
          this.broadcast({
            type: 'message',
            senderId: session.userId,
            username: session.username,
            content: data.content,
            messageId: data.messageId,
            timestamp: Date.now(),
          });
          break;
        
        case 'typing':
          // Broadcast typing indicator to others
          this.broadcast({
            type: 'typing',
            senderId: session.userId,
            username: session.username,
            timestamp: Date.now(),
          }, session.userId);
          break;
        
        case 'read':
          // Broadcast read receipt
          this.broadcast({
            type: 'read',
            senderId: session.userId,
            messageId: data.messageId,
            timestamp: Date.now(),
          }, session.userId);
          break;
      }
    } catch (err) {
      console.error('Error processing message:', err);
    }
  }

  async webSocketClose(ws: WebSocket, code: number, reason: string) {
    const session = this.findSession(ws);
    if (!session) return;
    
    // Remove session
    this.sessions.delete(session.userId);
    
    // Notify others of leave
    this.broadcast({
      type: 'presence',
      senderId: session.userId,
      username: session.username,
      content: 'left',
      timestamp: Date.now(),
    });
    
    await this.updateActiveUsers();
  }

  async webSocketError(ws: WebSocket, error: unknown) {
    const session = this.findSession(ws);
    if (session) {
      this.sessions.delete(session.userId);
      await this.updateActiveUsers();
    }
  }

  private findSession(ws: WebSocket): Session | undefined {
    for (const session of this.sessions.values()) {
      if (session.socket === ws) {
        return session;
      }
    }
    return undefined;
  }

  private broadcast(message: ChatMessage, excludeUserId?: string) {
    const payload = JSON.stringify(message);
    
    for (const [userId, session] of this.sessions) {
      if (userId !== excludeUserId) {
        try {
          session.socket.send(payload);
        } catch (err) {
          // Socket might be closed
          this.sessions.delete(userId);
        }
      }
    }
  }

  private async updateActiveUsers() {
    const userIds = Array.from(this.sessions.keys());
    await this.state.storage.put('active_users', userIds);
  }
}
