import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth.store';
import { Button } from '../ui/Button';
import ProfileDropdown from './ProfileDropdown';
import InboxDropdown from './InboxDropdown';
import NotificationDropdown from './NotificationDropdown';
import {
  MagnifyingGlassIcon,
  Bars3Icon,
  XMarkIcon,
  SparklesIcon,
  HomeIcon,
  ShoppingBagIcon,
  ChatBubbleLeftRightIcon,
  BriefcaseIcon,
  ArrowRightOnRectangleIcon,
} from '@heroicons/react/24/outline';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface HeaderProps {
  showSearch?: boolean;
  variant?: 'default' | 'minimal';
}

export default function Header({ showSearch = true, variant = 'default' }: HeaderProps) {
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuthStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/services?search=${encodeURIComponent(searchQuery)}`);
      setSearchQuery('');
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur-lg supports-[backdrop-filter]:bg-background/80">
      <div className="container flex h-16 items-center justify-between gap-4">
        {/* Logo */}
        <Link to="/" className="flex items-center space-x-2 shrink-0">
          <motion.div
            className="flex items-center gap-2"
            whileHover={{ scale: 1.02 }}
            transition={{ type: 'spring', stiffness: 400 }}
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-white font-bold shadow-lg">
              Z
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent hidden sm:block">
              Zomieks
            </span>
          </motion.div>
        </Link>

        {/* Search */}
        {showSearch && variant === 'default' && (
          <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-xl">
            <div className="relative w-full group">
              <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for any service..."
                className="w-full h-11 pl-11 pr-4 rounded-xl border-2 border-transparent bg-muted/50 focus:bg-background focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-muted-foreground/70"
              />
            </div>
          </form>
        )}

        {/* Nav */}
        <nav className="hidden md:flex items-center gap-1">
          <Link
            to="/services"
            className="px-4 py-2 text-sm font-medium rounded-lg hover:bg-muted transition-colors"
          >
            Explore
          </Link>

          {isAuthenticated ? (
            <>
              <InboxDropdown />
              <NotificationDropdown />
              <div className="ml-2">
                <ProfileDropdown />
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2 ml-2">
              <Link to="/login">
                <Button variant="ghost" size="sm">
                  Sign In
                </Button>
              </Link>
              <Link to="/register">
                <Button size="sm" className="shadow-sm">
                  <SparklesIcon className="h-4 w-4 mr-1" />
                  Join Free
                </Button>
              </Link>
            </div>
          )}
        </nav>

        {/* Mobile menu button */}
        <button
          className="md:hidden p-2 -mr-2 rounded-lg hover:bg-muted transition-colors"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <XMarkIcon className="h-6 w-6" /> : <Bars3Icon className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            className="md:hidden border-t overflow-hidden"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="p-4 space-y-4">
              {/* Mobile search */}
              {showSearch && (
                <form onSubmit={handleSearch}>
                  <div className="relative">
                    <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <input
                      type="search"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search services..."
                      className="w-full h-12 pl-12 pr-4 rounded-xl border-2 bg-muted/50 focus:bg-background focus:outline-none focus:border-primary"
                    />
                  </div>
                </form>
              )}

              {/* Mobile nav links */}
              <nav className="space-y-1">
                <Link
                  to="/services"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 py-3 px-4 rounded-xl hover:bg-muted transition-colors"
                >
                  <MagnifyingGlassIcon className="h-5 w-5 text-muted-foreground" />
                  Explore Services
                </Link>
                {isAuthenticated ? (
                  <>
                    <Link
                      to="/dashboard"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-3 py-3 px-4 rounded-xl hover:bg-muted transition-colors"
                    >
                      <HomeIcon className="h-5 w-5 text-muted-foreground" />
                      Dashboard
                    </Link>
                    <Link
                      to="/messages"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-3 py-3 px-4 rounded-xl hover:bg-muted transition-colors"
                    >
                      <ChatBubbleLeftRightIcon className="h-5 w-5 text-muted-foreground" />
                      Messages
                    </Link>
                    <Link
                      to="/orders"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-3 py-3 px-4 rounded-xl hover:bg-muted transition-colors"
                    >
                      <ShoppingBagIcon className="h-5 w-5 text-muted-foreground" />
                      Orders
                    </Link>
                    {user?.isSeller ? (
                      <Link
                        to="/seller"
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center gap-3 py-3 px-4 rounded-xl hover:bg-muted transition-colors"
                      >
                        <BriefcaseIcon className="h-5 w-5 text-muted-foreground" />
                        Seller Dashboard
                      </Link>
                    ) : (
                      <Link
                        to="/become-seller"
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center gap-3 py-3 px-4 rounded-xl bg-primary/10 text-primary font-medium"
                      >
                        <SparklesIcon className="h-5 w-5" />
                        Become a Seller
                      </Link>
                    )}
                    <div className="pt-4 mt-4 border-t">
                      <button
                        onClick={() => {
                          setMobileMenuOpen(false);
                          logout();
                        }}
                        className="flex items-center gap-3 w-full py-3 px-4 rounded-xl text-destructive hover:bg-destructive/10 transition-colors"
                      >
                        <ArrowRightOnRectangleIcon className="h-5 w-5" />
                        Sign Out
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="flex gap-3 pt-4">
                    <Link to="/login" className="flex-1" onClick={() => setMobileMenuOpen(false)}>
                      <Button variant="outline" className="w-full">
                        Sign In
                      </Button>
                    </Link>
                    <Link to="/register" className="flex-1" onClick={() => setMobileMenuOpen(false)}>
                      <Button className="w-full">Join Free</Button>
                    </Link>
                  </div>
                )}
              </nav>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
