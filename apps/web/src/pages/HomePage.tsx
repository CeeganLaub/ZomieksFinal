import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Button } from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';
import { MagnifyingGlassIcon, StarIcon } from '@heroicons/react/24/solid';
import { useState } from 'react';

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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/services?search=${encodeURIComponent(searchQuery)}`);
    }
  };

  return (
    <div>
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-primary/10 via-primary/5 to-background py-20">
        <div className="container text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            Find the perfect <span className="text-primary">freelance</span> services
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Connect with South Africa's top freelancers for your next project
          </p>
          
          {/* Search bar */}
          <form onSubmit={handleSearch} className="max-w-2xl mx-auto">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-6 w-6 text-muted-foreground" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder='Try "logo design" or "website development"'
                className="w-full h-14 pl-12 pr-32 rounded-full border-2 border-primary/20 bg-background text-lg focus:outline-none focus:border-primary"
              />
              <Button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 h-10 px-6 rounded-full">
                Search
              </Button>
            </div>
          </form>

          {/* Popular tags */}
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <span className="text-sm text-muted-foreground">Popular:</span>
            {['Logo Design', 'Website', 'Video Editing', 'Social Media'].map((tag) => (
              <Link 
                key={tag}
                to={`/services?search=${encodeURIComponent(tag)}`}
                className="text-sm px-3 py-1 rounded-full bg-muted hover:bg-muted/80"
              >
                {tag}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="container py-16">
        <h2 className="text-2xl font-bold mb-8">Browse by Category</h2>
        {categoriesLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
            {[...Array(7)].map((_, i) => (
              <div key={i} className="p-6 rounded-xl border animate-pulse">
                <div className="w-10 h-10 bg-muted rounded-full mx-auto mb-3"></div>
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
                className="p-6 rounded-xl border hover:border-primary hover:shadow-lg transition-all text-center group"
              >
                <div className="text-4xl mb-3">{categoryIcons[cat.icon] || '📦'}</div>
                <h3 className="font-medium group-hover:text-primary text-sm">{cat.name}</h3>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Featured Services */}
      <section className="bg-muted/30 py-16">
        <div className="container">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-bold">Featured Services</h2>
            <Link to="/services" className="text-primary hover:underline">
              View all
            </Link>
          </div>
          
          {servicesLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <Card key={i} className="overflow-hidden animate-pulse">
                  <div className="aspect-video bg-muted"></div>
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <div className="h-6 w-6 rounded-full bg-muted"></div>
                      <div className="h-3 bg-muted rounded w-20"></div>
                    </div>
                    <div className="h-4 bg-muted rounded mb-2"></div>
                    <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                    <div className="h-4 bg-muted rounded w-16"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : featured?.data?.services?.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {featured?.data?.services?.map((service: any) => (
                <Link key={service.id} to={`/services/${service.seller?.username}/${service.slug}`}>
                  <Card className="overflow-hidden hover:shadow-lg transition-shadow h-full">
                    <div className="aspect-video bg-muted relative">
                      {service.images?.[0] ? (
                        <img 
                          src={service.images[0]} 
                          alt={service.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                          No Image
                        </div>
                      )}
                    </div>
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-2 mb-2">
                        <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">
                          {service.seller?.username?.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {service.seller?.sellerProfile?.displayName || service.seller?.username}
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
                        <span className="font-bold">
                          R{service.packages?.[0]?.price?.toLocaleString() || '0'}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <p>No services available yet. Be the first to offer your skills!</p>
              <Link to="/become-seller" className="text-primary hover:underline mt-2 inline-block">
                Become a Seller
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* How it works */}
      <section className="container py-16">
        <h2 className="text-2xl font-bold text-center mb-12">How it Works</h2>
        <div className="grid md:grid-cols-3 gap-8">
          {[
            { 
              step: '1', 
              title: 'Find the perfect service', 
              desc: 'Browse through our categories or search for what you need' 
            },
            { 
              step: '2', 
              title: 'Place your order', 
              desc: 'Choose a package and make a secure payment' 
            },
            { 
              step: '3', 
              title: 'Get your delivery', 
              desc: 'Receive your completed work and leave a review' 
            },
          ].map((item) => (
            <div key={item.step} className="text-center">
              <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground text-2xl font-bold flex items-center justify-center mx-auto mb-4">
                {item.step}
              </div>
              <h3 className="text-lg font-semibold mb-2">{item.title}</h3>
              <p className="text-muted-foreground">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-primary text-primary-foreground py-16">
        <div className="container text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to get started?</h2>
          <p className="text-lg opacity-90 mb-8">
            Join thousands of freelancers and businesses on Kiekz
          </p>
          <div className="flex justify-center gap-4">
            <Link to="/register">
              <Button size="lg" variant="secondary">
                Join Now
              </Button>
            </Link>
            <Link to="/services">
              <Button size="lg" variant="outline" className="border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary">
                Browse Services
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
