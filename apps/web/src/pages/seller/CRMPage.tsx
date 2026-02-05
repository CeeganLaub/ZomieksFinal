import { useState, useMemo } from 'react';
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
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import {
  ChatBubbleLeftRightIcon,
  UserIcon,
  ClockIcon,
  StarIcon,
} from '@heroicons/react/24/outline';
import { formatDistanceToNow } from 'date-fns';

interface Conversation {
  id: string;
  pipelineStage: string;
  leadScore: number;
  lastMessageAt: string;
  participant: {
    id: string;
    username: string;
    firstName: string;
    lastName: string;
    avatar: string;
  };
  labels: { id: string; name: string; color: string }[];
  unreadCount: number;
}



const PIPELINE_STAGES = [
  { id: 'NEW', name: 'New Leads', color: 'bg-blue-500' },
  { id: 'CONTACTED', name: 'Contacted', color: 'bg-yellow-500' },
  { id: 'QUALIFIED', name: 'Qualified', color: 'bg-purple-500' },
  { id: 'PROPOSAL', name: 'Proposal', color: 'bg-orange-500' },
  { id: 'NEGOTIATION', name: 'Negotiation', color: 'bg-pink-500' },
  { id: 'WON', name: 'Won', color: 'bg-green-500' },
  { id: 'LOST', name: 'Lost', color: 'bg-gray-500' },
];

function ConversationCard({ conversation, isDragging }: { conversation: Conversation; isDragging?: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: conversation.id,
    data: { conversation },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`bg-white border rounded-lg p-3 cursor-grab active:cursor-grabbing ${
        isDragging ? 'opacity-50 shadow-lg' : 'hover:shadow-md'
      }`}
    >
      <div className="flex items-start gap-3 mb-2">
        <img
          src={conversation.participant.avatar || '/default-avatar.png'}
          alt={conversation.participant.username}
          className="w-10 h-10 rounded-full flex-shrink-0"
        />
        <div className="min-w-0 flex-1">
          <p className="font-medium truncate">
            {conversation.participant.firstName} {conversation.participant.lastName}
          </p>
          <p className="text-sm text-muted-foreground truncate">
            @{conversation.participant.username}
          </p>
        </div>
        {conversation.unreadCount > 0 && (
          <span className="bg-primary text-white text-xs px-2 py-0.5 rounded-full">
            {conversation.unreadCount}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
        <div className="flex items-center gap-1">
          <StarIcon className="h-3 w-3" />
          <span>{conversation.leadScore}</span>
        </div>
        <div className="flex items-center gap-1">
          <ClockIcon className="h-3 w-3" />
          <span>{formatDistanceToNow(new Date(conversation.lastMessageAt), { addSuffix: true })}</span>
        </div>
      </div>

      {conversation.labels.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {conversation.labels.slice(0, 3).map((label) => (
            <span
              key={label.id}
              className="px-2 py-0.5 rounded text-xs text-white"
              style={{ backgroundColor: label.color }}
            >
              {label.name}
            </span>
          ))}
          {conversation.labels.length > 3 && (
            <span className="text-xs text-muted-foreground">+{conversation.labels.length - 3}</span>
          )}
        </div>
      )}

      <Link
        to={`/messages/${conversation.participant.id}`}
        className="mt-2 block text-center text-sm text-primary hover:underline"
        onClick={(e) => e.stopPropagation()}
      >
        Open Chat
      </Link>
    </div>
  );
}

