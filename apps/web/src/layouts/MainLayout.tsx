import { Outlet, Link } from 'react-router-dom';
import { useAuthStore } from '../stores/auth.store';
import { useNotificationStore } from '../stores/notification.store';
import { Button } from '../components/ui/Button';
import { 
  HomeIcon, 
  MagnifyingGlassIcon, 
  ChatBubbleLeftRightIcon,
  BellIcon,
  UserCircleIcon,
  Bars3Icon,
} from '@heroicons/react/24/outline';
import { useState } from 'react';

export default function MainLayout() {
  const { user, isAuthenticated, logout } = useAuthStore();
  const { unreadCount } = useNotificationStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <span className="text-2xl font-bold text-primary">Kiekz</span>
          </Link>

          {/* Search */}
          <div className="hidden md:flex flex-1 max-w-xl mx-8">
            <div className="relative w-full">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <input
                type="search"
                placeholder="Search for any service..."
                className="w-full h-10 pl-10 pr-4 rounded-full border bg-muted/50 focus:bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          {/* Nav */}
          <nav className="hidden md:flex items-center space-x-4">
            <Link to="/services" className="text-sm font-medium hover:text-primary">
              Explore
            </Link>
            
            {isAuthenticated ? (
              <>
                <Link to="/messages" className="relative p-2 hover:bg-muted rounded-full">
                  <ChatBubbleLeftRightIcon className="h-6 w-6" />
                </Link>
                <Link to="/dashboard" className="relative p-2 hover:bg-muted rounded-full">
                  <BellIcon className="h-6 w-6" />
                  {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </Link>
                <div className="relative group">
                  <button className="flex items-center space-x-2 p-2 hover:bg-muted rounded-full">
                    {user?.avatar ? (
                      <img src={user.avatar} alt="" className="h-8 w-8 rounded-full object-cover" />
                    ) : (
                      <UserCircleIcon className="h-8 w-8" />
                    )}
                  </button>
                  <div className="absolute right-0 mt-2 w-48 bg-card border rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                    <div className="p-2">
                      <Link to="/dashboard" className="block px-4 py-2 text-sm hover:bg-muted rounded">
                        Dashboard
                      </Link>
                      <Link to="/orders" className="block px-4 py-2 text-sm hover:bg-muted rounded">
                        My Orders
                      </Link>
                      {user?.isSeller ? (
                        <Link to="/seller" className="block px-4 py-2 text-sm hover:bg-muted rounded">
                          Seller Dashboard
                        </Link>
                      ) : (
                        <Link to="/become-seller" className="block px-4 py-2 text-sm hover:bg-muted rounded">
                          Become a Seller
                        </Link>
                      )}
                      <Link to="/settings" className="block px-4 py-2 text-sm hover:bg-muted rounded">
                        Settings
                      </Link>
                      <hr className="my-2" />
                      <button 
                        onClick={() => logout()} 
                        className="w-full text-left px-4 py-2 text-sm text-destructive hover:bg-muted rounded"
                      >
                        Logout
                      </button>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="ghost">Sign In</Button>
                </Link>
                <Link to="/register">
                  <Button>Join</Button>
                </Link>
              </>
            )}
          </nav>

          {/* Mobile menu button */}
          <button 
            className="md:hidden p-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <Bars3Icon className="h-6 w-6" />
          </button>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t p-4">
            <div className="relative mb-4">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <input
                type="search"
                placeholder="Search..."
                className="w-full h-10 pl-10 pr-4 rounded-full border bg-muted/50"
              />
            </div>
            <nav className="space-y-2">
              <Link to="/services" className="block py-2">Explore</Link>
              {isAuthenticated ? (
                <>
                  <Link to="/dashboard" className="block py-2">Dashboard</Link>
                  <Link to="/messages" className="block py-2">Messages</Link>
                  <Link to="/orders" className="block py-2">Orders</Link>
                  <button onClick={() => logout()} className="block py-2 text-destructive">
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link to="/login" className="block py-2">Sign In</Link>
                  <Link to="/register" className="block py-2">Join</Link>
                </>
              )}
            </nav>
          </div>
        )}
      </header>

      {/* Main content */}
      <main>
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t mt-16">
        <div className="container py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div>
              <h3 className="font-semibold mb-4">Categories</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link to="/services?category=design" className="hover:text-foreground">Design</Link></li>
                <li><Link to="/services?category=development" className="hover:text-foreground">Development</Link></li>
                <li><Link to="/services?category=marketing" className="hover:text-foreground">Marketing</Link></li>
                <li><Link to="/services?category=writing" className="hover:text-foreground">Writing</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">About</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link to="/about" className="hover:text-foreground">About Us</Link></li>
                <li><Link to="/careers" className="hover:text-foreground">Careers</Link></li>
                <li><Link to="/press" className="hover:text-foreground">Press</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Support</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link to="/help" className="hover:text-foreground">Help Center</Link></li>
                <li><Link to="/trust" className="hover:text-foreground">Trust & Safety</Link></li>
                <li><Link to="/sellers" className="hover:text-foreground">Selling on Kiekz</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Legal</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link to="/terms" className="hover:text-foreground">Terms of Service</Link></li>
                <li><Link to="/privacy" className="hover:text-foreground">Privacy Policy</Link></li>
              </ul>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t text-center text-sm text-muted-foreground">
            <p>&copy; {new Date().getFullYear()} Kiekz. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
