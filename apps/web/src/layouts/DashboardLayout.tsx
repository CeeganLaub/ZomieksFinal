import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/auth.store';
import { Header } from '../components/nav';
import {
  HomeIcon,
  ShoppingBagIcon,
  ChatBubbleLeftRightIcon,
  CreditCardIcon,
  Cog6ToothIcon,
  ArrowLeftOnRectangleIcon,
  Squares2X2Icon,
  DocumentTextIcon,
  BanknotesIcon,
  UserGroupIcon,
  AcademicCapIcon,
  LinkIcon,
} from '@heroicons/react/24/outline';
import { cn } from '../lib/utils';

interface Props {
  isSeller?: boolean;
}

export default function DashboardLayout({ isSeller = false }: Props) {
  const { logout } = useAuthStore();
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
    { href: '/seller/courses', label: 'Courses', icon: AcademicCapIcon },
    { href: '/seller/biolink', label: 'BioLink', icon: LinkIcon },
    { href: '/settings', label: 'Settings', icon: Cog6ToothIcon },
  ];

  const navItems = isSeller ? sellerNavItems : buyerNavItems;

  // Determine if we should show sidebar based on current route
  const showSidebar = [
    '/orders',
    '/messages',
    '/seller/orders',
    '/seller/crm',
    '/seller/services',
    '/seller/courses',
    '/seller/biolink',
  ].some(path => location.pathname.startsWith(path));

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Unified Header */}
      <Header showSearch={false} />

      <div className="flex">
        {/* Sidebar - only shown on complex pages */}
        {showSidebar && (
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
        )}

        {/* Main content */}
        <main className={cn("flex-1 p-6", showSidebar ? "" : "container max-w-7xl mx-auto")}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
