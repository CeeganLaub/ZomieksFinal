import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Button } from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';
import { MagnifyingGlassIcon, StarIcon } from '@heroicons/react/24/solid';
import { 
  ShieldCheckIcon, 
  ClockIcon, 
  CurrencyDollarIcon,
  UserGroupIcon,
  CheckBadgeIcon,
  SparklesIcon,
  ArrowRightIcon,
  PlayIcon,
  AcademicCapIcon,
  LinkIcon,
  Squares2X2Icon,
  ChatBubbleLeftRightIcon,
  BanknotesIcon,
  DevicePhoneMobileIcon,
  PaintBrushIcon,
  GlobeAltIcon,
} from '@heroicons/react/24/outline';
import { useState } from 'react';
import { motion } from 'framer-motion';

// Animation variants
const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: { opacity: 1, scale: 1 },
};

// Category icon mapping
const categoryIcons: Record<string, string> = {
  'palette': '🎨',
  'code': '💻',
  'megaphone': '📢',
  'pencil': '✏️',
  'video': '🎬',
  'music': '🎵',
  'briefcase': '💼',
};

// Trust badges
const trustBadges = [
  { icon: ShieldCheckIcon, title: 'Secure Payments', desc: 'Escrow-protected transactions' },
  { icon: CurrencyDollarIcon, title: 'Money-Back Guarantee', desc: '24h refund on courses' },
  { icon: ClockIcon, title: 'Fast Delivery', desc: 'Most orders delivered in 24h' },
  { icon: CheckBadgeIcon, title: 'Verified Sellers', desc: 'Quality-checked freelancers' },
];

