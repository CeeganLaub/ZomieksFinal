import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { coursesApi, servicesApi } from '../lib/api';
import { MagnifyingGlassIcon, AcademicCapIcon, ClockIcon, StarIcon, UsersIcon, SparklesIcon, ShieldCheckIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { Button } from '../components/ui/Button';
import { motion } from 'framer-motion';

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

const levelOptions = [
  { value: '', label: 'All Levels' },
  { value: 'BEGINNER', label: 'Beginner' },
  { value: 'INTERMEDIATE', label: 'Intermediate' },
  { value: 'ADVANCED', label: 'Advanced' },
];

export default function CoursesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchInput, setSearchInput] = useState(searchParams.get('search') || '');

  const category = searchParams.get('category') || '';
  const search = searchParams.get('search') || '';
  const level = searchParams.get('level') || '';
  const sort = searchParams.get('sort') || 'newest';
  const page = Number(searchParams.get('page') || '1');

  const { data: coursesData, isLoading } = useQuery({
    queryKey: ['courses', { category, search, level, sort, page }],
    queryFn: () => coursesApi.list({ category, search, level, sort, page, limit: 12 }),
  });

  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => servicesApi.categories(),
  });

  const courses = coursesData?.data || [];
  const meta = coursesData?.meta;
  const categories: any[] = (categoriesData as any)?.data?.categories || (categoriesData as any)?.data || [];

  const updateParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.delete('page');
    setSearchParams(params);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateParam('search', searchInput);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-muted/30 to-background">
      {/* Hero */}
      <motion.section 
        className="bg-gradient-to-br from-purple-950/30 via-background to-emerald-950/20 relative overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-10 right-10 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-10 left-10 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
        </div>
        <div className="container relative z-10 py-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/10 text-purple-600 text-sm font-medium mb-4">
              <AcademicCapIcon className="h-4 w-4" />
              Learn & Grow
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-3">
              Explore <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-primary">Courses</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mb-8">
              Learn from expert sellers — video courses on freelancing, design, development, and more
            </p>
          </motion.div>

          {/* Search & Filters */}
          <motion.div
            className="space-y-4"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <form onSubmit={handleSearch} className="max-w-2xl relative">
              <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search courses..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full pl-12 pr-28 py-3.5 border-2 rounded-xl bg-background focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500/50 transition-all text-lg shadow-sm"
              />
              <Button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg px-6">
                Search
              </Button>
            </form>

            <div className="flex flex-wrap gap-3 items-center">
              {/* Level pills */}
              <div className="flex gap-2">
                {levelOptions.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => updateParam('level', opt.value)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                      level === opt.value 
                        ? 'bg-purple-600 text-white shadow-md shadow-purple-500/25' 
                        : 'bg-background border hover:border-purple-500/50 hover:text-purple-600'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              <div className="h-6 w-px bg-border" />

              <select
                value={category}
                onChange={(e) => updateParam('category', e.target.value)}
                className="px-3 py-2 border rounded-lg bg-background text-sm hover:border-purple-500/50 transition-colors cursor-pointer"
              >
                <option value="">All Categories</option>
                {categories.map((cat: any) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>

              <select
                value={sort}
                onChange={(e) => updateParam('sort', e.target.value)}
                className="px-3 py-2 border rounded-lg bg-background text-sm hover:border-purple-500/50 transition-colors cursor-pointer"
              >
                <option value="newest">Newest</option>
                <option value="popular">Most Popular</option>
                <option value="rating">Highest Rated</option>
                <option value="price_low">Price: Low to High</option>
                <option value="price_high">Price: High to Low</option>
              </select>
            </div>
          </motion.div>
        </div>
      </motion.section>

      {/* Trust strip */}
      <div className="bg-muted/50 py-3">
        <div className="container">
          <div className="flex flex-wrap justify-center gap-x-8 gap-y-1 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <ShieldCheckIcon className="h-4 w-4 text-primary" />
              24h Money-Back Guarantee
            </span>
            <span className="flex items-center gap-1.5">
              <SparklesIcon className="h-4 w-4 text-primary" />
              Lifetime Access
            </span>
            <span className="flex items-center gap-1.5">
              <ArrowPathIcon className="h-4 w-4 text-primary" />
              Expert Sellers
            </span>
          </div>
        </div>
      </div>

      {/* Course Grid */}
      <div className="container py-10">
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
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
      ) : courses.length === 0 ? (
        <div className="text-center py-16">
          <AcademicCapIcon className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">No courses found</h3>
          <p className="text-muted-foreground">
            {search ? 'Try adjusting your search or filters' : 'No courses available yet. Check back soon!'}
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {courses.map((course: any, i: number) => (
              <motion.div
                key={course.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Link to={`/courses/${course.slug}`} className="group block">
                    <div className="rounded-xl overflow-hidden border bg-card hover:shadow-xl hover:shadow-purple-500/5 transition-all duration-300 border-transparent hover:border-purple-500/20">
                    {/* Thumbnail */}
                    <div className="aspect-video bg-muted relative overflow-hidden">
                      {course.thumbnail ? (
                        <img
                          src={course.thumbnail}
                          alt={course.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-purple-500/20">
                          <AcademicCapIcon className="h-12 w-12 text-primary/40" />
                        </div>
                      )}
                      {/* Price badge */}
                      <div className="absolute top-2 right-2 bg-background/90 backdrop-blur-sm px-2.5 py-1 rounded-lg text-sm font-bold shadow-lg">
                        {Number(course.price) === 0 ? 'Free' : `R${Number(course.price).toFixed(0)}`}
                      </div>
                      {/* Popularity badge */}
                      {course.enrollCount > 10 && (
                        <div className="absolute top-2 left-2 px-2 py-1 rounded-full bg-orange-500 text-white text-xs font-bold shadow">
                          🔥 Bestseller
                        </div>
                      )}
                      {course.enrollCount <= 10 && course.enrollCount > 0 && (
                        <div className="absolute top-2 left-2 px-2 py-1 rounded-full bg-emerald-500 text-white text-xs font-bold shadow">
                          ✨ New
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="p-4">
                      <h3 className="font-semibold text-sm line-clamp-2 group-hover:text-primary transition-colors">
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
                                    star <= Math.round(Number(course.rating)) ? 'text-yellow-400 fill-yellow-400' : 'text-muted'
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
          </div>

          {/* Pagination */}
          {meta && (meta as any).total > (meta as any).limit && (
            <div className="flex justify-center mt-8 gap-2">
              {Array.from({ length: Math.ceil((meta as any).total / (meta as any).limit) }, (_, i) => (
                <button
                  key={i}
                  onClick={() => updateParam('page', String(i + 1))}
                  className={`px-3 py-1.5 rounded-md text-sm ${
                    page === i + 1
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted hover:bg-muted/80'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          )}
        </>
      )}
      </div>
    </div>
  );
}
