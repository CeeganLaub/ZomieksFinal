import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/auth.store';
import {
  HomeIcon,
  Cog6ToothIcon,
  ArrowLeftOnRectangleIcon,
  BanknotesIcon,
  WrenchScrewdriverIcon,
  UsersIcon,
  ShoppingBagIcon,
  DocumentTextIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { cn } from '../lib/utils';

export default function AdminLayout() {
  const { user, logout } = useAuthStore();
  const location = useLocation();

  const navItems = [
    { href: '/admin', label: 'Dashboard', icon: HomeIcon },
    { href: '/admin/users', label: 'Users', icon: UsersIcon },
    { href: '/admin/services', label: 'Services', icon: DocumentTextIcon },
    { href: '/admin/orders', label: 'Orders', icon: ShoppingBagIcon },
    { href: '/admin/disputes', label: 'Disputes', icon: ExclamationTriangleIcon },
    { href: '/admin/payouts', label: 'Payouts', icon: BanknotesIcon },
    { href: '/admin/analytics', label: 'Analytics', icon: ChartBarIcon },
    { divider: true },
    { href: '/admin/fees', label: 'Fees & Calculations', icon: BanknotesIcon },
    { href: '/admin/configuration', label: 'Configuration', icon: WrenchScrewdriverIcon },
    { href: '/admin/settings', label: 'Settings', icon: Cog6ToothIcon },
  ];

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Top header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background">
        <div className="flex h-16 items-center justify-between px-6">
          <div className="flex items-center space-x-4">
            <Link to="/admin" className="text-2xl font-bold text-primary">
              Zomieks <span className="text-sm font-normal text-muted-foreground">Admin</span>
            </Link>
          </div>

          <div className="flex items-center space-x-4">
            <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
              View Site
            </Link>
            <div className="flex items-center space-x-3">
              {user?.avatar ? (
                <img src={user.avatar} alt="" className="h-8 w-8 rounded-full object-cover" />
              ) : (
                <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-medium">
                  {user?.firstName?.charAt(0) || 'A'}
                </div>
              )}
              <span className="hidden md:block font-medium">
                {user?.firstName || 'Admin'}
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="hidden md:flex w-64 flex-col border-r bg-background min-h-[calc(100vh-4rem)] sticky top-16">
          <nav className="flex-1 p-4 space-y-1">
            {navItems.map((item, i) => {
              if ('divider' in item) {
                return <div key={i} className="border-t my-4" />;
              }
              const isActive = location.pathname === item.href || 
                (item.href !== '/admin' && location.pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className={cn(
                    "flex items-center space-x-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="p-4 border-t">
            <button
              onClick={() => logout()}
              className="flex items-center space-x-3 px-4 py-2.5 w-full rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <ArrowLeftOnRectangleIcon className="h-5 w-5" />
              <span>Logout</span>
            </button>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
