import { AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../../stores/auth.store';
import { useFloatingChatStore } from '../../stores/floatingChat.store';
import FloatingInbox from './FloatingInbox';
import MiniChatWindow from './MiniChatWindow';
import { useLocation } from 'react-router-dom';

/**
 * Orchestrates the floating inbox panel and all open mini chat windows.
 * Renders at the App level, visible on all pages when logged in.
 */
export default function FloatingChatManager() {
  const { isAuthenticated, isLoading } = useAuthStore();
  const { openChats } = useFloatingChatStore();
  const location = useLocation();

  // Don't render until auth is fully initialized (prevents crashes from stale hydrated state)
  if (!isAuthenticated || isLoading) return null;

  // Get the conversation ID from the current route if on a full conversation page
  const conversationPageMatch = location.pathname.match(
    /\/(?:messages|seller\/inbox)\/([a-zA-Z0-9-]+)$/
  );
  const activeFullPageConvId = conversationPageMatch?.[1] || null;

  // Filter out any chat that's already open in full-page view
  const visibleChats = activeFullPageConvId
    ? openChats.filter((id) => id !== activeFullPageConvId)
    : openChats;

  return (
    <>
      {/* Floating inbox panel — bottom right */}
      <FloatingInbox />

      {/* Mini chat windows — stacked to the left of the inbox */}
      <AnimatePresence mode="popLayout">
        {visibleChats.map((id, i) => (
          <MiniChatWindow
            key={id}
            conversationId={id}
            index={i}
          />
        ))}
      </AnimatePresence>
    </>
  );
}
