import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import {
  ArrowPathIcon,
  ArrowTrendingUpIcon,
  UsersIcon,
  ShoppingBagIcon,
  CurrencyDollarIcon,
  EyeIcon,
  AcademicCapIcon,
  StarIcon,
  ChatBubbleLeftRightIcon,
  Squares2X2Icon,
} from '@heroicons/react/24/outline';
import { cn } from '../../lib/utils';

interface AnalyticsData {
  overview: {
    totalUsers: number;
    totalSellers: number;
    totalOrders: number;
    totalGMV: number;
    totalPlatformRevenue: number;
    totalSellerPayouts: number;
    totalServices: number;
    totalCourses: number;
    totalEnrollments: number;
    totalConversations: number;
    platformConversionRate: number;
  };
  monthlyData: {
    month: string;
    revenue: number;
    orders: number;
    users: number;
    isPartial?: boolean;
  }[];
  ordersByStatus: {
    status: string;
    count: number;
    totalAmount: number;
  }[];
  topServices: {
    id: string;
    title: string;
    seller: string;
    orderCount: number;
    viewCount: number;
    rating: number;
    reviewCount: number;
    startingPrice: number;
  }[];
  topCourses: {
    id: string;
    title: string;
    instructor: string;
    enrollCount: number;
    rating: number;
    reviewCount: number;
    price: number;
  }[];
}

