import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useChatStore } from '../../stores/chat.store';
import { useAuthStore } from '../../stores/auth.store';
import { formatDistanceToNow } from 'date-fns';
import {
  ChatBubbleLeftRightIcon,
  MagnifyingGlassIcon,
  InboxIcon,
} from '@heroicons/react/24/outline';
import { cn } from '../../lib/utils';

type FilterType = 'all' | 'selling' | 'buying';

const statusColors: Record<string, string> = {
  OPEN: 'bg-green-500',
  PENDING: 'bg-yellow-500',
  RESOLVED: 'bg-gray-400',
  SPAM: 'bg-red-400',
};

export default function SellerInboxPage() {
  const { user } = useAuthStore();
  const { conversations, fetchConversations, isLoading } = useChatStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const filteredConversations = conversations.filter((conv) => {
    if (searchQuery) {
      const otherUser = conv.buyerId === user?.id ? conv.seller : conv.buyer;
      const matchesSearch =
        otherUser?.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        otherUser?.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        conv.messages?.[0]?.content?.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;
    }
    if (filter === 'buying' && conv.buyerId !== user?.id) return false;
    if (filter === 'selling' && conv.sellerId !== user?.id) return false;
    return true;
  });

  const totalUnread = conversations.reduce((sum, conv) => {
    const unread =
      conv.buyerId === user?.id ? conv.unreadBuyerCount : conv.unreadSellerCount;
    return sum + (unread || 0);
  }, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Inbox</h1>
        <p className="text-muted-foreground text-sm">
          Manage your customer conversations
        </p>
      </div>

      {/* Search and filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search customers, messages..."
            className="w-full h-11 pl-11 pr-4 rounded-xl border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          />
        </div>
        <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
          {(['all', 'selling', 'buying'] as FilterType[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                'px-4 py-2 text-sm font-medium rounded-md transition-colors capitalize',
                filter === f
                  ? 'bg-background shadow-sm text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {f === 'selling' ? 'Customers' : f === 'buying' ? 'Purchases' : 'All'}
            </button>
          ))}
        </div>
      </div>

      {totalUnread > 0 && (
        <div className="flex items-center gap-2 text-sm text-primary bg-primary/5 px-4 py-2 rounded-lg">
          <InboxIcon className="h-4 w-4" />
          <span className="font-medium">{totalUnread} unread messages</span>
        </div>
      )}

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
                : 'When a customer messages you about a service, the conversation will appear here.'}
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
              const convStatus = (conversation as any).status || 'OPEN';
              const labels = (conversation as any).labels || [];

              return (
                <Link
                  key={conversation.id}
                  to={`/seller/inbox/${conversation.id}`}
                  className={cn(
                    'flex items-start gap-4 p-4 hover:bg-muted/50 transition-colors',
                    hasUnread && 'bg-primary/5'
                  )}
                >
                  {/* Status dot overlay on avatar */}
                  <div className="relative shrink-0">
                    {otherUser?.avatar ? (
                      <img
                        src={otherUser.avatar}
                        alt=""
                        className="h-12 w-12 rounded-xl object-cover"
                      />
                    ) : (
                      <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center text-white font-bold">
                        {otherUser?.firstName?.charAt(0) || otherUser?.username?.charAt(0) || '?'}
                      </div>
                    )}
                    <div className={cn(
                      'absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full ring-2 ring-card',
                      statusColors[convStatus] || 'bg-green-500'
                    )} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={cn('font-semibold truncate', hasUnread && 'text-foreground')}>
                          {otherUser?.firstName
                            ? `${otherUser.firstName} ${(otherUser as any).lastName || ''}`.trim()
                            : otherUser?.username || 'User'}
                        </span>
                        <span
                          className={cn(
                            'text-xs px-2 py-0.5 rounded-full shrink-0',
                            isBuyer
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-green-100 text-green-700'
                          )}
                        >
                          {isBuyer ? 'Purchase' : 'Customer'}
                        </span>
                        {/* Label chips */}
                        {labels.slice(0, 2).map((cl: any) => (
                          <span
                            key={cl.label?.id || cl.id}
                            className="hidden sm:inline-flex px-1.5 py-0.5 rounded text-[10px] text-white shrink-0"
                            style={{ backgroundColor: cl.label?.color || cl.color || '#6b7280' }}
                          >
                            {cl.label?.name || cl.name}
                          </span>
                        ))}
                      </div>
                      {conversation.lastMessageAt && (
                        <span className="text-xs text-muted-foreground shrink-0">
                          {formatDistanceToNow(new Date(conversation.lastMessageAt), {
                            addSuffix: true,
                          })}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <p
                        className={cn(
                          'text-sm truncate flex-1',
                          hasUnread ? 'text-foreground font-medium' : 'text-muted-foreground'
                        )}
                      >
                        {lastMessage?.content || 'No messages yet'}
                      </p>
                      {/* Linked order badge */}
                      {(conversation as any).order?.orderNumber && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-muted rounded text-muted-foreground shrink-0">
                          #{(conversation as any).order.orderNumber}
                        </span>
                      )}
                    </div>
                  </div>

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
