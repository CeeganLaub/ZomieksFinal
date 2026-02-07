import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { usersApi, conversationsApi } from '../lib/api';
import { useAuthStore } from '../stores/auth.store';
import { formatCurrency } from '../lib/utils';
import { StarIcon, ChatBubbleLeftRightIcon, ShieldCheckIcon, MapPinIcon } from '@heroicons/react/24/solid';
import { PlayCircleIcon } from '@heroicons/react/24/outline';
import { useState } from 'react';

// Social platform icons (simple SVG paths)
const socialIcons: Record<string, string> = {
  twitter: 'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z',
  instagram: 'M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z',
  linkedin: 'M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z',
  facebook: 'M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z',
  youtube: 'M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z',
  tiktok: 'M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z',
  website: 'M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm-1 17.93c-3.94-.49-7-3.85-7-7.93 0-.62.08-1.22.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z',
};

function SocialIcon({ platform }: { platform: string }) {
  const path = socialIcons[platform.toLowerCase()] || socialIcons.website;
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
      <path d={path} />
    </svg>
  );
}

function getButtonClasses(style: string) {
  const base = 'w-full py-3 px-6 font-medium transition-all duration-200 text-center';
  switch (style) {
    case 'pill':
      return `${base} rounded-full`;
    case 'square':
      return `${base} rounded-none`;
    case 'outline':
      return `${base} rounded-lg bg-transparent border-2`;
    case 'rounded':
    default:
      return `${base} rounded-lg`;
  }
}

