import { useEffect, useState, useCallback } from 'react';
import { api } from '../../lib/api';
import { toast } from 'sonner';
import {
  PlusIcon,
  ArrowPathIcon,
  MagnifyingGlassIcon,
  StarIcon,
  ChartBarIcon,
  ChatBubbleLeftRightIcon,
  ShoppingBagIcon,
  DocumentTextIcon,
  UserGroupIcon,
  PencilIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarSolid } from '@heroicons/react/24/solid';

// ============ TYPES ============

interface SellerProfile {
  id: string;
  displayName: string;
  professionalTitle: string;
  description: string;
  skills: string[];
  rating: number;
  reviewCount: number;
  completedOrders: number;
  responseTimeMinutes: number | null;
  onTimeDeliveryRate: number;
  level: number;
  isAvailable: boolean;
  subscription: { status: string } | null;
}

interface ManagedSeller {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  avatar: string | null;
  isSeller: boolean;
  isAdmin: boolean;
  createdAt: string;
  sellerProfile: SellerProfile | null;
  _count: { sellerOrders: number; services: number; receivedReviews?: number };
}

interface SellerDetails {
  seller: ManagedSeller & {
    services: any[];
    sellerOrders: any[];
    sellerConversations: any[];
    receivedReviews: any[];
    bankDetails: any;
  };
  metrics: any[];
}

interface ManagedUser {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  avatar: string | null;
  createdAt: string;
  _count: { reviews: number };
}

// ============ MAIN COMPONENT ============

