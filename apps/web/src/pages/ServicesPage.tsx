import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { StarIcon, FunnelIcon, XMarkIcon } from '@heroicons/react/24/solid';
import { formatCurrency } from '../lib/utils';

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
    queryFn: () => api.get<any>('/services/categories'),
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

  return (
    <div className="container py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4">
          {category ? categories?.data?.categories?.find((c: any) => c.slug === category)?.name || 'Services' : 'All Services'}
        </h1>
        
        {/* Search and sort */}
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <div className="flex-1 max-w-md">
            <Input
              type="search"
              placeholder="Search services..."
              value={search}
              onChange={(e) => updateFilter('search', e.target.value)}
            />
          </div>
          
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              onClick={() => setShowFilters(!showFilters)}
              className="md:hidden"
            >
              <FunnelIcon className="h-4 w-4 mr-2" />
              Filters
            </Button>
            
            <select
              value={sortBy}
              onChange={(e) => updateFilter('sortBy', e.target.value)}
              className="h-10 px-3 rounded-md border bg-background"
            >
              <option value="popular">Most Popular</option>
              <option value="newest">Newest</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="rating">Best Rating</option>
            </select>
          </div>
        </div>
      </div>

      <div className="flex gap-8">
        {/* Filters sidebar */}
        <aside className={`w-64 shrink-0 ${showFilters ? 'block' : 'hidden md:block'}`}>
          <div className="sticky top-24 space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="font-semibold">Filters</h2>
              <button onClick={clearFilters} className="text-sm text-primary hover:underline">
                Clear all
              </button>
            </div>

            {/* Categories */}
            <div>
              <h3 className="font-medium mb-3">Category</h3>
              <div className="space-y-2">
                {categories?.data?.categories?.map((cat: any) => (
                  <label key={cat.id} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="category"
                      checked={category === cat.slug}
                      onChange={() => updateFilter('category', cat.slug)}
                      className="h-4 w-4 text-primary"
                    />
                    <span className="text-sm">{cat.name}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Price range */}
            <div>
              <h3 className="font-medium mb-3">Price Range</h3>
              <div className="flex gap-2 items-center">
                <Input
                  type="number"
                  placeholder="Min"
                  value={minPrice}
                  onChange={(e) => updateFilter('minPrice', e.target.value)}
                  className="w-24"
                />
                <span>-</span>
                <Input
                  type="number"
                  placeholder="Max"
                  value={maxPrice}
                  onChange={(e) => updateFilter('maxPrice', e.target.value)}
                  className="w-24"
                />
              </div>
            </div>

            {/* Delivery time */}
            <div>
              <h3 className="font-medium mb-3">Delivery Time</h3>
              <div className="space-y-2">
                {[
                  { value: '1', label: 'Express 24H' },
                  { value: '3', label: 'Up to 3 days' },
                  { value: '7', label: 'Up to 7 days' },
                  { value: '', label: 'Any' },
                ].map((option) => (
                  <label key={option.value} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="deliveryDays"
                      checked={deliveryDays === option.value}
                      onChange={() => updateFilter('deliveryDays', option.value)}
                      className="h-4 w-4 text-primary"
                    />
                    <span className="text-sm">{option.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </aside>

        {/* Services grid */}
        <div className="flex-1">
          {/* Active filters */}
          {(category || search || minPrice || maxPrice || deliveryDays) && (
            <div className="flex flex-wrap gap-2 mb-6">
              {category && (
                <span className="inline-flex items-center px-3 py-1 rounded-full bg-primary/10 text-primary text-sm">
                  {categories?.data?.categories?.find((c: any) => c.slug === category)?.name}
                  <button onClick={() => updateFilter('category', '')} className="ml-2">
                    <XMarkIcon className="h-4 w-4" />
                  </button>
                </span>
              )}
              {search && (
                <span className="inline-flex items-center px-3 py-1 rounded-full bg-primary/10 text-primary text-sm">
                  "{search}"
                  <button onClick={() => updateFilter('search', '')} className="ml-2">
                    <XMarkIcon className="h-4 w-4" />
                  </button>
                </span>
              )}
            </div>
          )}

          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="overflow-hidden animate-pulse">
                  <div className="aspect-video bg-muted" />
                  <CardContent className="p-4 space-y-3">
                    <div className="h-4 bg-muted rounded w-3/4" />
                    <div className="h-4 bg-muted rounded w-1/2" />
                    <div className="h-4 bg-muted rounded w-1/4" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : data?.data?.services?.length === 0 ? (
            <div className="text-center py-16">
              <h3 className="text-lg font-medium mb-2">No services found</h3>
              <p className="text-muted-foreground mb-4">Try adjusting your filters</p>
              <Button onClick={clearFilters}>Clear filters</Button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {data?.data?.services?.map((service: any) => (
                  <Link key={service.id} to={`/services/${service.slug}`}>
                    <Card className="overflow-hidden hover:shadow-lg transition-shadow h-full">
                      <div className="aspect-video bg-muted relative">
                        {service.images?.[0] && (
                          <img 
                            src={service.images[0]} 
                            alt={service.title}
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>
                      <CardContent className="p-4">
                        <div className="flex items-center space-x-2 mb-2">
                          <img 
                            src={service.seller?.avatar || '/placeholder-avatar.png'} 
                            alt=""
                            className="h-6 w-6 rounded-full"
                          />
                          <span className="text-sm text-muted-foreground">
                            {service.seller?.sellerProfile?.displayName || service.seller?.username}
                          </span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-muted">
                            Level {service.seller?.sellerProfile?.level || 1}
                          </span>
                        </div>
                        <h3 className="font-medium line-clamp-2 mb-2">{service.title}</h3>
                        <div className="flex items-center space-x-1 mb-2">
                          <StarIcon className="h-4 w-4 text-yellow-500" />
                          <span className="text-sm font-medium">
                            {service.rating?.toFixed(1) || 'New'}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            ({service.reviewCount || 0})
                          </span>
                        </div>
                        <div className="text-sm">
                          <span className="text-muted-foreground">From </span>
                          <span className="font-bold">{formatCurrency(service.startingPrice)}</span>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>

              {/* Pagination */}
              {data?.meta && data.meta.totalPages > 1 && (
                <div className="flex justify-center mt-8 gap-2">
                  <Button
                    variant="outline"
                    disabled={page <= 1}
                    onClick={() => updateFilter('page', String(page - 1))}
                  >
                    Previous
                  </Button>
                  <span className="flex items-center px-4">
                    Page {page} of {data.meta.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    disabled={page >= data.meta.totalPages}
                    onClick={() => updateFilter('page', String(page + 1))}
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