function PipelineColumn({
  stage,
  conversations,
}: {
  stage: { id: string; name: string; color: string };
  conversations: Conversation[];
}) {
  const conversationIds = conversations.map((c) => c.id);

  return (
    <div className="flex-shrink-0 w-72 bg-gray-50 rounded-lg">
      <div className="p-3 border-b bg-white rounded-t-lg">
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${stage.color}`} />
          <h3 className="font-medium">{stage.name}</h3>
          <span className="text-sm text-muted-foreground ml-auto">
            {conversations.length}
          </span>
        </div>
      </div>

      <div className="p-2 h-[calc(100vh-300px)] overflow-y-auto">
        <SortableContext items={conversationIds} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {conversations.map((conversation) => (
              <ConversationCard key={conversation.id} conversation={conversation} />
            ))}
          </div>
        </SortableContext>

        {conversations.length === 0 && (
          <div className="text-center py-8 text-muted-foreground text-sm">
            No conversations
          </div>
        )}
      </div>
    </div>
  );
}

export default function CRMPage() {
  const queryClient = useQueryClient();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const { data: conversations, isLoading } = useQuery<Conversation[]>({
    queryKey: ['crm-conversations'],
    queryFn: async () => {
      const res = await api.get<any>('/conversations');
      return res.data.data.conversations;
    },
  });

  const updateStageMutation = useMutation({
    mutationFn: async ({ conversationId, stage }: { conversationId: string; stage: string }) => {
      await api.patch(`/conversations/${conversationId}/stage`, { stage });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-conversations'] });
    },
    onError: () => {
      toast.error('Failed to update stage');
      queryClient.invalidateQueries({ queryKey: ['crm-conversations'] });
    },
  });

  const conversationsByStage = useMemo(() => {
    if (!conversations) return {};

    let filtered = conversations;
    if (filter === 'unread') {
      filtered = conversations.filter((c) => c.unreadCount > 0);
    } else if (filter === 'high-score') {
      filtered = conversations.filter((c) => c.leadScore >= 50);
    }

    return PIPELINE_STAGES.reduce((acc, stage) => {
      acc[stage.id] = filtered.filter((c) => c.pipelineStage === stage.id);
      return acc;
    }, {} as Record<string, Conversation[]>);
  }, [conversations, filter]);

  const activeConversation = activeId
    ? conversations?.find((c) => c.id === activeId)
    : null;

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const activeConv = conversations?.find((c) => c.id === active.id);
    if (!activeConv) return;

    // Find what stage we're dropping into
    const overConv = conversations?.find((c) => c.id === over.id);
    let newStage: string;

    if (overConv) {
      newStage = overConv.pipelineStage;
    } else {
      // Dropped on empty column - need to determine from over.id
      const stageFromId = PIPELINE_STAGES.find((s) => s.id === over.id);
      newStage = stageFromId?.id || activeConv.pipelineStage;
    }

    if (newStage !== activeConv.pipelineStage) {
      // Optimistic update
      queryClient.setQueryData<Conversation[]>(['crm-conversations'], (old) =>
        old?.map((c) =>
          c.id === active.id ? { ...c, pipelineStage: newStage } : c
        )
      );

      updateStageMutation.mutate({
        conversationId: active.id as string,
        stage: newStage,
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      <div className="px-6 py-4 border-b bg-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">CRM Pipeline</h1>
            <p className="text-muted-foreground">
              Manage your leads and conversations
            </p>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-3 py-2 border rounded-lg text-sm"
            >
              <option value="all">All Conversations</option>
              <option value="unread">Unread Only</option>
              <option value="high-score">High Score (50+)</option>
            </select>

            <Link to="/messages">
              <Button variant="outline">
                <ChatBubbleLeftRightIcon className="h-5 w-5 mr-2" />
                Messages
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="px-6 py-3 bg-gray-50 border-b flex gap-6">
        <div className="flex items-center gap-2 text-sm">
          <UserIcon className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{conversations?.length || 0}</span>
          <span className="text-muted-foreground">Total Leads</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <ChatBubbleLeftRightIcon className="h-4 w-4 text-primary" />
          <span className="font-medium">
            {conversations?.filter((c) => c.unreadCount > 0).length || 0}
          </span>
          <span className="text-muted-foreground">Unread</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <StarIcon className="h-4 w-4 text-yellow-500" />
          <span className="font-medium">
            {conversations?.filter((c) => c.leadScore >= 50).length || 0}
          </span>
          <span className="text-muted-foreground">Hot Leads</span>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto p-6">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4 h-full">
            {PIPELINE_STAGES.map((stage) => (
              <PipelineColumn
                key={stage.id}
                stage={stage}
                conversations={conversationsByStage[stage.id] || []}
              />
            ))}
          </div>

          <DragOverlay>
            {activeConversation ? (
              <ConversationCard conversation={activeConversation} isDragging />
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  );
}
