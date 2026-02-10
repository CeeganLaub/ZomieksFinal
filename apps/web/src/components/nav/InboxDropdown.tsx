import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useChatStore } from '../../stores/chat.store';
import { ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline';
import { formatDistanceToNow } from 'date-fns';

export default function InboxDropdown() {
  const { conversations, fetchConversations, isLoading } = useChatStore();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchConversations();
    }
  }, [isOpen, fetchConversations]);

  // Calculate total unread count
  const totalUnread = conversations.reduce((acc, conv) => {
    return acc + (conv.unreadBuyerCount || 0) + (conv.unreadSellerCount || 0);
  }, 0);

  // Get the 5 most recent conversations
  const recentConversations = conversations.slice(0, 5);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2.5 hover:bg-muted rounded-lg transition-colors"
      >
        <ChatBubbleLeftRightIcon className="h-5 w-5" />
        {totalUnread > 0 && (
          <motion.span
            className="absolute -top-0.5 -right-0.5 h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-medium shadow-sm"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 500 }}
          >
            {totalUnread > 9 ? '9+' : totalUnread}
          </motion.span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="absolute right-0 mt-2 w-80 bg-card border rounded-2xl shadow-xl z-50 overflow-hidden"
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
          >
            {/* Header */}
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-semibold">Inbox</h3>
              {totalUnread > 0 && (
                <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                  {totalUnread} new
                </span>
              )}
            </div>

            {/* Conversations list */}
            <div className="max-h-80 overflow-y-auto">
              {isLoading ? (
                <div className="p-8 text-center">
                  <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              ) : recentConversations.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <ChatBubbleLeftRightIcon className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No messages yet</p>
                </div>
              ) : (
                <div className="p-2">
                  {recentConversations.map((conversation) => {
                    const otherUser = conversation.buyer || conversation.seller;
                    const lastMessage = conversation.messages?.[0];
                    const hasUnread = (conversation.unreadBuyerCount || 0) + (conversation.unreadSellerCount || 0) > 0;

                    return (
                      <Link
                        key={conversation.id}
                        to={`/messages/${conversation.id}`}
                        onClick={() => setIsOpen(false)}
                        className={`flex items-start gap-3 p-3 rounded-xl hover:bg-muted transition-colors ${
                          hasUnread ? 'bg-primary/5' : ''
                        }`}
                      >
                        {otherUser?.avatar ? (
                          <img
                            src={otherUser.avatar}
                            alt=""
                            className="h-10 w-10 rounded-lg object-cover shrink-0"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center text-white text-sm font-bold shrink-0">
                            {otherUser?.firstName?.charAt(0) || otherUser?.username?.charAt(0) || '?'}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className={`text-sm truncate ${hasUnread ? 'font-semibold' : 'font-medium'}`}>
                              {otherUser?.firstName || otherUser?.username || 'User'}
                            </p>
                            {conversation.lastMessageAt && (
                              <span className="text-xs text-muted-foreground shrink-0">
                                {formatDistanceToNow(new Date(conversation.lastMessageAt), { addSuffix: false })}
                              </span>
                            )}
                          </div>
                          <p className={`text-sm truncate ${hasUnread ? 'text-foreground' : 'text-muted-foreground'}`}>
                            {lastMessage?.content || 'No messages'}
                          </p>
                        </div>
                        {hasUnread && (
                          <span className="w-2 h-2 rounded-full bg-primary shrink-0 mt-2" />
                        )}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-3 border-t">
              <Link
                to="/messages"
                onClick={() => setIsOpen(false)}
                className="block w-full text-center text-sm text-primary font-medium hover:underline"
              >
                See All in Inbox
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
