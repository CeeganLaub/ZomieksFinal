import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Button } from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';
import { MagnifyingGlassIcon, StarIcon } from '@heroicons/react/24/solid';

export default function HomePage() {
  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get<any>('/services/categories'),
  });

  const { data: featured } = useQuery({
    queryKey: ['services', 'featured'],
    queryFn: () => api.get<any>('/services', { params: { featured: true, limit: 8 } }),
  });

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
          <div className="max-w-2xl mx-auto">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-6 w-6 text-muted-foreground" />
              <input
                type="search"
                placeholder='Try "logo design" or "website development"'
                className="w-full h-14 pl-12 pr-32 rounded-full border-2 border-primary/20 bg-background text-lg focus:outline-none focus:border-primary"
              />
              <Button className="absolute right-2 top-1/2 -translate-y-1/2 h-10 px-6 rounded-full">
                Search
              </Button>
            </div>
          </div>

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
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {categories?.data?.categories?.slice(0, 12).map((cat: any) => (
            <Link
              key={cat.id}
              to={`/services?category=${cat.slug}`}
              className="p-6 rounded-xl border hover:border-primary hover:shadow-lg transition-all text-center group"
            >
              <div className="text-4xl mb-3">{cat.icon || '📦'}</div>
              <h3 className="font-medium group-hover:text-primary">{cat.name}</h3>
            </Link>
          ))}
        </div>
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
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featured?.data?.services?.map((service: any) => (
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
                        R{service.packages?.[0]?.price?.toLocaleString() || service.startingPrice?.toLocaleString()}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
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
