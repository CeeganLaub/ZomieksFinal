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

// Stats data
const stats = [
  { value: '50K+', label: 'Active Users', icon: UserGroupIcon },
  { value: '100K+', label: 'Projects Completed', icon: CheckBadgeIcon },
  { value: '4.9/5', label: 'Average Rating', icon: StarIcon },
  { value: '24/7', label: 'Support', icon: ClockIcon },
];

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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/services?search=${encodeURIComponent(searchQuery)}`);
    }
  };

  return (
    <div className="overflow-hidden">
      {/* Hero Section */}
      <section className="relative min-h-[70vh] flex items-center bg-gradient-to-br from-emerald-950/30 via-background to-purple-950/20 overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div
            className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl"
            animate={{ x: [0, 30, 0], y: [0, -20, 0] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute bottom-20 right-10 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"
            animate={{ x: [0, -30, 0], y: [0, 20, 0] }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-primary/5 to-purple-500/5 rounded-full blur-3xl"
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
                <span className="relative">
                  <span className="text-primary">freelance</span>
                  <motion.svg
                    className="absolute -bottom-2 left-0 w-full"
                    viewBox="0 0 300 12"
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
                { value: '2,400+', label: 'Services' },
                { value: '500+', label: 'Courses' },
                { value: '4.9★', label: 'Avg Rating' },
                { value: '10K+', label: 'Happy Users' },
              ].map((stat, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <span className="font-bold text-foreground">{stat.value}</span>
                  <span className="text-muted-foreground">{stat.label}</span>
                </div>
              ))}
            </motion.div>
          </div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <div className="w-6 h-10 rounded-full border-2 border-muted-foreground/30 flex justify-center pt-2">
            <motion.div
              className="w-1.5 h-3 bg-muted-foreground/30 rounded-full"
              animate={{ y: [0, 8, 0], opacity: [1, 0.5, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </div>
        </motion.div>
      </section>

      {/* Trust Badges */}
      <section className="py-8 bg-gray-950">
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
                className="flex items-center gap-3 justify-center p-4 rounded-xl bg-white/5 border border-white/5"
                variants={fadeInUp}
              >
                <div className="p-2.5 rounded-lg bg-primary/20">
                  <badge.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-white text-sm">{badge.title}</h3>
                  <p className="text-xs text-gray-400">{badge.desc}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Categories */}
      <section className="container py-20">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerContainer}
        >
          <motion.div className="text-center mb-12" variants={fadeInUp}>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Explore Popular Categories</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Find the right freelancer for any project, big or small
            </p>
          </motion.div>
          
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
            <motion.div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4" variants={staggerContainer}>
              {categories?.data?.categories?.map((cat: any) => (
                <motion.div key={cat.id} variants={scaleIn}>
                  <Link
                    to={`/services?category=${cat.slug}`}
                    className="group block p-6 rounded-2xl border bg-background hover:border-primary hover:shadow-xl transition-all duration-300 text-center relative overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <motion.div 
                      className="text-5xl mb-4 relative z-10"
                      whileHover={{ scale: 1.2, rotate: [0, -10, 10, 0] }}
                      transition={{ duration: 0.3 }}
                    >
                      {categoryIcons[cat.icon] || '📦'}
                    </motion.div>
                    <h3 className="font-medium group-hover:text-primary transition-colors text-sm relative z-10">{cat.name}</h3>
                  </Link>
                </motion.div>
              ))}
            </motion.div>
          )}
        </motion.div>
      </section>

      {/* Featured Services */}
      <section className="bg-gradient-to-b from-muted/30 to-background py-20">
        <div className="container">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
          >
            <motion.div className="flex justify-between items-end mb-12" variants={fadeInUp}>
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
            </motion.div>
          
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
              <motion.div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6" variants={staggerContainer}>
                {featured?.data?.services?.map((service: any) => (
                  <motion.div key={service.id} variants={fadeInUp}>
                    <Link to={`/services/${service.seller?.username}/${service.slug}`}>
                      <Card className="group overflow-hidden hover:shadow-2xl transition-all duration-300 h-full border-2 border-transparent hover:border-primary/20">
                        <div className="aspect-video bg-muted relative overflow-hidden">
                          {service.images?.[0] ? (
                            <img 
                              src={service.images[0]} 
                              alt={service.title}
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-muted-foreground bg-gradient-to-br from-muted to-muted/50">
                              <SparklesIcon className="h-12 w-12 opacity-50" />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                          <motion.div
                            className="absolute bottom-3 right-3 bg-background/90 backdrop-blur-sm px-3 py-1.5 rounded-full text-sm font-semibold shadow-lg"
                            initial={{ opacity: 0, y: 10 }}
                            whileHover={{ scale: 1.05 }}
                          >
                            From R{service.packages?.[0]?.price?.toLocaleString() || '0'}
                          </motion.div>
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
                            <div className="flex items-center space-x-1 bg-yellow-50 px-2 py-1 rounded-full">
                              <StarIcon className="h-4 w-4 text-yellow-500" />
                              <span className="text-sm font-semibold text-yellow-700">
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
                  </motion.div>
                ))}
              </motion.div>
            ) : (
              <motion.div 
                className="text-center py-16 bg-muted/30 rounded-2xl"
                variants={fadeInUp}
              >
                <SparklesIcon className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
                <p className="text-muted-foreground mb-4 text-lg">No services available yet. Be the first to offer your skills!</p>
                <Link to="/become-seller">
                  <Button size="lg">Become a Seller</Button>
                </Link>
              </motion.div>
            )}

            <div className="text-center mt-8 md:hidden">
              <Link to="/services">
                <Button variant="outline" size="lg">
                  View all services
                  <ArrowRightIcon className="h-5 w-5 ml-2" />
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Featured Courses */}
      <section className="py-20 bg-gradient-to-b from-gray-950 to-gray-900 text-white relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 right-0 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
        </div>
        <div className="container relative z-10">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
          >
            <motion.div className="flex justify-between items-end mb-12" variants={fadeInUp}>
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
            </motion.div>

            {(coursesData?.data as any[])?.length > 0 ? (
              <motion.div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6" variants={staggerContainer}>
                {(coursesData.data as any[]).map((course: any) => (
                  <motion.div key={course.id} variants={fadeInUp}>
                    <Link to={`/courses/${course.slug}`}>
                      <div className="group rounded-2xl bg-gray-800/50 border border-gray-700/50 overflow-hidden hover:border-purple-500/30 hover:shadow-2xl hover:shadow-purple-500/10 transition-all duration-300">
                        <div className="aspect-video bg-gray-800 relative overflow-hidden">
                          {course.thumbnail ? (
                            <img 
                              src={course.thumbnail} 
                              alt={course.title}
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
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
                            <span className="font-bold text-lg text-white">R{course.price?.toFixed(0) || '0'}</span>
                            <span className="text-xs text-gray-400">{course.enrollCount || 0} students</span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </motion.div>
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
          </motion.div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-gradient-to-r from-primary via-emerald-600 to-teal-600 text-primary-foreground relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
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
            {stats.map((stat, i) => (
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
      <section className="container py-20">
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
      </section>

      {/* Testimonials Placeholder */}
      <section className="py-20 bg-muted/30">
        <div className="container">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
          >
            <motion.div className="text-center mb-12" variants={fadeInUp}>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Loved by Thousands</h2>
              <p className="text-lg text-muted-foreground">See what our community has to say</p>
            </motion.div>

            <motion.div className="grid md:grid-cols-3 gap-6" variants={staggerContainer}>
              {[
                { name: 'Sarah M.', role: 'Business Owner', text: 'Found an amazing designer who created my brand identity. The process was smooth and the results exceeded my expectations!' },
                { name: 'John D.', role: 'Startup Founder', text: 'As a startup, we needed quality work within budget. Zomieks connected us with talented developers who delivered brilliantly.' },
                { name: 'Thabo K.', role: 'Marketing Manager', text: 'The freelancers here are professional and skilled. Our social media presence has improved dramatically since using Zomieks.' },
              ].map((testimonial, i) => (
                <motion.div key={i} variants={fadeInUp}>
                  <Card className="h-full p-6 hover:shadow-lg transition-shadow">
                    <div className="flex items-center gap-1 mb-4">
                      {[...Array(5)].map((_, j) => (
                        <StarIcon key={j} className="h-5 w-5 text-yellow-400" />
                      ))}
                    </div>
                    <p className="text-muted-foreground mb-6 italic">"{testimonial.text}"</p>
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center text-white font-bold">
                        {testimonial.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-semibold">{testimonial.name}</div>
                        <div className="text-sm text-muted-foreground">{testimonial.role}</div>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative py-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary to-purple-700" />
        <div className="absolute inset-0 opacity-30">
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
      <section className="py-20">
        <div className="container">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeInUp}
          >
            <div className="rounded-3xl overflow-hidden bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 border border-gray-800 relative">
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
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
                      { label: 'Sell Services', desc: '8% commission' },
                      { label: 'Create Courses', desc: '20% platform fee' },
                      { label: 'Set Your Prices', desc: 'You control pricing' },
                      { label: 'From R399', desc: 'One-time seller fee' },
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
