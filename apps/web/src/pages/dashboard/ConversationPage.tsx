import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useChatStore } from '../../stores/chat.store';
import { useAuthStore } from '../../stores/auth.store';
import { api } from '../../lib/api';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '../../lib/utils';
import {
  ArrowLeftIcon,
  PaperAirplaneIcon,
  TagIcon,
  CheckIcon,
  XMarkIcon,
  CurrencyDollarIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';

interface QuickOffer {
  description: string;
  price: number;
  deliveryDays: number;
  revisions?: number;
  buyerFee?: number;
  totalAmount?: number;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED';
  orderId?: string;
}

interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  type: string;
  quickOffer?: QuickOffer;
  attachments?: any[];
  createdAt: string;
  sender: {
    id: string;
    username: string;
    firstName?: string;
    avatar?: string;
  };
}

export default function ConversationPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuthStore();
  const { activeConversation, messages, fetchConversation, sendMessage, isLoading } = useChatStore();
  const [newMessage, setNewMessage] = useState('');
  const [showOfferForm, setShowOfferForm] = useState(false);
  const [offerData, setOfferData] = useState({ description: '', price: '', deliveryDays: '', revisions: '0' });
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (id) {
      fetchConversation(id);
    }
  }, [id, fetchConversation]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !id) return;
    sendMessage(id, newMessage.trim());
    setNewMessage('');
  }, [newMessage, id, sendMessage]);

  const handleSendOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    const price = parseFloat(offerData.price);
    const deliveryDays = parseInt(offerData.deliveryDays);
    const revisions = parseInt(offerData.revisions) || 0;

    if (!offerData.description || isNaN(price) || price < 50 || isNaN(deliveryDays) || deliveryDays < 1) {
      toast.error('Please fill in all offer fields correctly (min R50)');
      return;
    }

    setIsSending(true);
    try {
      await api.post(`/conversations/${id}/offer`, {
        description: offerData.description,
        price,
        deliveryDays,
        revisions,
      });
      setOfferData({ description: '', price: '', deliveryDays: '', revisions: '0' });
      setShowOfferForm(false);
      fetchConversation(id);
      toast.success('Custom offer sent!');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to send offer');
    } finally {
      setIsSending(false);
    }
  };

  const handleAcceptOffer = async (messageId: string) => {
    if (!id) return;
    setIsSending(true);
    try {
      const res = await api.post<{ success: boolean; data: { order: any; paymentUrl: string } }>(
        `/conversations/${id}/offer/${messageId}/accept`,
        { paymentGateway: 'PAYFAST' }
      );
      toast.success('Offer accepted! Order created.');
      fetchConversation(id);
      if (res.data?.paymentUrl) {
        toast.info(`Proceed to payment: ${res.data.paymentUrl}`);
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to accept offer');
    } finally {
      setIsSending(false);
    }
  };

  const handleDeclineOffer = async (messageId: string) => {
    if (!id) return;
    setIsSending(true);
    try {
      await api.post(`/conversations/${id}/offer/${messageId}/decline`);
      toast.info('Offer declined');
      fetchConversation(id);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to decline offer');
    } finally {
      setIsSending(false);
    }
  };

  if (isLoading && !activeConversation) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!activeConversation) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <p className="text-muted-foreground">Conversation not found.</p>
        <Link to="/messages" className="text-primary hover:underline mt-2 inline-block">← Back to Inbox</Link>
      </div>
    );
  }

  const isBuyer = activeConversation.buyerId === user?.id;
  const isSeller = activeConversation.sellerId === user?.id;
  const otherUser = isBuyer ? activeConversation.seller : activeConversation.buyer;

  return (
    <div className="max-w-4xl mx-auto flex flex-col" style={{ height: 'calc(100vh - 140px)' }}>
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b bg-card rounded-t-xl">
        <Link to="/messages" className="p-2 hover:bg-muted rounded-lg transition-colors">
          <ArrowLeftIcon className="h-5 w-5" />
        </Link>
        {otherUser?.avatar ? (
          <img src={otherUser.avatar} alt="" className="h-10 w-10 rounded-full object-cover" />
        ) : (
          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center text-white font-bold text-sm">
            {otherUser?.firstName?.charAt(0) || otherUser?.username?.charAt(0) || '?'}
          </div>
        )}
        <div className="flex-1">
          <h2 className="font-semibold">{otherUser?.firstName || otherUser?.username || 'User'}</h2>
          <span className={cn(
            'text-xs px-2 py-0.5 rounded-full',
            isBuyer ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
          )}>
            {isBuyer ? 'Buying' : 'Selling'}
          </span>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-muted/20">
        {(messages as Message[]).map((message) => {
          const isOwn = message.senderId === user?.id;
          const isOffer = message.type === 'QUICK_OFFER' && message.quickOffer;
          const isSystem = message.type === 'SYSTEM' || message.type === 'ORDER_UPDATE';

          if (isSystem) {
            return (
              <div key={message.id} className="flex justify-center">
                <div className="bg-muted text-muted-foreground text-xs px-4 py-2 rounded-full max-w-md text-center">
                  {message.content}
                </div>
              </div>
            );
          }

          if (isOffer && message.quickOffer) {
            return (
              <OfferMessageCard
                key={message.id}
                message={message}
                isOwn={isOwn}
                isBuyer={isBuyer}
                onAccept={() => handleAcceptOffer(message.id)}
                onDecline={() => handleDeclineOffer(message.id)}
                isSending={isSending}
              />
            );
          }

          return (
            <div key={message.id} className={cn('flex gap-2', isOwn ? 'justify-end' : 'justify-start')}>
              {!isOwn && (
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                  {message.sender?.firstName?.charAt(0) || message.sender?.username?.charAt(0) || '?'}
                </div>
              )}
              <div className={cn(
                'max-w-[70%] rounded-2xl px-4 py-2.5',
                isOwn
                  ? 'bg-primary text-primary-foreground rounded-br-md'
                  : 'bg-card border rounded-bl-md'
              )}>
                <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                <p className={cn(
                  'text-[10px] mt-1',
                  isOwn ? 'text-primary-foreground/60' : 'text-muted-foreground'
                )}>
                  {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Custom Offer Form (seller only) */}
      {showOfferForm && isSeller && (
        <div className="border-t bg-card p-4">
          <form onSubmit={handleSendOffer} className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <TagIcon className="h-4 w-4 text-primary" />
                Send Custom Offer
              </h3>
              <button type="button" onClick={() => setShowOfferForm(false)} className="p-1 hover:bg-muted rounded">
                <XMarkIcon className="h-4 w-4" />
              </button>
            </div>
            <textarea
              value={offerData.description}
              onChange={(e) => setOfferData(p => ({ ...p, description: e.target.value }))}
              placeholder="Describe what you'll deliver..."
              className="w-full h-20 px-3 py-2 border rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              required
              minLength={10}
            />
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Price (ZAR)</label>
                <input
                  type="number"
                  min="50"
                  step="0.01"
                  value={offerData.price}
                  onChange={(e) => setOfferData(p => ({ ...p, price: e.target.value }))}
                  placeholder="R50+"
                  className="w-full h-9 px-3 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  required
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Delivery (days)</label>
                <input
                  type="number"
                  min="1"
                  max="90"
                  value={offerData.deliveryDays}
                  onChange={(e) => setOfferData(p => ({ ...p, deliveryDays: e.target.value }))}
                  placeholder="1-90"
                  className="w-full h-9 px-3 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  required
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Revisions</label>
                <input
                  type="number"
                  min="0"
                  max="99"
                  value={offerData.revisions}
                  onChange={(e) => setOfferData(p => ({ ...p, revisions: e.target.value }))}
                  placeholder="0"
                  className="w-full h-9 px-3 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
            </div>
            {offerData.price && parseFloat(offerData.price) >= 50 && (
              <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-2">
                Buyer pays: <span className="font-medium text-foreground">R{(parseFloat(offerData.price) * 1.03).toFixed(2)}</span>
                <span className="mx-1">·</span>
                You earn: <span className="font-medium text-green-600">R{(parseFloat(offerData.price) * 0.92).toFixed(2)}</span>
                <span className="mx-1">·</span>
                <span className="text-muted-foreground">Fees applied at checkout</span>
              </div>
            )}
            <button
              type="submit"
              disabled={isSending}
              className="w-full h-10 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {isSending ? 'Sending...' : 'Send Offer'}
            </button>
          </form>
        </div>
      )}

      {/* Message input */}
      <div className="border-t bg-card p-4 rounded-b-xl">
        <form onSubmit={handleSendMessage} className="flex items-center gap-2">
          {isSeller && !showOfferForm && (
            <button
              type="button"
              onClick={() => setShowOfferForm(true)}
              className="p-2.5 hover:bg-muted rounded-lg transition-colors text-primary shrink-0"
              title="Send custom offer"
            >
              <CurrencyDollarIcon className="h-5 w-5" />
            </button>
          )}
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 h-11 px-4 rounded-xl border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          />
          <button
            type="submit"
            disabled={!newMessage.trim()}
            className="p-2.5 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50 shrink-0"
          >
            <PaperAirplaneIcon className="h-5 w-5" />
          </button>
        </form>
      </div>
    </div>
  );
}

function OfferMessageCard({
  message,
  isOwn,
  isBuyer,
  onAccept,
  onDecline,
  isSending,
}: {
  message: Message;
  isOwn: boolean;
  isBuyer: boolean;
  onAccept: () => void;
  onDecline: () => void;
  isSending: boolean;
}) {
  const offer = message.quickOffer!;
  const isPending = offer.status === 'PENDING';
  const isAccepted = offer.status === 'ACCEPTED';
  const isDeclined = offer.status === 'DECLINED';

  return (
    <div className={cn('flex gap-2', isOwn ? 'justify-end' : 'justify-start')}>
      {!isOwn && (
        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center text-white text-xs font-bold shrink-0 mt-1">
          {message.sender?.firstName?.charAt(0) || message.sender?.username?.charAt(0) || '?'}
        </div>
      )}
      <div className={cn(
        'max-w-[80%] rounded-2xl border-2 overflow-hidden',
        isPending ? 'border-primary/30 bg-primary/5' : '',
        isAccepted ? 'border-green-300 bg-green-50' : '',
        isDeclined ? 'border-gray-300 bg-gray-50 opacity-75' : '',
      )}>
        <div className={cn(
          'px-4 py-2 text-xs font-semibold flex items-center gap-2',
          isPending ? 'bg-primary/10 text-primary' : '',
          isAccepted ? 'bg-green-100 text-green-700' : '',
          isDeclined ? 'bg-gray-100 text-gray-500' : '',
        )}>
          <TagIcon className="h-3.5 w-3.5" />
          Custom Offer
          {isAccepted && <span className="ml-auto flex items-center gap-1"><CheckIcon className="h-3.5 w-3.5" /> Accepted</span>}
          {isDeclined && <span className="ml-auto flex items-center gap-1"><XMarkIcon className="h-3.5 w-3.5" /> Declined</span>}
          {isPending && <span className="ml-auto">Pending</span>}
        </div>

        <div className="p-4 space-y-3">
          <p className="text-sm">{offer.description}</p>

          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-background rounded-lg p-2 border">
              <p className="text-lg font-bold text-primary">R{offer.price.toFixed(2)}</p>
              <p className="text-[10px] text-muted-foreground">Price</p>
            </div>
            <div className="bg-background rounded-lg p-2 border">
              <p className="text-lg font-bold">{offer.deliveryDays}</p>
              <p className="text-[10px] text-muted-foreground">Day{offer.deliveryDays !== 1 ? 's' : ''} Delivery</p>
            </div>
            <div className="bg-background rounded-lg p-2 border">
              <p className="text-lg font-bold">{offer.revisions || 0}</p>
              <p className="text-[10px] text-muted-foreground">Revision{(offer.revisions || 0) !== 1 ? 's' : ''}</p>
            </div>
          </div>

          {offer.totalAmount && (
            <p className="text-xs text-muted-foreground text-center">
              Total with fees: <span className="font-semibold text-foreground">R{offer.totalAmount.toFixed(2)}</span>
              <span className="ml-1">(incl. 3% buyer fee)</span>
            </p>
          )}

          {isBuyer && isPending && (
            <div className="flex gap-2 pt-1">
              <button
                onClick={onAccept}
                disabled={isSending}
                className="flex-1 h-9 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                <CheckIcon className="h-4 w-4" />
                Accept & Pay
              </button>
              <button
                onClick={onDecline}
                disabled={isSending}
                className="flex-1 h-9 bg-background border text-foreground rounded-lg text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                <XMarkIcon className="h-4 w-4" />
                Decline
              </button>
            </div>
          )}

          {isAccepted && offer.orderId && (
            <Link
              to={`/orders/${offer.orderId}`}
              className="block text-center text-sm text-primary hover:underline font-medium"
            >
              View Order →
            </Link>
          )}
        </div>

        <div className="px-4 pb-2">
          <p className="text-[10px] text-muted-foreground">
            {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
          </p>
        </div>
      </div>
    </div>
  );
}
