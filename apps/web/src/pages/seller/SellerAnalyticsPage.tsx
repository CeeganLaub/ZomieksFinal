import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '@/lib/api';
import {
  ChartBarIcon,
  CurrencyDollarIcon,
  EyeIcon,
  ShoppingBagIcon,
  StarIcon,
  AcademicCapIcon,
  UsersIcon,
  ArrowTrendingUpIcon,
  HeartIcon,
  CheckCircleIcon,
  LinkIcon,
  Squares2X2Icon,
} from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';

interface AnalyticsData {
  overview: {
    totalRevenue: number;
    totalOrders: number;
    totalServiceViews: number;
    conversionRate: number;
    totalEnrollments: number;
    rating: number;
    reviewCount: number;
    completedOrders: number;
    onTimeDeliveryRate: number;
    responseTimeMinutes: number | null;
    level: number;
  };
  services: {
    id: string;
    title: string;
    slug: string;
    status: string;
    isActive: boolean;
    rating: number;
    reviewCount: number;
    orderCount: number;
    viewCount: number;
    favoriteCount: number;
    startingPrice: number;
    conversionRate: number;
    createdAt: string;
  }[];
  courses: {
    id: string;
    title: string;
    slug: string;
    status: string;
    rating: number;
    reviewCount: number;
    enrollCount: number;
    price: number;
    totalDuration: number;
    estimatedRevenue: number;
    createdAt: string;
  }[];
  biolink: {
    enabled: boolean;
  };
  ordersByStatus: {
    status: string;
    count: number;
    totalAmount: number;
  }[];
  monthlyEarnings: {
    month: string;
    amount: number;
    isPartial?: boolean;
  }[];
  totals: {
    services: {
      count: number;
      activeCount: number;
      totalViews: number;
      totalOrders: number;
      totalFavorites: number;
    };
    courses: {
      count: number;
      publishedCount: number;
      totalEnrollments: number;
      estimatedRevenue: number;
    };
  };
}

