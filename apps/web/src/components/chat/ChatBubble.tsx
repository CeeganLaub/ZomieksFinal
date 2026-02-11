import { cn } from '../../lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { DocumentIcon } from '@heroicons/react/24/outline';

interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  type: string;
  quickOffer?: {
    description: string;
    price: number;
    deliveryDays: number;
    revisions?: number;
    status: string;
    offerType?: string;
  };
  attachments?: string[];
  createdAt: string;
  sender: {
    id: string;
    username: string;
    firstName?: string;
    avatar?: string;
  };
}

interface ChatBubbleProps {
  message: ChatMessage;
  isOwn: boolean;
  compact?: boolean;
  showAvatar?: boolean;
}

function Avatar({ sender, size = 'sm' }: { sender: ChatMessage['sender']; size?: 'sm' | 'md' }) {
  const dim = size === 'sm' ? 'h-6 w-6 text-[10px]' : 'h-8 w-8 text-xs';
  if (sender?.avatar) {
    return <img src={sender.avatar} alt="" className={cn(dim, 'rounded-full object-cover shrink-0')} />;
  }
  return (
    <div className={cn(dim, 'rounded-full bg-gradient-to-br from-primary/80 to-purple-500 flex items-center justify-center text-white font-bold shrink-0')}>
      {sender?.firstName?.charAt(0) || sender?.username?.charAt(0) || '?'}
    </div>
  );
}

export default function ChatBubble({ message, isOwn, compact = false, showAvatar = true }: ChatBubbleProps) {
  const isSystem = message.type === 'SYSTEM' || message.type === 'ORDER_UPDATE';

  if (isSystem) {
    return (
      <div className="flex justify-center my-1">
        <div className="bg-muted text-muted-foreground text-[10px] px-3 py-1 rounded-full max-w-[80%] text-center">
          {message.content}
        </div>
      </div>
    );
  }

  if (message.type === 'QUICK_OFFER' && message.quickOffer) {
    const offer = message.quickOffer;
    return (
      <div className={cn('flex gap-1.5', isOwn ? 'justify-end' : 'justify-start')}>
        {!isOwn && showAvatar && <Avatar sender={message.sender} size={compact ? 'sm' : 'md'} />}
        <div className={cn(
          'rounded-xl border overflow-hidden',
          compact ? 'max-w-[240px]' : 'max-w-[280px]',
          isOwn ? 'bg-primary/5 border-primary/20' : 'bg-card'
        )}>
          <div className="px-3 py-2 border-b bg-muted/50">
            <p className="text-[10px] font-semibold text-primary">Custom Offer</p>
          </div>
          <div className="px-3 py-2 space-y-1">
            <p className="text-xs">{offer.description}</p>
            <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
              <span className="font-semibold text-foreground text-xs">R{offer.price}</span>
              <span>{offer.deliveryDays}d delivery</span>
              {offer.revisions ? <span>{offer.revisions} rev</span> : null}
            </div>
            <div className={cn(
              'text-[10px] font-medium px-1.5 py-0.5 rounded w-fit',
              offer.status === 'ACCEPTED' ? 'bg-green-500/10 text-green-600' :
              offer.status === 'DECLINED' ? 'bg-red-500/10 text-red-500' :
              'bg-yellow-500/10 text-yellow-600'
            )}>
              {offer.status}
            </div>
          </div>
          <p className={cn('text-[9px] px-3 pb-1.5', isOwn ? 'text-muted-foreground/60' : 'text-muted-foreground')}>
            {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('flex gap-1.5', isOwn ? 'justify-end' : 'justify-start')}>
      {!isOwn && showAvatar && <Avatar sender={message.sender} size={compact ? 'sm' : 'md'} />}
      <div className={cn(
        compact ? 'max-w-[85%]' : 'max-w-[70%]',
        'rounded-2xl px-3 py-2',
        isOwn
          ? 'bg-primary text-primary-foreground rounded-br-sm'
          : 'bg-card border rounded-bl-sm'
      )}>
        <p className={cn(compact ? 'text-xs' : 'text-sm', 'whitespace-pre-wrap break-words leading-relaxed')}>
          {message.content}
        </p>
        {message.attachments && message.attachments.length > 0 && (
          <div className="mt-1.5 space-y-1">
            {(message.attachments as string[]).map((url, i) => {
              const isImg = /\.(jpg|jpeg|png|gif|webp)$/i.test(url) || url.includes('/images/');
              return isImg ? (
                <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="block">
                  <img src={url} alt="" className={cn('rounded-lg', compact ? 'max-h-28' : 'max-h-48', 'max-w-full')} />
                </a>
              ) : (
                <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                  className={cn('flex items-center gap-1.5 text-[10px] px-2 py-1 rounded-lg',
                    isOwn ? 'bg-primary-foreground/10 text-primary-foreground hover:bg-primary-foreground/20' : 'bg-muted hover:bg-muted/80'
                  )}>
                  <DocumentIcon className="h-3 w-3 shrink-0" />
                  <span className="truncate">{url.split('/').pop()}</span>
                </a>
              );
            })}
          </div>
        )}
        <p className={cn(
          'text-[9px] mt-0.5',
          isOwn ? 'text-primary-foreground/50' : 'text-muted-foreground/70'
        )}>
          {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
        </p>
      </div>
    </div>
  );
}

export type { ChatMessage };
