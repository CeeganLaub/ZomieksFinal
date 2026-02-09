import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
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
} from '@heroicons/react/24/outline';

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  totalAmount: number;
  platformFee: number;
  serviceFee: number;
  deliveryDueAt: string;
  createdAt: string;
  orderItems: {
    id: string;
    quantity: number;
    price: number;
    package: { name: string; tier: string };
    service: { title: string; slug: string; images: string[] };
  }[];
  buyer: {
    id: string;
    username: string;
    firstName: string;
    lastName: string;
    avatar: string;
  };
}

const statusConfig: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  PENDING_PAYMENT: { label: 'Pending Payment', icon: ClockIcon, color: 'text-yellow-600 bg-yellow-50' },
  PAID: { label: 'Paid', icon: CheckCircleIcon, color: 'text-blue-600 bg-blue-50' },
  IN_PROGRESS: { label: 'In Progress', icon: TruckIcon, color: 'text-purple-600 bg-purple-50' },
  DELIVERED: { label: 'Delivered', icon: DocumentTextIcon, color: 'text-indigo-600 bg-indigo-50' },
  COMPLETED: { label: 'Completed', icon: CheckCircleIcon, color: 'text-green-600 bg-green-50' },
  CANCELLED: { label: 'Cancelled', icon: XCircleIcon, color: 'text-gray-600 bg-gray-50' },
  DISPUTED: { label: 'Disputed', icon: ExclamationTriangleIcon, color: 'text-red-600 bg-red-50' },
  REFUNDED: { label: 'Refunded', icon: XCircleIcon, color: 'text-orange-600 bg-orange-50' },
};

function OrderCard({ order }: { order: Order }) {
  const queryClient = useQueryClient();
  const status = statusConfig[order.status] || statusConfig.PENDING_PAYMENT;

  const startOrderMutation = useMutation({
    mutationFn: async () => {
      await api.patch(`/orders/${order.id}/start`);
    },
    onSuccess: () => {
      toast.success('Order started');
      queryClient.invalidateQueries({ queryKey: ['seller-orders'] });
    },
  });

  const deliverOrderMutation = useMutation({
    mutationFn: async () => {
      await api.post(`/orders/${order.id}/deliver`, {
        message: 'Your order has been delivered!',
      });
    },
    onSuccess: () => {
      toast.success('Order marked as delivered');
      queryClient.invalidateQueries({ queryKey: ['seller-orders'] });
    },
  });

  const daysUntilDue = order.deliveryDueAt
    ? Math.ceil((new Date(order.deliveryDueAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  const netEarnings = order.totalAmount - order.platformFee - order.serviceFee;

  return (
    <div className="bg-white border rounded-lg p-4">
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
            {new Date(order.createdAt).toLocaleDateString()}
          </p>
        </div>
        <div className="text-right">
          <p className="font-semibold">R{netEarnings.toFixed(2)}</p>
          <p className="text-xs text-muted-foreground">Net earnings</p>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <img
          src={order.buyer.avatar || '/default-avatar.png'}
          alt={order.buyer.username}
          className="w-10 h-10 rounded-full"
        />
        <div>
          <p className="font-medium">{order.buyer.firstName} {order.buyer.lastName}</p>
          <p className="text-sm text-muted-foreground">@{order.buyer.username}</p>
        </div>
      </div>

      <div className="space-y-2 mb-4">
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
            <p className="font-medium">R{item.price.toFixed(2)}</p>
          </div>
        ))}
      </div>

      {daysUntilDue !== null && order.status === 'IN_PROGRESS' && (
        <div className={`text-sm mb-4 ${daysUntilDue <= 1 ? 'text-red-600' : 'text-muted-foreground'}`}>
          {daysUntilDue > 0 ? `${daysUntilDue} day${daysUntilDue !== 1 ? 's' : ''} until delivery` : 'Due today!'}
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        <Link to={`/messages/${order.buyer.id}`}>
          <Button variant="outline" size="sm">
            <ChatBubbleLeftRightIcon className="h-4 w-4 mr-1" />
            Message
          </Button>
        </Link>

        {order.status === 'PAID' && (
          <Button
            size="sm"
            onClick={() => startOrderMutation.mutate()}
            disabled={startOrderMutation.isPending}
          >
            Start Order
          </Button>
        )}

        {order.status === 'IN_PROGRESS' && (
          <Button
            size="sm"
            onClick={() => deliverOrderMutation.mutate()}
            disabled={deliverOrderMutation.isPending}
          >
            Mark Delivered
          </Button>
        )}

        <Link to={`/orders/${order.id}`}>
          <Button variant="outline" size="sm">
            View Details
          </Button>
        </Link>
      </div>
    </div>
  );
}

export default function SellerOrdersPage() {
  const [filter, setFilter] = useState<string>('all');

  const { data: orders, isLoading } = useQuery<Order[]>({
    queryKey: ['seller-orders'],
    queryFn: async () => {
      const res = await api.get('/orders/my-orders');
      return (res as any).data.data.orders;
    },
  });

  const filteredOrders = orders?.filter((o) => {
    if (filter === 'all') return true;
    if (filter === 'active') return ['PAID', 'IN_PROGRESS', 'DELIVERED'].includes(o.status);
    return o.status === filter;
  });

  const stats = {
    active: orders?.filter((o) => ['PAID', 'IN_PROGRESS', 'DELIVERED'].includes(o.status)).length || 0,
    completed: orders?.filter((o) => o.status === 'COMPLETED').length || 0,
    disputed: orders?.filter((o) => o.status === 'DISPUTED').length || 0,
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2">My Orders</h1>
        <p className="text-muted-foreground">Manage your customer orders</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white border rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-blue-600">{stats.active}</p>
          <p className="text-sm text-muted-foreground">Active</p>
        </div>
        <div className="bg-white border rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
          <p className="text-sm text-muted-foreground">Completed</p>
        </div>
        <div className="bg-white border rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-red-600">{stats.disputed}</p>
          <p className="text-sm text-muted-foreground">Disputed</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {[
          { value: 'all', label: 'All' },
          { value: 'active', label: 'Active' },
          { value: 'PAID', label: 'New' },
          { value: 'IN_PROGRESS', label: 'In Progress' },
          { value: 'DELIVERED', label: 'Delivered' },
          { value: 'COMPLETED', label: 'Completed' },
          { value: 'DISPUTED', label: 'Disputed' },
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
          <p className="text-muted-foreground">
            Orders from your customers will appear here
          </p>
        </div>
      )}
    </div>
  );
}
