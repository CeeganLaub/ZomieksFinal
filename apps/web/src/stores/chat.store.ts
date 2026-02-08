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
  conversationMap: Map<string, Conversation>;
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
  conversationMap: new Map(),
  activeConversation: null,
  messages: [],
  typingUsers: new Map(),
  isLoading: false,

  fetchConversations: async () => {
    set({ isLoading: true });
    try {
      const response = await api.get<{ success: boolean; data: { conversations: Conversation[] } }>('/conversations');
      const conversations = response.data.conversations;
      const conversationMap = new Map(conversations.map(c => [c.id, c]));
      set({ conversations, conversationMap });
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
    set((state) => {
      const newMap = new Map(state.conversationMap);
      const existing = newMap.get(message.conversationId);

      if (existing) {
        const updated = {
          ...existing,
          messages: [{ content: message.content, type: message.type, createdAt: message.createdAt }],
          lastMessageAt: message.createdAt,
        };
        newMap.set(message.conversationId, updated);
      }

      // Rebuild ordered list: move updated conversation to front
      const updatedConversations = Array.from(newMap.values());
      const idx = updatedConversations.findIndex(c => c.id === message.conversationId);
      if (idx > 0) {
        const [moved] = updatedConversations.splice(idx, 1);
        updatedConversations.unshift(moved);
      }

      return {
        messages: [...state.messages, message],
        conversations: updatedConversations,
        conversationMap: newMap,
      };
    });
  },

  sendMessage: (conversationId, content, _type = 'TEXT', _attachments) => {
    // Socket currently only supports text messages
    socketClient.sendMessage(conversationId, content);
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

// Socket listeners are set up per-conversation when joining
// See fetchConversation and setActiveConversation for socket setup