function StatCard({
  title,
  value,
  icon: Icon,
  subtitle,
  color = 'blue',
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  subtitle?: string;
  color?: 'blue' | 'green' | 'yellow' | 'purple' | 'rose' | 'indigo';
}) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    purple: 'bg-purple-50 text-purple-600',
    rose: 'bg-rose-50 text-rose-600',
    indigo: 'bg-indigo-50 text-indigo-600',
  };

  return (
    <div className="bg-white rounded-lg border p-5">
      <div className="flex items-center gap-4">
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
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

function EarningsChart({ data }: { data: { month: string; amount: number; isPartial?: boolean }[] }) {
  const maxAmount = Math.max(...data.map((d) => d.amount), 1);

  return (
    <div className="bg-white rounded-lg border p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-semibold">Monthly Earnings</h3>
          <p className="text-sm text-muted-foreground">Last 6 months revenue trend</p>
        </div>
        <ArrowTrendingUpIcon className="h-5 w-5 text-muted-foreground" />
      </div>
      <div className="flex items-end gap-3 h-40">
        {data.map((item) => {
          const height = maxAmount > 0 ? (item.amount / maxAmount) * 100 : 0;
          const monthLabel = new Date(item.month + '-01').toLocaleDateString('en-ZA', {
            month: 'short',
          });
          return (
            <div key={item.month} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-xs font-medium text-muted-foreground">
                {item.amount > 0 ? `R${item.amount.toFixed(0)}` : ''}
              </span>
              <div
                className={cn(
                  'w-full rounded-t-md transition-all',
                  item.amount > 0
                    ? item.isPartial ? 'bg-primary/40 border border-dashed border-primary' : 'bg-primary/80'
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
      {data.some(d => d.isPartial) && (
        <p className="text-xs text-muted-foreground mt-2">* Current month (partial data)</p>
      )}
    </div>
  );
}

function OrderStatusBreakdown({ data }: { data: { status: string; count: number; totalAmount: number }[] }) {
  const statusConfig: Record<string, { label: string; color: string; bgColor: string }> = {
    PENDING_PAYMENT: { label: 'Pending Payment', color: 'text-gray-600', bgColor: 'bg-gray-100' },
    IN_PROGRESS: { label: 'In Progress', color: 'text-blue-600', bgColor: 'bg-blue-100' },
    DELIVERED: { label: 'Delivered', color: 'text-yellow-600', bgColor: 'bg-yellow-100' },
    REVISION_REQUESTED: { label: 'Revision', color: 'text-orange-600', bgColor: 'bg-orange-100' },
    COMPLETED: { label: 'Completed', color: 'text-green-600', bgColor: 'bg-green-100' },
    CANCELLED: { label: 'Cancelled', color: 'text-red-600', bgColor: 'bg-red-100' },
    DISPUTED: { label: 'Disputed', color: 'text-red-600', bgColor: 'bg-red-100' },
  };

  const total = data.reduce((sum, d) => sum + d.count, 0);

  return (
    <div className="bg-white rounded-lg border p-6">
      <h3 className="font-semibold mb-4">Order Status Breakdown</h3>
      {data.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">No orders yet</p>
      ) : (
        <div className="space-y-3">
          {data.map((item) => {
            const config = statusConfig[item.status] || {
              label: item.status.replace(/_/g, ' '),
              color: 'text-gray-600',
              bgColor: 'bg-gray-100',
            };
            const percentage = total > 0 ? (item.count / total) * 100 : 0;
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
                  <div
                    className={cn('h-full rounded-full transition-all', config.bgColor)}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ServiceTable({ services }: { services: AnalyticsData['services'] }) {
  if (services.length === 0) {
    return (
      <div className="bg-white rounded-lg border p-6">
        <h3 className="font-semibold mb-4">Service Performance</h3>
        <div className="text-center py-8">
          <Squares2X2Icon className="h-10 w-10 text-muted-foreground/50 mx-auto mb-2" />
          <p className="text-muted-foreground">No services yet</p>
          <Link to="/seller/services/new" className="text-primary text-sm hover:underline mt-1 inline-block">
            Create your first service →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border">
      <div className="p-4 border-b flex items-center justify-between">
        <h3 className="font-semibold">Service Performance</h3>
        <Link to="/seller/services" className="text-sm text-primary hover:underline">
          View all
        </Link>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Service</th>
              <th className="text-left px-4 py-3 font-medium">Status</th>
              <th className="text-right px-4 py-3 font-medium">Views</th>
              <th className="text-right px-4 py-3 font-medium">Orders</th>
              <th className="text-right px-4 py-3 font-medium">Conv. Rate</th>
              <th className="text-right px-4 py-3 font-medium">Rating</th>
              <th className="text-right px-4 py-3 font-medium">Favorites</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {services.map((service) => (
              <tr key={service.id} className="hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3">
                  <div className="max-w-[200px]">
                    <p className="font-medium truncate">{service.title}</p>
                    <p className="text-xs text-muted-foreground">
                      From R{service.startingPrice.toFixed(0)}
                    </p>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={cn(
                      'px-2 py-1 text-xs rounded-full',
                      service.isActive && service.status === 'ACTIVE'
                        ? 'bg-green-100 text-green-700'
                        : service.status === 'PENDING_REVIEW'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-gray-100 text-gray-600'
                    )}
                  >
                    {service.status === 'ACTIVE' && service.isActive ? 'Active' : service.status.replace(/_/g, ' ')}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">{service.viewCount.toLocaleString()}</td>
                <td className="px-4 py-3 text-right">{service.orderCount}</td>
                <td className="px-4 py-3 text-right">
                  <span className={cn(
                    service.conversionRate > 5 ? 'text-green-600' : service.conversionRate > 0 ? 'text-yellow-600' : 'text-muted-foreground'
                  )}>
                    {service.conversionRate > 0 ? `${service.conversionRate.toFixed(1)}%` : '-'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  {service.rating > 0 ? (
                    <span className="flex items-center justify-end gap-1">
                      {service.rating.toFixed(1)}
                      <StarIcon className="h-3.5 w-3.5 text-yellow-500" />
                    </span>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <span className="flex items-center justify-end gap-1">
                    {service.favoriteCount}
                    <HeartIcon className="h-3.5 w-3.5 text-muted-foreground" />
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CourseTable({ courses }: { courses: AnalyticsData['courses'] }) {
  if (courses.length === 0) {
    return (
      <div className="bg-white rounded-lg border p-6">
        <h3 className="font-semibold mb-4">Course Performance</h3>
        <div className="text-center py-8">
          <AcademicCapIcon className="h-10 w-10 text-muted-foreground/50 mx-auto mb-2" />
          <p className="text-muted-foreground">No courses yet</p>
          <Link to="/seller/courses/new" className="text-primary text-sm hover:underline mt-1 inline-block">
            Create your first course →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border">
      <div className="p-4 border-b flex items-center justify-between">
        <h3 className="font-semibold">Course Performance</h3>
        <Link to="/seller/courses" className="text-sm text-primary hover:underline">
          View all
        </Link>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Course</th>
              <th className="text-left px-4 py-3 font-medium">Status</th>
              <th className="text-right px-4 py-3 font-medium">Students</th>
              <th className="text-right px-4 py-3 font-medium">Rating</th>
              <th className="text-right px-4 py-3 font-medium">Price</th>
              <th className="text-right px-4 py-3 font-medium">Est. Revenue</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {courses.map((course) => (
              <tr key={course.id} className="hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3">
                  <p className="font-medium truncate max-w-[200px]">{course.title}</p>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={cn(
                      'px-2 py-1 text-xs rounded-full',
                      course.status === 'PUBLISHED'
                        ? 'bg-green-100 text-green-700'
                        : course.status === 'DRAFT'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-gray-100 text-gray-600'
                    )}
                  >
                    {course.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <span className="flex items-center justify-end gap-1">
                    {course.enrollCount}
                    <UsersIcon className="h-3.5 w-3.5 text-muted-foreground" />
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  {course.rating > 0 ? (
                    <span className="flex items-center justify-end gap-1">
                      {course.rating.toFixed(1)}
                      <StarIcon className="h-3.5 w-3.5 text-yellow-500" />
                    </span>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  {course.price > 0 ? `R${course.price.toFixed(0)}` : 'Free'}
                </td>
                <td className="px-4 py-3 text-right font-medium">
                  R{course.estimatedRevenue.toFixed(0)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function SellerAnalyticsPage() {
  const { data, isLoading } = useQuery<AnalyticsData>({
    queryKey: ['seller-analytics'],
    queryFn: async () => {
      const res = await api.get('/users/seller/analytics');
      return (res as any).data.data;
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8 text-center">
        <ChartBarIcon className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
        <h2 className="text-xl font-bold mb-2">Analytics Unavailable</h2>
        <p className="text-muted-foreground">Unable to load analytics data. Please try again.</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ChartBarIcon className="h-7 w-7" />
          Analytics
        </h1>
        <p className="text-muted-foreground mt-1">
          Track performance across your services, courses, and biolink.
        </p>
      </div>

      {/* Overview KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
        <StatCard
          title="Total Revenue"
          value={`R${data.overview.totalRevenue.toFixed(0)}`}
          icon={CurrencyDollarIcon}
          color="green"
          subtitle={`${data.overview.totalOrders} orders`}
        />
        <StatCard
          title="Service Views"
          value={data.overview.totalServiceViews.toLocaleString()}
          icon={EyeIcon}
          color="blue"
          subtitle={`${data.overview.conversionRate}% conversion`}
        />
        <StatCard
          title="Completed Orders"
          value={data.overview.completedOrders}
          icon={ShoppingBagIcon}
          color="purple"
          subtitle={`${data.overview.onTimeDeliveryRate}% on-time`}
        />
        <StatCard
          title="Enrollments"
          value={data.overview.totalEnrollments}
          icon={AcademicCapIcon}
          color="indigo"
          subtitle={`${data.totals.courses.publishedCount} courses`}
        />
        <StatCard
          title="Rating"
          value={data.overview.rating > 0 ? data.overview.rating.toFixed(1) : 'N/A'}
          icon={StarIcon}
          color="yellow"
          subtitle={`${data.overview.reviewCount} reviews`}
        />
        <StatCard
          title="Seller Level"
          value={`Level ${data.overview.level}`}
          icon={CheckCircleIcon}
          color="rose"
          subtitle={data.overview.responseTimeMinutes
            ? `${data.overview.responseTimeMinutes}m avg response`
            : 'Keep it up!'}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <EarningsChart data={data.monthlyEarnings} />
        <OrderStatusBreakdown data={data.ordersByStatus} />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {/* Services Summary */}
        <div className="bg-white rounded-lg border p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Squares2X2Icon className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold">Services</h3>
              <p className="text-xs text-muted-foreground">
                {data.totals.services.activeCount} of {data.totals.services.count} active
              </p>
            </div>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Views</span>
              <span className="font-medium">{data.totals.services.totalViews.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Orders</span>
              <span className="font-medium">{data.totals.services.totalOrders}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Favorites</span>
              <span className="font-medium">{data.totals.services.totalFavorites}</span>
            </div>
          </div>
          <Link to="/seller/services" className="block mt-4 text-sm text-primary hover:underline">
            Manage Services →
          </Link>
        </div>

        {/* Courses Summary */}
        <div className="bg-white rounded-lg border p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-indigo-50 rounded-lg">
              <AcademicCapIcon className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <h3 className="font-semibold">Courses</h3>
              <p className="text-xs text-muted-foreground">
                {data.totals.courses.publishedCount} of {data.totals.courses.count} published
              </p>
            </div>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Students</span>
              <span className="font-medium">{data.totals.courses.totalEnrollments}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Est. Revenue</span>
              <span className="font-medium">R{data.totals.courses.estimatedRevenue.toFixed(0)}</span>
            </div>
          </div>
          <Link to="/seller/courses" className="block mt-4 text-sm text-primary hover:underline">
            Manage Courses →
          </Link>
        </div>

        {/* BioLink Summary */}
        <div className="bg-white rounded-lg border p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-purple-50 rounded-lg">
              <LinkIcon className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <h3 className="font-semibold">BioLink</h3>
              <p className="text-xs text-muted-foreground">
                {data.biolink.enabled ? 'Active' : 'Inactive'}
              </p>
            </div>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status</span>
              <span className={cn(
                'font-medium',
                data.biolink.enabled ? 'text-green-600' : 'text-muted-foreground'
              )}>
                {data.biolink.enabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>
          </div>
          <Link to="/seller/biolink" className="block mt-4 text-sm text-primary hover:underline">
            {data.biolink.enabled ? 'Edit BioLink →' : 'Set Up BioLink →'}
          </Link>
        </div>
      </div>

      {/* Detailed Tables */}
      <div className="space-y-6">
        <ServiceTable services={data.services} />
        <CourseTable courses={data.courses} />
      </div>
    </div>
  );
}
