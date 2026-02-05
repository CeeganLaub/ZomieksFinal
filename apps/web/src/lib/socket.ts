import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

class SocketClient {
  private chatSocket: Socket | null = null;
  private notificationSocket: Socket | null = null;
  private presenceSocket: Socket | null = null;
  private crmSocket: Socket | null = null;

  connect() {
    // Chat namespace
    this.chatSocket = io(`${SOCKET_URL}/chat`, {
      withCredentials: true,
      autoConnect: true,
    });

    // Notifications namespace
    this.notificationSocket = io(`${SOCKET_URL}/notifications`, {
      withCredentials: true,
      autoConnect: true,
    });

    // Presence namespace
    this.presenceSocket = io(`${SOCKET_URL}/presence`, {
      withCredentials: true,
      autoConnect: true,
    });

    // CRM namespace (sellers only)
    this.crmSocket = io(`${SOCKET_URL}/crm`, {
      withCredentials: true,
      autoConnect: true,
    });

    this.setupEventHandlers();
  }

  disconnect() {
    this.chatSocket?.disconnect();
    this.notificationSocket?.disconnect();
    this.presenceSocket?.disconnect();
    this.crmSocket?.disconnect();
  }

  private setupEventHandlers() {
    this.chatSocket?.on('connect', () => {
      console.log('Chat socket connected');
    });

    this.notificationSocket?.on('connect', () => {
      console.log('Notification socket connected');
    });

    this.presenceSocket?.on('connect', () => {
      console.log('Presence socket connected');
    });
  }

  // Chat methods
  joinConversation(conversationId: string) {
    this.chatSocket?.emit('join-conversation', conversationId);
  }

  leaveConversation(conversationId: string) {
    this.chatSocket?.emit('leave-conversation', conversationId);
  }

  sendMessage(conversationId: string, content: string, type: string = 'TEXT', attachments?: string[]) {
    this.chatSocket?.emit('send-message', { conversationId, content, type, attachments });
  }

  startTyping(conversationId: string) {
    this.chatSocket?.emit('typing-start', conversationId);
  }

  stopTyping(conversationId: string) {
    this.chatSocket?.emit('typing-stop', conversationId);
  }

  markRead(conversationId: string, messageIds: string[]) {
    this.chatSocket?.emit('mark-read', { conversationId, messageIds });
  }

  onNewMessage(callback: (message: any) => void) {
    this.chatSocket?.on('new-message', callback);
  }

  onTyping(callback: (data: { conversationId: string; userId: string; isTyping: boolean }) => void) {
    this.chatSocket?.on('user-typing', callback);
  }

  // Notification methods
  onNotification(callback: (notification: any) => void) {
    this.notificationSocket?.on('notification', callback);
  }

  // Presence methods
  setOnline() {
    this.presenceSocket?.emit('set-online');
  }

  setAway() {
    this.presenceSocket?.emit('set-away');
  }

  onPresenceChange(callback: (data: { userId: string; status: string }) => void) {
    this.presenceSocket?.on('presence-change', callback);
  }

  // CRM methods
  subscribeToCRM() {
    this.crmSocket?.emit('subscribe');
  }

  onPipelineUpdate(callback: (data: any) => void) {
    this.crmSocket?.on('pipeline-update', callback);
  }

  get chat() {
    return this.chatSocket;
  }

  get notifications() {
    return this.notificationSocket;
  }

  get presence() {
    return this.presenceSocket;
  }

  get crm() {
    return this.crmSocket;
  }
}

export const socketClient = new SocketClient();