export default function HomePage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  const { data: categories, isLoading: categoriesLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get<any>('/services/meta/categories'),
  });

  const { data: featured, isLoading: servicesLoading } = useQuery({
    queryKey: ['services', 'featured'],
    queryFn: () => api.get<any>('/services', { params: { limit: 8, sortBy: 'rating' } }),
  });

  const { data: coursesData } = useQuery({
    queryKey: ['courses', 'featured-home'],
    queryFn: () => api.get<any>('/courses', { params: { limit: 4, sort: 'popular' } }),
  });

  const { data: platformStats } = useQuery({
    queryKey: ['platform-stats'],
    queryFn: () => api.get<any>('/services/meta/stats'),
    staleTime: 5 * 60 * 1000,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/services?search=${encodeURIComponent(searchQuery)}`);
    }
  };

  return (
    <div className="overflow-x-hidden">
      {/* Hero Section */}
      <section className="relative min-h-[70vh] flex items-center bg-gradient-to-b from-background via-background to-muted/30 overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none" aria-hidden="true">
          <motion.div
            className="absolute top-32 left-10 w-72 h-72 bg-primary/5 rounded-full blur-3xl"
            animate={{ x: [0, 30, 0], y: [0, -20, 0] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute bottom-20 right-10 w-80 h-80 bg-purple-500/5 rounded-full blur-3xl"
            animate={{ x: [0, -30, 0], y: [0, 20, 0] }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gradient-to-r from-primary/3 to-purple-500/3 rounded-full blur-3xl"
            animate={{ scale: [1, 1.1, 1], rotate: [0, 180, 360] }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          />
        </div>

        <div className="container relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <motion.div
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
              >
                <SparklesIcon className="h-4 w-4" />
                South Africa's #1 Freelance Marketplace
              </motion.div>
              
              <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
                Find the perfect{' '}
                <span className="relative inline-block">
                  <span className="text-primary relative z-10">freelance</span>
                  <motion.svg
                    className="absolute -bottom-2 left-0 w-full h-3"
                    viewBox="0 0 300 12"
                    preserveAspectRatio="none"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ delay: 0.5, duration: 0.8 }}
                  >
                    <motion.path
                      d="M2 8 C50 2, 100 12, 150 6 C200 0, 250 10, 298 4"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                      className="text-primary"
                      strokeLinecap="round"
                    />
                  </motion.svg>
                </span>
                <br />
                services for your business
              </h1>
              
              <motion.p
                className="text-xl md:text-2xl text-muted-foreground mb-10 max-w-2xl mx-auto"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                Connect with talented South African freelancers and get your projects done faster
              </motion.p>
            </motion.div>
            
            {/* Search bar */}
            <motion.form
              onSubmit={handleSearch}
              className="max-w-2xl mx-auto mb-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-primary via-purple-500 to-primary rounded-full opacity-30 blur group-hover:opacity-50 transition duration-300" />
                <div className="relative flex items-center bg-background rounded-full border-2 border-transparent">
                  <MagnifyingGlassIcon className="absolute left-5 h-6 w-6 text-muted-foreground" />
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder='Try "logo design" or "website development"'
                    className="w-full h-16 pl-14 pr-36 rounded-full bg-transparent text-lg focus:outline-none placeholder:text-muted-foreground/70"
                  />
                  <Button 
                    type="submit" 
                    size="lg"
                    className="absolute right-2 h-12 px-8 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
                  >
                    Search
                  </Button>
                </div>
              </div>
            </motion.form>

            {/* Popular tags */}
            <motion.div
              className="flex flex-wrap justify-center gap-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <span className="text-sm text-muted-foreground">Popular:</span>
              {['Logo Design', 'Website Development', 'Video Editing', 'Social Media', 'Copywriting'].map((tag, i) => (
                <motion.div
                  key={tag}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + i * 0.1 }}
                >
                  <Link 
                    to={`/services?search=${encodeURIComponent(tag)}`}
                    className="text-sm px-4 py-2 rounded-full bg-background border hover:border-primary hover:text-primary transition-all duration-200 hover:shadow-md"
                  >
                    {tag}
                  </Link>
                </motion.div>
              ))}
            </motion.div>

            {/* Social proof strip */}
            <motion.div
              className="mt-10 flex flex-wrap justify-center gap-x-8 gap-y-2 text-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
            >
              {[
                { value: (platformStats?.data?.totalServices || 0).toLocaleString(), label: 'Services' },
                { value: (coursesData as any)?.meta?.total?.toLocaleString() || '0', label: 'Courses' },
                { value: (platformStats?.data?.totalSellers || 0).toLocaleString(), label: 'Sellers' },
                { value: (platformStats?.data?.totalCategories || 0).toLocaleString(), label: 'Categories' },
              ].map((stat, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <span className="font-bold text-foreground">{stat.value}</span>
                  <span className="text-muted-foreground">{stat.label}</span>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* Trust Badges */}
      <section className="py-8 bg-muted/80 dark:bg-gray-950 relative z-20 border-y border-border dark:border-gray-800">
        <div className="container">
          <motion.div
            className="grid grid-cols-2 md:grid-cols-4 gap-4"
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {trustBadges.map((badge, i) => (
              <motion.div
                key={i}
                className="flex items-center gap-3 justify-center p-4 rounded-xl bg-background/60 dark:bg-white/5 border border-border dark:border-white/5"
                variants={fadeInUp}
              >
                <div className="p-2.5 rounded-lg bg-primary/20">
                  <badge.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground text-sm">{badge.title}</h3>
                  <p className="text-xs text-muted-foreground">{badge.desc}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* BioLink Showcase */}
      <section className="relative py-20 bg-background overflow-hidden">
        <div className="container relative z-10">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Phone Mockup */}
            <div className="flex justify-center order-2 md:order-1">
              <div className="relative">
                {/* Phone frame */}
                <div className="w-[280px] h-[560px] bg-gray-900 rounded-[3rem] p-3 shadow-2xl border-4 border-gray-800 relative">
                  {/* Notch */}
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-gray-900 rounded-b-2xl z-20" />
                  {/* Screen */}
                  <div className="w-full h-full bg-gradient-to-b from-emerald-600 to-emerald-800 rounded-[2.25rem] overflow-hidden relative">
                    {/* BioLink Preview Content */}
                    <div className="pt-10 px-4 text-center text-white">
                      <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm mx-auto mb-3 flex items-center justify-center text-3xl">
                        👩‍💻
                      </div>
                      <h4 className="font-bold text-lg">Sarah's Studio</h4>
                      <p className="text-emerald-200 text-xs mb-4">Graphic Designer & Brand Strategist</p>
                      
                      {/* Mini service cards */}
                      <div className="space-y-2 text-left">
                        {[
                          { title: 'Logo Design', price: 'R1,500' },
                          { title: 'Brand Identity Pack', price: 'R4,500' },
                          { title: 'Social Media Kit', price: 'R2,000' },
                        ].map((svc, i) => (
                          <div key={i} className="bg-white/15 backdrop-blur-sm rounded-xl p-3 flex items-center justify-between">
                            <span className="text-sm font-medium">{svc.title}</span>
                            <span className="text-xs bg-white/20 px-2 py-1 rounded-full">{svc.price}</span>
                          </div>
                        ))}
                      </div>
                      
                      {/* Social links */}
                      <div className="flex justify-center gap-3 mt-4">
                        {['🌐', '📸', '🐦'].map((icon, i) => (
                          <div key={i} className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center text-lg">
                            {icon}
                          </div>
                        ))}
                      </div>

                      {/* CTA */}
                      <div className="mt-4 bg-white text-emerald-700 font-semibold text-sm py-2.5 rounded-xl">
                        Contact Me
                      </div>
                    </div>
                  </div>
                </div>
                {/* Decorative glow */}
                <div className="absolute -inset-8 bg-primary/10 rounded-full blur-3xl -z-10" />
              </div>
            </div>

            {/* Text Content */}
            <div className="order-1 md:order-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
                <LinkIcon className="h-4 w-4" />
                BioLink — Your Digital Storefront
              </div>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                One link. All your services.
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                Get your own custom BioLink page — a personalized storefront where clients can browse your services, 
                courses, portfolio, and contact you directly. Share one link everywhere.
              </p>
              
              <div className="space-y-4 mb-8">
                {[
                  { icon: PaintBrushIcon, title: 'Fully Customizable', desc: 'Choose your theme, colors, and layout to match your brand' },
                  { icon: Squares2X2Icon, title: 'Showcase Everything', desc: 'Services, courses, portfolio, and social links in one place' },
                  { icon: GlobeAltIcon, title: 'Share Anywhere', desc: 'One clean link for Instagram, WhatsApp, email signatures & more' },
                  { icon: DevicePhoneMobileIcon, title: 'Mobile Optimized', desc: 'Looks stunning on any device your clients use' },
                ].map((feature, i) => (
                  <div key={i} className="flex items-start gap-4">
                    <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                      <feature.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-semibold">{feature.title}</h4>
                      <p className="text-sm text-muted-foreground">{feature.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <Link to="/become-seller">
                <Button size="lg" className="shadow-lg">
                  Get Your BioLink
                  <ArrowRightIcon className="h-5 w-5 ml-2" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-20 bg-muted/20">
        <div className="container">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Explore Popular Categories</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Find the right freelancer for any project, big or small
          </p>
        </div>
        
        {categoriesLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
            {[...Array(7)].map((_, i) => (
              <div key={i} className="p-6 rounded-xl border animate-pulse">
                <div className="w-12 h-12 bg-muted rounded-full mx-auto mb-3"></div>
                <div className="h-4 bg-muted rounded mx-auto w-20"></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
            {categories?.data?.categories?.map((cat: any) => (
              <Link
                key={cat.id}
                to={`/services?category=${cat.slug}`}
                className="group block p-6 rounded-2xl border bg-background hover:border-primary hover:shadow-xl transition-all duration-300 text-center relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="text-5xl mb-4 relative z-10">
                  {categoryIcons[cat.icon] || '📦'}
                </div>
                <h3 className="font-medium group-hover:text-primary transition-colors text-sm relative z-10">{cat.name}</h3>
              </Link>
            ))}
          </div>
        )}
        </div>
      </section>

      {/* Featured Services */}
      <section className="bg-background py-20 relative">
        <div className="container relative z-10">
          <div className="flex justify-between items-end mb-12">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-2">Featured Services</h2>
              <p className="text-muted-foreground">Top-rated services by our best freelancers</p>
            </div>
            <Link 
              to="/services" 
              className="hidden md:flex items-center gap-2 text-primary hover:gap-3 transition-all font-medium"
            >
              View all services
              <ArrowRightIcon className="h-5 w-5" />
            </Link>
          </div>
          
          {servicesLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <Card key={i} className="overflow-hidden animate-pulse">
                  <div className="aspect-video bg-muted"></div>
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <div className="h-8 w-8 rounded-full bg-muted"></div>
                      <div className="h-3 bg-muted rounded w-24"></div>
                    </div>
                    <div className="h-4 bg-muted rounded mb-2"></div>
                    <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                    <div className="h-5 bg-muted rounded w-20"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : featured?.data?.services?.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {featured?.data?.services?.map((service: any) => (
                <Link key={service.id} to={`/services/${service.seller?.username}/${service.slug}`}>
                  <Card className="group overflow-hidden hover:shadow-2xl transition-all duration-300 h-full border-2 border-transparent hover:border-primary/20">
                    <div className="aspect-video bg-gradient-to-br from-muted to-muted/50 relative overflow-hidden">
                      {service.images?.[0] ? (
                        <img 
                          src={service.images[0]} 
                          alt={service.title}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 relative z-[1]"
                          loading="lazy"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <SparklesIcon className="h-12 w-12 text-muted-foreground/20" />
                        </div>
                      )}
                      <div className="absolute bottom-3 right-3 z-[2] bg-background/90 backdrop-blur-sm px-3 py-1.5 rounded-full text-sm font-semibold shadow-lg">
                        {service.pricingType === 'SUBSCRIPTION'
                          ? `R${(service.subscriptionTiers?.[0]?.price || service.packages?.[0]?.price || 0).toLocaleString()}/mo`
                          : service.pricingType === 'BOTH'
                            ? `From R${(service.packages?.[0]?.price || 0).toLocaleString()}`
                            : `R${(service.packages?.[0]?.price || 0).toLocaleString()}`}
                      </div>
                    </div>
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-3 mb-3">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center text-white text-sm font-bold shadow-lg">
                          {service.seller?.username?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <span className="text-sm font-medium block">
                            {service.seller?.sellerProfile?.displayName || service.seller?.username}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            Level {service.seller?.sellerProfile?.level || 1} Seller
                          </span>
                        </div>
                      </div>
                      <h3 className="font-semibold line-clamp-2 mb-3 group-hover:text-primary transition-colors">
                        {service.title}
                      </h3>
                      <div className="flex items-center space-x-2">
                        <div className="flex items-center space-x-1 bg-yellow-500/10 px-2 py-1 rounded-full">
                          <StarIcon className="h-4 w-4 text-yellow-500" />
                          <span className="text-sm font-semibold text-yellow-600 dark:text-yellow-400">
                            {service.rating ? Number(service.rating).toFixed(1) : 'New'}
                          </span>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          ({service.reviewCount || 0} reviews)
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-muted/30 rounded-2xl">
              <SparklesIcon className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
              <p className="text-muted-foreground mb-4 text-lg">No services available yet. Be the first to offer your skills!</p>
              <Link to="/become-seller">
                <Button size="lg">Become a Seller</Button>
              </Link>
            </div>
          )}

          <div className="text-center mt-8 md:hidden">
            <Link to="/services">
              <Button variant="outline" size="lg">
                View all services
                <ArrowRightIcon className="h-5 w-5 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Why Sell on Zomieks */}
      <section className="py-20 bg-muted/20 relative">
        <div className="container relative z-10">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
              <SparklesIcon className="h-4 w-4" />
              Why Sell on Zomieks
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Everything you need to grow your freelance business</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              From selling services to creating courses, we give you the tools to build your brand and earn more.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {[
              { 
                icon: Squares2X2Icon, 
                title: 'Sell Services', 
                desc: 'Create unlimited service listings with tiered packages. Set your own prices and delivery times.',
                badge: '8% commission',
                color: 'from-emerald-500/20 to-emerald-600/5',
                iconColor: 'text-emerald-500',
              },
              { 
                icon: AcademicCapIcon, 
                title: 'Create & Sell Courses', 
                desc: 'Build and sell online courses with video lessons. Earn passive income from your expertise.',
                badge: '20% platform fee',
                color: 'from-purple-500/20 to-purple-600/5',
                iconColor: 'text-purple-500',
              },
              { 
                icon: LinkIcon, 
                title: 'BioLink Storefront', 
                desc: 'Get your own custom BioLink page to showcase all your services, courses, and social links.',
                badge: 'Pro exclusive',
                color: 'from-blue-500/20 to-blue-600/5',
                iconColor: 'text-blue-500',
              },
              { 
                icon: ChatBubbleLeftRightIcon, 
                title: 'Built-in CRM', 
                desc: 'Manage clients, track orders, and communicate with buyers all in one dashboard.',
                badge: 'All plans',
                color: 'from-orange-500/20 to-orange-600/5',
                iconColor: 'text-orange-500',
              },
              { 
                icon: BanknotesIcon, 
                title: 'Secure Payments', 
                desc: 'Get paid safely through PayFast and OZOW. Escrow protection on every order.',
                badge: 'Instant payouts',
                color: 'from-green-500/20 to-green-600/5',
                iconColor: 'text-green-500',
              },
              { 
                icon: MagnifyingGlassIcon, 
                title: 'Get Discovered', 
                desc: 'Your services appear in search results on the marketplace. Pro sellers get priority placement.',
                badge: 'SEO optimized',
                color: 'from-pink-500/20 to-pink-600/5',
                iconColor: 'text-pink-500',
              },
            ].map((benefit, i) => (
              <div key={i} className="group p-6 rounded-2xl border bg-background hover:shadow-xl hover:border-primary/20 transition-all duration-300 relative overflow-hidden">
                <div className={`absolute inset-0 bg-gradient-to-br ${benefit.color} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-4">
                    <div className={`p-2.5 rounded-xl bg-muted ${benefit.iconColor}`}>
                      <benefit.icon className="h-6 w-6" />
                    </div>
                    <span className="text-xs px-2.5 py-1 rounded-full bg-muted font-medium text-muted-foreground">
                      {benefit.badge}
                    </span>
                  </div>
                  <h3 className="font-bold text-lg mb-2">{benefit.title}</h3>
                  <p className="text-sm text-muted-foreground">{benefit.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Plans Comparison Mini */}
          <div className="max-w-2xl mx-auto">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-6 rounded-2xl border bg-background text-center">
                <h4 className="font-bold text-lg mb-1">Starter</h4>
                <p className="text-3xl font-bold text-primary mb-1">Free</p>
                <p className="text-sm text-muted-foreground mb-4">Perfect to get started</p>
                <ul className="text-sm text-left space-y-2">
                  <li className="flex items-center gap-2"><span className="text-primary">✓</span> Sell services</li>
                  <li className="flex items-center gap-2"><span className="text-primary">✓</span> Built-in CRM</li>
                  <li className="flex items-center gap-2"><span className="text-muted-foreground/50">✗</span> <span className="text-muted-foreground">BioLink page</span></li>
                  <li className="flex items-center gap-2"><span className="text-muted-foreground/50">✗</span> <span className="text-muted-foreground">Create courses</span></li>
                </ul>
              </div>
              <div className="p-6 rounded-2xl border-2 border-primary bg-primary/5 text-center relative">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-primary text-white text-xs font-bold rounded-full">
                  Popular
                </div>
                <h4 className="font-bold text-lg mb-1">Zomieks Pro</h4>
                <p className="text-3xl font-bold text-primary mb-1">R399<span className="text-base font-normal text-muted-foreground">/mo</span></p>
                <p className="text-sm text-muted-foreground mb-4">Full toolkit for pros</p>
                <ul className="text-sm text-left space-y-2">
                  <li className="flex items-center gap-2"><span className="text-primary">✓</span> Everything in Starter</li>
                  <li className="flex items-center gap-2"><span className="text-primary">✓</span> BioLink storefront</li>
                  <li className="flex items-center gap-2"><span className="text-primary">✓</span> Create & sell courses</li>
                  <li className="flex items-center gap-2"><span className="text-primary">✓</span> Priority in search</li>
                </ul>
              </div>
            </div>
            <div className="text-center mt-6">
              <Link to="/become-seller">
                <Button size="lg" className="px-8">
                  Start Selling Today
                  <ArrowRightIcon className="h-5 w-5 ml-2" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Courses */}
      <section className="py-20 bg-gray-900 dark:bg-gray-950 text-white relative overflow-hidden">
        <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none" aria-hidden="true">
          <div className="absolute top-0 right-0 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
        </div>
        <div className="container relative z-10">
          <div className="flex justify-between items-end mb-12">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 text-sm font-medium mb-3">
                <AcademicCapIcon className="h-4 w-4" />
                Learn & Grow
              </div>
              <h2 className="text-3xl md:text-4xl font-bold mb-2">Popular Courses</h2>
              <p className="text-gray-400">Upskill with courses created by expert sellers</p>
            </div>
            <Link 
              to="/courses" 
              className="hidden md:flex items-center gap-2 text-purple-400 hover:text-purple-300 hover:gap-3 transition-all font-medium"
            >
              View all courses
              <ArrowRightIcon className="h-5 w-5" />
            </Link>
          </div>

          {(coursesData?.data as any[])?.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {(coursesData.data as any[]).map((course: any) => (
                <Link key={course.id} to={`/courses/${course.slug}`}>
                  <div className="group rounded-2xl bg-gray-800/50 border border-gray-700/50 overflow-hidden hover:border-purple-500/30 hover:shadow-2xl hover:shadow-purple-500/10 transition-all duration-300">
                    <div className="aspect-video bg-gray-800 relative overflow-hidden">
                      {course.thumbnail ? (
                        <img 
                          src={course.thumbnail} 
                          alt={course.title}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-900/50 to-gray-800">
                          <AcademicCapIcon className="h-12 w-12 text-purple-400/50" />
                        </div>
                      )}
                      {course.enrollCount > 5 && (
                        <div className="absolute top-3 left-3 px-2 py-1 rounded-full bg-orange-500 text-white text-xs font-bold">
                          🔥 Popular
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 capitalize">{course.level || 'All Levels'}</span>
                      </div>
                      <h3 className="font-semibold text-white line-clamp-2 mb-2 group-hover:text-purple-300 transition-colors">{course.title}</h3>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-lg text-white">R{Number(course.price || 0).toFixed(0)}</span>
                        <span className="text-xs text-gray-400">{course.enrollCount || 0} students</span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 rounded-2xl bg-gray-800/30 border border-gray-700/30">
              <AcademicCapIcon className="h-12 w-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400">Courses coming soon!</p>
            </div>
          )}

          <div className="text-center mt-8 md:hidden">
            <Link to="/courses">
              <Button variant="outline" size="lg" className="border-gray-700 text-white hover:bg-gray-800">
                View all courses
                <ArrowRightIcon className="h-5 w-5 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-gradient-to-r from-primary via-emerald-600 to-teal-600 text-primary-foreground relative overflow-hidden">
        <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none" aria-hidden="true">
          <div className="absolute top-0 left-0 w-64 h-64 bg-white/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
        </div>
        <div className="container relative z-10">
          <motion.div
            className="grid grid-cols-2 md:grid-cols-4 gap-8"
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {[
              { value: (platformStats?.data?.totalSellers || 0).toLocaleString(), label: 'Active Sellers', icon: UserGroupIcon },
              { value: (platformStats?.data?.totalServices || 0).toLocaleString(), label: 'Services Listed', icon: CheckBadgeIcon },
              { value: (platformStats?.data?.totalCategories || 0).toLocaleString(), label: 'Categories', icon: StarIcon },
              { value: '24/7', label: 'Support', icon: ClockIcon },
            ].map((stat, i) => (
              <motion.div key={i} className="text-center" variants={scaleIn}>
                <stat.icon className="h-8 w-8 mx-auto mb-3 opacity-80" />
                <div className="text-4xl md:text-5xl font-bold mb-2">{stat.value}</div>
                <div className="text-sm md:text-base opacity-80">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 bg-background">
        <div className="container">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerContainer}
        >
          <motion.div className="text-center mb-16" variants={fadeInUp}>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">How Zomieks Works</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Get your project done in three simple steps
            </p>
          </motion.div>
          
          <div className="grid md:grid-cols-3 gap-8 relative">
            {/* Connecting line */}
            <div className="hidden md:block absolute top-16 left-1/4 right-1/4 h-0.5 bg-gradient-to-r from-primary/50 via-primary to-primary/50" />
            
            {[
              { 
                step: '1', 
                title: 'Find the perfect service', 
                desc: 'Browse through thousands of services or search for exactly what you need. Compare freelancers, prices, and reviews.',
                icon: MagnifyingGlassIcon,
              },
              { 
                step: '2', 
                title: 'Place your order', 
                desc: 'Choose a package that fits your budget and timeline. Make a secure payment with PayFast or OZOW.',
                icon: CurrencyDollarIcon,
              },
              { 
                step: '3', 
                title: 'Get your delivery', 
                desc: 'Receive your completed work and request revisions if needed. Release payment when you\'re satisfied.',
                icon: CheckBadgeIcon,
              },
            ].map((item) => (
              <motion.div 
                key={item.step} 
                className="text-center relative"
                variants={fadeInUp}
              >
                <motion.div 
                  className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-purple-600 text-primary-foreground text-2xl font-bold flex items-center justify-center mx-auto mb-6 shadow-xl relative z-10"
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <item.icon className="h-8 w-8" />
                </motion.div>
                <h3 className="text-xl font-bold mb-3">{item.title}</h3>
                <p className="text-muted-foreground max-w-xs mx-auto">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
        </div>
      </section>



      {/* CTA */}
      <section className="relative py-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary to-purple-700" />
        <div className="absolute inset-0 -z-0 opacity-30 pointer-events-none" aria-hidden="true">
          <div className="absolute top-0 left-0 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl" />
        </div>
        
        <div className="container relative z-10">
          <motion.div
            className="text-center text-primary-foreground"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
          >
            <motion.h2 
              className="text-4xl md:text-5xl font-bold mb-6"
              variants={fadeInUp}
            >
              Ready to get started?
            </motion.h2>
            <motion.p 
              className="text-xl opacity-90 mb-10 max-w-2xl mx-auto"
              variants={fadeInUp}
            >
              Join thousands of freelancers and businesses on Zomieks. 
              Start your journey today!
            </motion.p>
            <motion.div 
              className="flex flex-col sm:flex-row justify-center gap-4"
              variants={fadeInUp}
            >
              <Link to="/register">
                <Button 
                  size="lg" 
                  variant="secondary"
                  className="text-lg px-8 py-6 shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300"
                >
                  Join for Free
                  <ArrowRightIcon className="h-5 w-5 ml-2" />
                </Button>
              </Link>
              <Link to="/services">
                <Button 
                  size="lg" 
                  variant="outline" 
                  className="text-lg px-8 py-6 border-white/30 text-white hover:bg-white/10 hover:scale-105 transition-all duration-300"
                >
                  <PlayIcon className="h-5 w-5 mr-2" />
                  Browse Services
                </Button>
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Become a Seller CTA */}
      <section className="py-20 bg-background">
        <div className="container">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeInUp}
          >
            <div className="rounded-3xl overflow-hidden bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 border border-gray-800 relative">
              <div className="absolute inset-0 -z-0 overflow-hidden pointer-events-none" aria-hidden="true">
                <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
                <div className="absolute bottom-0 left-0 w-72 h-72 bg-purple-600/10 rounded-full blur-3xl" />
              </div>
              <div className="grid md:grid-cols-2 gap-8 relative z-10">
                <div className="p-8 md:p-12 flex flex-col justify-center text-white">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/20 text-primary text-sm font-medium mb-4 w-fit">
                    <SparklesIcon className="h-4 w-4" />
                    Start Earning
                  </div>
                  <h2 className="text-3xl md:text-4xl font-bold mb-4">
                    Turn your skills into income
                  </h2>
                  <p className="text-gray-400 mb-6 text-lg">
                    Join our community of freelancers. Sell services, create courses, and grow your brand.
                  </p>
                  <div className="grid grid-cols-2 gap-3 mb-6">
                    {[
                      { label: 'Sell Services', desc: '8% commission only' },
                      { label: 'Create Courses', desc: '20% platform fee' },
                      { label: 'BioLink Page', desc: 'Your digital storefront' },
                      { label: 'Zomieks Pro', desc: 'R399/month subscription' },
                    ].map((item, i) => (
                      <div key={i} className="p-3 rounded-xl bg-white/5 border border-white/10">
                        <div className="font-semibold text-sm text-white">{item.label}</div>
                        <div className="text-xs text-gray-400">{item.desc}</div>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-3 mb-6 text-sm text-gray-400">
                    <ShieldCheckIcon className="h-5 w-5 text-primary shrink-0" />
                    <span>24h money-back guarantee on courses &bull; Secure escrow payments</span>
                  </div>
                  <Link to="/become-seller">
                    <Button size="lg" className="w-fit shadow-lg shadow-primary/25">
                      Become a Seller
                      <ArrowRightIcon className="h-5 w-5 ml-2" />
                    </Button>
                  </Link>
                </div>
                <div className="relative h-64 md:h-auto flex items-center justify-center">
                  <motion.div
                    className="text-[120px] md:text-[160px] leading-none"
                    animate={{ y: [0, -10, 0], rotate: [0, 3, 0, -3, 0] }}
                    transition={{ duration: 4, repeat: Infinity }}
                  >
                    💼
                  </motion.div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
