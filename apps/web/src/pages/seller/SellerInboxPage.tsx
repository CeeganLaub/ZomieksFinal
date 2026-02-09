import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { toast } from 'sonner';
import { useChatStore } from '../../stores/chat.store';
import { useAuthStore } from '../../stores/auth.store';
import { api } from '../../lib/api';
import { formatDistanceToNow } from 'date-fns';
import {
  ChatBubbleLeftRightIcon,
  MagnifyingGlassIcon,
  ViewColumnsIcon,
  InboxIcon,
  UserIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import { cn } from '../../lib/utils';

type TabType = 'inbox' | 'pipeline';
type FilterType = 'all' | 'selling' | 'buying';

// ─── Shared Types ─────────────────────────────────────────────
interface PipelineStage {
  id: string;
  name: string;
  color: string;
  order: number;
  _count?: { conversations: number };
}

interface ConversationLabel {
  label: { id: string; name: string; color: string };
}

interface PipelineConversation {
  id: string;
  buyerId: string;
  sellerId: string;
  status: string;
  lastMessageAt: string;
  unreadBuyerCount: number;
  unreadSellerCount: number;
  pipelineStageId: string | null;
  pipelineStage: { id: string; name: string; color: string } | null;
  buyer: { id: string; username: string; firstName?: string; lastName?: string; avatar?: string };
  seller: { id: string; username: string; firstName?: string; lastName?: string; avatar?: string };
  labels: ConversationLabel[];
  messages: { content: string; type: string; createdAt: string; senderId?: string }[];
  order?: { id: string; orderNumber: string; status: string } | null;
}

// ─── Kanban Card ──────────────────────────────────────────────
function KanbanCard({
  conversation,
  isDragging,
}: {
  conversation: PipelineConversation;
  isDragging?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: conversation.id,
    data: { conversation },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const participant = conversation.buyer;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        'bg-white border rounded-lg p-3 cursor-grab active:cursor-grabbing transition-shadow',
        isDragging ? 'opacity-50 shadow-lg ring-2 ring-primary/20' : 'hover:shadow-md'
      )}
    >
      <div className="flex items-start gap-3 mb-2">
        {participant.avatar ? (
          <img
            src={participant.avatar}
            alt={participant.username}
            className="w-9 h-9 rounded-full flex-shrink-0 object-cover"
          />
        ) : (
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
            {participant.firstName?.charAt(0) || participant.username?.charAt(0) || '?'}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="font-medium text-sm truncate">
            {participant.firstName} {participant.lastName || ''}
          </p>
          <p className="text-xs text-muted-foreground truncate">@{participant.username}</p>
        </div>
        {conversation.unreadSellerCount > 0 && (
          <span className="bg-primary text-white text-xs px-1.5 py-0.5 rounded-full">
            {conversation.unreadSellerCount}
          </span>
        )}
      </div>

      {conversation.messages?.[0] && (
        <p className="text-xs text-muted-foreground truncate mb-2">
          {conversation.messages[0].content}
        </p>
      )}

      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
        <div className="flex items-center gap-1">
          <ClockIcon className="h-3 w-3" />
          <span>
            {formatDistanceToNow(new Date(conversation.lastMessageAt), { addSuffix: true })}
          </span>
        </div>
      </div>

      {conversation.labels.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {conversation.labels.slice(0, 3).map((cl) => (
            <span
              key={cl.label.id}
              className="px-1.5 py-0.5 rounded text-[10px] text-white"
              style={{ backgroundColor: cl.label.color }}
            >
              {cl.label.name}
            </span>
          ))}
          {conversation.labels.length > 3 && (
            <span className="text-[10px] text-muted-foreground">
              +{conversation.labels.length - 3}
            </span>
          )}
        </div>
      )}

      <Link
        to={`/seller/inbox/${conversation.id}`}
        className="block text-center text-xs text-primary hover:underline font-medium"
        onClick={(e) => e.stopPropagation()}
      >
        Open Chat
      </Link>
    </div>
  );
}

