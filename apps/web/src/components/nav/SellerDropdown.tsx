import { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../../stores/auth.store';
import { cn } from '../../lib/utils';
import {
  ChevronDownIcon,
  HomeIcon,
  Squares2X2Icon,
  DocumentTextIcon,
  ChatBubbleLeftRightIcon,
  BanknotesIcon,
  AcademicCapIcon,
  ChartBarIcon,
  LinkIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';

const sellerNavItems = [
  { href: '/seller', label: 'Dashboard', icon: HomeIcon },
  { href: '/seller/services', label: 'Services', icon: Squares2X2Icon },
  { href: '/seller/orders', label: 'Orders', icon: DocumentTextIcon },
  { href: '/seller/inbox', label: 'Inbox & CRM', icon: ChatBubbleLeftRightIcon },
  { href: '/seller/earnings', label: 'Earnings', icon: BanknotesIcon },
  { href: '/seller/courses', label: 'Courses', icon: AcademicCapIcon },
  { href: '/seller/analytics', label: 'Analytics', icon: ChartBarIcon },
  { href: '/seller/biolink', label: 'BioLink', icon: LinkIcon },
];

export default function SellerDropdown() {
  const { user } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const location = useLocation();

  const isAnyActive = sellerNavItems.some(
    (item) =>
      location.pathname === item.href ||
      (item.href !== '/seller' && location.pathname.startsWith(item.href + '/')) ||
      (item.href === '/seller' && location.pathname === '/seller')
  );

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!user?.isSeller) {
    return (
      <Link
        to="/become-seller"
        className="flex items-center gap-1.5 px-3.5 py-1.5 text-sm font-medium rounded-full text-primary hover:bg-primary/10 transition-all duration-200"
      >
        <SparklesIcon className="h-3.5 w-3.5" />
        Become a Seller
      </Link>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center gap-1 px-3.5 py-1.5 text-sm font-medium rounded-full transition-all duration-200',
          isAnyActive
            ? 'bg-primary/10 text-primary shadow-sm'
            : 'text-muted-foreground hover:text-foreground hover:bg-muted/80'
        )}
      >
        Selling
        <ChevronDownIcon
          className={cn('h-3.5 w-3.5 transition-transform', isOpen && 'rotate-180')}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="absolute left-0 mt-2 w-56 bg-card border rounded-2xl shadow-xl z-50 overflow-hidden"
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
          >
            <div className="p-2">
              <p className="px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Selling
              </p>
              {sellerNavItems.map((item) => {
                const isActive =
                  item.href === '/seller'
                    ? location.pathname === '/seller'
                    : location.pathname === item.href || location.pathname.startsWith(item.href + '/');
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    onClick={() => setIsOpen(false)}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 text-sm rounded-xl transition-colors',
                      isActive
                        ? 'bg-primary/10 text-primary font-medium'
                        : 'hover:bg-muted text-foreground'
                    )}
                  >
                    <item.icon className={cn('h-5 w-5', isActive ? 'text-primary' : 'text-muted-foreground')} />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
