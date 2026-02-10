import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api, ordersApi } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { REFUND_POLICY } from '@zomieks/shared';
import {
  CheckCircleIcon,
  XCircleIcon,
  ChatBubbleLeftRightIcon,
  DocumentTextIcon,
  TruckIcon,
  ExclamationTriangleIcon,
  CreditCardIcon,
  ArrowLeftIcon,
  StarIcon,
  BanknotesIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';

const statusConfig: Record<string, { label: string; icon: React.ElementType; color: string; bgColor: string }> = {
  PENDING_PAYMENT: { label: 'Awaiting Payment', icon: CreditCardIcon, color: 'text-yellow-600', bgColor: 'bg-yellow-50' },
  PAID: { label: 'Payment Received', icon: CheckCircleIcon, color: 'text-blue-600', bgColor: 'bg-blue-50' },
  IN_PROGRESS: { label: 'In Progress', icon: TruckIcon, color: 'text-purple-600', bgColor: 'bg-purple-50' },
  DELIVERED: { label: 'Delivered', icon: DocumentTextIcon, color: 'text-indigo-600', bgColor: 'bg-indigo-50' },
  COMPLETED: { label: 'Completed', icon: CheckCircleIcon, color: 'text-green-600', bgColor: 'bg-green-50' },
  CANCELLED: { label: 'Cancelled', icon: XCircleIcon, color: 'text-gray-600', bgColor: 'bg-gray-50' },
  DISPUTED: { label: 'Disputed', icon: ExclamationTriangleIcon, color: 'text-red-600', bgColor: 'bg-red-50' },
  REFUNDED: { label: 'Refunded', icon: XCircleIcon, color: 'text-orange-600', bgColor: 'bg-orange-50' },
  REVISION_REQUESTED: { label: 'Revision Requested', icon: ArrowPathIcon, color: 'text-amber-600', bgColor: 'bg-amber-50' },
};

export default function OrderPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'payfast' | 'ozow'>('payfast');
  const [rating, setRating] = useState(5);
  const [review, setReview] = useState('');
  const [showReviewModal, setShowReviewModal] = useState(false);

  // Handle payment redirect query params
  const paymentStatus = searchParams.get('payment');
  useState(() => {
    if (paymentStatus === 'success') {
      toast.success('Order Placed Successfully! The seller has been notified.');
    } else if (paymentStatus === 'cancelled') {
      toast.info('Payment was cancelled. You can try again or cancel the order.');
    } else if (paymentStatus === 'failed') {
      toast.error('Payment failed. Please try again.');
    }
  });

  // Redirect to conversation page after successful payment
  const { data: order, isLoading, error } = useQuery({
    queryKey: ['order', id],
    queryFn: async () => {
      const res = await api.get<any>(`/orders/${id}`);
      return res.data.order;
    },
    enabled: !!id,
  });

  useEffect(() => {
    if (paymentStatus === 'success' && order?.sellerId) {
      // Find or create conversation and redirect to it
      api.post<any>('/conversations/start', {
        participantId: order.sellerId,
        orderId: order.id,
      }).then(res => {
        const convId = res.data?.conversationId;
        if (convId) {
          navigate(`/messages/${convId}`, { replace: true });
        }
      }).catch(() => {
        // Stay on order page if conversation lookup fails
      });
    }
  }, [paymentStatus, order, navigate]);

  const payMutation = useMutation({
    mutationFn: async (gateway: string) => {
      const res = await api.get<any>(`/payments/initiate`, { params: { orderId: id, gateway: gateway.toUpperCase() } });
      return res.data;
    },
    onSuccess: (data) => {
      if (data?.paymentUrl) {
        window.location.href = data.paymentUrl;
      }
    },
    onError: (error: any) => {
      toast.error(error.message || 'Payment failed');
    },
  });

  const acceptDeliveryMutation = useMutation({
    mutationFn: async () => {
      await api.post(`/orders/${id}/accept`);
    },
    onSuccess: () => {
      toast.success('Order completed!');
      queryClient.invalidateQueries({ queryKey: ['order', id] });
      setShowReviewModal(true);
    },
  });

  const requestRevisionMutation = useMutation({
    mutationFn: async (message: string) => {
      await api.post(`/orders/${id}/revision`, { message });
    },
    onSuccess: () => {
      toast.success('Revision requested');
      queryClient.invalidateQueries({ queryKey: ['order', id] });
    },
  });

  const submitReviewMutation = useMutation({
    mutationFn: async () => {
      await api.post(`/orders/${id}/review`, {
        rating,
        comment: review,
      });
    },
    onSuccess: () => {
      toast.success('Review submitted!');
      setShowReviewModal(false);
      queryClient.invalidateQueries({ queryKey: ['order', id] });
    },
  });

  const disputeMutation = useMutation({
    mutationFn: async (reason: string) => {
      await api.post(`/orders/${id}/dispute`, { reason });
    },
    onSuccess: () => {
      toast.success('Dispute opened');
      queryClient.invalidateQueries({ queryKey: ['order', id] });
    },
  });

  const cancelRefundMutation = useMutation({
    mutationFn: async (reason: string) => ordersApi.cancelAndRefund(id!, reason),
    onSuccess: (data: any) => {
      const refund = data.data?.refund;
      if (refund) {
        toast.success(`R${refund.refundAmount.toFixed(2)} credited to your balance. R${refund.totalDeducted.toFixed(2)} retained as fees.`);
      } else {
        toast.success('Order cancelled');
      }
      queryClient.invalidateQueries({ queryKey: ['order', id] });
      setShowRefundModal(false);
      setShowCancelModal(false);
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to cancel order');
    },
  });

  const [showRefundModal, setShowRefundModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 text-center">
        <h1 className="text-2xl font-bold mb-4">Order not found</h1>
        <Button onClick={() => navigate('/orders')}>Back to Orders</Button>
      </div>
    );
  }

  const status = statusConfig[order.status] || statusConfig.PENDING_PAYMENT;
  const canPay = order.status === 'PENDING_PAYMENT';
  const canAccept = order.status === 'DELIVERED';
  const canDispute = ['DELIVERED', 'IN_PROGRESS'].includes(order.status);
  const isPaid = order.status !== 'PENDING_PAYMENT';
  const canCancel = ['PENDING_PAYMENT', 'PAID', 'IN_PROGRESS'].includes(order.status) && (!order.deliveries || order.deliveries.length === 0);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Button variant="ghost" className="mb-6" onClick={() => navigate('/orders')}>
        <ArrowLeftIcon className="h-4 w-4 mr-2" />
        Back to Orders
      </Button>

      {/* Order Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold mb-2">Order #{order.orderNumber}</h1>
          <p className="text-muted-foreground">
            Placed on {format(new Date(order.createdAt), 'PPP')}
          </p>
        </div>
        <div className={`px-4 py-2 rounded-lg flex items-center gap-2 ${status.bgColor}`}>
          <status.icon className={`h-5 w-5 ${status.color}`} />
          <span className={`font-medium ${status.color}`}>{status.label}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Items */}
          <Card>
            <CardHeader>
              <CardTitle>Order Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                <img
                  src={order.service?.images?.[0] || '/placeholder.png'}
                  alt={order.service?.title}
                  className="w-24 h-24 rounded-lg object-cover"
                />
                <div className="flex-1">
                  <Link
                    to={`/services/${order.seller?.username}/${order.service?.slug}`}
                    className="font-medium hover:text-primary"
                  >
                    {order.service?.title}
                  </Link>
                  {order.package && (
                    <p className="text-sm text-muted-foreground">
                      {order.package.name} ({order.package.tier})
                    </p>
                  )}
                  <p className="text-sm text-muted-foreground">
                    {order.deliveryDays} day delivery • {order.revisions} revisions
                  </p>
                  <p className="font-semibold mt-2">R{Number(order.baseAmount).toFixed(2)}</p>
                </div>
              </div>
              {order.requirements && (
                <div className="pt-4 border-t">
                  <p className="text-sm font-medium mb-1">Requirements</p>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{order.requirements}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payment Section */}
          {canPay && (
            <Card className="border-primary">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCardIcon className="h-5 w-5" />
                  Complete Payment
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  Choose your preferred payment method to complete this order.
                </p>

                <div className="space-y-3 mb-6">
                  <label
                    className={`flex items-center gap-3 p-4 border rounded-lg cursor-pointer ${
                      selectedPaymentMethod === 'payfast' ? 'border-primary bg-primary/5' : ''
                    }`}
                  >
                    <input
                      type="radio"
                      name="payment"
                      checked={selectedPaymentMethod === 'payfast'}
                      onChange={() => setSelectedPaymentMethod('payfast')}
                      className="text-primary"
                    />
                    <div className="flex-1">
                      <p className="font-medium">PayFast</p>
                      <p className="text-sm text-muted-foreground">
                        Credit/Debit Card, Instant EFT, SnapScan
                      </p>
                    </div>
                    <CreditCardIcon className="h-8 w-8 text-blue-600" />
                  </label>

                  <label
                    className={`flex items-center gap-3 p-4 border rounded-lg cursor-pointer ${
                      selectedPaymentMethod === 'ozow' ? 'border-primary bg-primary/5' : ''
                    }`}
                  >
                    <input
                      type="radio"
                      name="payment"
                      checked={selectedPaymentMethod === 'ozow'}
                      onChange={() => setSelectedPaymentMethod('ozow')}
                      className="text-primary"
                    />
                    <div className="flex-1">
                      <p className="font-medium">OZOW</p>
                      <p className="text-sm text-muted-foreground">
                        Instant EFT from your bank
                      </p>
                    </div>
                    <BanknotesIcon className="h-8 w-8 text-green-600" />
                  </label>
                </div>

                <Button
                  className="w-full"
                  size="lg"
                  onClick={() => payMutation.mutate(selectedPaymentMethod)}
                  disabled={payMutation.isPending}
                >
                  {payMutation.isPending ? 'Processing...' : `Pay R${Number(order.totalAmount).toFixed(2)}`}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Delivery Acceptance */}
          {canAccept && (
            <Card className="border-green-500">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-600">
                  <CheckCircleIcon className="h-5 w-5" />
                  Delivery Ready for Review
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  The seller has delivered your order. Please review the delivery and accept if satisfied.
                </p>
                <div className="flex gap-3">
                  <Button
                    className="flex-1"
                    onClick={() => acceptDeliveryMutation.mutate()}
                    disabled={acceptDeliveryMutation.isPending}
                  >
                    Accept Delivery
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      const msg = prompt('What changes do you need?');
                      if (msg) requestRevisionMutation.mutate(msg);
                    }}
                  >
                    Request Revision
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Deliveries Section */}
          {order.deliveries?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Deliveries</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {order.deliveries.map((delivery: any, i: number) => (
                  <div key={delivery.id} className="p-4 bg-muted/50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">Delivery #{i + 1}</span>
                      <span className="text-sm text-muted-foreground">
                        {format(new Date(delivery.createdAt), 'PPp')}
                      </span>
                    </div>
                    <p className="text-sm mb-2">{delivery.message}</p>
                    {delivery.files?.length > 0 && (
                      <div className="flex gap-2 flex-wrap">
                        {delivery.files.map((file: string, j: number) => (
                          <a
                            key={j}
                            href={file}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-primary hover:underline"
                          >
                            Download File {j + 1}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Order Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>R{(Number(order.totalAmount) - Number(order.buyerFee)).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Service Fee (3%)</span>
                <span>R{Number(order.buyerFee).toFixed(2)}</span>
              </div>
              <div className="border-t pt-3 flex justify-between font-semibold">
                <span>Total</span>
                <span>R{Number(order.totalAmount).toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Seller Info */}
          <Card>
            <CardHeader>
              <CardTitle>Seller</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3 mb-4">
                <img
                  src={order.seller?.avatar || '/default-avatar.png'}
                  alt={order.seller?.username}
                  className="w-12 h-12 rounded-full"
                />
                <div>
                  <Link
                    to={`/${order.seller?.username}`}
                    className="font-medium hover:text-primary"
                  >
                    {order.seller?.firstName} {order.seller?.lastName}
                  </Link>
                  <p className="text-sm text-muted-foreground">@{order.seller?.username}</p>
                </div>
              </div>
              <Link to={`/messages/${order.seller?.id}`}>
                <Button variant="outline" className="w-full">
                  <ChatBubbleLeftRightIcon className="h-4 w-4 mr-2" />
                  Contact Seller
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="w-2 h-2 mt-2 rounded-full bg-primary" />
                  <div>
                    <p className="font-medium">Order Placed</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(order.createdAt), 'PPp')}
                    </p>
                  </div>
                </div>
                {order.paidAt && (
                  <div className="flex gap-3">
                    <div className="w-2 h-2 mt-2 rounded-full bg-green-500" />
                    <div>
                      <p className="font-medium">Payment Received</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(order.paidAt), 'PPp')}
                      </p>
                    </div>
                  </div>
                )}
                {order.deliveryDueAt && (
                  <div className="flex gap-3">
                    <div className="w-2 h-2 mt-2 rounded-full bg-gray-300" />
                    <div>
                      <p className="font-medium">Expected Delivery</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(order.deliveryDueAt), 'PPP')}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          {canCancel && isPaid && (
            <Button
              variant="outline"
              className="w-full text-orange-600 border-orange-200 hover:bg-orange-50"
              onClick={() => setShowRefundModal(true)}
            >
              <ArrowPathIcon className="h-4 w-4 mr-2" />
              Cancel & Refund
            </Button>
          )}
          {canCancel && !isPaid && (
            <Button
              variant="outline"
              className="w-full text-muted-foreground border-muted hover:bg-muted/50"
              onClick={() => setShowCancelModal(true)}
            >
              <XCircleIcon className="h-4 w-4 mr-2" />
              Cancel Order
            </Button>
          )}
          {canDispute && (
            <Button
              variant="outline"
              className="w-full text-red-600 border-red-200 hover:bg-red-50"
              onClick={() => {
                const reason = prompt('Please describe your issue:');
                if (reason) disputeMutation.mutate(reason);
              }}
            >
              <ExclamationTriangleIcon className="h-4 w-4 mr-2" />
              Open Dispute
            </Button>
          )}
        </div>
      </div>

      {/* Review Modal */}
      {showReviewModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background rounded-lg p-6 w-full max-w-md mx-4">
            <h2 className="text-xl font-bold mb-4">Leave a Review</h2>
            
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Rating</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setRating(star)}
                    className="focus:outline-none"
                  >
                    <StarIcon
                      className={`h-8 w-8 ${
                        star <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Your Review</label>
              <textarea
                value={review}
                onChange={(e) => setReview(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="Share your experience..."
              />
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowReviewModal(false)}
              >
                Skip
              </Button>
              <Button
                className="flex-1"
                onClick={() => submitReviewMutation.mutate()}
                disabled={submitReviewMutation.isPending}
              >
                {submitReviewMutation.isPending ? 'Submitting...' : 'Submit Review'}
              </Button>
            </div>
          </div>
        </div>
      )}
      {/* Cancel Confirmation Modal (unpaid orders) */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background rounded-lg p-6 w-full max-w-md mx-4">
            <h2 className="text-xl font-bold mb-2">Cancel Order</h2>
            <p className="text-sm text-muted-foreground mb-4">
              This order hasn't been paid yet. It will simply be cancelled — no refund is needed.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Reason (optional)</label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border rounded-lg text-sm"
                placeholder="Why are you cancelling?"
              />
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setShowCancelModal(false)}>
                Keep Order
              </Button>
              <Button
                className="flex-1"
                variant="destructive"
                onClick={() => cancelRefundMutation.mutate(cancelReason)}
                disabled={cancelRefundMutation.isPending}
              >
                {cancelRefundMutation.isPending ? 'Cancelling...' : 'Confirm Cancel'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Refund Confirmation Modal (paid orders) */}
      {showRefundModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background rounded-lg p-6 w-full max-w-md mx-4">
            <h2 className="text-xl font-bold mb-2">Cancel & Refund Order</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Your refund will be credited to your account balance after deducting platform fees.
              Credits can be used for any purchase but cannot be withdrawn.
            </p>
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4 text-sm space-y-1">
              <p className="font-medium text-orange-800">Fee Breakdown</p>
              <div className="text-orange-700">
                <p>Order total: R{Number(order.totalAmount).toFixed(2)}</p>
                <p>Buyer fee kept (3%): -R{Number(order.buyerFee).toFixed(2)}</p>
                <p>Processing fee ({REFUND_POLICY.PROCESSING_FEE_PERCENT}%): -R{(Number(order.baseAmount) * REFUND_POLICY.PROCESSING_FEE_PERCENT / 100).toFixed(2)}</p>
                <p className="font-bold mt-1">
                  Estimated refund: R{(Number(order.totalAmount) - Number(order.buyerFee) - Number(order.baseAmount) * REFUND_POLICY.PROCESSING_FEE_PERCENT / 100).toFixed(2)}
                </p>
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Reason (optional)</label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border rounded-lg text-sm"
                placeholder="Why are you cancelling?"
              />
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setShowRefundModal(false)}>
                Keep Order
              </Button>
              <Button
                className="flex-1 bg-orange-600 hover:bg-orange-700"
                onClick={() => cancelRefundMutation.mutate(cancelReason)}
                disabled={cancelRefundMutation.isPending}
              >
                {cancelRefundMutation.isPending ? 'Processing...' : 'Confirm Refund'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