// ─── Pipeline Column ──────────────────────────────────────────
function PipelineColumn({
  stage,
  conversations,
}: {
  stage: PipelineStage;
  conversations: PipelineConversation[];
}) {
  const conversationIds = conversations.map((c) => c.id);

  return (
    <div className="flex-shrink-0 w-72 bg-gray-50 rounded-lg border">
      <div className="p-3 border-b bg-white rounded-t-lg">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: stage.color }} />
          <h3 className="font-medium text-sm">{stage.name}</h3>
          <span className="text-xs text-muted-foreground ml-auto bg-gray-100 px-2 py-0.5 rounded-full">
            {conversations.length}
          </span>
        </div>
      </div>

      <div className="p-2 h-[calc(100vh-340px)] overflow-y-auto">
        <SortableContext items={conversationIds} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {conversations.map((conversation) => (
              <KanbanCard key={conversation.id} conversation={conversation} />
            ))}
          </div>
        </SortableContext>

        {conversations.length === 0 && (
          <div className="text-center py-8 text-muted-foreground text-xs">No conversations</div>
        )}
      </div>
    </div>
  );
}

// ─── Pipeline View ────────────────────────────────────────────
function PipelineView({
  conversations,
  stages,
  onStageChange,
}: {
  conversations: PipelineConversation[];
  stages: PipelineStage[];
  onStageChange: (conversationId: string, stageId: string) => void;
}) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [pipelineFilter, setPipelineFilter] = useState<string>('all');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const conversationsByStage = useMemo(() => {
    let filtered = conversations;
    if (pipelineFilter === 'unread') {
      filtered = conversations.filter((c) => c.unreadSellerCount > 0);
    }

    const grouped: Record<string, PipelineConversation[]> = {};
    grouped['UNASSIGNED'] = [];

    for (const stage of stages) {
      grouped[stage.id] = [];
    }

    for (const conv of filtered) {
      const key = conv.pipelineStageId || 'UNASSIGNED';
      if (grouped[key]) {
        grouped[key].push(conv);
      } else {
        grouped['UNASSIGNED'].push(conv);
      }
    }

    return grouped;
  }, [conversations, stages, pipelineFilter]);

  const activeConversation = activeId ? conversations.find((c) => c.id === activeId) : null;

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;

    const activeConv = conversations.find((c) => c.id === active.id);
    if (!activeConv) return;

    const overConv = conversations.find((c) => c.id === over.id);
    let newStageId: string | null = null;

    if (overConv) {
      newStageId = overConv.pipelineStageId;
    } else {
      const stageFromId = stages.find((s) => s.id === over.id);
      newStageId = stageFromId?.id || null;
    }

    if (newStageId && newStageId !== activeConv.pipelineStageId) {
      onStageChange(active.id as string, newStageId);
    }
  };

  const allStages: PipelineStage[] = [
    { id: 'UNASSIGNED', name: 'Unassigned', color: '#9CA3AF', order: -1 },
    ...stages,
  ];

  return (
    <div>
      {/* Stats Bar */}
      <div className="px-2 py-3 flex items-center gap-6 mb-4">
        <div className="flex items-center gap-2 text-sm">
          <UserIcon className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{conversations.length}</span>
          <span className="text-muted-foreground">Total</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <ChatBubbleLeftRightIcon className="h-4 w-4 text-primary" />
          <span className="font-medium">
            {conversations.filter((c) => c.unreadSellerCount > 0).length}
          </span>
          <span className="text-muted-foreground">Unread</span>
        </div>
        <div className="ml-auto">
          <select
            value={pipelineFilter}
            onChange={(e) => setPipelineFilter(e.target.value)}
            className="px-3 py-1.5 border rounded-lg text-sm"
          >
            <option value="all">All Conversations</option>
            <option value="unread">Unread Only</option>
          </select>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="overflow-x-auto pb-4">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4" style={{ minWidth: 'max-content' }}>
            {allStages.map((stage) => (
              <PipelineColumn
                key={stage.id}
                stage={stage}
                conversations={conversationsByStage[stage.id] || []}
              />
            ))}
          </div>

          <DragOverlay>
            {activeConversation ? <KanbanCard conversation={activeConversation} isDragging /> : null}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  );
}

