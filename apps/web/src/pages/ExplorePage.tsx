import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import {
  MagnifyingGlassIcon,
  StarIcon,
} from '@heroicons/react/24/solid';
import {
  SparklesIcon,
  AcademicCapIcon,
  ClockIcon,
  UsersIcon,
  ArrowRightIcon,
  ShoppingBagIcon,
} from '@heroicons/react/24/outline';
import { formatCurrency } from '../lib/utils';
import { motion } from 'framer-motion';

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export default function ExplorePage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  const { data: servicesData, isLoading: servicesLoading } = useQuery({
    queryKey: ['explore-services'],
    queryFn: () => api.get<any>('/services', { params: { limit: 8, sortBy: 'rating' } }),
  });

  const { data: coursesData, isLoading: coursesLoading } = useQuery({
    queryKey: ['explore-courses'],
    queryFn: () => api.get<any>('/courses', { params: { limit: 8, sort: 'popular' } }),
  });

  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get<any>('/services/meta/categories'),
  });

  const services = servicesData?.data?.services || [];
  const courses = coursesData?.data || [];
  const categories = categoriesData?.data?.categories || categoriesData?.data || [];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/services?search=${encodeURIComponent(searchQuery)}`);
    }
  };

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative bg-gradient-to-br from-emerald-950/30 via-background to-purple-950/20">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div
            className="absolute top-10 right-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl"
            animate={{ x: [0, 20, 0], y: [0, -15, 0] }}
            transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="absolute bottom-10 left-10 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl"
            animate={{ x: [0, -20, 0], y: [0, 15, 0] }}
            transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>

        <div className="container relative z-10 py-16 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
              <SparklesIcon className="h-4 w-4" />
              Discover Services & Courses
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Explore Everything on{' '}
              <span className="text-primary">Zomieks</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
              Browse freelance services and online courses — all in one place
            </p>
          </motion.div>

          {/* Search */}
          <motion.form
            onSubmit={handleSearch}
            className="max-w-xl mx-auto"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search services, courses, freelancers..."
                className="w-full h-14 pl-12 pr-28 rounded-full border-2 bg-background focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-lg shadow-sm"
              />
              <Button
                type="submit"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full px-6 h-10"
              >
                Search
              </Button>
            </div>
          </motion.form>
        </div>
      </section>

      {/* Quick Category Links */}
      {categories.length > 0 && (
        <section className="container py-8">
          <motion.div
            className="flex flex-wrap justify-center gap-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            {categories.slice(0, 7).map((cat: any) => (
              <Link
                key={cat.id}
                to={`/services?category=${cat.slug}`}
                className="px-4 py-2 rounded-full border bg-background hover:border-primary hover:text-primary transition-all text-sm font-medium hover:shadow-md"
              >
                {cat.name}
              </Link>
            ))}
          </motion.div>
        </section>
      )}

      {/* Featured Services */}
      <section className="container py-12">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerContainer}
        >
          <motion.div className="flex justify-between items-end mb-8" variants={fadeInUp}>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <ShoppingBagIcon className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h2 className="text-2xl md:text-3xl font-bold">Top Services</h2>
                <p className="text-muted-foreground text-sm">Hire talented freelancers for your projects</p>
              </div>
            </div>
            <Link
              to="/services"
              className="hidden md:flex items-center gap-2 text-primary hover:gap-3 transition-all font-medium text-sm"
            >
              View all services
              <ArrowRightIcon className="h-4 w-4" />
            </Link>
          </motion.div>

          {servicesLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <Card key={i} className="overflow-hidden animate-pulse">
                  <div className="aspect-video bg-muted" />
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-muted" />
                      <div className="h-3 bg-muted rounded w-24" />
                    </div>
                    <div className="h-4 bg-muted rounded" />
                    <div className="h-4 bg-muted rounded w-3/4" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : services.length > 0 ? (
            <motion.div
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
              variants={staggerContainer}
            >
              {services.map((service: any) => (
                <motion.div key={service.id} variants={fadeInUp}>
                  <Link to={`/services/${service.seller?.username}/${service.slug}`}>
                    <Card className="group overflow-hidden hover:shadow-xl transition-all duration-300 h-full border-2 border-transparent hover:border-primary/20">
                      <div className="aspect-video bg-muted relative overflow-hidden">
                        {service.images?.[0] ? (
                          <img
                            src={service.images[0]}
                            alt={service.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/50">
                            <SparklesIcon className="h-12 w-12 text-muted-foreground/30" />
                          </div>
                        )}
                        <div className="absolute bottom-3 right-3 bg-background/90 backdrop-blur-sm px-3 py-1.5 rounded-lg font-bold text-sm shadow-lg">
                          {service.pricingType === 'SUBSCRIPTION'
                            ? `${formatCurrency(service.subscriptionTiers?.[0]?.price || service.packages?.[0]?.price || 0)}/mo`
                            : service.pricingType === 'BOTH'
                              ? `From ${formatCurrency(service.packages?.[0]?.price || 0)}`
                              : formatCurrency(service.packages?.[0]?.price || 0)}
                        </div>
                      </div>
                      <CardContent className="p-4">
                        <div className="flex items-center space-x-3 mb-3">
                          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center text-white text-xs font-bold shadow">
                            {service.seller?.username?.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-sm font-medium truncate">
                            {service.seller?.sellerProfile?.displayName || service.seller?.username}
                          </span>
                        </div>
                        <h3 className="font-semibold text-sm line-clamp-2 mb-2 group-hover:text-primary transition-colors">
                          {service.title}
                        </h3>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1 bg-yellow-50 px-2 py-0.5 rounded-full">
                            <StarIcon className="h-3.5 w-3.5 text-yellow-500" />
                            <span className="text-xs font-bold text-yellow-700">
                              {service.rating ? Number(service.rating).toFixed(1) : 'New'}
                            </span>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            ({service.reviewCount || 0})
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <div className="text-center py-12 bg-muted/30 rounded-2xl">
              <SparklesIcon className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-muted-foreground">No services available yet</p>
            </div>
          )}

          <div className="text-center mt-6 md:hidden">
            <Link to="/services">
              <Button variant="outline">
                View all services <ArrowRightIcon className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </div>
        </motion.div>
      </section>

      {/* Divider */}
      <div className="h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />

      {/* Featured Courses */}
      <section className="py-16 bg-gray-950 text-white relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 right-0 w-96 h-96 bg-purple-600/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-72 h-72 bg-primary/5 rounded-full blur-3xl" />
        </div>
        <div className="container relative z-10">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerContainer}
        >
          <motion.div className="flex justify-between items-end mb-8" variants={fadeInUp}>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/20">
                <AcademicCapIcon className="h-6 w-6 text-purple-400" />
              </div>
              <div>
                <h2 className="text-2xl md:text-3xl font-bold text-white">Popular Courses</h2>
                <p className="text-gray-400 text-sm">Learn new skills from expert sellers</p>
              </div>
            </div>
            <Link
              to="/courses"
              className="hidden md:flex items-center gap-2 text-purple-400 hover:gap-3 transition-all font-medium text-sm"
            >
              View all courses
              <ArrowRightIcon className="h-4 w-4" />
            </Link>
          </motion.div>

          {coursesLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="bg-muted rounded-xl h-40" />
                  <div className="mt-3 space-y-2">
                    <div className="bg-muted rounded h-4 w-3/4" />
                    <div className="bg-muted rounded h-3 w-1/2" />
                    <div className="bg-muted rounded h-3 w-1/4" />
                  </div>
                </div>
              ))}
            </div>
          ) : courses.length > 0 ? (
            <motion.div
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
              variants={staggerContainer}
            >
              {courses.map((course: any) => (
                <motion.div key={course.id} variants={fadeInUp}>
                  <Link to={`/courses/${course.slug}`} className="group block">
                    <div className="rounded-xl overflow-hidden bg-gray-800/50 hover:shadow-xl hover:shadow-purple-500/10 transition-all duration-300 border border-gray-700/50 hover:border-purple-500/30">
                      {/* Thumbnail */}
                      <div className="aspect-video bg-muted relative overflow-hidden">
                        {course.thumbnail ? (
                          <img
                            src={course.thumbnail}
                            alt={course.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-500/20 to-primary/20">
                            <AcademicCapIcon className="h-12 w-12 text-purple-500/40" />
                          </div>
                        )}
                        <div className="absolute top-2 right-2 bg-background/90 backdrop-blur-sm px-2 py-1 rounded-md text-sm font-bold shadow">
                          {Number(course.price) === 0 ? 'Free' : `R${Number(course.price).toFixed(0)}`}
                        </div>
                      </div>

                      {/* Content */}
                      <div className="p-4">
                        <h3 className="font-semibold text-sm line-clamp-2 text-white group-hover:text-purple-300 transition-colors">
                          {course.title}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-1">
                          {course.seller?.displayName || course.seller?.user?.username}
                        </p>

                        {/* Rating */}
                        <div className="flex items-center gap-1 mt-2">
                          <span className="text-sm font-bold text-yellow-500">
                            {Number(course.rating) > 0 ? Number(course.rating).toFixed(1) : 'New'}
                          </span>
                          {Number(course.rating) > 0 && (
                            <>
                              <div className="flex">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <StarIcon
                                    key={star}
                                    className={`h-3.5 w-3.5 ${
                                      star <= Math.round(Number(course.rating))
                                        ? 'text-yellow-400 fill-yellow-400'
                                        : 'text-gray-300'
                                    }`}
                                  />
                                ))}
                              </div>
                              <span className="text-xs text-muted-foreground">({course.reviewCount})</span>
                            </>
                          )}
                        </div>

                        {/* Meta */}
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <ClockIcon className="h-3.5 w-3.5" />
                            {formatDuration(course.totalDuration || 0)}
                          </span>
                          <span className="flex items-center gap-1">
                            <UsersIcon className="h-3.5 w-3.5" />
                            {course.enrollCount || 0}
                          </span>
                          <span className="capitalize text-xs px-1.5 py-0.5 bg-muted rounded">
                            {course.level?.toLowerCase().replace(/_/g, ' ')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <div className="text-center py-12 bg-muted/30 rounded-2xl">
              <AcademicCapIcon className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-muted-foreground">No courses available yet</p>
            </div>
          )}

          <div className="text-center mt-6 md:hidden">
            <Link to="/courses">
              <Button variant="outline">
                View all courses <ArrowRightIcon className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </div>
        </motion.div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="bg-gradient-to-r from-primary via-emerald-600 to-teal-600 py-16">
        <div className="container text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-2xl md:text-3xl font-bold mb-3 text-white">
              Can't find what you're looking for?
            </h2>
            <p className="text-white/80 mb-6 max-w-lg mx-auto">
              Browse our full catalogue of services and courses, or become a seller and offer your own skills.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link to="/services">
                <Button size="lg" variant="secondary" className="gap-2">
                  <ShoppingBagIcon className="h-5 w-5" />
                  All Services
                </Button>
              </Link>
              <Link to="/courses">
                <Button size="lg" variant="outline" className="gap-2 border-white/30 text-white hover:bg-white/10">
                  <AcademicCapIcon className="h-5 w-5" />
                  All Courses
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
