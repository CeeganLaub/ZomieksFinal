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
  sellerProfile?: {
    displayName: string;
    professionalTitle: string;
    rating: number;
    reviewCount: number;
    isVerified: boolean;
  };
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  
  // Actions
  initialize: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: User | null) => void;
  setAuth: (user: User, token: string) => void;
  clearAuth: () => void;
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
      token: null,
      isLoading: true,
      isAuthenticated: false,

      initialize: async () => {
        const { token } = get();
        if (!token) {
          set({ isLoading: false });
          return;
        }
        try {
          const response = await api.get<{ success: boolean; data: { user: User } }>('/auth/me');
          set({ 
            user: response.data.user, 
            isAuthenticated: true, 
            isLoading: false 
          });
          socketClient.connect();
        } catch {
          set({ user: null, token: null, isAuthenticated: false, isLoading: false });
        }
      },

      login: async (email, password) => {
        const response = await api.post<{ success: boolean; data: { user: User; accessToken: string } }>('/auth/login', { 
          email, 
          password 
        });
        set({ 
          user: response.data.user, 
          token: response.data.accessToken,
          isAuthenticated: true 
        });
        socketClient.connect();
      },

      register: async (data) => {
        const response = await api.post<{ success: boolean; data: { user: User; accessToken: string } }>('/auth/register', data);
        set({ 
          user: response.data.user, 
          token: response.data.accessToken,
          isAuthenticated: true 
        });
        socketClient.connect();
      },

      logout: async () => {
        try {
          await api.post('/auth/logout');
        } finally {
          set({ user: null, token: null, isAuthenticated: false });
          socketClient.disconnect();
        }
      },

      setUser: (user) => set({ user, isAuthenticated: !!user }),
      
      setAuth: (user, token) => {
        set({ user, token, isAuthenticated: true });
        socketClient.connect();
      },
      
      clearAuth: () => {
        set({ user: null, token: null, isAuthenticated: false });
        socketClient.disconnect();
      },

      refreshUser: async () => {
        try {
          const response = await api.get<{ success: boolean; data: { user: User } }>('/auth/me');
          set({ user: response.data.user });
        } catch {
          set({ user: null, token: null, isAuthenticated: false });
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ 
        user: state.user, 
        token: state.token,
        isAuthenticated: state.isAuthenticated 
      }),
    }
  )
);
