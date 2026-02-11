import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface FloatingChatState {
  isInboxOpen: boolean;
  openChats: string[]; // conversation IDs, ordered by most recently opened last
  minimizedChats: string[]; // conversation IDs that are minimized

  toggleInbox: () => void;
  openInbox: () => void;
  closeInbox: () => void;
  openChat: (conversationId: string) => void;
  closeChat: (conversationId: string) => void;
  toggleMinimize: (conversationId: string) => void;
  bringToFront: (conversationId: string) => void;
  closeAll: () => void;
}

export const useFloatingChatStore = create<FloatingChatState>()(
  persist(
    (set) => ({
      isInboxOpen: false,
      openChats: [],
      minimizedChats: [],

      toggleInbox: () => set((s) => ({ isInboxOpen: !s.isInboxOpen })),
      openInbox: () => set({ isInboxOpen: true }),
      closeInbox: () => set({ isInboxOpen: false }),

      openChat: (conversationId) =>
        set((s) => {
          if (s.openChats.includes(conversationId)) {
            // Already open — un-minimize and bring to front
            return {
              openChats: [...s.openChats.filter((id) => id !== conversationId), conversationId],
              minimizedChats: s.minimizedChats.filter((id) => id !== conversationId),
            };
          }
          return {
            openChats: [...s.openChats, conversationId],
            minimizedChats: s.minimizedChats.filter((id) => id !== conversationId),
          };
        }),

      closeChat: (conversationId) =>
        set((s) => ({
          openChats: s.openChats.filter((id) => id !== conversationId),
          minimizedChats: s.minimizedChats.filter((id) => id !== conversationId),
        })),

      toggleMinimize: (conversationId) =>
        set((s) => ({
          minimizedChats: s.minimizedChats.includes(conversationId)
            ? s.minimizedChats.filter((id) => id !== conversationId)
            : [...s.minimizedChats, conversationId],
        })),

      bringToFront: (conversationId) =>
        set((s) => ({
          openChats: [...s.openChats.filter((id) => id !== conversationId), conversationId],
        })),

      closeAll: () => set({ openChats: [], minimizedChats: [] }),
    }),
    {
      name: 'floating-chat-storage',
      partialize: (state) => ({
        isInboxOpen: state.isInboxOpen,
        openChats: state.openChats,
        minimizedChats: state.minimizedChats,
      }),
    }
  )
);
