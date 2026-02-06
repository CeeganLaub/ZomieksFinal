import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useChatStore } from '../../stores/chat.store';
import { useAuthStore } from '../../stores/auth.store';
import { formatDistanceToNow } from 'date-fns';
import {
  ChatBubbleLeftRightIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import { cn } from '../../lib/utils';

type FilterType = 'all' | 'buying' | 'selling';

export default function MessagesPage() {
  const { user } = useAuthStore();
  const { conversations, fetchConversations, isLoading } = useChatStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Filter conversations based on search and filter type
  const filteredConversations = conversations.filter((conv) => {
    // Search filter
    if (searchQuery) {
      const otherUser = conv.buyerId === user?.id ? conv.seller : conv.buyer;
      const matchesSearch =
        otherUser?.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        otherUser?.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        conv.messages?.[0]?.content?.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;
    }

    // Role filter
    if (filter === 'buying' && conv.buyerId !== user?.id) return false;
    if (filter === 'selling' && conv.sellerId !== user?.id) return false;

    return true;
  });

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Inbox</h1>
        <div className="flex items-center gap-2">
          {/* Filter tabs */}
          {user?.isSeller && (
            <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
              {(['all', 'buying', 'selling'] as FilterType[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={cn(
                    'px-3 py-1.5 text-sm font-medium rounded-md transition-colors capitalize',
                    filter === f
                      ? 'bg-background shadow-sm text-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {f}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search messages..."
          className="w-full h-11 pl-11 pr-4 rounded-xl border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
        />
      </div>

      {/* Conversations list */}
      <div className="bg-card rounded-xl border overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="mt-4 text-muted-foreground">Loading conversations...</p>
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="p-12 text-center">
            <ChatBubbleLeftRightIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <h3 className="font-semibold mb-2">
              {searchQuery ? 'No conversations found' : 'No messages yet'}
            </h3>
            <p className="text-muted-foreground text-sm">
              {searchQuery
                ? 'Try a different search term'
                : 'When you start a conversation with a buyer or seller, it will appear here.'}
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {filteredConversations.map((conversation) => {
              const isBuyer = conversation.buyerId === user?.id;
              const otherUser = isBuyer ? conversation.seller : conversation.buyer;
              const lastMessage = conversation.messages?.[0];
              const unreadCount = isBuyer
                ? conversation.unreadBuyerCount
                : conversation.unreadSellerCount;
              const hasUnread = unreadCount > 0;

              return (
                <Link
                  key={conversation.id}
                  to={`/messages/${conversation.id}`}
                  className={cn(
                    'flex items-start gap-4 p-4 hover:bg-muted/50 transition-colors',
                    hasUnread && 'bg-primary/5'
                  )}
                >
                  {/* Avatar */}
                  {otherUser?.avatar ? (
                    <img
                      src={otherUser.avatar}
                      alt=""
                      className="h-12 w-12 rounded-xl object-cover shrink-0"
                    />
                  ) : (
                    <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center text-white font-bold shrink-0">
                      {otherUser?.firstName?.charAt(0) || otherUser?.username?.charAt(0) || '?'}
                    </div>
                  )}

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2">
                        <span className={cn('font-semibold', hasUnread && 'text-foreground')}>
                          {otherUser?.firstName || otherUser?.username || 'User'}
                        </span>
                        <span
                          className={cn(
                            'text-xs px-2 py-0.5 rounded-full',
                            isBuyer
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-green-100 text-green-700'
                          )}
                        >
                          {isBuyer ? 'Buying' : 'Selling'}
                        </span>
                      </div>
                      {conversation.lastMessageAt && (
                        <span className="text-xs text-muted-foreground shrink-0">
                          {formatDistanceToNow(new Date(conversation.lastMessageAt), {
                            addSuffix: true,
                          })}
                        </span>
                      )}
                    </div>
                    <p
                      className={cn(
                        'text-sm truncate',
                        hasUnread ? 'text-foreground font-medium' : 'text-muted-foreground'
                      )}
                    >
                      {lastMessage?.content || 'No messages yet'}
                    </p>
                  </div>

                  {/* Unread indicator */}
                  {hasUnread && (
                    <span className="h-5 min-w-[20px] rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-medium px-1.5 shrink-0">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
