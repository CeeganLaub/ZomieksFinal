import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { toast } from 'sonner';
import {
  MagnifyingGlassIcon,
  ArrowPathIcon,
  ChatBubbleLeftRightIcon,
  FlagIcon,
  EyeIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import { cn } from '../../lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface AdminConversation {
  id: string;
  buyerId: string;
  sellerId: string;
  status: string;
  adminFlagged: boolean;
  adminNotes: string | null;
  lastMessageAt: string | null;
  createdAt: string;
  buyer: { id: string; username: string; email: string; firstName: string; avatar: string | null };
  seller: { id: string; username: string; email: string; firstName: string; avatar: string | null };
  order: { id: string; orderNumber: string; status: string; totalAmount: number } | null;
  messages: { id: string; content: string; type: string; senderId: string; createdAt: string }[];
  _count: { messages: number };
}

interface ConversationDetail {
  id: string;
  buyerId: string;
  sellerId: string;
  adminFlagged: boolean;
  adminNotes: string | null;
  buyer: { id: string; username: string; email: string; firstName: string; avatar: string | null };
  seller: { id: string; username: string; email: string; firstName: string; avatar: string | null };
  order: { id: string; orderNumber: string; status: string; totalAmount: number } | null;
  messages: {
    id: string;
    content: string;
    type: string;
    senderId: string;
    createdAt: string;
    sender: { id: string; username: string; firstName: string; avatar: string | null };
  }[];
}

