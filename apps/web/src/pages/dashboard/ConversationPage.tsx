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
  PaperClipIcon,
  TagIcon,
  CheckIcon,
  XMarkIcon,
  CurrencyDollarIcon,
  ArrowPathIcon,
  CreditCardIcon,
  ExclamationTriangleIcon,
  DocumentIcon,
  PhotoIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';

interface QuickOffer {
  description: string;
  price: number;
  deliveryDays: number;
  revisions?: number;
  buyerFee?: number;
  totalAmount?: number;
  offerType?: 'ONE_TIME' | 'MONTHLY';
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
  const [offerData, setOfferData] = useState({ description: '', price: '', deliveryDays: '', revisions: '0', offerType: 'ONE_TIME' as 'ONE_TIME' | 'MONTHLY' });
  const [isSending, setIsSending] = useState(false);
  const [showGatewayPicker, setShowGatewayPicker] = useState<string | null>(null);
  const [showOffPlatformWarning, setShowOffPlatformWarning] = useState(true);
  const [pendingAttachments, setPendingAttachments] = useState<Array<{ url: string; name: string; type: string }>>([]); 
  const [isUploading, setIsUploading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (id) {
      fetchConversation(id);
    }
  }, [id, fetchConversation]);

  const prevMessageCountRef = useRef(0);

  useEffect(() => {
    // Use instant scroll for initial load / large batch updates, smooth for single new messages
    const isNewSingleMessage = messages.length === prevMessageCountRef.current + 1 && prevMessageCountRef.current > 0;
    messagesEndRef.current?.scrollIntoView({ behavior: isNewSingleMessage ? 'smooth' : 'instant' });
    prevMessageCountRef.current = messages.length;
  }, [messages]);

  const handleSendMessage = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!newMessage.trim() && pendingAttachments.length === 0) || !id) return;
    const content = newMessage.trim() || (pendingAttachments.length > 0 ? '📎 Attachment' : '');
    const attachmentUrls = pendingAttachments.length > 0 ? pendingAttachments.map(a => a.url) : undefined;
    try {
      await sendMessage(id, content, 'TEXT', attachmentUrls);
      setNewMessage('');
      setPendingAttachments([]);
    } catch {
      toast.error('Failed to send message');
    }
  }, [newMessage, id, sendMessage, pendingAttachments]);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    if (file.size > 10 * 1024 * 1024) {
      toast.error('File must be less than 10MB');
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      const isImage = file.type.startsWith('image/');
      formData.append(isImage ? 'image' : 'file', file);

      const token = localStorage.getItem('auth-storage');
      const parsed = token ? JSON.parse(token) : null;
      const authToken = parsed?.state?.token;

      const res = await fetch(`/api/v1/uploads/${isImage ? 'image' : 'file'}`, {
        method: 'POST',
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
        body: formData,
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error?.message || 'Upload failed');

      setPendingAttachments(prev => [...prev, {
        url: data.data.url,
        name: file.name,
        type: file.type,
      }]);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to upload file');
    } finally {
      setIsUploading(false);
    }
  }, []);

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
        offerType: offerData.offerType,
      });
      setOfferData({ description: '', price: '', deliveryDays: '', revisions: '0', offerType: 'ONE_TIME' });
      setShowOfferForm(false);
      fetchConversation(id);
      toast.success('Custom offer sent!');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to send offer');
    } finally {
      setIsSending(false);
    }
  };

  const handleAcceptOffer = async (messageId: string, gateway: 'PAYFAST' | 'OZOW') => {
    if (!id) return;
    setIsSending(true);
    try {
      const res = await api.post<{ success: boolean; data: { order: any; paymentUrl: string } }>(
        `/conversations/${id}/offer/${messageId}/accept`,
        { paymentGateway: gateway }
      );
      toast.success('Offer accepted! Redirecting to payment...');
      fetchConversation(id);
      setShowGatewayPicker(null);
      if (res.data?.paymentUrl) {
        // Full page redirect needed: payment URL returns 302 to external gateway (PayFast/Ozow)
        window.location.href = `${window.location.origin}${res.data.paymentUrl}`;
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

      {/* Off-Platform Warning Banner */}
      {showOffPlatformWarning && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-3 flex items-start gap-3">
          <ExclamationTriangleIcon className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-900">
              Stay safe — keep all communication on Zomieks
            </p>
            <p className="text-xs text-amber-700 mt-0.5">
              Do not share personal contact details or move conversations off-platform.
              Zomieks cannot manage disputes, process refunds, or protect transactions that occur outside our platform.
            </p>
          </div>
          <button
            onClick={() => setShowOffPlatformWarning(false)}
            className="p-1 hover:bg-amber-100 rounded text-amber-600 shrink-0"
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        </div>
      )}

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
                onAccept={(gateway) => handleAcceptOffer(message.id, gateway)}
                onDecline={() => handleDeclineOffer(message.id)}
                isSending={isSending}
                showGatewayPicker={showGatewayPicker === message.id}
                onToggleGatewayPicker={() => setShowGatewayPicker(showGatewayPicker === message.id ? null : message.id)}
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
                {/* Render attachments */}
                {message.attachments && Array.isArray(message.attachments) && message.attachments.length > 0 && (
                  <div className="mt-2 space-y-1.5">
                    {(message.attachments as string[]).map((url, i) => {
                      const isImg = /\.(jpg|jpeg|png|gif|webp)$/i.test(url) || url.includes('/images/');
                      return isImg ? (
                        <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="block">
                          <img src={url} alt="Attachment" className="max-w-full max-h-48 rounded-lg" />
                        </a>
                      ) : (
                        <a
                          key={i}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={cn(
                            'flex items-center gap-2 text-xs px-2 py-1.5 rounded-lg',
                            isOwn ? 'bg-primary-foreground/10 text-primary-foreground hover:bg-primary-foreground/20' : 'bg-muted hover:bg-muted/80'
                          )}
                        >
                          <DocumentIcon className="h-4 w-4 shrink-0" />
                          <span className="truncate">{url.split('/').pop()}</span>
                        </a>
                      );
                    })}
                  </div>
                )}
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

            {/* Offer Type Toggle */}
            <div className="flex p-1 bg-muted rounded-lg">
              <button
                type="button"
                onClick={() => setOfferData(p => ({ ...p, offerType: 'ONE_TIME' }))}
                className={cn(
                  'flex-1 py-2 px-3 rounded-md text-xs font-medium transition-colors',
                  offerData.offerType === 'ONE_TIME' ? 'bg-background shadow text-foreground' : 'text-muted-foreground'
                )}
              >
                One-time
              </button>
              <button
                type="button"
                onClick={() => setOfferData(p => ({ ...p, offerType: 'MONTHLY' }))}
                className={cn(
                  'flex-1 py-2 px-3 rounded-md text-xs font-medium transition-colors',
                  offerData.offerType === 'MONTHLY' ? 'bg-background shadow text-foreground' : 'text-muted-foreground'
                )}
              >
                Monthly Subscription
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
                <label className="text-xs text-muted-foreground block mb-1">
                  {offerData.offerType === 'MONTHLY' ? 'Price/month (ZAR)' : 'Price (ZAR)'}
                </label>
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
                Buyer pays: <span className="font-medium text-foreground">R{(parseFloat(offerData.price) * 1.03).toFixed(2)}{offerData.offerType === 'MONTHLY' ? '/mo' : ''}</span>
                <span className="mx-1">·</span>
                You earn: <span className="font-medium text-green-600">R{(parseFloat(offerData.price) * 0.92).toFixed(2)}{offerData.offerType === 'MONTHLY' ? '/mo' : ''}</span>
                <span className="mx-1">·</span>
                <span className="text-muted-foreground">{offerData.offerType === 'MONTHLY' ? 'Recurring monthly' : 'Fees applied at checkout'}</span>
              </div>
            )}
            <button
              type="submit"
              disabled={isSending}
              className="w-full h-10 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {isSending ? 'Sending...' : offerData.offerType === 'MONTHLY' ? 'Send Subscription Offer' : 'Send Offer'}
            </button>
          </form>
        </div>
      )}

      {/* Message input */}
      <div className="border-t bg-card p-4 rounded-b-xl">
        {/* Pending attachments preview */}
        {pendingAttachments.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {pendingAttachments.map((att, i) => (
              <div key={i} className="flex items-center gap-1.5 bg-muted px-2.5 py-1.5 rounded-lg text-xs">
                {att.type.startsWith('image/') ? (
                  <PhotoIcon className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                ) : (
                  <DocumentIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                )}
                <span className="truncate max-w-[120px]">{att.name}</span>
                <button
                  type="button"
                  onClick={() => setPendingAttachments(prev => prev.filter((_, j) => j !== i))}
                  className="p-0.5 hover:bg-background rounded"
                >
                  <XMarkIcon className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
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
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="p-2.5 hover:bg-muted rounded-lg transition-colors text-muted-foreground shrink-0"
            title="Attach file"
          >
            {isUploading ? (
              <ArrowPathIcon className="h-5 w-5 animate-spin" />
            ) : (
              <PaperClipIcon className="h-5 w-5" />
            )}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept="image/*,.pdf,.zip,.doc,.docx,.xls,.xlsx"
            onChange={handleFileSelect}
          />
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 h-11 px-4 rounded-xl border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          />
          <button
            type="submit"
            disabled={!newMessage.trim() && pendingAttachments.length === 0}
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
  showGatewayPicker,
  onToggleGatewayPicker,
}: {
  message: Message;
  isOwn: boolean;
  isBuyer: boolean;
  onAccept: (gateway: 'PAYFAST' | 'OZOW') => void;
  onDecline: () => void;
  isSending: boolean;
  showGatewayPicker: boolean;
  onToggleGatewayPicker: () => void;
}) {
  const offer = message.quickOffer!;
  const isPending = offer.status === 'PENDING';
  const isAccepted = offer.status === 'ACCEPTED';
  const isDeclined = offer.status === 'DECLINED';
  const isMonthly = offer.offerType === 'MONTHLY';

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
          {isMonthly && (
            <span className="ml-1 px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded text-[10px]">
              Monthly
            </span>
          )}
          {isAccepted && <span className="ml-auto flex items-center gap-1"><CheckIcon className="h-3.5 w-3.5" /> Accepted</span>}
          {isDeclined && <span className="ml-auto flex items-center gap-1"><XMarkIcon className="h-3.5 w-3.5" /> Declined</span>}
          {isPending && <span className="ml-auto">Pending</span>}
        </div>

        <div className="p-4 space-y-3">
          <p className="text-sm">{offer.description}</p>

          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-background rounded-lg p-2 border">
              <p className="text-lg font-bold text-primary">R{offer.price.toFixed(2)}</p>
              <p className="text-[10px] text-muted-foreground">{isMonthly ? 'Per Month' : 'Price'}</p>
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
              Total with fees: <span className="font-semibold text-foreground">R{offer.totalAmount.toFixed(2)}{isMonthly ? '/mo' : ''}</span>
              <span className="ml-1">(incl. 3% buyer fee)</span>
            </p>
          )}

          {isBuyer && isPending && !showGatewayPicker && (
            <div className="flex gap-2 pt-1">
              <button
                onClick={onToggleGatewayPicker}
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

          {/* Payment Gateway Picker */}
          {isBuyer && isPending && showGatewayPicker && (
            <div className="space-y-2 pt-1">
              <p className="text-xs font-medium text-center text-muted-foreground">Choose payment method:</p>
              <div className="flex gap-2">
                <button
                  onClick={() => onAccept('PAYFAST')}
                  disabled={isSending}
                  className="flex-1 h-10 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {isSending ? <ArrowPathIcon className="h-4 w-4 animate-spin" /> : <CreditCardIcon className="h-4 w-4" />}
                  PayFast
                </button>
                {!isMonthly && (
                  <button
                    onClick={() => onAccept('OZOW')}
                    disabled={isSending}
                    className="flex-1 h-10 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    {isSending ? <ArrowPathIcon className="h-4 w-4 animate-spin" /> : <CreditCardIcon className="h-4 w-4" />}
                    Ozow (EFT)
                  </button>
                )}
              </div>
              <button
                onClick={onToggleGatewayPicker}
                className="w-full text-xs text-muted-foreground hover:text-foreground"
              >
                ← Back
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
