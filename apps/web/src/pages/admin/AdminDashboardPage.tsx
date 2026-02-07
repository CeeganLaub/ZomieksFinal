import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { 
  UsersIcon, 
  ShoppingBagIcon,
  DocumentTextIcon,
  BanknotesIcon,
  ExclamationTriangleIcon,
  ArrowTrendingUpIcon,
  ArrowPathIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';

interface DashboardStats {
  totalUsers: number;
  totalSellers: number;
  totalServices: number;
  totalOrders: number;
  pendingDisputes: number;
  pendingPayouts: number;
  pendingKYC: number;
  revenueToday: number;
  revenueWeek: number;
  revenueMonth: number;
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    try {
      setLoading(true);
      const [statsRes, kycRes] = await Promise.all([
        api.get<{ success: boolean; data: any }>('/admin/stats'),
        api.get<{ success: boolean; data: { sellers: any[] } }>('/admin/sellers/pending-kyc').catch(() => ({ data: { sellers: [] } })),
      ]);
      const d = statsRes.data;
      setStats({
        totalUsers: d?.users?.total || 0,
        totalSellers: d?.users?.sellers || 0,
        totalServices: d?.services || 0,
        totalOrders: d?.orders?.total || 0,
        pendingDisputes: d?.pending?.disputes || 0,
        pendingPayouts: d?.pending?.payouts || 0,
        pendingKYC: kycRes.data?.sellers?.length || 0,
        revenueToday: Number(d?.revenue?.today) || 0,
        revenueWeek: Number(d?.revenue?.total) || 0,
        revenueMonth: Number(d?.revenue?.monthly) || 0,
      });
    } catch {
      setStats({
        totalUsers: 0,
        totalSellers: 0,
        totalServices: 0,
        totalOrders: 0,
        pendingDisputes: 0,
        pendingPayouts: 0,
        pendingKYC: 0,
        revenueToday: 0,
        revenueWeek: 0,
        revenueMonth: 0,
      });
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

  const statCards = [
    { 
      label: 'Total Users', 
      value: stats?.totalUsers || 0, 
      icon: UsersIcon,
      href: '/admin/users',
      color: 'text-blue-600 bg-blue-100',
    },
    { 
      label: 'Active Sellers', 
      value: stats?.totalSellers || 0, 
      icon: UsersIcon,
      href: '/admin/users?role=seller',
      color: 'text-green-600 bg-green-100',
    },
    { 
      label: 'Services', 
      value: stats?.totalServices || 0, 
      icon: DocumentTextIcon,
      href: '/admin/services',
      color: 'text-purple-600 bg-purple-100',
    },
    { 
      label: 'Total Orders', 
      value: stats?.totalOrders || 0, 
      icon: ShoppingBagIcon,
      href: '/admin/orders',
      color: 'text-orange-600 bg-orange-100',
    },
    { 
      label: 'Pending Disputes', 
      value: stats?.pendingDisputes || 0, 
      icon: ExclamationTriangleIcon,
      href: '/admin/disputes',
      color: 'text-red-600 bg-red-100',
    },
    { 
      label: 'Pending Payouts', 
      value: stats?.pendingPayouts || 0, 
      icon: BanknotesIcon,
      href: '/admin/payouts',
      color: 'text-yellow-600 bg-yellow-100',
    },
    { 
      label: 'Pending KYC', 
      value: stats?.pendingKYC || 0, 
      icon: ShieldCheckIcon,
      href: '/admin/kyc',
      color: 'text-indigo-600 bg-indigo-100',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground">Overview of platform activity and key metrics</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map((stat) => (
          <Link
            key={stat.label}
            to={stat.href}
            className="bg-background border rounded-lg p-6 hover:border-primary/50 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className="text-3xl font-bold mt-1">{stat.value.toLocaleString()}</p>
              </div>
              <div className={`p-3 rounded-full ${stat.color}`}>
                <stat.icon className="h-6 w-6" />
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Revenue Section */}
      <div className="bg-background border rounded-lg p-6">
        <h2 className="font-semibold mb-4 flex items-center gap-2">
          <ArrowTrendingUpIcon className="h-5 w-5" />
          Revenue Overview
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground">Today</p>
            <p className="text-2xl font-bold">R{((stats?.revenueToday || 0) / 100).toFixed(2)}</p>
          </div>
          <div className="p-4 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground">This Week</p>
            <p className="text-2xl font-bold">R{((stats?.revenueWeek || 0) / 100).toFixed(2)}</p>
          </div>
          <div className="p-4 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground">This Month</p>
            <p className="text-2xl font-bold">R{((stats?.revenueMonth || 0) / 100).toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-background border rounded-lg p-6">
        <h2 className="font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Link
            to="/admin/fees"
            className="p-4 border rounded-lg text-center hover:border-primary/50 transition-colors"
          >
            <BanknotesIcon className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm font-medium">Manage Fees</p>
          </Link>
          <Link
            to="/admin/configuration"
            className="p-4 border rounded-lg text-center hover:border-primary/50 transition-colors"
          >
            <svg className="h-8 w-8 mx-auto mb-2 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <p className="text-sm font-medium">Configuration</p>
          </Link>
          <Link
            to="/admin/disputes"
            className="p-4 border rounded-lg text-center hover:border-primary/50 transition-colors"
          >
            <ExclamationTriangleIcon className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm font-medium">View Disputes</p>
          </Link>
          <Link
            to="/admin/payouts"
            className="p-4 border rounded-lg text-center hover:border-primary/50 transition-colors"
          >
            <BanknotesIcon className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm font-medium">Process Payouts</p>
          </Link>
          <Link
            to="/admin/kyc"
            className="p-4 border rounded-lg text-center hover:border-primary/50 transition-colors"
          >
            <ShieldCheckIcon className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm font-medium">Review KYC</p>
          </Link>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-background border rounded-lg p-6">
        <h2 className="font-semibold mb-4">System Status</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between py-2">
            <span className="text-sm">Payment Gateway</span>
            <span className="flex items-center gap-2 text-sm text-green-600">
              <span className="h-2 w-2 bg-green-500 rounded-full"></span>
              Operational
            </span>
          </div>
          <div className="flex items-center justify-between py-2 border-t">
            <span className="text-sm">Email Service</span>
            <span className="flex items-center gap-2 text-sm text-green-600">
              <span className="h-2 w-2 bg-green-500 rounded-full"></span>
              Operational
            </span>
          </div>
          <div className="flex items-center justify-between py-2 border-t">
            <span className="text-sm">File Storage</span>
            <span className="flex items-center gap-2 text-sm text-green-600">
              <span className="h-2 w-2 bg-green-500 rounded-full"></span>
              Operational
            </span>
          </div>
          <div className="flex items-center justify-between py-2 border-t">
            <span className="text-sm">Database</span>
            <span className="flex items-center gap-2 text-sm text-green-600">
              <span className="h-2 w-2 bg-green-500 rounded-full"></span>
              Operational
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