function StatCard({
  title,
  value,
  icon: Icon,
  subtitle,
  color,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  subtitle?: string;
  color: string;
}) {
  return (
    <div className="bg-background border rounded-lg p-5">
      <div className="flex items-center gap-4">
        <div className={`p-3 rounded-lg ${color}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground truncate">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
    </div>
  );
}

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, []);

  async function loadAnalytics() {
    try {
      setLoading(true);
      const res = await api.get<{ success: boolean; data: AnalyticsData }>('/admin/analytics');
      setData(res.data as unknown as AnalyticsData);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <ArrowPathIcon className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-16">
        <ArrowTrendingUpIcon className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
        <h2 className="text-xl font-bold mb-2">Analytics Unavailable</h2>
        <p className="text-muted-foreground">Unable to load analytics data.</p>
      </div>
    );
  }

  const o = data.overview;
  const maxRevenue = Math.max(...data.monthlyData.map((d) => d.revenue), 1);
  const maxOrders = Math.max(...data.monthlyData.map((d) => d.orders), 1);

  const statusConfig: Record<string, { label: string; color: string; bgColor: string }> = {
    PENDING_PAYMENT: { label: 'Pending Payment', color: 'text-gray-600', bgColor: 'bg-gray-100' },
    IN_PROGRESS: { label: 'In Progress', color: 'text-blue-600', bgColor: 'bg-blue-100' },
    DELIVERED: { label: 'Delivered', color: 'text-yellow-600', bgColor: 'bg-yellow-100' },
    REVISION_REQUESTED: { label: 'Revision', color: 'text-orange-600', bgColor: 'bg-orange-100' },
    COMPLETED: { label: 'Completed', color: 'text-green-600', bgColor: 'bg-green-100' },
    CANCELLED: { label: 'Cancelled', color: 'text-red-600', bgColor: 'bg-red-100' },
    DISPUTED: { label: 'Disputed', color: 'text-red-600', bgColor: 'bg-red-100' },
  };

  const totalOrderCount = data.ordersByStatus.reduce((sum, s) => sum + s.count, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ArrowTrendingUpIcon className="h-7 w-7" />
          Platform Analytics
        </h1>
        <p className="text-muted-foreground">
          Comprehensive overview of all platform activity and performance metrics.
        </p>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        <StatCard
          title="Platform Revenue"
          value={`R${o.totalPlatformRevenue.toFixed(0)}`}
          icon={CurrencyDollarIcon}
          color="bg-green-50 text-green-600"
          subtitle={`R${o.totalGMV.toFixed(0)} GMV`}
        />
        <StatCard
          title="Total Users"
          value={o.totalUsers.toLocaleString()}
          icon={UsersIcon}
          color="bg-blue-50 text-blue-600"
          subtitle={`${o.totalSellers} sellers`}
        />
        <StatCard
          title="Total Orders"
          value={o.totalOrders.toLocaleString()}
          icon={ShoppingBagIcon}
          color="bg-purple-50 text-purple-600"
          subtitle={`${o.platformConversionRate}% conversion`}
        />
        <StatCard
          title="Services"
          value={o.totalServices}
          icon={Squares2X2Icon}
          color="bg-indigo-50 text-indigo-600"
          subtitle={`${o.totalCourses} courses`}
        />
        <StatCard
          title="Conversations"
          value={o.totalConversations.toLocaleString()}
          icon={ChatBubbleLeftRightIcon}
          color="bg-rose-50 text-rose-600"
          subtitle={`${o.totalEnrollments} enrollments`}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Revenue Chart */}
        <div className="bg-background border rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-semibold">Monthly Revenue</h3>
              <p className="text-sm text-muted-foreground">Platform revenue over last 6 months</p>
            </div>
            <CurrencyDollarIcon className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="flex items-end gap-3 h-40">
            {data.monthlyData.map((item) => {
              const height = maxRevenue > 0 ? (item.revenue / maxRevenue) * 100 : 0;
              const monthLabel = new Date(item.month + '-01').toLocaleDateString('en-ZA', {
                month: 'short',
              });
              return (
                <div key={item.month} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs font-medium text-muted-foreground">
                    {item.revenue > 0 ? `R${item.revenue.toFixed(0)}` : ''}
                  </span>
                  <div
                    className={cn(
                      'w-full rounded-t-md transition-all',
                      item.revenue > 0
                        ? item.isPartial ? 'bg-green-300 border border-dashed border-green-500' : 'bg-green-500'
                        : 'bg-muted'
                    )}
                    style={{ height: `${Math.max(height, 4)}%` }}
                  />
                  <span className="text-xs text-muted-foreground">
                    {monthLabel}{item.isPartial ? '*' : ''}
                  </span>
                </div>
              );
            })}
          </div>
          {data.monthlyData.some((d) => d.isPartial) && (
            <p className="text-xs text-muted-foreground mt-2">* Current month (partial data)</p>
          )}
        </div>

        {/* Monthly Orders Chart */}
        <div className="bg-background border rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-semibold">Monthly Orders</h3>
              <p className="text-sm text-muted-foreground">Order volume over last 6 months</p>
            </div>
            <ShoppingBagIcon className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="flex items-end gap-3 h-40">
            {data.monthlyData.map((item) => {
              const height = maxOrders > 0 ? (item.orders / maxOrders) * 100 : 0;
              const monthLabel = new Date(item.month + '-01').toLocaleDateString('en-ZA', {
                month: 'short',
              });
              return (
                <div key={item.month} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs font-medium text-muted-foreground">
                    {item.orders > 0 ? item.orders : ''}
                  </span>
                  <div
                    className={cn(
                      'w-full rounded-t-md transition-all',
                      item.orders > 0
                        ? item.isPartial ? 'bg-blue-300 border border-dashed border-blue-500' : 'bg-blue-500'
                        : 'bg-muted'
                    )}
                    style={{ height: `${Math.max(height, 4)}%` }}
                  />
                  <span className="text-xs text-muted-foreground">
                    {monthLabel}{item.isPartial ? '*' : ''}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* User Growth + Order Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Growth */}
        <div className="bg-background border rounded-lg p-6">
          <h3 className="font-semibold mb-4">New User Signups</h3>
          <div className="space-y-3">
            {data.monthlyData.map((item) => {
              const monthLabel = new Date(item.month + '-01').toLocaleDateString('en-ZA', {
                month: 'short', year: 'numeric',
              });
              const maxUsers = Math.max(...data.monthlyData.map((d) => d.users), 1);
              const width = maxUsers > 0 ? (item.users / maxUsers) * 100 : 0;
              return (
                <div key={item.month}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-muted-foreground">{monthLabel}{item.isPartial ? '*' : ''}</span>
                    <span className="font-medium">{item.users}</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-blue-400 rounded-full" style={{ width: `${width}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Order Status Breakdown */}
        <div className="bg-background border rounded-lg p-6">
          <h3 className="font-semibold mb-4">Order Status Breakdown</h3>
          {data.ordersByStatus.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No orders yet</p>
          ) : (
            <div className="space-y-3">
              {data.ordersByStatus.map((item) => {
                const config = statusConfig[item.status] || {
                  label: item.status.replace(/_/g, ' '),
                  color: 'text-gray-600',
                  bgColor: 'bg-gray-100',
                };
                const percentage = totalOrderCount > 0 ? (item.count / totalOrderCount) * 100 : 0;
                return (
                  <div key={item.status}>
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-sm font-medium ${config.color}`}>{config.label}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">{item.count}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded ${config.bgColor} ${config.color}`}>
                          {percentage.toFixed(0)}%
                        </span>
                      </div>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className={cn('h-full rounded-full', config.bgColor)} style={{ width: `${percentage}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Revenue Summary */}
      <div className="bg-background border rounded-lg p-6">
        <h3 className="font-semibold mb-4">Revenue Breakdown</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-green-50 rounded-lg">
            <p className="text-sm text-green-700">Total GMV (Gross)</p>
            <p className="text-2xl font-bold text-green-800">R{o.totalGMV.toFixed(2)}</p>
          </div>
          <div className="p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-700">Platform Revenue</p>
            <p className="text-2xl font-bold text-blue-800">R{o.totalPlatformRevenue.toFixed(2)}</p>
          </div>
          <div className="p-4 bg-purple-50 rounded-lg">
            <p className="text-sm text-purple-700">Seller Payouts</p>
            <p className="text-2xl font-bold text-purple-800">R{o.totalSellerPayouts.toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* Top Services Table */}
      <div className="bg-background border rounded-lg">
        <div className="p-4 border-b">
          <h3 className="font-semibold">Top Services</h3>
          <p className="text-sm text-muted-foreground">By order volume</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Service</th>
                <th className="text-left px-4 py-3 font-medium">Seller</th>
                <th className="text-right px-4 py-3 font-medium">Orders</th>
                <th className="text-right px-4 py-3 font-medium">Views</th>
                <th className="text-right px-4 py-3 font-medium">Rating</th>
                <th className="text-right px-4 py-3 font-medium">Price</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.topServices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    No services yet
                  </td>
                </tr>
              ) : (
                data.topServices.map((s) => (
                  <tr key={s.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium truncate max-w-[200px]">{s.title}</td>
                    <td className="px-4 py-3 text-muted-foreground">{s.seller}</td>
                    <td className="px-4 py-3 text-right">{s.orderCount}</td>
                    <td className="px-4 py-3 text-right">{s.viewCount.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right">
                      {s.rating > 0 ? (
                        <span className="flex items-center justify-end gap-1">
                          {s.rating.toFixed(1)} <StarIcon className="h-3.5 w-3.5 text-yellow-500" />
                        </span>
                      ) : '-'}
                    </td>
                    <td className="px-4 py-3 text-right">R{s.startingPrice.toFixed(0)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Top Courses Table */}
      <div className="bg-background border rounded-lg">
        <div className="p-4 border-b">
          <h3 className="font-semibold">Top Courses</h3>
          <p className="text-sm text-muted-foreground">By enrollment count</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Course</th>
                <th className="text-left px-4 py-3 font-medium">Instructor</th>
                <th className="text-right px-4 py-3 font-medium">Students</th>
                <th className="text-right px-4 py-3 font-medium">Rating</th>
                <th className="text-right px-4 py-3 font-medium">Price</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.topCourses.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                    No courses yet
                  </td>
                </tr>
              ) : (
                data.topCourses.map((c) => (
                  <tr key={c.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium truncate max-w-[200px]">{c.title}</td>
                    <td className="px-4 py-3 text-muted-foreground">{c.instructor}</td>
                    <td className="px-4 py-3 text-right">{c.enrollCount}</td>
                    <td className="px-4 py-3 text-right">
                      {c.rating > 0 ? (
                        <span className="flex items-center justify-end gap-1">
                          {c.rating.toFixed(1)} <StarIcon className="h-3.5 w-3.5 text-yellow-500" />
                        </span>
                      ) : '-'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {c.price > 0 ? `R${c.price.toFixed(0)}` : 'Free'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
