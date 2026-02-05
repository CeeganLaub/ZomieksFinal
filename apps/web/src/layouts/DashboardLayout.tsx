import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/auth.store';
import { useNotificationStore } from '../stores/notification.store';
import {
  HomeIcon,
  ShoppingBagIcon,
  ChatBubbleLeftRightIcon,
  CreditCardIcon,
  Cog6ToothIcon,
  ArrowLeftOnRectangleIcon,
  Squares2X2Icon,
  DocumentTextIcon,
  ChartBarIcon,
  BanknotesIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';
import { cn } from '../lib/utils';

interface Props {
  isSeller?: boolean;
}

export default function DashboardLayout({ isSeller = false }: Props) {
  const { user, logout } = useAuthStore();
  const { unreadCount } = useNotificationStore();
  const location = useLocation();

  const buyerNavItems = [
    { href: '/dashboard', label: 'Dashboard', icon: HomeIcon },
    { href: '/orders', label: 'Orders', icon: ShoppingBagIcon },
    { href: '/messages', label: 'Messages', icon: ChatBubbleLeftRightIcon },
    { href: '/subscriptions', label: 'Subscriptions', icon: CreditCardIcon },
    { href: '/settings', label: 'Settings', icon: Cog6ToothIcon },
  ];

  const sellerNavItems = [
    { href: '/seller', label: 'Dashboard', icon: HomeIcon },
    { href: '/seller/services', label: 'Services', icon: Squares2X2Icon },
    { href: '/seller/orders', label: 'Orders', icon: DocumentTextIcon },
    { href: '/seller/crm', label: 'CRM', icon: UserGroupIcon },
    { href: '/seller/earnings', label: 'Earnings', icon: BanknotesIcon },
    { href: '/settings', label: 'Settings', icon: Cog6ToothIcon },
  ];

  const navItems = isSeller ? sellerNavItems : buyerNavItems;

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Top header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background">
        <div className="flex h-16 items-center justify-between px-6">
          <div className="flex items-center space-x-4">
            <Link to="/" className="text-2xl font-bold text-primary">
              Kiekz
            </Link>
            {user?.isSeller && (
              <div className="hidden md:flex items-center space-x-2 ml-8">
                <Link 
                  to="/dashboard" 
                  className={cn(
                    "px-3 py-1.5 rounded-full text-sm font-medium",
                    !isSeller ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                  )}
                >
                  Buying
                </Link>
                <Link 
                  to="/seller" 
                  className={cn(
                    "px-3 py-1.5 rounded-full text-sm font-medium",
                    isSeller ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                  )}
                >
                  Selling
                </Link>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-4">
            <Link to="/messages" className="relative p-2 hover:bg-muted rounded-full">
              <ChatBubbleLeftRightIcon className="h-6 w-6" />
            </Link>
            <div className="flex items-center space-x-3">
              {user?.avatar ? (
                <img src={user.avatar} alt="" className="h-8 w-8 rounded-full object-cover" />
              ) : (
                <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-medium">
                  {user?.firstName?.charAt(0) || user?.username?.charAt(0) || '?'}
                </div>
              )}
              <span className="hidden md:block font-medium">
                {user?.firstName || user?.username}
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="hidden md:flex w-64 flex-col border-r bg-background min-h-[calc(100vh-4rem)] sticky top-16">
          <nav className="flex-1 p-4 space-y-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.href;
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
