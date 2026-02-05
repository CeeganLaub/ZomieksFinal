import { create } from 'zustand';
import { api } from '../lib/api';
import { socketClient } from '../lib/socket';

interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  type: string;
  attachments?: string[];
  createdAt: string;
  sender: {
    id: string;
    username: string;
    firstName?: string;
    avatar?: string;
  };
}

interface Conversation {
  id: string;
  buyerId: string;
  sellerId: string;
  status: string;
  lastMessageAt: string;
  unreadBuyerCount: number;
  unreadSellerCount: number;
  buyer: {
    id: string;
    username: string;
    firstName?: string;
    avatar?: string;
  };
  seller: {
    id: string;
    username: string;
    firstName?: string;
    avatar?: string;
  };
  messages: { content: string; type: string; createdAt: string }[];
}

interface ChatState {
  conversations: Conversation[];
  activeConversation: Conversation | null;
  messages: Message[];
  typingUsers: Map<string, Set<string>>;
  isLoading: boolean;
  
  // Actions
  fetchConversations: () => Promise<void>;
  fetchConversation: (id: string) => Promise<void>;
  setActiveConversation: (conversation: Conversation | null) => void;
  addMessage: (message: Message) => void;
  sendMessage: (conversationId: string, content: string, type?: string, attachments?: string[]) => void;
  setTyping: (conversationId: string, userId: string, isTyping: boolean) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  activeConversation: null,
  messages: [],
  typingUsers: new Map(),
  isLoading: false,

  fetchConversations: async () => {
    set({ isLoading: true });
    try {
      const response = await api.get<{ success: boolean; data: { conversations: Conversation[] } }>('/conversations');
      set({ conversations: response.data.conversations });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchConversation: async (id) => {
    set({ isLoading: true });
    try {
      const response = await api.get<{ 
        success: boolean; 
        data: { conversation: Conversation; messages: Message[] } 
      }>(`/conversations/${id}`);
      set({ 
        activeConversation: response.data.conversation,
        messages: response.data.messages,
      });
      socketClient.joinConversation(id);
    } finally {
      set({ isLoading: false });
    }
  },

  setActiveConversation: (conversation) => {
    const current = get().activeConversation;
    if (current?.id) {
      socketClient.leaveConversation(current.id);
    }
    set({ activeConversation: conversation, messages: [] });
    if (conversation?.id) {
      socketClient.joinConversation(conversation.id);
    }
  },

  addMessage: (message) => {
    set((state) => ({
      messages: [...state.messages, message],
      conversations: state.conversations.map(c => 
        c.id === message.conversationId 
          ? { ...c, messages: [{ content: message.content, type: message.type, createdAt: message.createdAt }], lastMessageAt: message.createdAt }
          : c
      ).sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()),
    }));
  },

  sendMessage: (conversationId, content, type = 'TEXT', attachments) => {
    socketClient.sendMessage(conversationId, content, type, attachments);
  },

  setTyping: (conversationId, userId, isTyping) => {
    set((state) => {
      const newTypingUsers = new Map(state.typingUsers);
      const users = newTypingUsers.get(conversationId) || new Set();
      
      if (isTyping) {
        users.add(userId);
      } else {
        users.delete(userId);
      }
      
      newTypingUsers.set(conversationId, users);
      return { typingUsers: newTypingUsers };
    });
  },
}));

// Setup socket listeners
socketClient.onNewMessage((message) => {
  useChatStore.getState().addMessage(message);
});

socketClient.onTyping(({ conversationId, userId, isTyping }) => {
  useChatStore.getState().setTyping(conversationId, userId, isTyping);
});
