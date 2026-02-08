import { create } from 'zustand';
import { api } from '../lib/api';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  data?: Record<string, any>;
  createdAt: string;
}

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  
  // Actions
  fetchNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  addNotification: (notification: Notification) => void;
}

let fetchPromise: Promise<void> | null = null;

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,

  fetchNotifications: async () => {
    // Deduplicate concurrent fetches
    if (fetchPromise) return fetchPromise;

    set({ isLoading: true });
    fetchPromise = (async () => {
      try {
        const response = await api.get<{ 
          success: boolean; 
          data: { notifications: Notification[]; unreadCount: number } 
        }>('/users/notifications');
        set({ 
          notifications: response.data.notifications,
          unreadCount: response.data.unreadCount,
        });
      } catch {
        // Silently fail - notifications endpoint may not exist yet
        set({ notifications: [], unreadCount: 0 });
      } finally {
        set({ isLoading: false });
        fetchPromise = null;
      }
    })();

    return fetchPromise;
  },

  markAsRead: async (id: string) => {
    try {
      await api.post('/users/notifications/read', { notificationIds: [id] });
    } catch {
      // Silently fail
    }
    set((state) => ({
      notifications: state.notifications.map(n => 
        n.id === id ? { ...n, read: true } : n
      ),
      unreadCount: Math.max(0, state.unreadCount - 1),
    }));
  },

  markAllAsRead: async () => {
    try {
      await api.post('/users/notifications/read', { all: true });
    } catch {
      // Silently fail
    }
    set((state) => ({
      notifications: state.notifications.map(n => ({ ...n, read: true })),
      unreadCount: 0,
    }));
  },

  addNotification: (notification) => {
    set((state) => {
      // Prevent duplicate notifications
      if (state.notifications.some(n => n.id === notification.id)) {
        return state;
      }
      return {
        notifications: [notification, ...state.notifications],
        unreadCount: state.unreadCount + 1,
      };
    });
  },
}));