export default function SellerPage() {
  const { username } = useParams<{ username: string }>();
  const { user: currentUser } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'services' | 'courses'>('services');
  const [messageOpen, setMessageOpen] = useState(false);
  const [messageText, setMessageText] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['seller-profile', username],
    queryFn: () => usersApi.profile(username!),
    enabled: !!username,
  });

  const startConversation = useMutation({
    mutationFn: async () => {
      const res = await conversationsApi.start({
        participantId: seller?.id || '',
        content: messageText,
      });
      return res.data;
    },
    onSuccess: () => {
      setMessageOpen(false);
      setMessageText('');
      alert('Message sent! Check your messages.');
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-950">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500" />
      </div>
    );
  }

  if (error || !data?.data?.user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-950">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-2">Seller Not Found</h1>
          <p className="text-neutral-400 mb-4">This seller page doesn't exist.</p>
          <Link to="/explore" className="text-emerald-400 hover:underline">
            Browse services
          </Link>
        </div>
      </div>
    );
  }

  const seller = data.data.user;
  const profile = seller.sellerProfile;
  const hasBiolink = profile?.bioEnabled && profile?.subscription?.status === 'ACTIVE';

  // BioLink theme values (or defaults)
  const theme = {
    bg: profile?.bioBackgroundColor || '#0a0a0a',
    text: profile?.bioTextColor || '#ffffff',
    accent: profile?.bioThemeColor || '#10B981',
    buttonStyle: profile?.bioButtonStyle || 'rounded',
    font: profile?.bioFont || 'Inter',
  };

  const socialLinks = (profile?.bioSocialLinks as any[]) || [];
  const services = seller.services || [];
  const courses = profile?.courses || [];
  const reviews = seller.receivedReviews || [];

  // If BioLink is not enabled, show standard profile
  if (!hasBiolink) {
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
        </div>
      </div>
    );
  }

  // ========== BIOLINK STOREFRONT ==========
  return (
    <div
      className="min-h-screen"
      style={{
        backgroundColor: theme.bg,
        color: theme.text,
        fontFamily: theme.font,
      }}
    >
      {/* Cover image */}
      {profile.bioCoverImage && (
        <div className="w-full h-48 md:h-64 overflow-hidden">
          <img
            src={profile.bioCoverImage}
            alt="Cover"
            className="w-full h-full object-cover"
          />
        </div>
      )}

      <div className="max-w-lg mx-auto px-4 py-8">
        {/* Avatar + Name */}
        <div className={`text-center ${profile.bioCoverImage ? '-mt-16' : ''}`}>
          <div
            className="w-24 h-24 rounded-full mx-auto border-4 overflow-hidden flex items-center justify-center text-2xl font-bold"
            style={{
              borderColor: theme.accent,
              backgroundColor: theme.bg,
            }}
          >
            {seller.avatar ? (
              <img src={seller.avatar} alt="" className="w-full h-full object-cover" />
            ) : (
              <span style={{ color: theme.accent }}>
                {seller.firstName?.[0]}{seller.lastName?.[0]}
              </span>
            )}
          </div>

          <h1 className="text-2xl font-bold mt-4">
            {profile.displayName || `${seller.firstName} ${seller.lastName}`}
          </h1>

          <p className="text-sm opacity-70 mt-1">{profile.professionalTitle}</p>

          {profile.bioHeadline && (
            <p className="mt-3 text-sm opacity-80">{profile.bioHeadline}</p>
          )}

          {/* Verification + Rating */}
          <div className="flex items-center justify-center gap-4 mt-3 text-sm opacity-70">
            {profile.isVerified && (
              <span className="flex items-center gap-1" style={{ color: theme.accent }}>
                <ShieldCheckIcon className="w-4 h-4" /> Verified
              </span>
            )}
            <span className="flex items-center gap-1">
              <StarIcon className="w-4 h-4" style={{ color: '#FBBF24' }} />
              {Number(profile.rating).toFixed(1)} ({profile.reviewCount} reviews)
            </span>
          </div>

          {/* Social links */}
          {socialLinks.length > 0 && (
            <div className="flex items-center justify-center gap-3 mt-4">
              {socialLinks.map((link: any, i: number) => (
                <a
                  key={i}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full flex items-center justify-center transition-transform hover:scale-110"
                  style={{ backgroundColor: `${theme.accent}20`, color: theme.accent }}
                  title={link.platform}
                >
                  <SocialIcon platform={link.platform} />
                </a>
              ))}
            </div>
          )}
        </div>

        {/* CTA Button */}
        {currentUser && currentUser.id !== seller.id && (
          <div className="mt-6">
            <button
              onClick={() => setMessageOpen(!messageOpen)}
              className={getButtonClasses(theme.buttonStyle)}
              style={{
                backgroundColor: theme.buttonStyle === 'outline' ? 'transparent' : theme.accent,
                color: theme.buttonStyle === 'outline' ? theme.accent : '#fff',
                borderColor: theme.accent,
              }}
            >
              <ChatBubbleLeftRightIcon className="w-5 h-5 inline mr-2" />
              {profile.bioCtaText || 'Get in Touch'}
            </button>

            {messageOpen && (
              <div className="mt-3 space-y-3">
                <textarea
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  rows={3}
                  placeholder="Write a message..."
                  className="w-full rounded-lg px-4 py-3 text-sm bg-white/10 backdrop-blur border border-white/20 focus:outline-none focus:ring-2 resize-none"
                  style={{ color: theme.text }}
                />
                <button
                  onClick={() => startConversation.mutate()}
                  disabled={!messageText.trim() || startConversation.isPending}
                  className={getButtonClasses(theme.buttonStyle)}
                  style={{
                    backgroundColor: theme.accent,
                    color: '#fff',
                    opacity: !messageText.trim() ? 0.5 : 1,
                  }}
                >
                  {startConversation.isPending ? 'Sending...' : 'Send Message'}
                </button>
              </div>
            )}
          </div>
        )}

        {!currentUser && (
          <div className="mt-6">
            <Link
              to={`/login?redirect=/sellers/${username}`}
              className={`block ${getButtonClasses(theme.buttonStyle)}`}
              style={{
                backgroundColor: theme.accent,
                color: '#fff',
              }}
            >
              <ChatBubbleLeftRightIcon className="w-5 h-5 inline mr-2" />
              {profile.bioCtaText || 'Get in Touch'}
            </Link>
          </div>
        )}

        {/* Tabs */}
        {(services.length > 0 || courses.length > 0) && (
          <div className="mt-8">
            <div className="flex border-b" style={{ borderColor: `${theme.text}20` }}>
              {services.length > 0 && (
                <button
                  onClick={() => setActiveTab('services')}
                  className="flex-1 py-3 text-sm font-medium text-center transition-colors"
                  style={{
                    borderBottom: activeTab === 'services' ? `2px solid ${theme.accent}` : '2px solid transparent',
                    color: activeTab === 'services' ? theme.accent : `${theme.text}80`,
                  }}
                >
                  Services ({services.length})
                </button>
              )}
              {courses.length > 0 && (
                <button
                  onClick={() => setActiveTab('courses')}
                  className="flex-1 py-3 text-sm font-medium text-center transition-colors"
                  style={{
                    borderBottom: activeTab === 'courses' ? `2px solid ${theme.accent}` : '2px solid transparent',
                    color: activeTab === 'courses' ? theme.accent : `${theme.text}80`,
                  }}
                >
                  Courses ({courses.length})
                </button>
              )}
            </div>

            {/* Services list */}
            {activeTab === 'services' && (
              <div className="mt-4 space-y-3">
                {services.map((service: any) => (
                  <Link
                    key={service.id}
                    to={`/services/${seller.username}/${service.slug}`}
                    className="flex items-center gap-4 p-4 rounded-xl transition-all hover:scale-[1.01]"
                    style={{ backgroundColor: `${theme.text}08`, border: `1px solid ${theme.text}15` }}
                  >
                    {service.images?.[0] && (
                      <img
                        src={service.images[0]}
                        alt=""
                        className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium truncate">{service.title}</h3>
                      <div className="flex items-center gap-2 mt-1 text-sm opacity-60">
                        <StarIcon className="w-3 h-3" style={{ color: '#FBBF24' }} />
                        {Number(service.rating).toFixed(1)} ({service.reviewCount})
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className="font-bold" style={{ color: theme.accent }}>
                        {service.packages?.[0]?.price
                          ? formatCurrency(Number(service.packages[0].price))
                          : 'Free'}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {/* Courses list */}
            {activeTab === 'courses' && (
              <div className="mt-4 space-y-3">
                {courses.map((course: any) => (
                  <Link
                    key={course.id}
                    to={`/courses/${course.slug}`}
                    className="flex items-center gap-4 p-4 rounded-xl transition-all hover:scale-[1.01]"
                    style={{ backgroundColor: `${theme.text}08`, border: `1px solid ${theme.text}15` }}
                  >
                    {course.thumbnail ? (
                      <img
                        src={course.thumbnail}
                        alt=""
                        className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                      />
                    ) : (
                      <div
                        className="w-16 h-16 rounded-lg flex-shrink-0 flex items-center justify-center"
                        style={{ backgroundColor: `${theme.accent}20` }}
                      >
                        <PlayCircleIcon className="w-8 h-8" style={{ color: theme.accent }} />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium truncate">{course.title}</h3>
                      <div className="flex items-center gap-2 mt-1 text-sm opacity-60">
                        <span>{course.enrollCount} students</span>
                        <span>&middot;</span>
                        <span>{course.level}</span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className="font-bold" style={{ color: theme.accent }}>
                        {formatCurrency(Number(course.price))}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Reviews */}
        {reviews.length > 0 && (
          <div className="mt-8">
            <h2 className="text-lg font-semibold mb-4">Recent Reviews</h2>
            <div className="space-y-3">
              {reviews.map((review: any) => (
                <div
                  key={review.id}
                  className="p-4 rounded-xl"
                  style={{ backgroundColor: `${theme.text}08`, border: `1px solid ${theme.text}15` }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold overflow-hidden">
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
                          className="w-3 h-3"
                          style={{
                            color: i < review.rating ? '#FBBF24' : `${theme.text}30`,
                          }}
                        />
                      ))}
                    </div>
                  </div>
                  <p className="text-sm opacity-70">{review.comment}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-12 pb-8 text-center">
          <p className="text-xs opacity-30">
            Powered by{' '}
            <Link to="/" className="hover:opacity-60" style={{ color: theme.accent }}>
              Zomieks
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
