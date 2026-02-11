import { useState, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api, ordersApi } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { format, formatDistanceToNow } from 'date-fns';
import {
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
  ChatBubbleLeftRightIcon,
  DocumentTextIcon,
  TruckIcon,
  ExclamationTriangleIcon,
  XMarkIcon,
  PaperClipIcon,
  ArrowPathIcon,
  ArrowUpTrayIcon,
  DocumentArrowDownIcon,
  PhotoIcon,
  PlayIcon,
} from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  baseAmount: string | number;
  buyerFee: string | number;
  totalAmount: string | number;
  sellerFee: string | number;
  sellerPayout: string | number;
  platformRevenue: string | number;
  deliveryDays: number;
  revisions: number;
  revisionsUsed: number;
  requirements: string | null;
  deliveryDueAt: string | null;
  createdAt: string;
  paidAt: string | null;
  startedAt: string | null;
  deliveredAt: string | null;
  completedAt: string | null;
  service: { id: string; title: string; slug: string; images: string[] };
  package: { name: string; tier: string } | null;
  buyer: { id?: string; username: string; avatar: string; firstName?: string };
  deliveries?: { id: string; message: string; attachments: any; createdAt: string; status: string }[];
  revisionRequests?: { id: string; message: string; requestedAt: string }[];
  conversation?: { id: string } | null;
  review?: any;
}

const statusConfig: Record<string, { label: string; icon: React.ElementType; color: string; dot: string }> = {
  PENDING_PAYMENT: { label: 'Pending Payment', icon: ClockIcon, color: 'text-yellow-600 bg-yellow-50', dot: 'bg-yellow-500' },
  PAID: { label: 'New Order', icon: PlayIcon, color: 'text-blue-600 bg-blue-50', dot: 'bg-blue-500' },
  IN_PROGRESS: { label: 'In Progress', icon: TruckIcon, color: 'text-purple-600 bg-purple-50', dot: 'bg-purple-500' },
  DELIVERED: { label: 'Delivered', icon: DocumentTextIcon, color: 'text-indigo-600 bg-indigo-50', dot: 'bg-indigo-500' },
  REVISION_REQUESTED: { label: 'Revision Needed', icon: ArrowPathIcon, color: 'text-amber-600 bg-amber-50', dot: 'bg-amber-500' },
  COMPLETED: { label: 'Completed', icon: CheckCircleIcon, color: 'text-green-600 bg-green-50', dot: 'bg-green-500' },
  CANCELLED: { label: 'Cancelled', icon: XCircleIcon, color: 'text-gray-600 bg-gray-50', dot: 'bg-gray-400' },
  DISPUTED: { label: 'Disputed', icon: ExclamationTriangleIcon, color: 'text-red-600 bg-red-50', dot: 'bg-red-500' },
  REFUNDED: { label: 'Refunded', icon: XCircleIcon, color: 'text-orange-600 bg-orange-50', dot: 'bg-orange-500' },
};

