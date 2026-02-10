import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth.store';
import { Button } from '../ui/Button';
import ProfileDropdown from './ProfileDropdown';
import InboxDropdown from './InboxDropdown';
import NotificationDropdown from './NotificationDropdown';
import DashboardDropdown from './DashboardDropdown';
import SellerDropdown from './SellerDropdown';
import { cn } from '../../lib/utils';
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
  AcademicCapIcon,
  RocketLaunchIcon,
} from '@heroicons/react/24/outline';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface HeaderProps {
  showSearch?: boolean;
  variant?: 'default' | 'minimal';
}

export default function Header({ showSearch = true, variant = 'default' }: HeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, logout } = useAuthStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const isActive = (path: string) => {
    if (path === '/explore') return location.pathname === '/explore';
    return location.pathname.startsWith(path);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/services?search=${encodeURIComponent(searchQuery)}`);
      setSearchQuery('');
    }
  };

  const navLinks = [
    { to: '/explore', label: 'Explore', icon: RocketLaunchIcon },
    { to: '/services', label: 'Services', icon: ShoppingBagIcon },
    { to: '/courses', label: 'Courses', icon: AcademicCapIcon },
  ];

  return (
    <header className={cn(
      "sticky top-0 z-50 w-full transition-all duration-300",
      scrolled
        ? "bg-background/80 backdrop-blur-xl shadow-sm border-b border-border/50"
        : "bg-background/95 backdrop-blur-lg border-b border-transparent"
    )}>
      {/* Gradient accent line */}
      <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

      <div className="container flex h-16 items-center justify-between gap-4">
        {/* Logo */}
        <Link to="/" className="flex items-center space-x-2 shrink-0">
          <motion.div
            className="flex items-center gap-2.5"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 400, damping: 17 }}
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary via-emerald-500 to-teal-500 flex items-center justify-center text-white font-black text-lg shadow-lg shadow-primary/25">
              Z
            </div>
            <span className="text-xl font-extrabold tracking-tight hidden sm:block">
              <span className="text-foreground">Zom</span>
              <span className="text-primary">ieks</span>
            </span>
          </motion.div>
        </Link>

        {/* Search */}
        {showSearch && variant === 'default' && (
          <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-md">
            <div className="relative w-full group">
              <MagnifyingGlassIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search services & courses..."
                className="w-full h-10 pl-10 pr-4 rounded-full border bg-muted/40 focus:bg-background focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all text-sm placeholder:text-muted-foreground/60"
              />
            </div>
          </form>
        )}

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={cn(
                "px-3.5 py-1.5 text-sm font-medium rounded-full transition-all duration-200",
                isActive(link.to)
                  ? "bg-primary/10 text-primary shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/80"
              )}
            >
              {link.label}
            </Link>
          ))}

          {isAuthenticated && (
            <>
              <DashboardDropdown />
              <SellerDropdown />
            </>
          )}

          <div className="w-px h-6 bg-border mx-2" />

          {isAuthenticated ? (
            <div className="flex items-center gap-1">
              <InboxDropdown />
              <NotificationDropdown />
              <div className="ml-1">
                <ProfileDropdown />
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/login">
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                  Sign In
                </Button>
              </Link>
              <Link to="/register">
                <Button size="sm" className="rounded-full shadow-md hover:shadow-lg transition-shadow animate-pulse-glow">
                  <SparklesIcon className="h-3.5 w-3.5 mr-1.5" />
                  Join Free
                </Button>
              </Link>
            </div>
          )}
        </nav>

        {/* Mobile menu button */}
        <button
          className="md:hidden p-2 -mr-2 rounded-xl hover:bg-muted transition-colors"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <XMarkIcon className="h-6 w-6" /> : <Bars3Icon className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            className="md:hidden border-t bg-background/98 backdrop-blur-xl overflow-hidden"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
          >
            <div className="p-4 space-y-3">
              {/* Mobile search */}
              {showSearch && (
                <form onSubmit={handleSearch}>
                  <div className="relative">
                    <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <input
                      type="search"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search services & courses..."
                      className="w-full h-12 pl-12 pr-4 rounded-xl border bg-muted/30 focus:bg-background focus:outline-none focus:border-primary text-sm"
                    />
                  </div>
                </form>
              )}

              {/* Mobile nav links */}
              <nav className="space-y-1 pt-1">
                {navLinks.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-3 py-3 px-4 rounded-xl transition-all",
                      isActive(link.to)
                        ? "bg-primary/10 text-primary font-medium"
                        : "hover:bg-muted text-foreground"
                    )}
                  >
                    <link.icon className="h-5 w-5" />
                    {link.label}
                  </Link>
                ))}

                {isAuthenticated ? (
                  <>
                    <div className="h-px bg-border my-2" />
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
                    <Link
                      to="/my-courses"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-3 py-3 px-4 rounded-xl hover:bg-muted transition-colors"
                    >
                      <AcademicCapIcon className="h-5 w-5 text-muted-foreground" />
                      My Courses
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
                        className="flex items-center gap-3 py-3 px-4 rounded-xl bg-gradient-to-r from-primary/10 to-emerald-500/10 text-primary font-medium"
                      >
                        <SparklesIcon className="h-5 w-5" />
                        Become a Seller
                      </Link>
                    )}
                    <div className="pt-3 mt-2 border-t">
                      <button
                        onClick={() => { setMobileMenuOpen(false); logout(); }}
                        className="flex items-center gap-3 w-full py-3 px-4 rounded-xl text-destructive hover:bg-destructive/10 transition-colors"
                      >
                        <ArrowRightOnRectangleIcon className="h-5 w-5" />
                        Sign Out
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="flex gap-3 pt-3 border-t mt-2">
                    <Link to="/login" className="flex-1" onClick={() => setMobileMenuOpen(false)}>
                      <Button variant="outline" className="w-full rounded-xl">Sign In</Button>
                    </Link>
                    <Link to="/register" className="flex-1" onClick={() => setMobileMenuOpen(false)}>
                      <Button className="w-full rounded-xl">Join Free</Button>
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