export default function AdminSellerManagementPage() {
  const [sellers, setSellers] = useState<ManagedSeller[]>([]);
  const [selectedSeller, setSelectedSeller] = useState<SellerDetails | null>(null);
  const [managedUsers, setManagedUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'orders' | 'conversations' | 'services' | 'reviews' | 'analytics' | 'users'>('overview');
  const [showCreateSeller, setShowCreateSeller] = useState(false);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [showCreateReview, setShowCreateReview] = useState(false);
  const [showEditStats, setShowEditStats] = useState(false);
  const [showEditMetrics, setShowEditMetrics] = useState(false);
  const [search, setSearch] = useState('');

  const loadSellers = useCallback(async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = {};
      if (search) params.search = search;
      const res = await api.get<any>(`/admin/sellers/managed?${new URLSearchParams(params)}`);
      setSellers(res.data?.sellers || []);
    } catch {
      toast.error('Failed to load sellers');
    } finally {
      setLoading(false);
    }
  }, [search]);

  const loadSellerDetails = useCallback(async (sellerId: string) => {
    try {
      setDetailLoading(true);
      const res = await api.get<any>(`/admin/sellers/managed/${sellerId}`);
      setSelectedSeller(res.data);
    } catch {
      toast.error('Failed to load seller details');
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const loadManagedUsers = useCallback(async () => {
    try {
      const res = await api.get<any>('/admin/users/managed');
      setManagedUsers(res.data?.users || []);
    } catch {
      // Silently handle
    }
  }, []);

  useEffect(() => {
    loadSellers();
    loadManagedUsers();
  }, [loadSellers, loadManagedUsers]);

  const selectSeller = (seller: ManagedSeller) => {
    loadSellerDetails(seller.id);
    setActiveTab('overview');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Seller Management</h1>
          <p className="text-muted-foreground">Create and manage seller accounts, reviews, and analytics</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowCreateUser(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium border rounded-lg hover:bg-muted"
          >
            <UserGroupIcon className="h-4 w-4" /> Create User
          </button>
          <button
            onClick={() => setShowCreateSeller(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
          >
            <PlusIcon className="h-4 w-4" /> Create Seller
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Seller List Sidebar */}
        <div className="lg:col-span-1 space-y-4">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadSellers()}
              placeholder="Search sellers..."
              className="w-full h-9 pl-9 pr-4 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div className="bg-background border rounded-lg divide-y max-h-[calc(100vh-280px)] overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <ArrowPathIcon className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : sellers.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                No sellers created yet. Click "Create Seller" to add one.
              </div>
            ) : (
              sellers.map((seller) => (
                <button
                  key={seller.id}
                  onClick={() => selectSeller(seller)}
                  className={`w-full text-left p-3 hover:bg-muted/50 transition-colors ${
                    selectedSeller?.seller?.id === seller.id ? 'bg-primary/5 border-l-2 border-l-primary' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {seller.avatar ? (
                      <img src={seller.avatar} alt="" className="h-9 w-9 rounded-full object-cover" />
                    ) : (
                      <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                        {seller.firstName?.charAt(0)}{seller.lastName?.charAt(0)}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{seller.sellerProfile?.displayName || `${seller.firstName} ${seller.lastName}`}</p>
                      <p className="text-xs text-muted-foreground truncate">@{seller.username}</p>
                    </div>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                      seller.sellerProfile?.subscription?.status === 'ACTIVE'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {seller.sellerProfile?.subscription?.status === 'ACTIVE' ? 'Pro' : 'Free'}
                    </span>
                  </div>
                  <div className="mt-1.5 flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{seller._count?.services || 0} services</span>
                    <span>{seller._count?.sellerOrders || 0} orders</span>
                    <span className="flex items-center gap-0.5">
                      <StarSolid className="h-3 w-3 text-yellow-500" />
                      {Number(seller.sellerProfile?.rating || 0).toFixed(1)}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3">
          {!selectedSeller ? (
            <div className="bg-background border rounded-lg p-12 text-center">
              <UserGroupIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Select a Seller</h3>
              <p className="text-muted-foreground text-sm">
                Choose a seller from the list to manage their profile, orders, conversations, and analytics.
              </p>
            </div>
          ) : detailLoading ? (
            <div className="flex items-center justify-center py-20">
              <ArrowPathIcon className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Seller Header */}
              <div className="bg-background border rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center text-lg font-bold text-primary">
                      {selectedSeller.seller.firstName?.charAt(0)}{selectedSeller.seller.lastName?.charAt(0)}
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold">{selectedSeller.seller.sellerProfile?.displayName}</h2>
                      <p className="text-sm text-muted-foreground">
                        @{selectedSeller.seller.username} · {selectedSeller.seller.sellerProfile?.professionalTitle}
                      </p>
                      <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <StarSolid className="h-3.5 w-3.5 text-yellow-500" />
                          {Number(selectedSeller.seller.sellerProfile?.rating || 0).toFixed(1)} ({selectedSeller.seller.sellerProfile?.reviewCount || 0} reviews)
                        </span>
                        <span>{selectedSeller.seller.sellerProfile?.completedOrders || 0} completed orders</span>
                        <span>Level {selectedSeller.seller.sellerProfile?.level || 1}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <PlanSwitcher
                      sellerId={selectedSeller.seller.id}
                      currentPlan={selectedSeller.seller.sellerProfile?.subscription?.status === 'ACTIVE' ? 'pro' : 'free'}
                      onUpdate={() => loadSellerDetails(selectedSeller.seller.id)}
                    />
                    <button
                      onClick={() => setShowEditStats(true)}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs border rounded-lg hover:bg-muted"
                    >
                      <PencilIcon className="h-3.5 w-3.5" /> Edit Stats
                    </button>
                    <button
                      onClick={() => setShowCreateReview(true)}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs bg-yellow-50 text-yellow-700 rounded-lg hover:bg-yellow-100"
                    >
                      <StarIcon className="h-3.5 w-3.5" /> Add Review
                    </button>
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex gap-1 bg-muted/50 p-1 rounded-lg">
                {[
                  { key: 'overview', label: 'Overview', icon: ChartBarIcon },
                  { key: 'orders', label: 'Orders', icon: ShoppingBagIcon },
                  { key: 'conversations', label: 'Inbox', icon: ChatBubbleLeftRightIcon },
                  { key: 'services', label: 'Services', icon: DocumentTextIcon },
                  { key: 'reviews', label: 'Reviews', icon: StarIcon },
                  { key: 'analytics', label: 'Analytics', icon: ChartBarIcon },
                  { key: 'users', label: 'Users', icon: UserGroupIcon },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key as any)}
                    className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      activeTab === tab.key
                        ? 'bg-background shadow-sm text-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <tab.icon className="h-4 w-4" />
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              {activeTab === 'overview' && <OverviewTab seller={selectedSeller} />}
              {activeTab === 'orders' && <OrdersTab orders={selectedSeller.seller.sellerOrders} />}
              {activeTab === 'conversations' && <ConversationsTab conversations={selectedSeller.seller.sellerConversations} />}
              {activeTab === 'services' && <ServicesTab services={selectedSeller.seller.services} />}
              {activeTab === 'reviews' && <ReviewsTab reviews={selectedSeller.seller.receivedReviews} />}
              {activeTab === 'analytics' && (
                <AnalyticsTab
                  metrics={selectedSeller.metrics}
                  sellerId={selectedSeller.seller.id}
                  showEditMetrics={showEditMetrics}
                  setShowEditMetrics={setShowEditMetrics}
                  onUpdate={() => loadSellerDetails(selectedSeller.seller.id)}
                />
              )}
              {activeTab === 'users' && (
                <UsersTab
                  users={managedUsers}
                  onCreateUser={() => setShowCreateUser(true)}
                  onRefresh={loadManagedUsers}
                />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showCreateSeller && (
        <CreateSellerModal
          onClose={() => setShowCreateSeller(false)}
          onCreated={() => { loadSellers(); setShowCreateSeller(false); }}
        />
      )}
      {showCreateUser && (
        <CreateUserModal
          onClose={() => setShowCreateUser(false)}
          onCreated={() => { loadManagedUsers(); setShowCreateUser(false); }}
        />
      )}
      {showCreateReview && selectedSeller && (
        <CreateReviewModal
          seller={selectedSeller.seller}
          users={managedUsers}
          onClose={() => setShowCreateReview(false)}
          onCreated={() => { loadSellerDetails(selectedSeller.seller.id); setShowCreateReview(false); }}
        />
      )}
      {showEditStats && selectedSeller && (
        <EditStatsModal
          seller={selectedSeller.seller}
          onClose={() => setShowEditStats(false)}
          onSaved={() => { loadSellerDetails(selectedSeller.seller.id); setShowEditStats(false); }}
        />
      )}
    </div>
  );
}

// ============ PLAN SWITCHER ============

function PlanSwitcher({ sellerId, currentPlan, onUpdate }: { sellerId: string; currentPlan: 'free' | 'pro'; onUpdate: () => void }) {
  const [updating, setUpdating] = useState(false);

  const toggle = async () => {
    const newPlan = currentPlan === 'pro' ? 'free' : 'pro';
    try {
      setUpdating(true);
      await api.patch(`/admin/sellers/managed/${sellerId}/plan`, { plan: newPlan });
      toast.success(`Plan switched to ${newPlan}`);
      onUpdate();
    } catch {
      toast.error('Failed to update plan');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <button
      onClick={toggle}
      disabled={updating}
      className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
        currentPlan === 'pro'
          ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
          : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
      }`}
    >
      {updating ? '...' : currentPlan === 'pro' ? '✓ Pro Plan' : 'Free Plan'}
    </button>
  );
}

// ============ TAB COMPONENTS ============

function OverviewTab({ seller }: { seller: SellerDetails }) {
  const profile = seller.seller.sellerProfile;
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <StatCard label="Completed Orders" value={profile?.completedOrders || 0} />
      <StatCard label="Rating" value={`${Number(profile?.rating || 0).toFixed(1)} / 5.0`} />
      <StatCard label="Reviews" value={profile?.reviewCount || 0} />
      <StatCard label="Services" value={seller.seller.services?.length || 0} />
      <StatCard label="Level" value={profile?.level || 1} />
      <StatCard label="On-Time Rate" value={`${Number(profile?.onTimeDeliveryRate || 100).toFixed(0)}%`} />

      <div className="md:col-span-3 bg-background border rounded-lg p-4">
        <h3 className="text-sm font-semibold mb-2">Profile Description</h3>
        <p className="text-sm text-muted-foreground">{profile?.description || 'No description'}</p>
        {profile?.skills && profile.skills.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {profile.skills.map((s: string, i: number) => (
              <span key={i} className="px-2 py-0.5 text-xs bg-primary/10 text-primary rounded-full">{s}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-background border rounded-lg p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
    </div>
  );
}

function OrdersTab({ orders }: { orders: any[] }) {
  if (!orders?.length) return <EmptyState message="No orders yet" />;
  return (
    <div className="bg-background border rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 border-b">
          <tr>
            <th className="text-left px-4 py-3 font-medium">Order</th>
            <th className="text-left px-4 py-3 font-medium">Buyer</th>
            <th className="text-left px-4 py-3 font-medium">Service</th>
            <th className="text-left px-4 py-3 font-medium">Status</th>
            <th className="text-left px-4 py-3 font-medium">Amount</th>
            <th className="text-left px-4 py-3 font-medium">Date</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {orders.map((o: any) => (
            <tr key={o.id} className="hover:bg-muted/30">
              <td className="px-4 py-3 font-mono text-xs">{o.orderNumber}</td>
              <td className="px-4 py-3">{o.buyer?.firstName || o.buyer?.username}</td>
              <td className="px-4 py-3 max-w-[200px] truncate">{o.service?.title}</td>
              <td className="px-4 py-3">
                <StatusBadge status={o.status} />
              </td>
              <td className="px-4 py-3">R{Number(o.totalAmount).toFixed(2)}</td>
              <td className="px-4 py-3 text-muted-foreground">{new Date(o.createdAt).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ConversationsTab({ conversations }: { conversations: any[] }) {
  if (!conversations?.length) return <EmptyState message="No conversations yet" />;
  return (
    <div className="bg-background border rounded-lg divide-y">
      {conversations.map((c: any) => (
        <div key={c.id} className="p-4 hover:bg-muted/30 transition-colors">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {c.buyer?.avatar ? (
                <img src={c.buyer.avatar} alt="" className="h-8 w-8 rounded-full object-cover" />
              ) : (
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                  {c.buyer?.firstName?.charAt(0) || '?'}
                </div>
              )}
              <div>
                <p className="text-sm font-medium">{c.buyer?.username || 'Unknown'}</p>
                <p className="text-xs text-muted-foreground truncate max-w-[300px]">
                  {c.messages?.[0]?.content || 'No messages'}
                </p>
              </div>
            </div>
            <div className="text-xs text-muted-foreground">
              {c._count?.messages || 0} messages
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ServicesTab({ services }: { services: any[] }) {
  if (!services?.length) return <EmptyState message="No services yet" />;
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {services.map((s: any) => (
        <div key={s.id} className="bg-background border rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold truncate">{s.title}</h3>
            <StatusBadge status={s.status} />
          </div>
          <p className="text-xs text-muted-foreground mb-2">{s.category?.name || 'Uncategorized'}</p>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>{s._count?.orders || 0} orders</span>
            <span>{s._count?.reviews || 0} reviews</span>
            {s.packages?.[0] && <span>From R{Number(s.packages[0].price).toFixed(0)}</span>}
          </div>
        </div>
      ))}
    </div>
  );
}

function ReviewsTab({ reviews }: { reviews: any[] }) {
  if (!reviews?.length) return <EmptyState message="No reviews yet. Add one using the 'Add Review' button above." />;
  return (
    <div className="space-y-3">
      {reviews.map((r: any) => (
        <div key={r.id} className="bg-background border rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              {r.author?.avatar ? (
                <img src={r.author.avatar} alt="" className="h-7 w-7 rounded-full object-cover" />
              ) : (
                <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                  {r.author?.firstName?.charAt(0) || '?'}
                </div>
              )}
              <span className="text-sm font-medium">{r.author?.firstName} {r.author?.lastName}</span>
              <span className="text-xs text-muted-foreground">@{r.author?.username}</span>
            </div>
            <div className="flex items-center gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <StarSolid key={i} className={`h-3.5 w-3.5 ${i < r.rating ? 'text-yellow-500' : 'text-gray-200'}`} />
              ))}
            </div>
          </div>
          <p className="text-sm text-muted-foreground">{r.comment}</p>
          <p className="text-xs text-muted-foreground mt-2">
            For: {r.service?.title} · {new Date(r.createdAt).toLocaleDateString()}
          </p>
        </div>
      ))}
    </div>
  );
}

function AnalyticsTab({ metrics, sellerId, showEditMetrics, setShowEditMetrics, onUpdate }: {
  metrics: any[];
  sellerId: string;
  showEditMetrics: boolean;
  setShowEditMetrics: (v: boolean) => void;
  onUpdate: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Seller Metrics (Last 30 days)</h3>
        <button
          onClick={() => setShowEditMetrics(true)}
          className="flex items-center gap-1 px-3 py-1.5 text-xs border rounded-lg hover:bg-muted"
        >
          <PencilIcon className="h-3.5 w-3.5" /> Add/Edit Metrics
        </button>
      </div>

      {metrics?.length > 0 ? (
        <div className="bg-background border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Date</th>
                <th className="text-left px-4 py-3 font-medium">Orders</th>
                <th className="text-left px-4 py-3 font-medium">Completed</th>
                <th className="text-left px-4 py-3 font-medium">Gross Revenue</th>
                <th className="text-left px-4 py-3 font-medium">Net Revenue</th>
                <th className="text-left px-4 py-3 font-medium">Avg Rating</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {metrics.map((m: any) => (
                <tr key={m.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3">{new Date(m.date).toLocaleDateString()}</td>
                  <td className="px-4 py-3">{m.ordersReceived}</td>
                  <td className="px-4 py-3">{m.ordersCompleted}</td>
                  <td className="px-4 py-3">R{Number(m.grossRevenue).toFixed(2)}</td>
                  <td className="px-4 py-3">R{Number(m.netRevenue).toFixed(2)}</td>
                  <td className="px-4 py-3">{m.avgRating ? Number(m.avgRating).toFixed(1) : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState message="No metrics recorded. Click 'Add/Edit Metrics' to set demo data." />
      )}

      {showEditMetrics && (
        <EditMetricsModal
          sellerId={sellerId}
          onClose={() => setShowEditMetrics(false)}
          onSaved={() => { onUpdate(); setShowEditMetrics(false); }}
        />
      )}
    </div>
  );
}

function UsersTab({ users, onCreateUser }: { users: ManagedUser[]; onCreateUser: () => void; onRefresh: () => void }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Admin-Created Users ({users.length})</h3>
        <button
          onClick={onCreateUser}
          className="flex items-center gap-1 px-3 py-1.5 text-xs bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
        >
          <PlusIcon className="h-3.5 w-3.5" /> Create User
        </button>
      </div>

      {users.length === 0 ? (
        <EmptyState message="No users created yet. Create users to leave reviews on seller profiles." />
      ) : (
        <div className="bg-background border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium">User</th>
                <th className="text-left px-4 py-3 font-medium">Email</th>
                <th className="text-left px-4 py-3 font-medium">Reviews</th>
                <th className="text-left px-4 py-3 font-medium">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                        {u.firstName?.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium">{u.firstName} {u.lastName}</p>
                        <p className="text-xs text-muted-foreground">@{u.username}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                  <td className="px-4 py-3">{u._count?.reviews || 0}</td>
                  <td className="px-4 py-3 text-muted-foreground">{new Date(u.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ============ HELPER COMPONENTS ============

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    COMPLETED: 'bg-green-100 text-green-700',
    IN_PROGRESS: 'bg-blue-100 text-blue-700',
    ACTIVE: 'bg-green-100 text-green-700',
    PENDING_PAYMENT: 'bg-yellow-100 text-yellow-700',
    PENDING_REVIEW: 'bg-yellow-100 text-yellow-700',
    CANCELLED: 'bg-red-100 text-red-700',
    DELIVERED: 'bg-purple-100 text-purple-700',
    DRAFT: 'bg-gray-100 text-gray-600',
    PAUSED: 'bg-gray-100 text-gray-600',
  };
  return (
    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${styles[status] || 'bg-gray-100 text-gray-600'}`}>
      {status?.replace(/_/g, ' ')}
    </span>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="bg-background border rounded-lg p-8 text-center">
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

// ============ MODAL COMPONENTS ============

function CreateSellerModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({
    email: '', username: '', password: '', firstName: '', lastName: '',
    displayName: '', professionalTitle: '', description: '', skills: '',
    plan: 'pro' as 'free' | 'pro', country: 'South Africa',
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await api.post('/admin/sellers/create', {
        ...form,
        skills: form.skills.split(',').map(s => s.trim()).filter(Boolean),
      });
      toast.success('Seller created successfully');
      onCreated();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to create seller');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ModalWrapper title="Create Seller Account" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <FormField label="First Name" value={form.firstName} onChange={(v) => setForm({ ...form, firstName: v })} required />
          <FormField label="Last Name" value={form.lastName} onChange={(v) => setForm({ ...form, lastName: v })} required />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Email" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} required />
          <FormField label="Username" value={form.username} onChange={(v) => setForm({ ...form, username: v.toLowerCase().replace(/[^a-z0-9_-]/g, '') })} required />
        </div>
        <FormField label="Password" type="password" value={form.password} onChange={(v) => setForm({ ...form, password: v })} required />
        <FormField label="Display Name" value={form.displayName} onChange={(v) => setForm({ ...form, displayName: v })} required />
        <FormField label="Professional Title" value={form.professionalTitle} onChange={(v) => setForm({ ...form, professionalTitle: v })} placeholder="e.g. Logo Designer, Web Developer" required />
        <div>
          <label className="block text-sm font-medium mb-1">Description</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            required
          />
        </div>
        <FormField label="Skills (comma-separated)" value={form.skills} onChange={(v) => setForm({ ...form, skills: v })} placeholder="Logo Design, Branding, Illustration" />

        <div>
          <label className="block text-sm font-medium mb-2">Seller Plan</label>
          <div className="flex gap-3">
            <label className={`flex-1 p-3 border rounded-lg cursor-pointer text-center transition-colors ${form.plan === 'free' ? 'border-primary bg-primary/5' : 'hover:bg-muted'}`}>
              <input type="radio" name="plan" value="free" checked={form.plan === 'free'} onChange={() => setForm({ ...form, plan: 'free' })} className="sr-only" />
              <p className="font-medium text-sm">Free</p>
              <p className="text-xs text-muted-foreground">Basic features</p>
            </label>
            <label className={`flex-1 p-3 border rounded-lg cursor-pointer text-center transition-colors ${form.plan === 'pro' ? 'border-primary bg-primary/5' : 'hover:bg-muted'}`}>
              <input type="radio" name="plan" value="pro" checked={form.plan === 'pro'} onChange={() => setForm({ ...form, plan: 'pro' })} className="sr-only" />
              <p className="font-medium text-sm">Pro (R399/mo)</p>
              <p className="text-xs text-muted-foreground">All features unlocked</p>
            </label>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm border rounded-lg hover:bg-muted">Cancel</button>
          <button type="submit" disabled={submitting} className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50">
            {submitting ? 'Creating...' : 'Create Seller'}
          </button>
        </div>
      </form>
    </ModalWrapper>
  );
}

function CreateUserModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({
    email: '', username: '', password: '', firstName: '', lastName: '', country: 'South Africa',
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await api.post('/admin/users/create', form);
      toast.success('User created successfully');
      onCreated();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to create user');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ModalWrapper title="Create User Account" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <FormField label="First Name" value={form.firstName} onChange={(v) => setForm({ ...form, firstName: v })} required />
          <FormField label="Last Name" value={form.lastName} onChange={(v) => setForm({ ...form, lastName: v })} required />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Email" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} required />
          <FormField label="Username" value={form.username} onChange={(v) => setForm({ ...form, username: v.toLowerCase().replace(/[^a-z0-9_-]/g, '') })} required />
        </div>
        <FormField label="Password" type="password" value={form.password} onChange={(v) => setForm({ ...form, password: v })} required />
        <p className="text-xs text-muted-foreground">This user can be used to leave reviews on seller profiles for marketing purposes.</p>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm border rounded-lg hover:bg-muted">Cancel</button>
          <button type="submit" disabled={submitting} className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50">
            {submitting ? 'Creating...' : 'Create User'}
          </button>
        </div>
      </form>
    </ModalWrapper>
  );
}

function CreateReviewModal({ seller, users, onClose, onCreated }: {
  seller: any;
  users: ManagedUser[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [form, setForm] = useState({
    authorId: '', serviceId: '', rating: 5, comment: '',
    communicationRating: 5, qualityRating: 5, valueRating: 5,
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.authorId || !form.serviceId) {
      toast.error('Please select a user and a service');
      return;
    }
    try {
      setSubmitting(true);
      await api.post('/admin/reviews/create', {
        ...form,
        sellerId: seller.id,
      });
      toast.success('Review created successfully');
      onCreated();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to create review');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ModalWrapper title="Add Review" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Review Author (User)</label>
          <select
            value={form.authorId}
            onChange={(e) => setForm({ ...form, authorId: e.target.value })}
            className="w-full h-10 px-3 rounded-lg border bg-background text-sm"
            required
          >
            <option value="">Select a user...</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.firstName} {u.lastName} (@{u.username})</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Service</label>
          <select
            value={form.serviceId}
            onChange={(e) => setForm({ ...form, serviceId: e.target.value })}
            className="w-full h-10 px-3 rounded-lg border bg-background text-sm"
            required
          >
            <option value="">Select a service...</option>
            {seller.services?.map((s: any) => (
              <option key={s.id} value={s.id}>{s.title}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Overall Rating</label>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setForm({ ...form, rating: star })}
                className="p-0.5"
              >
                <StarSolid className={`h-6 w-6 ${star <= form.rating ? 'text-yellow-500' : 'text-gray-200'}`} />
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <RatingSelect label="Communication" value={form.communicationRating} onChange={(v) => setForm({ ...form, communicationRating: v })} />
          <RatingSelect label="Quality" value={form.qualityRating} onChange={(v) => setForm({ ...form, qualityRating: v })} />
          <RatingSelect label="Value" value={form.valueRating} onChange={(v) => setForm({ ...form, valueRating: v })} />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Comment</label>
          <textarea
            value={form.comment}
            onChange={(e) => setForm({ ...form, comment: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            placeholder="Write the review comment..."
            required
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm border rounded-lg hover:bg-muted">Cancel</button>
          <button type="submit" disabled={submitting} className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50">
            {submitting ? 'Creating...' : 'Add Review'}
          </button>
        </div>
      </form>
    </ModalWrapper>
  );
}

function EditStatsModal({ seller, onClose, onSaved }: { seller: any; onClose: () => void; onSaved: () => void }) {
  const profile = seller.sellerProfile;
  const [form, setForm] = useState({
    rating: String(profile?.rating || 0),
    reviewCount: String(profile?.reviewCount || 0),
    completedOrders: String(profile?.completedOrders || 0),
    responseTimeMinutes: String(profile?.responseTimeMinutes || 30),
    onTimeDeliveryRate: String(profile?.onTimeDeliveryRate || 100),
    level: String(profile?.level || 1),
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await api.patch(`/admin/sellers/managed/${seller.id}/stats`, {
        rating: parseFloat(form.rating),
        reviewCount: parseInt(form.reviewCount),
        completedOrders: parseInt(form.completedOrders),
        responseTimeMinutes: parseInt(form.responseTimeMinutes),
        onTimeDeliveryRate: parseFloat(form.onTimeDeliveryRate),
        level: parseInt(form.level),
      });
      toast.success('Stats updated');
      onSaved();
    } catch {
      toast.error('Failed to update stats');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ModalWrapper title="Edit Seller Stats" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-xs text-muted-foreground">Override seller profile stats for demo and marketing purposes.</p>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Rating (0-5)" value={form.rating} onChange={(v) => setForm({ ...form, rating: v })} type="number" />
          <FormField label="Review Count" value={form.reviewCount} onChange={(v) => setForm({ ...form, reviewCount: v })} type="number" />
          <FormField label="Completed Orders" value={form.completedOrders} onChange={(v) => setForm({ ...form, completedOrders: v })} type="number" />
          <FormField label="Response Time (min)" value={form.responseTimeMinutes} onChange={(v) => setForm({ ...form, responseTimeMinutes: v })} type="number" />
          <FormField label="On-Time Rate (%)" value={form.onTimeDeliveryRate} onChange={(v) => setForm({ ...form, onTimeDeliveryRate: v })} type="number" />
          <div>
            <label className="block text-sm font-medium mb-1">Level</label>
            <select value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })} className="w-full h-10 px-3 rounded-lg border bg-background text-sm">
              <option value="1">Level 1</option>
              <option value="2">Level 2</option>
              <option value="3">Level 3</option>
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm border rounded-lg hover:bg-muted">Cancel</button>
          <button type="submit" disabled={submitting} className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50">
            {submitting ? 'Saving...' : 'Save Stats'}
          </button>
        </div>
      </form>
    </ModalWrapper>
  );
}

function EditMetricsModal({ sellerId, onClose, onSaved }: { sellerId: string; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    ordersReceived: '5',
    ordersCompleted: '4',
    ordersCancelled: '0',
    grossRevenue: '5000',
    platformFees: '400',
    netRevenue: '4600',
    avgDeliveryTimeHrs: '24',
    onTimeDeliveries: '4',
    lateDeliveries: '0',
    reviewsReceived: '3',
    avgRating: '4.8',
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await api.post(`/admin/sellers/managed/${sellerId}/metrics`, {
        date: form.date,
        ordersReceived: parseInt(form.ordersReceived),
        ordersCompleted: parseInt(form.ordersCompleted),
        ordersCancelled: parseInt(form.ordersCancelled),
        grossRevenue: parseFloat(form.grossRevenue),
        platformFees: parseFloat(form.platformFees),
        netRevenue: parseFloat(form.netRevenue),
        avgDeliveryTimeHrs: parseInt(form.avgDeliveryTimeHrs),
        onTimeDeliveries: parseInt(form.onTimeDeliveries),
        lateDeliveries: parseInt(form.lateDeliveries),
        reviewsReceived: parseInt(form.reviewsReceived),
        avgRating: parseFloat(form.avgRating),
      });
      toast.success('Metrics saved');
      onSaved();
    } catch {
      toast.error('Failed to save metrics');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ModalWrapper title="Add/Edit Seller Metrics" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-xs text-muted-foreground">Set daily metrics for demo and marketing analytics display.</p>
        <FormField label="Date" type="date" value={form.date} onChange={(v) => setForm({ ...form, date: v })} required />
        <div className="grid grid-cols-3 gap-3">
          <FormField label="Orders Received" value={form.ordersReceived} onChange={(v) => setForm({ ...form, ordersReceived: v })} type="number" />
          <FormField label="Orders Completed" value={form.ordersCompleted} onChange={(v) => setForm({ ...form, ordersCompleted: v })} type="number" />
          <FormField label="Orders Cancelled" value={form.ordersCancelled} onChange={(v) => setForm({ ...form, ordersCancelled: v })} type="number" />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <FormField label="Gross Revenue (R)" value={form.grossRevenue} onChange={(v) => setForm({ ...form, grossRevenue: v })} type="number" />
          <FormField label="Platform Fees (R)" value={form.platformFees} onChange={(v) => setForm({ ...form, platformFees: v })} type="number" />
          <FormField label="Net Revenue (R)" value={form.netRevenue} onChange={(v) => setForm({ ...form, netRevenue: v })} type="number" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Avg Delivery (hrs)" value={form.avgDeliveryTimeHrs} onChange={(v) => setForm({ ...form, avgDeliveryTimeHrs: v })} type="number" />
          <FormField label="On-Time Deliveries" value={form.onTimeDeliveries} onChange={(v) => setForm({ ...form, onTimeDeliveries: v })} type="number" />
          <FormField label="Reviews Received" value={form.reviewsReceived} onChange={(v) => setForm({ ...form, reviewsReceived: v })} type="number" />
          <FormField label="Avg Rating" value={form.avgRating} onChange={(v) => setForm({ ...form, avgRating: v })} type="number" />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm border rounded-lg hover:bg-muted">Cancel</button>
          <button type="submit" disabled={submitting} className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50">
            {submitting ? 'Saving...' : 'Save Metrics'}
          </button>
        </div>
      </form>
    </ModalWrapper>
  );
}

// ============ SHARED UI COMPONENTS ============

function ModalWrapper({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-background rounded-xl border shadow-lg w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 m-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded-lg">
            <XCircleIcon className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function FormField({ label, value, onChange, type = 'text', placeholder, required }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="w-full h-10 px-3 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
      />
    </div>
  );
}

function RatingSelect({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value))}
        className="w-full h-9 px-2 rounded-lg border bg-background text-sm"
      >
        {[1, 2, 3, 4, 5].map((n) => (
          <option key={n} value={n}>{n} Star{n > 1 ? 's' : ''}</option>
        ))}
      </select>
    </div>
  );
}
