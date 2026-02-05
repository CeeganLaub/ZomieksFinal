import { create } from 'zustand';
import { api } from '../lib/api';
import { socketClient } from '../lib/socket';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  data?: Record<string, any>;
  createdAt: string;
}

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  
  // Actions
  fetchNotifications: () => Promise<void>;
  markAsRead: (ids?: string[]) => Promise<void>;
  addNotification: (notification: Notification) => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,

  fetchNotifications: async () => {
    set({ isLoading: true });
    try {
      const response = await api.get<{ 
        success: boolean; 
        data: { notifications: Notification[]; unreadCount: number } 
      }>('/users/notifications');
      set({ 
        notifications: response.data.notifications,
        unreadCount: response.data.unreadCount,
      });
    } finally {
      set({ isLoading: false });
    }
  },

  markAsRead: async (ids) => {
    await api.post('/users/notifications/read', { notificationIds: ids });
    set((state) => ({
      notifications: state.notifications.map(n => 
        ids ? (ids.includes(n.id) ? { ...n, isRead: true } : n) : { ...n, isRead: true }
      ),
      unreadCount: ids ? state.unreadCount - ids.length : 0,
    }));
  },

  addNotification: (notification) => {
    set((state) => ({
      notifications: [notification, ...state.notifications],
      unreadCount: state.unreadCount + 1,
    }));
  },
}));

// Setup socket listener
socketClient.onNotification((notification) => {
  useNotificationStore.getState().addNotification(notification);
});
