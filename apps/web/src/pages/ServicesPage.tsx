import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { StarIcon, FunnelIcon, XMarkIcon, MagnifyingGlassIcon } from '@heroicons/react/24/solid';
import { 
  SparklesIcon, 
  ClockIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  AdjustmentsHorizontalIcon,
} from '@heroicons/react/24/outline';
import { formatCurrency } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

// Animation variants
const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

export default function ServicesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [showFilters, setShowFilters] = useState(false);

  const category = searchParams.get('category') || '';
  const search = searchParams.get('search') || '';
  const minPrice = searchParams.get('minPrice') || '';
  const maxPrice = searchParams.get('maxPrice') || '';
  const deliveryDays = searchParams.get('deliveryDays') || '';
  const sortBy = searchParams.get('sortBy') || 'popular';
  const page = parseInt(searchParams.get('page') || '1');

  const { data, isLoading } = useQuery({
    queryKey: ['services', { category, search, minPrice, maxPrice, deliveryDays, sortBy, page }],
    queryFn: () => api.get<any>('/services', {
      params: { category, search, minPrice, maxPrice, deliveryDays, sortBy, page, limit: 20 },
    }),
  });

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get<any>('/services/meta/categories'),
  });

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.delete('page');
    setSearchParams(params);
  };

  const clearFilters = () => {
    setSearchParams({});
  };

  const hasActiveFilters = category || search || minPrice || maxPrice || deliveryDays;
  const resultsCount = data?.meta?.total || 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-muted/30 to-background">
      {/* Hero header */}
      <motion.div 
        className="bg-gradient-to-r from-primary/10 via-background to-purple-500/10 border-b"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="container py-10">
          <motion.h1 
            className="text-4xl md:text-5xl font-bold mb-4"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {category 
              ? categories?.data?.categories?.find((c: any) => c.slug === category)?.name || 'Services' 
              : search 
                ? `Results for "${search}"`
                : 'Explore All Services'
            }
          </motion.h1>
          <motion.p 
            className="text-lg text-muted-foreground max-w-2xl"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            Find the perfect freelancer for your project from our curated selection
          </motion.p>
          
          {/* Search bar */}
          <motion.div 
            className="mt-6 max-w-2xl"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search services..."
                value={search}
                onChange={(e) => updateFilter('search', e.target.value)}
                className="h-14 pl-12 pr-4 text-lg rounded-xl border-2 focus:border-primary shadow-sm"
              />
            </div>
          </motion.div>
        </div>
      </motion.div>

      <div className="container py-8">
        {/* Controls bar */}
        <motion.div 
          className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between mb-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              onClick={() => setShowFilters(!showFilters)}
              className="md:hidden gap-2"
            >
              <AdjustmentsHorizontalIcon className="h-4 w-4" />
              Filters
              {hasActiveFilters && (
                <span className="ml-1 w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
                  !
                </span>
              )}
            </Button>
            
            {!isLoading && (
              <p className="text-muted-foreground">
                <span className="font-semibold text-foreground">{resultsCount.toLocaleString()}</span> services found
              </p>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => updateFilter('sortBy', e.target.value)}
              className="h-10 px-4 rounded-lg border bg-background hover:border-primary transition-colors cursor-pointer"
            >
              <option value="popular">Most Popular</option>
              <option value="newest">Newest First</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="rating">Best Rating</option>
            </select>
          </div>
        </motion.div>

        <div className="flex gap-8">
          {/* Filters sidebar */}
          <AnimatePresence>
            <motion.aside 
              className={`w-72 shrink-0 ${showFilters ? 'block' : 'hidden md:block'}`}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <div className="sticky top-24 space-y-6 p-6 bg-background rounded-2xl border shadow-sm">
                <div className="flex justify-between items-center pb-4 border-b">
                  <h2 className="font-bold text-lg flex items-center gap-2">
                    <FunnelIcon className="h-5 w-5" />
                    Filters
                  </h2>
                  {hasActiveFilters && (
                    <button 
                      onClick={clearFilters} 
                      className="text-sm text-primary hover:underline font-medium"
                    >
                      Clear all
                    </button>
                  )}
                </div>

                {/* Categories */}
                <div>
                  <h3 className="font-semibold mb-4 text-sm uppercase tracking-wide text-muted-foreground">Category</h3>
                  <div className="space-y-2">
                    <label
                      className={`flex items-center space-x-3 p-2.5 rounded-lg cursor-pointer transition-all ${
                        !category ? 'bg-primary/10 text-primary' : 'hover:bg-muted'
                      }`}
                    >
                      <input
                        type="radio"
                        name="category"
                        checked={!category}
                        onChange={() => updateFilter('category', '')}
                        className="h-4 w-4 text-primary accent-primary"
                      />
                      <span className="text-sm font-medium">All Categories</span>
                    </label>
                    {categories?.data?.categories?.map((cat: any) => (
                      <label 
                        key={cat.id} 
                        className={`flex items-center space-x-3 p-2.5 rounded-lg cursor-pointer transition-all ${
                          category === cat.slug ? 'bg-primary/10 text-primary' : 'hover:bg-muted'
                        }`}
                      >
                        <input
                          type="radio"
                          name="category"
                          checked={category === cat.slug}
                          onChange={() => updateFilter('category', cat.slug)}
                          className="h-4 w-4 text-primary accent-primary"
                        />
                        <span className="text-sm font-medium">{cat.name}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Price range */}
                <div>
                  <h3 className="font-semibold mb-4 text-sm uppercase tracking-wide text-muted-foreground">Price Range (ZAR)</h3>
                  <div className="flex gap-3 items-center">
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R</span>
                      <Input
                        type="number"
                        placeholder="Min"
                        value={minPrice}
                        onChange={(e) => updateFilter('minPrice', e.target.value)}
                        className="pl-8"
                      />
                    </div>
                    <span className="text-muted-foreground">–</span>
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R</span>
                      <Input
                        type="number"
                        placeholder="Max"
                        value={maxPrice}
                        onChange={(e) => updateFilter('maxPrice', e.target.value)}
                        className="pl-8"
                      />
                    </div>
                  </div>
                </div>

                {/* Delivery time */}
                <div>
                  <h3 className="font-semibold mb-4 text-sm uppercase tracking-wide text-muted-foreground">Delivery Time</h3>
                  <div className="space-y-2">
                    {[
                      { value: '1', label: 'Express 24H', icon: '⚡' },
                      { value: '3', label: 'Up to 3 days', icon: '🚀' },
                      { value: '7', label: 'Up to 7 days', icon: '📦' },
                      { value: '', label: 'Any time', icon: '🕐' },
                    ].map((option) => (
                      <label 
                        key={option.value} 
                        className={`flex items-center space-x-3 p-2.5 rounded-lg cursor-pointer transition-all ${
                          deliveryDays === option.value ? 'bg-primary/10 text-primary' : 'hover:bg-muted'
                        }`}
                      >
                        <input
                          type="radio"
                          name="deliveryDays"
                          checked={deliveryDays === option.value}
                          onChange={() => updateFilter('deliveryDays', option.value)}
                          className="h-4 w-4 text-primary accent-primary"
                        />
                        <span className="text-sm font-medium">{option.icon} {option.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </motion.aside>
          </AnimatePresence>

          {/* Services grid */}
          <div className="flex-1">
            {/* Active filters */}
            <AnimatePresence>
              {hasActiveFilters && (
                <motion.div 
                  className="flex flex-wrap gap-2 mb-6"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  {category && (
                    <motion.span 
                      className="inline-flex items-center px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-medium shadow-sm"
                      initial={{ scale: 0.8 }}
                      animate={{ scale: 1 }}
                      whileHover={{ scale: 1.05 }}
                    >
                      {categories?.data?.categories?.find((c: any) => c.slug === category)?.name}
                      <button 
                        onClick={() => updateFilter('category', '')} 
                        className="ml-2 hover:bg-white/20 rounded-full p-0.5 transition-colors"
                      >
                        <XMarkIcon className="h-4 w-4" />
                      </button>
                    </motion.span>
                  )}
                  {search && (
                    <motion.span 
                      className="inline-flex items-center px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-medium shadow-sm"
                      initial={{ scale: 0.8 }}
                      animate={{ scale: 1 }}
                      whileHover={{ scale: 1.05 }}
                    >
                      "{search}"
                      <button 
                        onClick={() => updateFilter('search', '')} 
                        className="ml-2 hover:bg-white/20 rounded-full p-0.5 transition-colors"
                      >
                        <XMarkIcon className="h-4 w-4" />
                      </button>
                    </motion.span>
                  )}
                  {(minPrice || maxPrice) && (
                    <motion.span 
                      className="inline-flex items-center px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-medium shadow-sm"
                      initial={{ scale: 0.8 }}
                      animate={{ scale: 1 }}
                      whileHover={{ scale: 1.05 }}
                    >
                      R{minPrice || '0'} - R{maxPrice || '∞'}
                      <button 
                        onClick={() => {
                          updateFilter('minPrice', '');
                          updateFilter('maxPrice', '');
                        }} 
                        className="ml-2 hover:bg-white/20 rounded-full p-0.5 transition-colors"
                      >
                        <XMarkIcon className="h-4 w-4" />
                      </button>
                    </motion.span>
                  )}
                  {deliveryDays && (
                    <motion.span 
                      className="inline-flex items-center px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-medium shadow-sm"
                      initial={{ scale: 0.8 }}
                      animate={{ scale: 1 }}
                      whileHover={{ scale: 1.05 }}
                    >
                      <ClockIcon className="h-4 w-4 mr-1" />
                      {deliveryDays === '1' ? '24H' : `${deliveryDays} days`}
                      <button 
                        onClick={() => updateFilter('deliveryDays', '')} 
                        className="ml-2 hover:bg-white/20 rounded-full p-0.5 transition-colors"
                      >
                        <XMarkIcon className="h-4 w-4" />
                      </button>
                    </motion.span>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {isLoading ? (
              <motion.div 
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
                variants={staggerContainer}
                initial="hidden"
                animate="visible"
              >
                {[...Array(6)].map((_, i) => (
                  <motion.div key={i} variants={fadeInUp}>
                    <Card className="overflow-hidden">
                      <div className="aspect-video bg-gradient-to-br from-muted to-muted/50 animate-pulse" />
                      <CardContent className="p-5 space-y-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-muted animate-pulse" />
                          <div className="space-y-2 flex-1">
                            <div className="h-3 bg-muted rounded w-24 animate-pulse" />
                            <div className="h-2 bg-muted rounded w-16 animate-pulse" />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="h-4 bg-muted rounded animate-pulse" />
                          <div className="h-4 bg-muted rounded w-2/3 animate-pulse" />
                        </div>
                        <div className="h-3 bg-muted rounded w-20 animate-pulse" />
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </motion.div>
            ) : data?.data?.services?.length === 0 ? (
              <motion.div 
                className="text-center py-20 bg-muted/30 rounded-2xl"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <SparklesIcon className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">No services found</h3>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  We couldn't find any services matching your criteria. Try adjusting your filters or search term.
                </p>
                <Button onClick={clearFilters} size="lg">
                  Clear all filters
                </Button>
              </motion.div>
            ) : (
              <>
                <motion.div 
                  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
                  variants={staggerContainer}
                  initial="hidden"
                  animate="visible"
                >
                  {data?.data?.services?.map((service: any) => (
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
                            {/* Overlay on hover */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                            
                            {/* Price badge */}
                            <motion.div
                              className="absolute bottom-3 right-3 bg-background/95 backdrop-blur-sm px-3 py-1.5 rounded-lg font-bold shadow-lg"
                              whileHover={{ scale: 1.05 }}
                            >
                              From {formatCurrency(service.packages?.[0]?.price || 0)}
                            </motion.div>
                            
                            {/* Featured badge if top rated */}
                            {service.rating >= 4.8 && (
                              <div className="absolute top-3 left-3 px-2.5 py-1 bg-gradient-to-r from-yellow-400 to-orange-400 text-white text-xs font-bold rounded-full shadow-lg flex items-center gap-1">
                                <StarIcon className="h-3 w-3" />
                                TOP RATED
                              </div>
                            )}
                          </div>
                          <CardContent className="p-5">
                            <div className="flex items-center space-x-3 mb-3">
                              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center text-white text-sm font-bold shadow-lg ring-2 ring-background">
                                {service.seller?.username?.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <span className="text-sm font-semibold block">
                                  {service.seller?.sellerProfile?.displayName || service.seller?.username}
                                </span>
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                  <span className={`w-2 h-2 rounded-full ${
                                    (service.seller?.sellerProfile?.level || 1) >= 3 
                                      ? 'bg-green-500' 
                                      : 'bg-primary'
                                  }`} />
                                  Level {service.seller?.sellerProfile?.level || 1} Seller
                                </span>
                              </div>
                            </div>
                            <h3 className="font-semibold line-clamp-2 mb-3 group-hover:text-primary transition-colors leading-snug">
                              {service.title}
                            </h3>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <div className="flex items-center space-x-1 bg-yellow-50 px-2 py-1 rounded-full">
                                  <StarIcon className="h-4 w-4 text-yellow-500" />
                                  <span className="text-sm font-bold text-yellow-700">
                                    {service.rating ? Number(service.rating).toFixed(1) : 'New'}
                                  </span>
                                </div>
                                <span className="text-xs text-muted-foreground">
                                  ({service.reviewCount || 0})
                                </span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    </motion.div>
                  ))}
                </motion.div>

                {/* Pagination */}
                {data?.meta && data.meta.totalPages > 1 && (
                  <motion.div 
                    className="flex justify-center items-center mt-12 gap-2"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                  >
                    <Button
                      variant="outline"
                      disabled={page <= 1}
                      onClick={() => updateFilter('page', String(page - 1))}
                      className="gap-2"
                    >
                      <ChevronLeftIcon className="h-4 w-4" />
                      Previous
                    </Button>
                    
                    <div className="flex items-center gap-1 px-4">
                      {Array.from({ length: Math.min(5, data.meta.totalPages) }, (_, i) => {
                        const pageNum = Math.max(1, Math.min(page - 2 + i, data.meta.totalPages - 4 + i));
                        return (
                          <button
                            key={pageNum}
                            onClick={() => updateFilter('page', String(pageNum))}
                            className={`w-10 h-10 rounded-lg font-medium transition-all ${
                              page === pageNum 
                                ? 'bg-primary text-primary-foreground shadow-lg' 
                                : 'hover:bg-muted'
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                      {data.meta.totalPages > 5 && page < data.meta.totalPages - 2 && (
                        <>
                          <span className="px-2 text-muted-foreground">...</span>
                          <button
                            onClick={() => updateFilter('page', String(data.meta.totalPages))}
                            className="w-10 h-10 rounded-lg font-medium hover:bg-muted transition-all"
                          >
                            {data.meta.totalPages}
                          </button>
                        </>
                      )}
                    </div>
                    
                    <Button
                      variant="outline"
                      disabled={page >= data.meta.totalPages}
                      onClick={() => updateFilter('page', String(page + 1))}
                      className="gap-2"
                    >
                      Next
                      <ChevronRightIcon className="h-4 w-4" />
                    </Button>
                  </motion.div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
