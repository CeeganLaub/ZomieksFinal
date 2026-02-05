import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/auth.store';
import { useNotificationStore } from '../stores/notification.store';
import { Button } from '../components/ui/Button';
import { 
  MagnifyingGlassIcon, 
  ChatBubbleLeftRightIcon,
  BellIcon,
  Bars3Icon,
  XMarkIcon,
  ChevronDownIcon,
  SparklesIcon,
  ShoppingBagIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  HomeIcon,
  BriefcaseIcon,
  UserGroupIcon,
  ShieldCheckIcon,
  QuestionMarkCircleIcon,
} from '@heroicons/react/24/outline';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function MainLayout() {
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuthStore();
  const { unreadCount } = useNotificationStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/services?search=${encodeURIComponent(searchQuery)}`);
      setSearchQuery('');
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur-lg supports-[backdrop-filter]:bg-background/80">
        <div className="container flex h-16 items-center justify-between gap-4">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2 shrink-0">
            <motion.div
              className="flex items-center gap-2"
              whileHover={{ scale: 1.02 }}
              transition={{ type: "spring", stiffness: 400 }}
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
                <Link 
                  to="/messages" 
                  className="relative p-2.5 hover:bg-muted rounded-lg transition-colors"
                >
                  <ChatBubbleLeftRightIcon className="h-5 w-5" />
                </Link>
                <Link 
                  to="/dashboard" 
                  className="relative p-2.5 hover:bg-muted rounded-lg transition-colors"
                >
                  <BellIcon className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <motion.span 
                      className="absolute -top-0.5 -right-0.5 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center font-medium shadow-sm"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 500 }}
                    >
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </motion.span>
                  )}
                </Link>
                
                {/* User menu */}
                <div className="relative ml-2">
                  <button 
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center gap-2 p-1.5 pr-3 hover:bg-muted rounded-xl transition-colors"
                  >
                    {user?.avatar ? (
                      <img src={user.avatar} alt="" className="h-8 w-8 rounded-lg object-cover ring-2 ring-background" />
                    ) : (
                      <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center text-white text-sm font-bold">
                        {user?.firstName?.charAt(0).toUpperCase() || user?.username?.charAt(0).toUpperCase() || 'U'}
                      </div>
                    )}
                    <ChevronDownIcon className={`h-4 w-4 text-muted-foreground transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
                  </button>
                  
                  <AnimatePresence>
                    {userMenuOpen && (
                      <>
                        <div 
                          className="fixed inset-0 z-40" 
                          onClick={() => setUserMenuOpen(false)} 
                        />
                        <motion.div 
                          className="absolute right-0 mt-2 w-64 bg-card border rounded-2xl shadow-xl z-50 overflow-hidden"
                          initial={{ opacity: 0, y: -10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -10, scale: 0.95 }}
                          transition={{ duration: 0.15 }}
                        >
                          {/* User info */}
                          <div className="p-4 border-b bg-muted/30">
                            <p className="font-semibold">{user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : user?.username || 'User'}</p>
                            <p className="text-sm text-muted-foreground truncate">{user?.email}</p>
                          </div>
                          
                          <div className="p-2">
                            <Link 
                              to="/dashboard" 
                              onClick={() => setUserMenuOpen(false)}
                              className="flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-muted rounded-xl transition-colors"
                            >
                              <HomeIcon className="h-5 w-5 text-muted-foreground" />
                              Dashboard
                            </Link>
                            <Link 
                              to="/orders" 
                              onClick={() => setUserMenuOpen(false)}
                              className="flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-muted rounded-xl transition-colors"
                            >
                              <ShoppingBagIcon className="h-5 w-5 text-muted-foreground" />
                              My Orders
                            </Link>
                            {user?.isSeller ? (
                              <Link 
                                to="/seller" 
                                onClick={() => setUserMenuOpen(false)}
                                className="flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-muted rounded-xl transition-colors"
                              >
                                <BriefcaseIcon className="h-5 w-5 text-muted-foreground" />
                                Seller Dashboard
                              </Link>
                            ) : (
                              <Link 
                                to="/become-seller" 
                                onClick={() => setUserMenuOpen(false)}
                                className="flex items-center gap-3 px-3 py-2.5 text-sm text-primary font-medium hover:bg-primary/10 rounded-xl transition-colors"
                              >
                                <SparklesIcon className="h-5 w-5" />
                                Become a Seller
                              </Link>
                            )}
                            <Link 
                              to="/settings" 
                              onClick={() => setUserMenuOpen(false)}
                              className="flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-muted rounded-xl transition-colors"
                            >
                              <Cog6ToothIcon className="h-5 w-5 text-muted-foreground" />
                              Settings
                            </Link>
                          </div>
                          
                          <div className="p-2 border-t">
                            <button 
                              onClick={() => {
                                setUserMenuOpen(false);
                                logout();
                              }} 
                              className="flex items-center gap-3 w-full px-3 py-2.5 text-sm text-destructive hover:bg-destructive/10 rounded-xl transition-colors"
                            >
                              <ArrowRightOnRectangleIcon className="h-5 w-5" />
                              Sign Out
                            </button>
                          </div>
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2 ml-2">
                <Link to="/login">
                  <Button variant="ghost" size="sm">Sign In</Button>
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
            {mobileMenuOpen ? (
              <XMarkIcon className="h-6 w-6" />
            ) : (
              <Bars3Icon className="h-6 w-6" />
            )}
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
                        <Button variant="outline" className="w-full">Sign In</Button>
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

      {/* Main content */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-muted/30 border-t mt-auto">
        <div className="container py-16">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 lg:gap-12">
            {/* Brand */}
            <div className="col-span-2 md:col-span-1">
              <Link to="/" className="inline-flex items-center gap-2 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-white font-bold text-xl shadow-lg">
                  Z
                </div>
                <span className="text-xl font-bold">Zomieks</span>
              </Link>
              <p className="text-sm text-muted-foreground mb-4">
                South Africa's leading freelance marketplace. Connect with talented professionals.
              </p>
              <div className="flex gap-3">
                {/* Social links */}
                <a href="#" className="w-10 h-10 rounded-xl bg-muted hover:bg-primary hover:text-primary-foreground flex items-center justify-center transition-colors">
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/></svg>
                </a>
                <a href="#" className="w-10 h-10 rounded-xl bg-muted hover:bg-primary hover:text-primary-foreground flex items-center justify-center transition-colors">
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                </a>
                <a href="#" className="w-10 h-10 rounded-xl bg-muted hover:bg-primary hover:text-primary-foreground flex items-center justify-center transition-colors">
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
                </a>
              </div>
            </div>
            
            {/* Categories */}
            <div>
              <h3 className="font-semibold mb-4 text-sm uppercase tracking-wide">Categories</h3>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li><Link to="/services?category=design" className="hover:text-foreground transition-colors">Design</Link></li>
                <li><Link to="/services?category=development" className="hover:text-foreground transition-colors">Development</Link></li>
                <li><Link to="/services?category=marketing" className="hover:text-foreground transition-colors">Marketing</Link></li>
                <li><Link to="/services?category=writing" className="hover:text-foreground transition-colors">Writing</Link></li>
                <li><Link to="/services?category=video" className="hover:text-foreground transition-colors">Video & Animation</Link></li>
              </ul>
            </div>
            
            {/* About */}
            <div>
              <h3 className="font-semibold mb-4 text-sm uppercase tracking-wide">Company</h3>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li><Link to="/about" className="hover:text-foreground transition-colors">About Us</Link></li>
                <li><Link to="/careers" className="hover:text-foreground transition-colors">Careers</Link></li>
                <li><Link to="/press" className="hover:text-foreground transition-colors">Press & News</Link></li>
                <li><Link to="/partnerships" className="hover:text-foreground transition-colors">Partnerships</Link></li>
              </ul>
            </div>
            
            {/* Support */}
            <div>
              <h3 className="font-semibold mb-4 text-sm uppercase tracking-wide">Support</h3>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li><Link to="/help" className="hover:text-foreground transition-colors flex items-center gap-2"><QuestionMarkCircleIcon className="h-4 w-4" />Help Center</Link></li>
                <li><Link to="/trust" className="hover:text-foreground transition-colors flex items-center gap-2"><ShieldCheckIcon className="h-4 w-4" />Trust & Safety</Link></li>
                <li><Link to="/become-seller" className="hover:text-foreground transition-colors flex items-center gap-2"><UserGroupIcon className="h-4 w-4" />Become a Seller</Link></li>
              </ul>
            </div>
            
            {/* Legal */}
            <div>
              <h3 className="font-semibold mb-4 text-sm uppercase tracking-wide">Legal</h3>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li><Link to="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link></li>
                <li><Link to="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link></li>
                <li><Link to="/cookies" className="hover:text-foreground transition-colors">Cookie Policy</Link></li>
              </ul>
            </div>
          </div>
          
          {/* Bottom bar */}
          <div className="mt-12 pt-8 border-t flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()} Zomieks. All rights reserved.
            </p>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                All systems operational
              </span>
              <span>ZAR (R)</span>
              <span>🇿🇦 South Africa</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
