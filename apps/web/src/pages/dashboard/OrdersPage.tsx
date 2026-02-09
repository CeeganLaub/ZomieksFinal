import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import {
  CheckCircleIcon,
  XCircleIcon,
  DocumentTextIcon,
  TruckIcon,
  ExclamationTriangleIcon,
  CreditCardIcon,
} from '@heroicons/react/24/outline';
import { formatDistanceToNow } from 'date-fns';

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  totalAmount: string | number;
  buyerFee: string | number;
  baseAmount: string | number;
  deliveryDueAt: string;
  deliveryDays: number;
  revisions: number;
  createdAt: string;
  paidAt: string | null;
  service: {
    id: string;
    title: string;
    slug: string;
    images: string[];
  };
  package: { name: string; tier: string } | null;
  seller: {
    username: string;
    avatar: string;
  };
}

const statusConfig: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  PENDING_PAYMENT: { label: 'Awaiting Payment', icon: CreditCardIcon, color: 'text-yellow-600 bg-yellow-500/10' },
  PAID: { label: 'Payment Received', icon: CheckCircleIcon, color: 'text-blue-600 bg-blue-500/10' },
  IN_PROGRESS: { label: 'In Progress', icon: TruckIcon, color: 'text-purple-600 bg-purple-500/10' },
  DELIVERED: { label: 'Delivered', icon: DocumentTextIcon, color: 'text-indigo-600 bg-indigo-500/10' },
  COMPLETED: { label: 'Completed', icon: CheckCircleIcon, color: 'text-green-600 bg-green-500/10' },
  CANCELLED: { label: 'Cancelled', icon: XCircleIcon, color: 'text-muted-foreground bg-muted' },
  DISPUTED: { label: 'Disputed', icon: ExclamationTriangleIcon, color: 'text-red-600 bg-red-500/10' },
  REFUNDED: { label: 'Refunded', icon: XCircleIcon, color: 'text-orange-600 bg-orange-500/10' },
};

function OrderCard({ order }: { order: Order }) {
  const status = statusConfig[order.status] || statusConfig.PENDING_PAYMENT;

  return (
    <Link to={`/orders/${order.id}`} className="block">
      <div className="bg-card border rounded-lg p-4 hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium">#{order.orderNumber}</span>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${status.color}`}>
                <status.icon className="h-3 w-3" />
                {status.label}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              {formatDistanceToNow(new Date(order.createdAt), { addSuffix: true })}
            </p>
          </div>
          <div className="text-right">
            <p className="font-semibold">R{Number(order.totalAmount).toFixed(2)}</p>
            <p className="text-xs text-muted-foreground">
              Incl. R{Number(order.buyerFee ?? 0).toFixed(2)} fee
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 mb-4">
          <img
            src={order.seller.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(order.seller.username)}&background=10b981&color=fff`}
            alt={order.seller.username}
            className="w-10 h-10 rounded-full bg-muted"
          />
          <div>
            <p className="font-medium">@{order.seller.username}</p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-3 p-2 bg-muted/50 rounded">
            <img
              src={order.service.images?.[0] || `https://ui-avatars.com/api/?name=${encodeURIComponent(order.service.title.charAt(0))}&background=10b981&color=fff`}
              alt={order.service.title}
              className="w-12 h-12 rounded object-cover bg-muted"
            />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{order.service.title}</p>
              {order.package && (
                <p className="text-xs text-muted-foreground">
                  {order.package.name} ({order.package.tier})
                </p>
              )}
            </div>
            <p className="font-medium text-sm">R{Number(order.baseAmount).toFixed(2)}</p>
          </div>
        </div>

        {order.status === 'PENDING_PAYMENT' && (
          <div className="mt-4 pt-4 border-t">
            <Button size="sm" className="w-full">
              <CreditCardIcon className="h-4 w-4 mr-2" />
              Complete Payment
            </Button>
          </div>
        )}
      </div>
    </Link>
  );
}

export default function OrdersPage() {
  const [filter, setFilter] = useState<string>('all');

  const { data: orders, isLoading } = useQuery<Order[]>({
    queryKey: ['buyer-orders'],
    queryFn: async () => {
      const res = await api.get('/orders/buying');
      return (res as any).data.data.orders;
    },
  });

  const filteredOrders = orders?.filter((o) => {
    if (filter === 'all') return true;
    if (filter === 'active') return ['PAID', 'IN_PROGRESS', 'DELIVERED'].includes(o.status);
    if (filter === 'pending') return o.status === 'PENDING_PAYMENT';
    return o.status === filter;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2">My Orders</h1>
        <p className="text-muted-foreground">Track your orders and deliveries</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-card border rounded-lg p-4 text-center">
          <p className="text-2xl font-bold">{orders?.length || 0}</p>
          <p className="text-sm text-muted-foreground">Total</p>
        </div>
        <div className="bg-card border rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-yellow-600">
            {orders?.filter((o) => o.status === 'PENDING_PAYMENT').length || 0}
          </p>
          <p className="text-sm text-muted-foreground">Pending</p>
        </div>
        <div className="bg-card border rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-blue-600">
            {orders?.filter((o) => ['PAID', 'IN_PROGRESS', 'DELIVERED'].includes(o.status)).length || 0}
          </p>
          <p className="text-sm text-muted-foreground">Active</p>
        </div>
        <div className="bg-card border rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-green-600">
            {orders?.filter((o) => o.status === 'COMPLETED').length || 0}
          </p>
          <p className="text-sm text-muted-foreground">Completed</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {[
          { value: 'all', label: 'All' },
          { value: 'pending', label: 'Pending Payment' },
          { value: 'active', label: 'Active' },
          { value: 'DELIVERED', label: 'Delivered' },
          { value: 'COMPLETED', label: 'Completed' },
        ].map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setFilter(value)}
            className={`px-4 py-2 rounded-full text-sm whitespace-nowrap ${
              filter === value
                ? 'bg-primary text-white'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {filteredOrders && filteredOrders.length > 0 ? (
        <div className="space-y-4">
          {filteredOrders.map((order) => (
            <OrderCard key={order.id} order={order} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-card border rounded-lg">
          <DocumentTextIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="font-semibold mb-2">No orders yet</h3>
          <p className="text-muted-foreground mb-4">
            Browse services and place your first order
          </p>
          <Link to="/services">
            <Button>Browse Services</Button>
          </Link>
        </div>
      )}
    </div>
  );
}