export default function AdminInboxPage() {
  const [conversations, setConversations] = useState<AdminConversation[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterFlagged, setFilterFlagged] = useState(false);
  const [page, setPage] = useState(1);
  const [selectedConversation, setSelectedConversation] = useState<ConversationDetail | null>(null);
  const [viewLoading, setViewLoading] = useState(false);

  useEffect(() => {
    loadConversations();
  }, [page, filterFlagged]);

  async function loadConversations() {
    try {
      setLoading(true);
      const params: Record<string, string> = { page: String(page), limit: '20' };
      if (search) params.search = search;
      if (filterFlagged) params.flagged = 'true';

      const queryStr = new URLSearchParams(params).toString();
      const res = await api.get<any>(`/admin/conversations?${queryStr}`);
      setConversations(res.data?.conversations || []);
      setTotal(res.meta?.total || 0);
    } catch {
      setConversations([]);
    } finally {
      setLoading(false);
    }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    loadConversations();
  }

  async function viewConversation(id: string) {
    try {
      setViewLoading(true);
      const res = await api.get<any>(`/admin/conversations/${id}`);
      setSelectedConversation(res.data?.conversation || null);
    } catch {
      toast.error('Failed to load conversation');
    } finally {
      setViewLoading(false);
    }
  }

  async function toggleFlag(id: string, currentlyFlagged: boolean) {
    try {
      if (currentlyFlagged) {
        await api.post(`/admin/conversations/${id}/unflag`, {});
        toast.success('Conversation unflagged');
      } else {
        await api.post(`/admin/conversations/${id}/flag`, { reason: 'Flagged by admin for review' });
        toast.success('Conversation flagged for review');
      }
      loadConversations();
      if (selectedConversation?.id === id) {
        setSelectedConversation((prev) =>
          prev ? { ...prev, adminFlagged: !currentlyFlagged } : null
        );
      }
    } catch {
      toast.error('Failed to update flag');
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ChatBubbleLeftRightIcon className="h-7 w-7" />
          Inbox Management
        </h1>
        <p className="text-muted-foreground">
          Review conversations, monitor for off-platform contact attempts, and manage disputes.
        </p>
      </div>

      {/* Info Banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
        <ExclamationTriangleIcon className="h-6 w-6 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <h3 className="font-semibold text-amber-900">Off-Platform Communication Monitoring</h3>
          <p className="text-sm text-amber-800">
            All users are warned not to communicate off-platform. Flag conversations where users attempt to share
            personal contact details, external links, or try to move the transaction outside of Zomieks.
            Disputes involving off-platform communication cannot be resolved or refunded.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <form onSubmit={handleSearch} className="flex-1 min-w-[200px] max-w-md">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by username or email..."
              className="w-full h-10 pl-9 pr-4 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
        </form>

        <div className="flex gap-2">
          <button
            onClick={() => { setFilterFlagged(false); setPage(1); }}
            className={cn(
              'px-3 py-2 text-sm font-medium rounded-lg border transition-colors',
              !filterFlagged ? 'bg-primary text-white border-primary' : 'hover:bg-muted'
            )}
          >
            All
          </button>
          <button
            onClick={() => { setFilterFlagged(true); setPage(1); }}
            className={cn(
              'px-3 py-2 text-sm font-medium rounded-lg border transition-colors flex items-center gap-1',
              filterFlagged ? 'bg-red-600 text-white border-red-600' : 'hover:bg-muted'
            )}
          >
            <FlagIcon className="h-4 w-4" />
            Flagged
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Conversation List */}
        <div className="lg:col-span-2">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <ArrowPathIcon className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : conversations.length === 0 ? (
            <div className="bg-background border rounded-lg p-8 text-center">
              <ChatBubbleLeftRightIcon className="h-10 w-10 text-muted-foreground/50 mx-auto mb-2" />
              <p className="text-muted-foreground">No conversations found</p>
            </div>
          ) : (
            <div className="bg-background border rounded-lg divide-y overflow-hidden">
              {conversations.map((conv) => {
                const lastMsg = conv.messages[0];
                const isSelected = selectedConversation?.id === conv.id;
                return (
                  <div
                    key={conv.id}
                    className={cn(
                      'p-4 cursor-pointer transition-colors hover:bg-muted/50',
                      isSelected ? 'bg-primary/5 border-l-2 border-l-primary' : '',
                      conv.adminFlagged ? 'bg-red-50/50' : ''
                    )}
                    onClick={() => viewConversation(conv.id)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          {conv.adminFlagged && (
                            <FlagIcon className="h-4 w-4 text-red-500 shrink-0" />
                          )}
                          <span className="font-medium text-sm truncate">
                            {conv.buyer?.username || 'Unknown'}
                          </span>
                          <span className="text-muted-foreground text-xs">↔</span>
                          <span className="font-medium text-sm truncate">
                            {conv.seller?.username || 'Unknown'}
                          </span>
                        </div>
                        {lastMsg && (
                          <p className="text-xs text-muted-foreground truncate mt-1">
                            {lastMsg.content
                              ? lastMsg.content.length > 80
                                ? lastMsg.content.substring(0, 80) + '...'
                                : lastMsg.content
                              : ''}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-muted-foreground">
                            {conv._count.messages} messages
                          </span>
                          {conv.order && (
                            <span className="text-xs px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">
                              Order #{conv.order.orderNumber}
                            </span>
                          )}
                          {conv.lastMessageAt && (
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(conv.lastMessageAt), { addSuffix: true })}
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFlag(conv.id, conv.adminFlagged);
                        }}
                        className={cn(
                          'p-1.5 rounded hover:bg-muted shrink-0',
                          conv.adminFlagged ? 'text-red-500' : 'text-muted-foreground'
                        )}
                        title={conv.adminFlagged ? 'Unflag' : 'Flag for review'}
                      >
                        <FlagIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {total > 20 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                Page {page} of {Math.ceil(total / 20)}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page <= 1}
                  className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-50 hover:bg-muted"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={page >= Math.ceil(total / 20)}
                  className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-50 hover:bg-muted"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Conversation Detail */}
        <div className="lg:col-span-3">
          {viewLoading ? (
            <div className="bg-background border rounded-lg flex items-center justify-center h-64">
              <ArrowPathIcon className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : selectedConversation ? (
            <div className="bg-background border rounded-lg flex flex-col" style={{ maxHeight: '70vh' }}>
              {/* Detail Header */}
              <div className="p-4 border-b flex items-center justify-between">
                <div>
                  <h3 className="font-semibold flex items-center gap-2">
                    {selectedConversation.adminFlagged && (
                      <FlagIcon className="h-4 w-4 text-red-500" />
                    )}
                    {selectedConversation.buyer?.username} ↔ {selectedConversation.seller?.username}
                  </h3>
                  <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                    <span>Buyer: {selectedConversation.buyer?.email}</span>
                    <span>·</span>
                    <span>Seller: {selectedConversation.seller?.email}</span>
                  </div>
                  {selectedConversation.order && (
                    <p className="text-xs mt-1">
                      <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">
                        Order #{selectedConversation.order.orderNumber} — {selectedConversation.order.status}
                        {' '}(R{Number(selectedConversation.order.totalAmount).toFixed(2)})
                      </span>
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleFlag(selectedConversation.id, selectedConversation.adminFlagged)}
                    className={cn(
                      'px-3 py-1.5 text-sm rounded-lg flex items-center gap-1.5 transition-colors',
                      selectedConversation.adminFlagged
                        ? 'bg-green-100 text-green-700 hover:bg-green-200'
                        : 'bg-red-100 text-red-700 hover:bg-red-200'
                    )}
                  >
                    {selectedConversation.adminFlagged ? (
                      <>
                        <CheckCircleIcon className="h-4 w-4" />
                        Unflag
                      </>
                    ) : (
                      <>
                        <FlagIcon className="h-4 w-4" />
                        Flag
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => setSelectedConversation(null)}
                    className="p-1.5 hover:bg-muted rounded"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {selectedConversation.messages.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">No messages in this conversation</p>
                ) : (
                  selectedConversation.messages.map((msg) => {
                    const isBuyer = msg.senderId === selectedConversation.buyerId;
                    const isSystem = msg.type === 'SYSTEM' || msg.type === 'ORDER_UPDATE';

                    if (isSystem) {
                      return (
                        <div key={msg.id} className="flex justify-center">
                          <div className="bg-muted text-muted-foreground text-xs px-3 py-1.5 rounded-full">
                            {msg.content}
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div key={msg.id} className={cn('flex gap-2', isBuyer ? 'justify-start' : 'justify-end')}>
                        <div className={cn(
                          'max-w-[75%] rounded-2xl px-3 py-2',
                          isBuyer
                            ? 'bg-blue-50 border border-blue-100 rounded-bl-md'
                            : 'bg-green-50 border border-green-100 rounded-br-md'
                        )}>
                          <div className="flex items-center gap-1 mb-0.5">
                            <span className={cn(
                              'text-xs font-medium',
                              isBuyer ? 'text-blue-700' : 'text-green-700'
                            )}>
                              {msg.sender?.username || 'Unknown'} ({isBuyer ? 'Buyer' : 'Seller'})
                            </span>
                          </div>
                          <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                          <p className="text-[10px] text-muted-foreground mt-1">
                            {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ) : (
            <div className="bg-background border rounded-lg flex items-center justify-center h-64">
              <div className="text-center">
                <EyeIcon className="h-10 w-10 text-muted-foreground/50 mx-auto mb-2" />
                <p className="text-muted-foreground">Select a conversation to review</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
