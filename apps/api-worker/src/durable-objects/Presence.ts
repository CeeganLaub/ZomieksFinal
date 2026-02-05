/**
 * Presence Durable Object
 * Tracks user online status globally across all connections
 */

interface UserPresence {
  userId: string;
  username: string;
  isOnline: boolean;
  lastSeen: number;
  connections: number;
}

interface PresenceUpdate {
  type: 'online' | 'offline' | 'heartbeat';
  userId: string;
  username?: string;
}

export class Presence {
  private users: Map<string, UserPresence> = new Map();
  private subscriptions: Map<string, Set<WebSocket>> = new Map(); // userId -> subscribers
  private state: DurableObjectState;
  private env: any;

  constructor(state: DurableObjectState, env: any) {
    this.state = state;
    this.env = env;
    
    // Cleanup stale users periodically
    this.state.blockConcurrencyWhile(async () => {
      await this.cleanupStale();
    });
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    
    // WebSocket for real-time presence updates
    if (request.headers.get('Upgrade') === 'websocket') {
      return this.handleWebSocket(request);
    }
    
    // REST endpoints
    switch (url.pathname) {
      case '/online': {
        const userId = url.searchParams.get('userId');
        const username = url.searchParams.get('username') || 'User';
        
        if (!userId) {
          return new Response('Missing userId', { status: 400 });
        }
        
        await this.setOnline(userId, username);
        return Response.json({ success: true });
      }
      
      case '/offline': {
        const userId = url.searchParams.get('userId');
        
        if (!userId) {
          return new Response('Missing userId', { status: 400 });
        }
        
        await this.setOffline(userId);
        return Response.json({ success: true });
      }
      
      case '/status': {
        const userIds = url.searchParams.get('userIds')?.split(',') || [];
        const statuses = userIds.map(id => {
          const presence = this.users.get(id);
          return {
            userId: id,
            isOnline: presence?.isOnline || false,
            lastSeen: presence?.lastSeen || null,
          };
        });
        return Response.json({ statuses });
      }
      
      case '/all': {
        const online = Array.from(this.users.values())
          .filter(u => u.isOnline)
          .map(u => ({
            userId: u.userId,
            username: u.username,
            lastSeen: u.lastSeen,
          }));
        return Response.json({ online, count: online.length });
      }
      
      default:
        return new Response('Not Found', { status: 404 });
    }
  }

  private async handleWebSocket(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');
    const watchList = url.searchParams.get('watch')?.split(',') || [];
    
    if (!userId) {
      return new Response('Missing userId', { status: 400 });
    }
    
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    
    this.state.acceptWebSocket(server);
    
    // Add to subscriptions for watched users
    for (const watchId of watchList) {
      if (!this.subscriptions.has(watchId)) {
        this.subscriptions.set(watchId, new Set());
      }
      this.subscriptions.get(watchId)!.add(server);
    }
    
    // Send initial status of watched users
    const initialStatuses = watchList.map(id => {
      const presence = this.users.get(id);
      return {
        userId: id,
        isOnline: presence?.isOnline || false,
        lastSeen: presence?.lastSeen || null,
      };
    });
    
    server.send(JSON.stringify({
      type: 'initial',
      statuses: initialStatuses,
    }));
    
    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
    try {
      const data = JSON.parse(message as string) as PresenceUpdate;
      
      switch (data.type) {
        case 'online':
          await this.setOnline(data.userId, data.username || 'User');
          break;
        
        case 'offline':
          await this.setOffline(data.userId);
          break;
        
        case 'heartbeat':
          await this.heartbeat(data.userId);
          break;
      }
    } catch (err) {
      console.error('Presence message error:', err);
    }
  }

  async webSocketClose(ws: WebSocket) {
    // Remove from all subscriptions
    for (const subs of this.subscriptions.values()) {
      subs.delete(ws);
    }
  }

  async webSocketError(ws: WebSocket) {
    for (const subs of this.subscriptions.values()) {
      subs.delete(ws);
    }
  }

  private async setOnline(userId: string, username: string) {
    const existing = this.users.get(userId);
    
    const presence: UserPresence = {
      userId,
      username,
      isOnline: true,
      lastSeen: Date.now(),
      connections: (existing?.connections || 0) + 1,
    };
    
    this.users.set(userId, presence);
    await this.state.storage.put(`user:${userId}`, presence);
    
    // Notify subscribers
    this.notifySubscribers(userId, { isOnline: true, lastSeen: presence.lastSeen });
  }

  private async setOffline(userId: string) {
    const existing = this.users.get(userId);
    if (!existing) return;
    
    const connections = existing.connections - 1;
    
    if (connections <= 0) {
      // Actually offline
      existing.isOnline = false;
      existing.lastSeen = Date.now();
      existing.connections = 0;
      
      this.users.set(userId, existing);
      await this.state.storage.put(`user:${userId}`, existing);
      
      this.notifySubscribers(userId, { isOnline: false, lastSeen: existing.lastSeen });
    } else {
      // Still has other connections
      existing.connections = connections;
      this.users.set(userId, existing);
    }
  }

  private async heartbeat(userId: string) {
    const existing = this.users.get(userId);
    if (existing) {
      existing.lastSeen = Date.now();
      this.users.set(userId, existing);
    }
  }

  private notifySubscribers(userId: string, update: { isOnline: boolean; lastSeen: number }) {
    const subscribers = this.subscriptions.get(userId);
    if (!subscribers) return;
    
    const payload = JSON.stringify({
      type: 'update',
      userId,
      ...update,
    });
    
    for (const ws of subscribers) {
      try {
        ws.send(payload);
      } catch {
        subscribers.delete(ws);
      }
    }
  }

  private async cleanupStale() {
    const staleThreshold = Date.now() - 5 * 60 * 1000; // 5 minutes
    
    for (const [userId, presence] of this.users) {
      if (presence.isOnline && presence.lastSeen < staleThreshold) {
        presence.isOnline = false;
        this.users.set(userId, presence);
        await this.state.storage.put(`user:${userId}`, presence);
        this.notifySubscribers(userId, { isOnline: false, lastSeen: presence.lastSeen });
      }
    }
  }
}
