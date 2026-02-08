import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api, conversationsApi } from '../../lib/api';
import { useAuthStore } from '../../stores/auth.store';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { 
  ShoppingBagIcon, 
  ChatBubbleLeftRightIcon, 
  CreditCardIcon,
  ArrowRightIcon,
  EnvelopeIcon,
} from '@heroicons/react/24/outline';
import { formatCurrency } from '../../lib/utils';

export default function DashboardPage() {
  const { user } = useAuthStore();

  const { data: orders } = useQuery({
    queryKey: ['orders', 'recent'],
    queryFn: () => api.get<any>('/orders/buying', { params: { limit: 5 } }),
  });

  const { data: conversationsData } = useQuery({
    queryKey: ['conversations', 'dashboard'],
    queryFn: () => conversationsApi.list({ limit: 10 }),
  });

  const activeOrders = orders?.data?.orders?.filter((o: any) => 
    ['IN_PROGRESS', 'DELIVERED', 'REVISION_REQUESTED'].includes(o.status)
  ) || [];

  return (
    <div className="space-y-6">
      {/* Welcome header */}
      <div>
        <h1 className="text-2xl font-bold">Welcome back, {user?.firstName || user?.username}!</h1>
        <p className="text-muted-foreground">Here's what's happening with your account</p>
      </div>

      {/* Become seller CTA */}
      {!user?.isSeller && (
        <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold mb-1">Start selling on Zomieks</h2>
                <p className="text-muted-foreground">Share your skills and start earning today</p>
              </div>
              <Link to="/become-seller">
                <Button>
                  Become a Seller
                  <ArrowRightIcon className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-4">
              <div className="p-3 rounded-full bg-primary/10">
                <ShoppingBagIcon className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Orders</p>
                <p className="text-2xl font-bold">{activeOrders.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-4">
              <div className="p-3 rounded-full bg-blue-500/10">
                <ChatBubbleLeftRightIcon className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Unread Messages</p>
                <p className="text-2xl font-bold">0</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-4">
              <div className="p-3 rounded-full bg-purple-500/10">
                <CreditCardIcon className="h-6 w-6 text-purple-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Subscriptions</p>
                <p className="text-2xl font-bold">0</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Inbox / Messages */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <EnvelopeIcon className="h-5 w-5" />
            Inbox
          </CardTitle>
          <Link to="/messages" className="text-sm text-primary hover:underline">
            View all
          </Link>
        </CardHeader>
        <CardContent>
          {!conversationsData?.data?.conversations?.length ? (
            <div className="text-center py-8">
              <ChatBubbleLeftRightIcon className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-muted-foreground">No messages yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {conversationsData.data.conversations.map((conv: any) => (
                <Link
                  key={conv.id}
                  to={`/messages/${conv.id}`}
                  className="flex items-center gap-3 p-3 rounded-xl border hover:bg-muted/50 transition-colors"
                >
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center text-white text-sm font-bold shrink-0">
                    {conv.otherUser?.firstName?.charAt(0) || conv.otherUser?.username?.charAt(0) || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-sm truncate">
                        {conv.otherUser?.firstName
                          ? `${conv.otherUser.firstName} ${conv.otherUser.lastName || ''}`.trim()
                          : conv.otherUser?.username || 'User'}
                      </p>
                      {conv.lastMessage?.createdAt && (
                        <span className="text-xs text-muted-foreground shrink-0 ml-2">
                          {new Date(conv.lastMessage.createdAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {conv.lastMessage?.content || 'No messages yet'}
                    </p>
                  </div>
                  {conv.unreadCount > 0 && (
                    <span className="bg-primary text-white text-xs font-bold px-2 py-0.5 rounded-full shrink-0">
                      {conv.unreadCount}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent orders */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent Orders</CardTitle>
          <Link to="/orders" className="text-sm text-primary hover:underline">
            View all
          </Link>
        </CardHeader>
        <CardContent>
          {orders?.data?.orders?.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">You haven't placed any orders yet</p>
              <Link to="/services">
                <Button>Browse Services</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {orders?.data?.orders?.slice(0, 5).map((order: any) => (
                <Link 
                  key={order.id} 
                  to={`/orders/${order.id}`}
                  className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <img 
                      src={order.service?.images?.[0] || '/placeholder.png'} 
                      alt="" 
                      className="h-12 w-12 rounded object-cover"
                    />
                    <div>
                      <p className="font-medium">{order.service?.title}</p>
                      <p className="text-sm text-muted-foreground">
                        Order #{order.orderNumber}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{formatCurrency(order.totalAmount)}</p>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      order.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                      order.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700' :
                      order.status === 'DELIVERED' ? 'bg-purple-100 text-purple-700' :
                      'bg-muted text-muted-foreground'
                    }`}>
                      {order.status.replace('_', ' ')}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