// ─── Inbox View ───────────────────────────────────────────────
function InboxView() {
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
    <div className="space-y-4">
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

              return (
                <Link
                  key={conversation.id}
                  to={`/seller/inbox/${conversation.id}`}
                  className={cn(
                    'flex items-start gap-4 p-4 hover:bg-muted/50 transition-colors',
                    hasUnread && 'bg-primary/5'
                  )}
                >
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

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2">
                        <span className={cn('font-semibold', hasUnread && 'text-foreground')}>
                          {otherUser?.firstName
                            ? `${otherUser.firstName} ${(otherUser as any).lastName || ''}`.trim()
                            : otherUser?.username || 'User'}
                        </span>
                        <span
                          className={cn(
                            'text-xs px-2 py-0.5 rounded-full',
                            isBuyer
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-green-100 text-green-700'
                          )}
                        >
                          {isBuyer ? 'Purchase' : 'Customer'}
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

// ─── Main Page ────────────────────────────────────────────────
export default function SellerInboxPage() {
  const [activeTab, setActiveTab] = useState<TabType>('inbox');
  const queryClient = useQueryClient();

  // Pipeline stages for the logged-in seller
  const { data: stages = [] } = useQuery<PipelineStage[]>({
    queryKey: ['crm-pipeline-stages'],
    queryFn: async () => {
      const res = await api.get<any>('/conversations/crm/pipeline-stages');
      return res.data?.stages || [];
    },
  });

  // Pipeline conversations (with stage/label data)
  const { data: pipelineConversations = [] } = useQuery<PipelineConversation[]>({
    queryKey: ['crm-conversations'],
    queryFn: async () => {
      const res = await api.get<any>('/conversations');
      return res.data?.conversations || [];
    },
    enabled: activeTab === 'pipeline',
  });

  // Mutation to update a conversation's pipeline stage
  const updateStageMutation = useMutation({
    mutationFn: async ({ conversationId, stageId }: { conversationId: string; stageId: string }) => {
      await api.patch(`/conversations/${conversationId}`, { pipelineStageId: stageId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-conversations'] });
      queryClient.invalidateQueries({ queryKey: ['crm-pipeline-stages'] });
    },
    onError: () => {
      toast.error('Failed to update pipeline stage');
      queryClient.invalidateQueries({ queryKey: ['crm-conversations'] });
    },
  });

  const handleStageChange = (conversationId: string, stageId: string) => {
    // Optimistic update
    queryClient.setQueryData<PipelineConversation[]>(['crm-conversations'], (old) =>
      old?.map((c) =>
        c.id === conversationId
          ? {
              ...c,
              pipelineStageId: stageId,
              pipelineStage: stages.find((s) => s.id === stageId) || c.pipelineStage,
            }
          : c
      )
    );

    updateStageMutation.mutate({ conversationId, stageId });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Inbox & CRM</h1>
          <p className="text-muted-foreground text-sm">
            Manage conversations and your sales pipeline
          </p>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex items-center gap-1 bg-muted rounded-lg p-1 w-fit">
        <button
          onClick={() => setActiveTab('inbox')}
          className={cn(
            'flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-md transition-all',
            activeTab === 'inbox'
              ? 'bg-background shadow-sm text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <InboxIcon className="h-4 w-4" />
          Inbox
        </button>
        <button
          onClick={() => setActiveTab('pipeline')}
          className={cn(
            'flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-md transition-all',
            activeTab === 'pipeline'
              ? 'bg-background shadow-sm text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <ViewColumnsIcon className="h-4 w-4" />
          Pipeline
          {stages.length > 0 && (
            <span className="text-xs bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-full">
              {stages.length}
            </span>
          )}
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'inbox' ? (
        <InboxView />
      ) : (
        <PipelineView
          conversations={pipelineConversations}
          stages={stages}
          onStageChange={handleStageChange}
        />
      )}
    </div>
  );
}
