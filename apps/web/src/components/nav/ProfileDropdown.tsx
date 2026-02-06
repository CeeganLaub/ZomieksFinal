import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../stores/auth.store';
import { paymentsApi } from '../../lib/api';
import {
  ChevronDownIcon,
  HomeIcon,
  ShoppingBagIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  SparklesIcon,
  BriefcaseIcon,
  Squares2X2Icon,
  BanknotesIcon,
  UserGroupIcon,
  QuestionMarkCircleIcon,
  GlobeAltIcon,
} from '@heroicons/react/24/outline';

export default function ProfileDropdown() {
  const { user, logout } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data: creditData } = useQuery({
    queryKey: ['credit-balance'],
    queryFn: () => paymentsApi.creditBalance(),
    enabled: !!user && isOpen,
    staleTime: 30000,
  });
  const creditBalance = creditData?.data?.creditBalance || 0;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    setIsOpen(false);
    logout();
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-1.5 pr-3 hover:bg-muted rounded-xl transition-colors"
      >
        {user?.avatar ? (
          <img
            src={user.avatar}
            alt=""
            className="h-8 w-8 rounded-lg object-cover ring-2 ring-background"
          />
        ) : (
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center text-white text-sm font-bold">
            {user?.firstName?.charAt(0).toUpperCase() || user?.username?.charAt(0).toUpperCase() || 'U'}
          </div>
        )}
        <ChevronDownIcon
          className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="absolute right-0 mt-2 w-72 bg-card border rounded-2xl shadow-xl z-50 overflow-hidden"
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
          >
            {/* User info header */}
            <div className="p-4 border-b bg-muted/30">
              <div className="flex items-center gap-3">
                {user?.avatar ? (
                  <img
                    src={user.avatar}
                    alt=""
                    className="h-12 w-12 rounded-xl object-cover"
                  />
                ) : (
                  <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center text-white text-lg font-bold">
                    {user?.firstName?.charAt(0).toUpperCase() || user?.username?.charAt(0).toUpperCase() || 'U'}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">
                    {user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : user?.username || 'User'}
                  </p>
                  <p className="text-sm text-muted-foreground truncate">{user?.email}</p>
                  <span className="inline-flex items-center gap-1.5 mt-1 text-xs text-green-600">
                    <span className="w-2 h-2 rounded-full bg-green-500" />
                    Online
                  </span>
                  {creditBalance > 0 && (
                    <span className="inline-flex items-center gap-1 ml-2 mt-1 text-xs font-medium text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded">
                      <BanknotesIcon className="h-3 w-3" />
                      R{creditBalance.toFixed(2)} credit
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Buying section */}
            <div className="p-2">
              <p className="px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Buying
              </p>
              <Link
                to="/dashboard"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-muted rounded-xl transition-colors"
              >
                <HomeIcon className="h-5 w-5 text-muted-foreground" />
                Dashboard
              </Link>
              <Link
                to="/orders"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-muted rounded-xl transition-colors"
              >
                <ShoppingBagIcon className="h-5 w-5 text-muted-foreground" />
                My Orders
              </Link>
            </div>

            {/* Selling section */}
            <div className="p-2 border-t">
              <p className="px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Selling
              </p>
              {user?.isSeller ? (
                <>
                  <Link
                    to="/seller"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-muted rounded-xl transition-colors"
                  >
                    <BriefcaseIcon className="h-5 w-5 text-muted-foreground" />
                    Seller Dashboard
                  </Link>
                  <Link
                    to="/seller/services"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-muted rounded-xl transition-colors"
                  >
                    <Squares2X2Icon className="h-5 w-5 text-muted-foreground" />
                    My Services
                  </Link>
                  <Link
                    to="/seller/orders"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-muted rounded-xl transition-colors"
                  >
                    <ShoppingBagIcon className="h-5 w-5 text-muted-foreground" />
                    Orders
                  </Link>
                  <Link
                    to="/seller/crm"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-muted rounded-xl transition-colors"
                  >
                    <UserGroupIcon className="h-5 w-5 text-muted-foreground" />
                    CRM
                  </Link>
                  <Link
                    to="/seller/earnings"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-muted rounded-xl transition-colors"
                  >
                    <BanknotesIcon className="h-5 w-5 text-muted-foreground" />
                    Earnings
                  </Link>
                </>
              ) : (
                <Link
                  to="/become-seller"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 text-sm text-primary font-medium hover:bg-primary/10 rounded-xl transition-colors"
                >
                  <SparklesIcon className="h-5 w-5" />
                  Become a Seller
                </Link>
              )}
            </div>

            {/* General section */}
            <div className="p-2 border-t">
              <Link
                to="/settings"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-muted rounded-xl transition-colors"
              >
                <Cog6ToothIcon className="h-5 w-5 text-muted-foreground" />
                Settings
              </Link>
              <Link
                to="/help"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-muted rounded-xl transition-colors"
              >
                <QuestionMarkCircleIcon className="h-5 w-5 text-muted-foreground" />
                Help & Support
              </Link>
              <button
                className="flex items-center gap-3 w-full px-3 py-2.5 text-sm hover:bg-muted rounded-xl transition-colors text-left"
                onClick={() => setIsOpen(false)}
              >
                <GlobeAltIcon className="h-5 w-5 text-muted-foreground" />
                <span className="flex-1">English</span>
                <span className="text-muted-foreground">ZAR</span>
              </button>
            </div>

            {/* Sign out */}
            <div className="p-2 border-t">
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 w-full px-3 py-2.5 text-sm text-destructive hover:bg-destructive/10 rounded-xl transition-colors"
              >
                <ArrowRightOnRectangleIcon className="h-5 w-5" />
                Sign Out
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
