import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useChatStore } from '../../stores/chat.store';
import { useFloatingChatStore } from '../../stores/floatingChat.store';
import { useAuthStore } from '../../stores/auth.store';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '../../lib/utils';
import {
  ChatBubbleLeftRightIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  MagnifyingGlassIcon,
  AdjustmentsHorizontalIcon,
} from '@heroicons/react/24/outline';

export default function FloatingInbox() {
  const { user } = useAuthStore();
  const { conversations, fetchConversations, isLoading } = useChatStore();
  const { isInboxOpen, toggleInbox, openChat } = useFloatingChatStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'chats' | 'requests'>('chats');

  useEffect(() => {
    if (isInboxOpen) fetchConversations();
  }, [isInboxOpen, fetchConversations]);

  const totalUnread = conversations.reduce((acc, conv) => {
    if (!user) return acc;
    const isB = conv.buyerId === user.id;
    return acc + (isB ? conv.unreadBuyerCount || 0 : conv.unreadSellerCount || 0);
  }, 0);

  const filtered = conversations.filter((conv) => {
    if (!searchQuery) return true;
    const other = conv.buyerId === user?.id ? conv.seller : conv.buyer;
    return (
      other?.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      other?.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.messages?.[0]?.content?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const handleOpenChat = (conversationId: string) => {
    openChat(conversationId);
  };

  return (
    <div className="fixed bottom-0 right-4 z-[60] flex flex-col items-end">
      {/* Inbox Panel */}
      <AnimatePresence>
        {isInboxOpen && (
          <motion.div
            className="w-[340px] bg-card border border-border/60 rounded-t-xl shadow-2xl overflow-hidden flex flex-col"
            style={{ maxHeight: 'min(520px, calc(100vh - 80px))' }}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
          >
            {/* Search */}
            <div className="px-3 py-2 border-b">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search"
                  className="w-full h-8 pl-8 pr-8 text-xs rounded-lg border bg-muted/40 focus:bg-background focus:outline-none focus:border-primary/50 transition-colors placeholder:text-muted-foreground/60"
                />
                <button className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <AdjustmentsHorizontalIcon className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex items-center justify-between px-3 py-1.5 border-b text-xs">
              <div className="flex gap-3">
                <button
                  onClick={() => setActiveTab('chats')}
                  className={cn(
                    'font-medium pb-0.5 transition-colors',
                    activeTab === 'chats'
                      ? 'text-foreground border-b-2 border-primary'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  Chats
                </button>
                <button
                  onClick={() => setActiveTab('requests')}
                  className={cn(
                    'font-medium pb-0.5 transition-colors',
                    activeTab === 'requests'
                      ? 'text-foreground border-b-2 border-primary'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  Requests ({totalUnread})
                </button>
              </div>
            </div>

            {/* Conversation List */}
            <div className="flex-1 overflow-y-auto overscroll-contain">
              {isLoading ? (
                <div className="p-8 flex justify-center">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              ) : filtered.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <ChatBubbleLeftRightIcon className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p className="text-xs">No conversations</p>
                </div>
              ) : (
                <div>
                  {filtered.map((conversation) => {
                    const isBuyer = conversation.buyerId === user?.id;
                    const other = isBuyer ? conversation.seller : conversation.buyer;
                    const lastMsg = conversation.messages?.[0];
                    const unread = isBuyer ? conversation.unreadBuyerCount : conversation.unreadSellerCount;
                    const hasUnread = (unread || 0) > 0;

                    return (
                      <button
                        key={conversation.id}
                        onClick={() => handleOpenChat(conversation.id)}
                        className={cn(
                          'w-full flex items-start gap-2.5 px-3 py-2.5 text-left hover:bg-muted/60 transition-colors border-b border-border/30',
                          hasUnread && 'bg-primary/[0.03]'
                        )}
                      >
                        {/* Avatar with online indicator */}
                        <div className="relative shrink-0">
                          {other?.avatar ? (
                            <img src={other.avatar} alt="" className="h-10 w-10 rounded-full object-cover" />
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary/80 to-purple-500 flex items-center justify-center text-white text-sm font-bold">
                              {other?.firstName?.charAt(0) || other?.username?.charAt(0) || '?'}
                            </div>
                          )}
                          {/* Online dot */}
                          <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-green-500 border-2 border-card" />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <span className={cn('text-sm truncate', hasUnread ? 'font-semibold' : 'font-medium')}>
                              {other?.firstName || other?.username || 'User'}
                              {other?.username && (
                                <span className="text-muted-foreground font-normal"> @{other.username}</span>
                              )}
                            </span>
                            {conversation.lastMessageAt && (
                              <span className="text-[10px] text-muted-foreground shrink-0">
                                {formatDistanceToNow(new Date(conversation.lastMessageAt), { addSuffix: false })}
                              </span>
                            )}
                          </div>
                          <p className={cn(
                            'text-xs truncate mt-0.5',
                            hasUnread ? 'text-foreground font-medium' : 'text-muted-foreground'
                          )}>
                            {lastMsg?.content || 'No messages yet'}
                          </p>
                        </div>

                        {/* Unread badge */}
                        {hasUnread && (
                          <span className="mt-1 min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center px-1 shrink-0">
                            {unread! > 9 ? '9+' : unread}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Bar (always visible) — clickable to toggle */}
      <button
        onClick={toggleInbox}
        className={cn(
          'flex items-center justify-between w-[340px] h-10 px-4 rounded-t-xl transition-all',
          'bg-[hsl(220,20%,18%)] text-white hover:bg-[hsl(220,20%,22%)]',
          'shadow-lg border border-border/20',
          !isInboxOpen && 'rounded-xl shadow-xl'
        )}
      >
        <span className="text-sm font-semibold tracking-tight">Messages</span>
        <div className="flex items-center gap-2">
          {totalUnread > 0 && (
            <span className="min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center px-1">
              {totalUnread > 99 ? '99+' : totalUnread}
            </span>
          )}
          {isInboxOpen ? (
            <ChevronDownIcon className="h-4 w-4 opacity-70" />
          ) : (
            <ChevronUpIcon className="h-4 w-4 opacity-70" />
          )}
        </div>
      </button>
    </div>
  );
}
