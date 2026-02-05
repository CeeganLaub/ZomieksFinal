import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import {
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
  ChatBubbleLeftRightIcon,
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
  totalAmount: number;
  buyerFee: number;
  deliveryDueAt: string;
  createdAt: string;
  paidAt: string | null;
  orderItems: {
    id: string;
    quantity: number;
    price: number;
    package: { name: string; tier: string };
    service: { title: string; slug: string; images: string[] };
  }[];
  seller: {
    id: string;
    username: string;
    firstName: string;
    lastName: string;
    avatar: string;
  };
}

const statusConfig: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  PENDING: { label: 'Awaiting Payment', icon: CreditCardIcon, color: 'text-yellow-600 bg-yellow-50' },
  PAID: { label: 'Payment Received', icon: CheckCircleIcon, color: 'text-blue-600 bg-blue-50' },
  IN_PROGRESS: { label: 'In Progress', icon: TruckIcon, color: 'text-purple-600 bg-purple-50' },
  DELIVERED: { label: 'Delivered', icon: DocumentTextIcon, color: 'text-indigo-600 bg-indigo-50' },
  COMPLETED: { label: 'Completed', icon: CheckCircleIcon, color: 'text-green-600 bg-green-50' },
  CANCELLED: { label: 'Cancelled', icon: XCircleIcon, color: 'text-gray-600 bg-gray-50' },
  DISPUTED: { label: 'Disputed', icon: ExclamationTriangleIcon, color: 'text-red-600 bg-red-50' },
  REFUNDED: { label: 'Refunded', icon: XCircleIcon, color: 'text-orange-600 bg-orange-50' },
};

function OrderCard({ order }: { order: Order }) {
  const status = statusConfig[order.status] || statusConfig.PENDING;

  return (
    <Link to={`/orders/${order.id}`} className="block">
      <div className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow">
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
            <p className="font-semibold">R{order.totalAmount.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground">
              Incl. R{order.buyerFee.toFixed(2)} fee
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 mb-4">
          <img
            src={order.seller.avatar || '/default-avatar.png'}
            alt={order.seller.username}
            className="w-10 h-10 rounded-full"
          />
          <div>
            <p className="font-medium">{order.seller.firstName} {order.seller.lastName}</p>
            <p className="text-sm text-muted-foreground">@{order.seller.username}</p>
          </div>
        </div>

        <div className="space-y-2">
          {order.orderItems.map((item) => (
            <div key={item.id} className="flex items-center gap-3 p-2 bg-gray-50 rounded">
              <img
                src={item.service.images?.[0] || '/placeholder.png'}
                alt={item.service.title}
                className="w-12 h-12 rounded object-cover"
              />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{item.service.title}</p>
                <p className="text-xs text-muted-foreground">
                  {item.package.name} ({item.package.tier}) x{item.quantity}
                </p>
              </div>
              <p className="font-medium text-sm">R{item.price.toFixed(2)}</p>
            </div>
          ))}
        </div>

        {order.status === 'PENDING' && (
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
      return res.data.data.orders;
    },
  });

  const filteredOrders = orders?.filter((o) => {
    if (filter === 'all') return true;
    if (filter === 'active') return ['PAID', 'IN_PROGRESS', 'DELIVERED'].includes(o.status);
    if (filter === 'pending') return o.status === 'PENDING';
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
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white border rounded-lg p-4 text-center">
          <p className="text-2xl font-bold">{orders?.length || 0}</p>
          <p className="text-sm text-muted-foreground">Total</p>
        </div>
        <div className="bg-white border rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-yellow-600">
            {orders?.filter((o) => o.status === 'PENDING').length || 0}
          </p>
          <p className="text-sm text-muted-foreground">Pending</p>
        </div>
        <div className="bg-white border rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-blue-600">
            {orders?.filter((o) => ['PAID', 'IN_PROGRESS', 'DELIVERED'].includes(o.status)).length || 0}
          </p>
          <p className="text-sm text-muted-foreground">Active</p>
        </div>
        <div className="bg-white border rounded-lg p-4 text-center">
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
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
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
        <div className="text-center py-16 bg-white border rounded-lg">
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
