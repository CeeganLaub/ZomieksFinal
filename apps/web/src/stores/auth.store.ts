import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '../lib/api';
import { socketClient } from '../lib/socket';

interface User {
  id: string;
  email: string;
  username: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  isSeller: boolean;
  isAdmin: boolean;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  
  // Actions
  initialize: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: User | null) => void;
  refreshUser: () => Promise<void>;
}

interface RegisterData {
  email: string;
  password: string;
  username: string;
  firstName?: string;
  lastName?: string;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isLoading: true,
      isAuthenticated: false,

      initialize: async () => {
        try {
          const response = await api.get<{ success: boolean; data: { user: User } }>('/auth/me');
          set({ 
            user: response.data.user, 
            isAuthenticated: true, 
            isLoading: false 
          });
          socketClient.connect();
        } catch {
          set({ user: null, isAuthenticated: false, isLoading: false });
        }
      },

      login: async (email, password) => {
        const response = await api.post<{ success: boolean; data: { user: User } }>('/auth/login', { 
          email, 
          password 
        });
        set({ user: response.data.user, isAuthenticated: true });
        socketClient.connect();
      },

      register: async (data) => {
        const response = await api.post<{ success: boolean; data: { user: User } }>('/auth/register', data);
        set({ user: response.data.user, isAuthenticated: true });
        socketClient.connect();
      },

      logout: async () => {
        try {
          await api.post('/auth/logout');
        } finally {
          set({ user: null, isAuthenticated: false });
          socketClient.disconnect();
        }
      },

      setUser: (user) => set({ user, isAuthenticated: !!user }),

      refreshUser: async () => {
        try {
          const response = await api.get<{ success: boolean; data: { user: User } }>('/auth/me');
          set({ user: response.data.user });
        } catch {
          set({ user: null, isAuthenticated: false });
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    }
  )
);
