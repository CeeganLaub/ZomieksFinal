import { Outlet, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ShieldCheckIcon,
  CurrencyDollarIcon,
  UserGroupIcon,
  CheckBadgeIcon,
} from '@heroicons/react/24/outline';

// Features list
const features = [
  { icon: ShieldCheckIcon, title: 'Secure Payments', desc: 'Protected by escrow until you approve' },
  { icon: CurrencyDollarIcon, title: 'Money-Back Guarantee', desc: 'Full refund if not satisfied' },
  { icon: UserGroupIcon, title: 'Verified Freelancers', desc: 'Vetted professionals you can trust' },
  { icon: CheckBadgeIcon, title: 'Quality Work', desc: 'Average 4.9 star rating' },
];

export default function AuthLayout() {
  return (
    <div className="min-h-screen flex bg-background">
      {/* Left side - branding */}
      <motion.div 
        className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary via-primary to-purple-700 text-primary-foreground flex-col justify-between p-12 relative overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        {/* Background decorations */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div
            className="absolute -top-20 -left-20 w-80 h-80 bg-white/10 rounded-full blur-3xl"
            animate={{ x: [0, 30, 0], y: [0, -20, 0] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute -bottom-20 -right-20 w-96 h-96 bg-purple-500/30 rounded-full blur-3xl"
            animate={{ x: [0, -30, 0], y: [0, 20, 0] }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gradient-to-r from-white/5 to-transparent rounded-full blur-3xl"
            animate={{ scale: [1, 1.1, 1], rotate: [0, 180, 360] }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          />
        </div>

        {/* Logo */}
        <Link to="/" className="relative z-10 flex items-center gap-3">
          <motion.div 
            className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg"
            whileHover={{ scale: 1.05 }}
          >
            <span className="text-2xl font-bold">Z</span>
          </motion.div>
          <span className="text-3xl font-bold">Zomieks</span>
        </Link>

        {/* Main content */}
        <div className="relative z-10 space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h1 className="text-4xl xl:text-5xl font-bold mb-6 leading-tight">
              Find the perfect{' '}
              <span className="relative inline-block">
                freelance
                <motion.svg
                  className="absolute -bottom-1 left-0 w-full"
                  viewBox="0 0 200 8"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ delay: 0.5, duration: 0.8 }}
                >
                  <motion.path
                    d="M2 5 C40 2, 80 8, 120 4 C160 0, 180 6, 198 3"
                    stroke="currentColor"
                    strokeWidth="3"
                    fill="none"
                    strokeLinecap="round"
                    className="text-white/60"
                  />
                </motion.svg>
              </span>
              {' '}services for your business
            </h1>
            <p className="text-lg xl:text-xl opacity-90 max-w-lg">
              Join thousands of South African freelancers and businesses working together on Zomieks.
            </p>
          </motion.div>

          {/* Features grid */}
          <motion.div 
            className="grid grid-cols-2 gap-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            {features.map((feature, i) => (
              <motion.div 
                key={i}
                className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + i * 0.1 }}
                whileHover={{ scale: 1.02, backgroundColor: 'rgba(255,255,255,0.15)' }}
              >
                <feature.icon className="h-6 w-6 mb-2" />
                <h3 className="font-semibold text-sm">{feature.title}</h3>
                <p className="text-xs opacity-80">{feature.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>

        {/* Footer */}
        <div className="relative z-10 flex items-center justify-between text-sm opacity-70">
          <p>&copy; {new Date().getFullYear()} Zomieks. All rights reserved.</p>
          <div className="flex gap-4">
            <Link to="/terms" className="hover:opacity-100 transition-opacity">Terms</Link>
            <Link to="/privacy" className="hover:opacity-100 transition-opacity">Privacy</Link>
          </div>
        </div>
      </motion.div>

      {/* Right side - form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-gradient-to-br from-background to-muted/30">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden mb-8 text-center">
            <Link to="/" className="inline-flex items-center gap-2">
              <motion.div 
                className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-white font-bold shadow-lg"
                whileHover={{ scale: 1.05 }}
              >
                Z
              </motion.div>
              <span className="text-2xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                Zomieks
              </span>
            </Link>
          </div>
          <Outlet />
        </div>
      </div>
    </div>
  );
}
