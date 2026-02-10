import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { usersApi } from '../lib/api';
import { formatCurrency } from '../lib/utils';
import { StarIcon, ShieldCheckIcon, MapPinIcon } from '@heroicons/react/24/solid';
import { PlayCircleIcon } from '@heroicons/react/24/outline';

// ==================== MAIN PAGE ====================
export default function SellerPage() {
  const { username } = useParams<{ username: string }>();

  const { data, isLoading, error } = useQuery({
    queryKey: ['seller-profile', username],
    queryFn: () => usersApi.profile(username!),
    enabled: !!username,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500" />
      </div>
    );
  }

  if (error || !data?.data?.user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Seller Not Found</h1>
          <p className="text-muted-foreground mb-4">This seller page doesn't exist.</p>
          <Link to="/explore" className="text-emerald-500 hover:underline">
            Browse services
          </Link>
        </div>
      </div>
    );
  }

  const seller = data.data.user;
  const profile = seller.sellerProfile;

  const services = seller.services || [];
  const courses = profile?.courses || [];
  const reviews = seller.receivedReviews || [];

  // Always show standard profile — BioLink storefront is at /:username
  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl mx-auto py-12 px-4">
        {/* Standard profile header */}
        <div className="flex flex-col md:flex-row gap-6 items-start mb-8">
          <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center text-3xl font-bold overflow-hidden flex-shrink-0">
            {seller.avatar ? (
              <img src={seller.avatar} alt={seller.firstName} className="w-full h-full object-cover" />
            ) : (
              <span>{seller.firstName?.[0]}{seller.lastName?.[0]}</span>
            )}
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">
              {profile?.displayName || `${seller.firstName} ${seller.lastName}`}
            </h1>
            <p className="text-muted-foreground">{profile?.professionalTitle}</p>
            {profile && (
              <div className="flex items-center gap-4 mt-2 text-sm">
                <span className="flex items-center gap-1">
                  <StarIcon className="w-4 h-4 text-yellow-500" />
                  {Number(profile.rating).toFixed(1)} ({profile.reviewCount})
                </span>
                {profile.isVerified && (
                  <span className="flex items-center gap-1 text-emerald-500">
                    <ShieldCheckIcon className="w-4 h-4" /> Verified
                  </span>
                )}
                {seller.country && (
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <MapPinIcon className="w-4 h-4" /> {seller.country}
                  </span>
                )}
              </div>
            )}
            {profile?.description && (
              <p className="mt-3 text-muted-foreground">{profile.description}</p>
            )}

            {/* Link to BioLink if enabled */}
            {profile?.bioEnabled && profile?.subscription?.status === 'ACTIVE' && (
              <a
                href={`/${seller.username}`}
                className="inline-flex items-center gap-1 mt-3 text-sm text-emerald-500 hover:underline"
              >
                View BioLink storefront →
              </a>
            )}
          </div>
        </div>

        {/* Services */}
        {services.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Services</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {services.map((service: any) => (
                <Link
                  key={service.id}
                  to={`/services/${seller.username}/${service.slug}`}
                  className="border rounded-lg overflow-hidden hover:shadow-md transition-shadow bg-card"
                >
                  {service.images?.[0] && (
                    <img src={service.images[0]} alt={service.title} className="w-full h-40 object-cover" />
                  )}
                  <div className="p-4">
                    <h3 className="font-medium line-clamp-2">{service.title}</h3>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-sm text-muted-foreground flex items-center gap-1">
                        <StarIcon className="w-3 h-3 text-yellow-500" />
                        {Number(service.rating).toFixed(1)}
                      </span>
                      <span className="font-semibold text-emerald-500">
                        {service.packages?.[0]?.price ? formatCurrency(Number(service.packages[0].price)) : 'Contact'}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Courses */}
        {courses.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Courses</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {courses.map((course: any) => (
                <Link
                  key={course.id}
                  to={`/courses/${course.slug}`}
                  className="border rounded-lg overflow-hidden hover:shadow-md transition-shadow bg-card"
                >
                  {course.thumbnail && (
                    <div className="relative">
                      <img src={course.thumbnail} alt={course.title} className="w-full h-40 object-cover" />
                      <PlayCircleIcon className="absolute inset-0 m-auto w-12 h-12 text-white/80" />
                    </div>
                  )}
                  <div className="p-4">
                    <h3 className="font-medium line-clamp-2">{course.title}</h3>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-sm text-muted-foreground">
                        {course.enrollCount} students
                      </span>
                      <span className="font-semibold text-emerald-500">
                        {formatCurrency(Number(course.price))}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Reviews */}
        {reviews.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Reviews</h2>
            <div className="space-y-3">
              {reviews.map((review: any) => (
                <div key={review.id} className="border rounded-lg p-4 bg-card">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold overflow-hidden">
                      {review.author.avatar ? (
                        <img src={review.author.avatar} alt="" className="w-full h-full object-cover" />
                      ) : (
                        review.author.firstName?.[0]
                      )}
                    </div>
                    <span className="text-sm font-medium">{review.author.firstName}</span>
                    <div className="flex items-center gap-0.5 ml-auto">
                      {[...Array(5)].map((_, i) => (
                        <StarIcon
                          key={i}
                          className={`w-3 h-3 ${i < review.rating ? 'text-yellow-500' : 'text-muted'}`}
                        />
                      ))}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">{review.comment}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