// ─── Order Detail Panel ───────────────────────────────────────
function OrderDetailPanel({
  orderId,
  onClose,
}: {
  orderId: string;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [deliveryMessage, setDeliveryMessage] = useState('');
  const [deliveryFiles, setDeliveryFiles] = useState<Array<{ url: string; name: string; size: number; type: string }>>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: order, isLoading } = useQuery<Order>({
    queryKey: ['order-detail', orderId],
    queryFn: async () => {
      const res = await api.get<any>(`/orders/${orderId}`);
      return res.data.order;
    },
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['seller-orders'] });
    queryClient.invalidateQueries({ queryKey: ['order-detail', orderId] });
  };

  const startMutation = useMutation({
    mutationFn: () => api.patch(`/orders/${orderId}/start`),
    onSuccess: () => { toast.success('Order started!'); invalidate(); },
    onError: () => toast.error('Failed to start order'),
  });

  const deliverMutation = useMutation({
    mutationFn: (data: { message: string; attachments?: any[] }) =>
      ordersApi.deliver(orderId, data),
    onSuccess: () => {
      toast.success('Delivery submitted!');
      setDeliveryMessage('');
      setDeliveryFiles([]);
      invalidate();
    },
    onError: () => toast.error('Failed to submit delivery'),
  });

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
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
      setDeliveryFiles(prev => [...prev, {
        url: data.data.url,
        name: file.name,
        size: file.size,
        type: file.type,
      }]);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to upload file');
    } finally {
      setIsUploading(false);
    }
  }, []);

  const handleSubmitDelivery = () => {
    if (deliveryMessage.length < 10) {
      toast.error('Please describe your delivery (min 10 characters)');
      return;
    }
    deliverMutation.mutate({
      message: deliveryMessage,
      attachments: deliveryFiles.length > 0 ? deliveryFiles : undefined,
    });
  };

  if (isLoading || !order) {
    return (
      <div className="bg-card border-l h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const status = statusConfig[order.status] || statusConfig.PAID;
  const daysUntilDue = order.deliveryDueAt
    ? Math.ceil((new Date(order.deliveryDueAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;
  const canDeliver = ['IN_PROGRESS', 'REVISION_REQUESTED'].includes(order.status);

  return (
    <div className="bg-card border-l h-full overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 bg-card border-b px-5 py-4 flex items-center justify-between z-10">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-lg">#{order.orderNumber}</h2>
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${status.color}`}>
              <status.icon className="h-3.5 w-3.5" />
              {status.label}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {formatDistanceToNow(new Date(order.createdAt), { addSuffix: true })}
          </p>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg transition-colors">
          <XMarkIcon className="h-5 w-5" />
        </button>
      </div>

      <div className="p-5 space-y-5">
        {/* Service + Buyer */}
        <div className="flex gap-3">
          <img
            src={order.service.images?.[0] || '/placeholder.png'}
            alt={order.service.title}
            className="w-16 h-16 rounded-lg object-cover bg-muted"
          />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">{order.service.title}</p>
            {order.package && (
              <p className="text-xs text-muted-foreground">{order.package.name} ({order.package.tier})</p>
            )}
            <div className="flex items-center gap-2 mt-1.5">
              <img
                src={order.buyer.avatar || `https://ui-avatars.com/api/?name=${order.buyer.username}&background=10b981&color=fff&size=24`}
                alt="" className="w-5 h-5 rounded-full bg-muted"
              />
              <span className="text-xs text-muted-foreground">@{order.buyer.username}</span>
            </div>
          </div>
        </div>

        {/* Earnings + Delivery info */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-green-50 border border-green-100 rounded-lg p-3 text-center">
            <p className="text-lg font-bold text-green-700">R{Number(order.sellerPayout).toFixed(0)}</p>
            <p className="text-[10px] text-green-600">You Earn</p>
          </div>
          <div className="bg-muted/50 border rounded-lg p-3 text-center">
            <p className="text-lg font-bold">{order.deliveryDays}d</p>
            <p className="text-[10px] text-muted-foreground">Delivery</p>
          </div>
          <div className="bg-muted/50 border rounded-lg p-3 text-center">
            <p className="text-lg font-bold">{order.revisionsUsed}/{order.revisions}</p>
            <p className="text-[10px] text-muted-foreground">Revisions</p>
          </div>
        </div>

        {/* Delivery countdown */}
        {daysUntilDue !== null && ['IN_PROGRESS', 'REVISION_REQUESTED'].includes(order.status) && (
          <div className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-lg text-sm',
            daysUntilDue <= 0 ? 'bg-red-50 text-red-700 border border-red-200' :
            daysUntilDue <= 1 ? 'bg-amber-50 text-amber-700 border border-amber-200' :
            'bg-blue-50 text-blue-700 border border-blue-200'
          )}>
            <ClockIcon className="h-4 w-4" />
            <span className="font-medium">
              {daysUntilDue <= 0 ? 'Overdue!' : daysUntilDue === 1 ? 'Due tomorrow' : `${daysUntilDue} days remaining`}
            </span>
            {order.deliveryDueAt && (
              <span className="ml-auto text-xs opacity-75">
                Due {format(new Date(order.deliveryDueAt), 'MMM d')}
              </span>
            )}
          </div>
        )}

        {/* Requirements */}
        {order.requirements && (
          <div className="border rounded-lg p-3">
            <p className="text-xs font-medium text-muted-foreground mb-1">Buyer Requirements</p>
            <p className="text-sm whitespace-pre-wrap">{order.requirements}</p>
          </div>
        )}

        {/* ─── Action: Start Order (PAID) ─── */}
        {order.status === 'PAID' && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-800 text-sm mb-1">New order received!</h3>
            <p className="text-xs text-blue-700 mb-3">Review the requirements and start working when ready.</p>
            <Button
              className="w-full"
              onClick={() => startMutation.mutate()}
              disabled={startMutation.isPending}
            >
              <PlayIcon className="h-4 w-4 mr-2" />
              {startMutation.isPending ? 'Starting...' : 'Start Order'}
            </Button>
          </div>
        )}

        {/* ─── Action: Deliver Order (IN_PROGRESS / REVISION_REQUESTED) ─── */}
        {canDeliver && (
          <div className="border rounded-lg p-4 space-y-3">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <ArrowUpTrayIcon className="h-4 w-4 text-primary" />
              {order.status === 'REVISION_REQUESTED' ? 'Submit Revised Delivery' : 'Submit Delivery'}
            </h3>
            <textarea
              value={deliveryMessage}
              onChange={(e) => setDeliveryMessage(e.target.value)}
              placeholder="Describe what you're delivering..."
              className="w-full h-24 px-3 py-2 border rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              minLength={10}
            />
            {/* Upload area */}
            <div>
              {deliveryFiles.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {deliveryFiles.map((f, i) => (
                    <div key={i} className="flex items-center gap-1.5 bg-muted px-2.5 py-1.5 rounded-lg text-xs">
                      {f.type.startsWith('image/') ? (
                        <PhotoIcon className="h-3.5 w-3.5 text-blue-500" />
                      ) : (
                        <DocumentTextIcon className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                      <span className="truncate max-w-[120px]">{f.name}</span>
                      <button onClick={() => setDeliveryFiles(prev => prev.filter((_, j) => j !== i))} className="p-0.5 hover:bg-background rounded">
                        <XMarkIcon className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground px-3 py-2 border border-dashed rounded-lg hover:bg-muted/50 transition-colors w-full justify-center"
              >
                {isUploading ? <ArrowPathIcon className="h-4 w-4 animate-spin" /> : <PaperClipIcon className="h-4 w-4" />}
                {isUploading ? 'Uploading...' : 'Attach files (images, PDFs, ZIPs)'}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept="image/*,.pdf,.zip,.doc,.docx,.xls,.xlsx"
                onChange={handleFileUpload}
              />
            </div>
            <Button
              className="w-full"
              onClick={handleSubmitDelivery}
              disabled={deliverMutation.isPending || deliveryMessage.length < 10}
            >
              {deliverMutation.isPending ? 'Submitting...' : 'Submit Delivery'}
            </Button>
          </div>
        )}

        {/* Awaiting review notice */}
        {order.status === 'DELIVERED' && (
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 text-center">
            <DocumentTextIcon className="h-8 w-8 text-indigo-500 mx-auto mb-2" />
            <p className="font-medium text-indigo-800 text-sm">Awaiting Buyer Review</p>
            <p className="text-xs text-indigo-600 mt-1">The buyer is reviewing your delivery. You'll be notified when they respond.</p>
          </div>
        )}

        {/* Completed earnings */}
        {order.status === 'COMPLETED' && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
            <CheckCircleIcon className="h-8 w-8 text-green-500 mx-auto mb-2" />
            <p className="font-medium text-green-800 text-sm">Order Completed</p>
            <p className="text-2xl font-bold text-green-700 mt-1">R{Number(order.sellerPayout).toFixed(2)}</p>
            <p className="text-xs text-green-600 mt-1">Earnings released to your balance</p>
          </div>
        )}

        {/* ─── Revision Requests ─── */}
        {order.revisionRequests && order.revisionRequests.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold mb-2 text-amber-700 flex items-center gap-1.5">
              <ArrowPathIcon className="h-4 w-4" />
              Revision Requests
            </h3>
            <div className="space-y-2">
              {order.revisionRequests.map((rev) => (
                <div key={rev.id} className="bg-amber-50 border border-amber-100 rounded-lg p-3">
                  <p className="text-sm">{rev.message}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {formatDistanceToNow(new Date(rev.requestedAt), { addSuffix: true })}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── Past Deliveries ─── */}
        {order.deliveries && order.deliveries.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold mb-2">Deliveries</h3>
            <div className="space-y-2">
              {order.deliveries.map((del, i) => (
                <div key={del.id} className="border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium">Delivery #{order.deliveries!.length - i}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {format(new Date(del.createdAt), 'MMM d, h:mm a')}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{del.message}</p>
                  {del.attachments && Array.isArray(del.attachments) && del.attachments.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {(del.attachments as any[]).map((att: any, j: number) => (
                        <a
                          key={j}
                          href={att.url || att}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-xs text-primary hover:underline bg-primary/5 px-2 py-1 rounded"
                        >
                          <DocumentArrowDownIcon className="h-3.5 w-3.5" />
                          {att.name || `File ${j + 1}`}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── Timeline ─── */}
        <div>
          <h3 className="text-sm font-semibold mb-2">Timeline</h3>
          <div className="space-y-3 pl-3 border-l-2 border-muted">
            {[
              { label: 'Order Placed', date: order.createdAt, color: 'bg-gray-400' },
              { label: 'Payment Received', date: order.paidAt, color: 'bg-green-500' },
              { label: 'Work Started', date: order.startedAt, color: 'bg-purple-500' },
              { label: 'Delivered', date: order.deliveredAt, color: 'bg-indigo-500' },
              { label: 'Completed', date: order.completedAt, color: 'bg-green-600' },
            ].filter(e => e.date).map((event, i) => (
              <div key={i} className="flex items-start gap-2 relative">
                <div className={`w-2.5 h-2.5 rounded-full ${event.color} -ml-[1.3125rem] mt-1.5 ring-2 ring-background`} />
                <div>
                  <p className="text-xs font-medium">{event.label}</p>
                  <p className="text-[10px] text-muted-foreground">{format(new Date(event.date!), 'MMM d, h:mm a')}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-2 pt-2 border-t">
          {order.conversation?.id ? (
            <Link to={`/seller/inbox/${order.conversation.id}`} className="flex-1">
              <Button variant="outline" size="sm" className="w-full">
                <ChatBubbleLeftRightIcon className="h-4 w-4 mr-1.5" />
                Message Buyer
              </Button>
            </Link>
          ) : (
            <Link to={`/messages/${order.buyer.id || order.buyer.username}`} className="flex-1">
              <Button variant="outline" size="sm" className="w-full">
                <ChatBubbleLeftRightIcon className="h-4 w-4 mr-1.5" />
                Message Buyer
              </Button>
            </Link>
          )}
          <Link to={`/orders/${order.id}`} className="flex-1">
            <Button variant="outline" size="sm" className="w-full">
              Full View
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

// ─── Order Row Card ──────────────────────────────────────────
function OrderRow({ order, isSelected, onClick }: { order: Order; isSelected: boolean; onClick: () => void }) {
  const status = statusConfig[order.status] || statusConfig.PAID;
  const daysUntilDue = order.deliveryDueAt
    ? Math.ceil((new Date(order.deliveryDueAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left bg-card border rounded-lg p-4 transition-all hover:shadow-md',
        isSelected && 'ring-2 ring-primary border-primary shadow-md'
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={cn('w-2 h-2 rounded-full', status.dot)} />
          <span className="font-medium text-sm">#{order.orderNumber}</span>
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${status.color}`}>
            {status.label}
          </span>
        </div>
        <div className="text-right">
          <p className="font-semibold text-green-700 text-sm">R{Number(order.sellerPayout).toFixed(0)}</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <img
          src={order.service.images?.[0] || '/placeholder.png'}
          alt="" className="w-10 h-10 rounded-lg object-cover bg-muted"
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{order.service.title}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <img
              src={order.buyer.avatar || `https://ui-avatars.com/api/?name=${order.buyer.username}&background=10b981&color=fff&size=20`}
              alt="" className="w-4 h-4 rounded-full bg-muted"
            />
            <span className="text-xs text-muted-foreground">@{order.buyer.username}</span>
            {order.package && (
              <>
                <span className="text-xs text-muted-foreground">·</span>
                <span className="text-xs text-muted-foreground">{order.package.name}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {daysUntilDue !== null && ['IN_PROGRESS', 'REVISION_REQUESTED'].includes(order.status) && (
        <div className={cn(
          'mt-2 text-xs flex items-center gap-1',
          daysUntilDue <= 0 ? 'text-red-600' : daysUntilDue <= 1 ? 'text-amber-600' : 'text-muted-foreground'
        )}>
          <ClockIcon className="h-3 w-3" />
          {daysUntilDue <= 0 ? 'Overdue!' : daysUntilDue === 1 ? 'Due tomorrow' : `${daysUntilDue}d remaining`}
        </div>
      )}
    </button>
  );
}

// ─── Main Page ────────────────────────────────────────────────
export default function SellerOrdersPage() {
  const [filter, setFilter] = useState<string>('all');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  const { data: orders, isLoading } = useQuery<Order[]>({
    queryKey: ['seller-orders'],
    queryFn: async () => {
      const res = await api.get('/orders/selling');
      return (res as any).data.orders;
    },
  });

  const filteredOrders = orders?.filter((o) => {
    if (filter === 'all') return true;
    if (filter === 'active') return ['PAID', 'IN_PROGRESS', 'DELIVERED', 'REVISION_REQUESTED'].includes(o.status);
    return o.status === filter;
  });

  const stats = {
    active: orders?.filter(o => ['PAID', 'IN_PROGRESS', 'DELIVERED', 'REVISION_REQUESTED'].includes(o.status)).length || 0,
    completed: orders?.filter(o => o.status === 'COMPLETED').length || 0,
    earnings: orders?.filter(o => o.status === 'COMPLETED').reduce((s, o) => s + Number(o.sellerPayout), 0) || 0,
    disputed: orders?.filter(o => o.status === 'DISPUTED').length || 0,
  };

  const filters = [
    { value: 'all', label: 'All' },
    { value: 'active', label: 'Active' },
    { value: 'PAID', label: 'New' },
    { value: 'IN_PROGRESS', label: 'In Progress' },
    { value: 'REVISION_REQUESTED', label: 'Revision' },
    { value: 'DELIVERED', label: 'Delivered' },
    { value: 'COMPLETED', label: 'Completed' },
    { value: 'DISPUTED', label: 'Disputed' },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-80px)]">
      <div className="flex h-full">
        {/* Left: Order List */}
        <div className={cn(
          'flex-1 min-w-0 overflow-y-auto px-4 py-6 transition-all',
          selectedOrderId ? 'max-w-md border-r' : 'max-w-5xl mx-auto'
        )}>
          <div className="mb-6">
            <h1 className="text-2xl font-bold mb-1">My Orders</h1>
            <p className="text-sm text-muted-foreground">Manage your customer orders</p>
          </div>

          {/* Stats */}
          <div className={cn('grid gap-3 mb-5', selectedOrderId ? 'grid-cols-2' : 'grid-cols-4')}>
            <div className="bg-card border rounded-lg p-3 text-center">
              <p className="text-xl font-bold text-blue-600">{stats.active}</p>
              <p className="text-xs text-muted-foreground">Active</p>
            </div>
            <div className="bg-card border rounded-lg p-3 text-center">
              <p className="text-xl font-bold text-green-600">{stats.completed}</p>
              <p className="text-xs text-muted-foreground">Completed</p>
            </div>
            {!selectedOrderId && (
              <>
                <div className="bg-card border rounded-lg p-3 text-center">
                  <p className="text-xl font-bold text-green-700">R{stats.earnings.toFixed(0)}</p>
                  <p className="text-xs text-muted-foreground">Total Earned</p>
                </div>
                <div className="bg-card border rounded-lg p-3 text-center">
                  <p className="text-xl font-bold text-red-600">{stats.disputed}</p>
                  <p className="text-xs text-muted-foreground">Disputed</p>
                </div>
              </>
            )}
          </div>

          {/* Filters */}
          <div className="flex gap-1.5 mb-5 overflow-x-auto pb-1">
            {filters.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setFilter(value)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-xs whitespace-nowrap font-medium transition-colors',
                  filter === value
                    ? 'bg-primary text-white'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Order List */}
          {filteredOrders && filteredOrders.length > 0 ? (
            <div className="space-y-3">
              {filteredOrders.map((order) => (
                <OrderRow
                  key={order.id}
                  order={order}
                  isSelected={selectedOrderId === order.id}
                  onClick={() => setSelectedOrderId(selectedOrderId === order.id ? null : order.id)}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-card border rounded-lg">
              <DocumentTextIcon className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
              <h3 className="font-semibold mb-2">No orders yet</h3>
              <p className="text-sm text-muted-foreground">Orders from your customers will appear here</p>
            </div>
          )}
        </div>

        {/* Right: Detail Panel */}
        {selectedOrderId && (
          <div className="w-[440px] flex-shrink-0 h-full">
            <OrderDetailPanel
              key={selectedOrderId}
              orderId={selectedOrderId}
              onClose={() => setSelectedOrderId(null)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
