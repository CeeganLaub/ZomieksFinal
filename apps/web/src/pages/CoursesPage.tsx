import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { coursesApi, servicesApi } from '../lib/api';
import { MagnifyingGlassIcon, AcademicCapIcon, ClockIcon, StarIcon, UsersIcon } from '@heroicons/react/24/outline';
import { motion } from 'framer-motion';

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

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
  const categories = categoriesData?.data || [];

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
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Courses</h1>
        <p className="text-muted-foreground mt-2">
          Learn from expert sellers — video courses on freelancing, design, development, and more
        </p>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <form onSubmit={handleSearch} className="flex-1 relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search courses..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border rounded-lg bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </form>

        <select
          value={category}
          onChange={(e) => updateParam('category', e.target.value)}
          className="px-3 py-2.5 border rounded-lg bg-background"
        >
          <option value="">All Categories</option>
          {categories.map((cat: any) => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>

        <select
          value={level}
          onChange={(e) => updateParam('level', e.target.value)}
          className="px-3 py-2.5 border rounded-lg bg-background"
        >
          <option value="">All Levels</option>
          <option value="BEGINNER">Beginner</option>
          <option value="INTERMEDIATE">Intermediate</option>
          <option value="ADVANCED">Advanced</option>
          <option value="ALL_LEVELS">All Levels</option>
        </select>

        <select
          value={sort}
          onChange={(e) => updateParam('sort', e.target.value)}
          className="px-3 py-2.5 border rounded-lg bg-background"
        >
          <option value="newest">Newest</option>
          <option value="popular">Most Popular</option>
          <option value="rating">Highest Rated</option>
          <option value="price_low">Price: Low to High</option>
          <option value="price_high">Price: High to Low</option>
        </select>
      </div>

      {/* Course Grid */}
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
                  <div className="rounded-xl overflow-hidden border bg-card hover:shadow-lg transition-shadow">
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
                      <div className="absolute top-2 right-2 bg-background/90 backdrop-blur-sm px-2 py-1 rounded-md text-sm font-bold">
                        {Number(course.price) === 0 ? 'Free' : `R${Number(course.price).toFixed(0)}`}
                      </div>
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
                                    star <= Math.round(Number(course.rating)) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'
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
                          {course.level?.toLowerCase().replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>

          {/* Pagination */}
          {meta && meta.total > meta.limit && (
            <div className="flex justify-center mt-8 gap-2">
              {Array.from({ length: Math.ceil(meta.total / meta.limit) }, (_, i) => (
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
  );
}
