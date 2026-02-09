import { Outlet, Link } from 'react-router-dom';
import { Header } from '../components/nav';
import { useState } from 'react';
import { toast } from 'sonner';
import { 
  UserGroupIcon,
  ShieldCheckIcon,
  QuestionMarkCircleIcon,
  EnvelopeIcon,
} from '@heroicons/react/24/outline';

export default function MainLayout() {
  const [email, setEmail] = useState('');

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <Header />

      {/* Main content */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-gray-950 text-gray-300 mt-auto relative overflow-hidden">
        {/* Gradient top border */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-primary via-emerald-400 to-teal-400" />

        {/* Subtle background glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />

        <div className="container relative py-16">
          <div className="grid grid-cols-2 md:grid-cols-6 gap-8 lg:gap-10">
            {/* Brand */}
            <div className="col-span-2">
              <Link to="/" className="inline-flex items-center gap-2.5 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary via-emerald-500 to-teal-500 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-primary/25">
                  Z
                </div>
                <span className="text-xl font-extrabold text-white">
                  Zom<span className="text-primary">ieks</span>
                </span>
              </Link>
              <p className="text-sm text-gray-400 mb-5 leading-relaxed max-w-xs">
                South Africa's leading freelance marketplace. Connect with talented professionals and grow your business.
              </p>

              {/* Newsletter */}
              <div className="mb-6">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Stay updated</p>
                <form onSubmit={(e) => { e.preventDefault(); if (email.trim()) { toast.success('Thanks for subscribing!'); setEmail(''); } }} className="flex gap-2">
                  <div className="relative flex-1">
                    <EnvelopeIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your@email.com"
                      className="w-full h-10 pl-9 pr-3 rounded-lg bg-gray-900 border border-gray-800 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/25 transition-all"
                    />
                  </div>
                  <button type="submit" className="px-4 h-10 rounded-lg bg-primary hover:bg-primary/90 text-white text-sm font-medium transition-colors shrink-0">
                    Subscribe
                  </button>
                </form>
              </div>

              <div className="flex gap-3">
                <a href="#" aria-label="Follow us on Twitter" className="w-9 h-9 rounded-lg bg-gray-800/80 hover:bg-primary hover:text-white text-gray-400 flex items-center justify-center transition-all duration-200 hover:scale-110">
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/></svg>
                </a>
                <a href="#" aria-label="Follow us on Instagram" className="w-9 h-9 rounded-lg bg-gray-800/80 hover:bg-gradient-to-br hover:from-purple-500 hover:to-pink-500 hover:text-white text-gray-400 flex items-center justify-center transition-all duration-200 hover:scale-110">
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                </a>
                <a href="#" aria-label="Follow us on LinkedIn" className="w-9 h-9 rounded-lg bg-gray-800/80 hover:bg-blue-600 hover:text-white text-gray-400 flex items-center justify-center transition-all duration-200 hover:scale-110">
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
                </a>
              </div>
            </div>
            
            {/* Categories */}
            <div>
              <h3 className="font-semibold mb-4 text-xs uppercase tracking-widest text-primary">Categories</h3>
              <ul className="space-y-2.5 text-sm">
                <li><Link to="/services?category=design" className="text-gray-400 hover:text-white transition-colors">Design</Link></li>
                <li><Link to="/services?category=development" className="text-gray-400 hover:text-white transition-colors">Development</Link></li>
                <li><Link to="/services?category=marketing" className="text-gray-400 hover:text-white transition-colors">Marketing</Link></li>
                <li><Link to="/services?category=writing" className="text-gray-400 hover:text-white transition-colors">Writing</Link></li>
                <li><Link to="/services?category=video" className="text-gray-400 hover:text-white transition-colors">Video & Animation</Link></li>
              </ul>
            </div>
            
            {/* Company */}
            <div>
              <h3 className="font-semibold mb-4 text-xs uppercase tracking-widest text-primary">Company</h3>
              <ul className="space-y-2.5 text-sm">
                <li><Link to="/about" className="text-gray-400 hover:text-white transition-colors">About Us</Link></li>
                <li><Link to="/careers" className="text-gray-400 hover:text-white transition-colors">Careers</Link></li>
                <li><Link to="/press" className="text-gray-400 hover:text-white transition-colors">Press & News</Link></li>
                <li><Link to="/partnerships" className="text-gray-400 hover:text-white transition-colors">Partnerships</Link></li>
              </ul>
            </div>
            
            {/* Support */}
            <div>
              <h3 className="font-semibold mb-4 text-xs uppercase tracking-widest text-primary">Support</h3>
              <ul className="space-y-2.5 text-sm">
                <li><Link to="/help" className="text-gray-400 hover:text-white transition-colors flex items-center gap-2"><QuestionMarkCircleIcon className="h-4 w-4" />Help Center</Link></li>
                <li><Link to="/trust" className="text-gray-400 hover:text-white transition-colors flex items-center gap-2"><ShieldCheckIcon className="h-4 w-4" />Trust & Safety</Link></li>
                <li><Link to="/become-seller" className="text-gray-400 hover:text-white transition-colors flex items-center gap-2"><UserGroupIcon className="h-4 w-4" />Become a Seller</Link></li>
              </ul>
            </div>
            
            {/* Legal */}
            <div>
              <h3 className="font-semibold mb-4 text-xs uppercase tracking-widest text-primary">Legal</h3>
              <ul className="space-y-2.5 text-sm">
                <li><Link to="/terms" className="text-gray-400 hover:text-white transition-colors">Terms of Service</Link></li>
                <li><Link to="/privacy" className="text-gray-400 hover:text-white transition-colors">Privacy Policy</Link></li>
                <li><Link to="/cookies" className="text-gray-400 hover:text-white transition-colors">Cookie Policy</Link></li>
              </ul>
            </div>
          </div>
          
          {/* Bottom bar */}
          <div className="mt-12 pt-8 border-t border-gray-800/80 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-gray-500">
              &copy; {new Date().getFullYear()} Zomieks. All rights reserved.
            </p>
            <div className="flex items-center gap-5 text-sm text-gray-500">
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-sm shadow-emerald-500/50" />
                All systems operational
              </span>
              <span className="text-gray-600">|</span>
              <span>ZAR (R)</span>
              <span>🇿🇦 South Africa</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
