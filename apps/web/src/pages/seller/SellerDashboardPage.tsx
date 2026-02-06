import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '@/lib/api';
import { 
  CurrencyDollarIcon, 
  ShoppingBagIcon, 
  ChatBubbleLeftRightIcon,
  StarIcon,
  ClockIcon,
  CheckCircleIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';

interface DashboardStats {
  totalEarnings: number;
  pendingEarnings: number;
  totalOrders: number;
  activeOrders: number;
  completedOrders: number;
  totalReviews: number;
  averageRating: number;
  responseRate: number;
  unreadMessages: number;
}

function StatCard({ 
  title, 
  value, 
  icon: Icon, 
  subtitle,
  color = 'blue'
}: { 
  title: string; 
  value: string | number; 
  icon: React.ElementType; 
  subtitle?: string;
  color?: 'blue' | 'green' | 'yellow' | 'purple';
}) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    purple: 'bg-purple-50 text-purple-600',
  };

  return (
    <div className="bg-white rounded-lg border p-6">
      <div className="flex items-center gap-4">
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          <Icon className="h-6 w-6" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
    </div>
  );
}

function OrderItem({ order }: { order: any }) {
  const statusColors: Record<string, string> = {
    IN_PROGRESS: 'bg-blue-100 text-blue-800',
    DELIVERED: 'bg-yellow-100 text-yellow-800',
    REVISION_REQUESTED: 'bg-orange-100 text-orange-800',
    COMPLETED: 'bg-green-100 text-green-800',
  };

  return (
    <div className="flex items-center justify-between py-3 border-b last:border-0">
      <div className="flex items-center gap-3">
        <img 
          src={order.buyer?.avatar || `https://ui-avatars.com/api/?name=${order.buyer?.firstName}`}
          alt={order.buyer?.username}
          className="w-10 h-10 rounded-full"
        />
        <div>
          <p className="font-medium">{order.package?.name || order.service?.title}</p>
          <p className="text-sm text-muted-foreground">
            {order.buyer?.firstName} {order.buyer?.lastName}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <span className={`px-2 py-1 text-xs rounded-full ${statusColors[order.status] || 'bg-gray-100'}`}>
          {order.status.replace('_', ' ')}
        </span>
        <span className="font-medium">R{Number(order.totalAmount).toFixed(2)}</span>
      </div>
    </div>
  );
}

export default function SellerDashboardPage() {
  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ['seller-stats'],
    queryFn: async () => {
      const [earnings, orders] = await Promise.all([
        api.get('/payments/earnings'),
        api.get('/orders?selling=true'),
      ]);
      
      const ordersData = (orders as any).data.data.orders;
      const earningsData = (earnings as any).data.data;
      
      return {
        totalEarnings: earningsData.totalEarnings || 0,
        pendingEarnings: earningsData.pendingEarnings || 0,
        totalOrders: ordersData.length,
        activeOrders: ordersData.filter((o: any) => 
          ['IN_PROGRESS', 'DELIVERED', 'REVISION_REQUESTED'].includes(o.status)
        ).length,
        completedOrders: ordersData.filter((o: any) => o.status === 'COMPLETED').length,
        totalReviews: 0,
        averageRating: 0,
        responseRate: 95,
        unreadMessages: 0,
      };
    },
  });

  const { data: recentOrders } = useQuery({
    queryKey: ['seller-recent-orders'],
    queryFn: async () => {
      const res = await api.get('/orders?selling=true&limit=5');
      return (res as any).data.data.orders;
    },
  });

  if (statsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Seller Dashboard</h1>
          <p className="text-muted-foreground">Welcome back! Here's an overview of your business.</p>
        </div>
        <Link
          to="/seller/services/new"
          className="inline-flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90"
        >
          <PlusIcon className="h-5 w-5" />
          Create Service
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Total Earnings"
          value={`R${stats?.totalEarnings.toFixed(2) || '0.00'}`}
          icon={CurrencyDollarIcon}
          color="green"
          subtitle={`R${stats?.pendingEarnings.toFixed(2) || '0.00'} pending`}
        />
        <StatCard
          title="Active Orders"
          value={stats?.activeOrders || 0}
          icon={ShoppingBagIcon}
          color="blue"
          subtitle={`${stats?.completedOrders || 0} completed`}
        />
        <StatCard
          title="Messages"
          value={stats?.unreadMessages || 0}
          icon={ChatBubbleLeftRightIcon}
          color="purple"
          subtitle="unread"
        />
        <StatCard
          title="Rating"
          value={stats?.averageRating?.toFixed(1) || 'N/A'}
          icon={StarIcon}
          color="yellow"
          subtitle={`${stats?.totalReviews || 0} reviews`}
        />
      </div>

      {/* Quick Actions + Recent Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Orders */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg border">
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="font-semibold">Recent Orders</h2>
              <Link to="/seller/orders" className="text-sm text-primary hover:underline">
                View all
              </Link>
            </div>
            <div className="p-4">
              {recentOrders && recentOrders.length > 0 ? (
                recentOrders.map((order: any) => (
                  <OrderItem key={order.id} order={order} />
                ))
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  No orders yet. Start by creating a service!
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="space-y-4">
          <div className="bg-white rounded-lg border p-4">
            <h2 className="font-semibold mb-4">Quick Actions</h2>
            <div className="space-y-2">
              <Link
                to="/seller/services"
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <ShoppingBagIcon className="h-5 w-5 text-muted-foreground" />
                <span>Manage Services</span>
              </Link>
              <Link
                to="/seller/orders"
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <ClockIcon className="h-5 w-5 text-muted-foreground" />
                <span>View Orders</span>
              </Link>
              <Link
                to="/seller/crm"
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <ChatBubbleLeftRightIcon className="h-5 w-5 text-muted-foreground" />
                <span>CRM Dashboard</span>
              </Link>
              <Link
                to="/seller/earnings"
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <CurrencyDollarIcon className="h-5 w-5 text-muted-foreground" />
                <span>View Earnings</span>
              </Link>
            </div>
          </div>

          {/* Performance Card */}
          <div className="bg-white rounded-lg border p-4">
            <h2 className="font-semibold mb-4">Performance</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Response Rate</span>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{stats?.responseRate || 0}%</span>
                  <CheckCircleIcon className="h-4 w-4 text-green-500" />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Order Completion</span>
                <div className="flex items-center gap-2">
                  <span className="font-medium">
                    {stats?.totalOrders 
                      ? Math.round((stats.completedOrders / stats.totalOrders) * 100)
                      : 0}%
                  </span>
                  <CheckCircleIcon className="h-4 w-4 text-green-500" />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Customer Rating</span>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{stats?.averageRating?.toFixed(1) || 'N/A'}</span>
                  <StarIcon className="h-4 w-4 text-yellow-500" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
