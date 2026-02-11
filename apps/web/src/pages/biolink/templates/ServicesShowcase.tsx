import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { BioLinkTemplateProps, BioLinkService } from './index';
import {
  SellerAvatar,
  ThemedButton,
  Stars,
  VerifiedBadge,
  TrustStats,
  PriceBadge,
  ServiceImage,
  PoweredByFooter,
  AvailabilityBadge,
  TestimonialWall,
  DigitalProductStore,
} from './shared';

export default function ServicesShowcase({ seller, theme, onChat, onServiceClick }: BioLinkTemplateProps) {
  const sp = seller.sellerProfile;
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const featured = sp.bioFeaturedItems || [];
  const featuredServiceIds = new Set(featured.filter((f) => f.type === 'service').map((f) => f.id));
  const featuredCourseIds = new Set(featured.filter((f) => f.type === 'course').map((f) => f.id));

  // Featured first, then the rest
  const sortedServices = [
    ...seller.services.filter((s) => featuredServiceIds.has(s.id)),
    ...seller.services.filter((s) => !featuredServiceIds.has(s.id)),
  ];

  const courses = [
    ...sp.courses.filter((c) => featuredCourseIds.has(c.id)),
    ...sp.courses.filter((c) => !featuredCourseIds.has(c.id)),
  ];

  return (
    <div className="w-full max-w-lg mx-auto px-4 py-8 md:max-w-2xl">
      {/* Hero */}
      <div className="text-center mb-8">
        <div className="flex justify-center mb-4">
          <SellerAvatar seller={seller} theme={theme} size={96} />
        </div>
        <h1 className="text-2xl md:text-3xl font-bold mb-1" style={{ color: theme.textColor }}>
          {sp.displayName}
        </h1>
        <p className="text-sm opacity-60 mb-2">{sp.professionalTitle}</p>
        {sp.bioHeadline && <p className="opacity-80 mb-3">{sp.bioHeadline}</p>}
        <div className="flex items-center justify-center gap-3 mb-4">
          {sp.isVerified && <VerifiedBadge color={theme.themeColor} />}
          <span className="inline-flex items-center gap-1 text-sm">
            <Stars rating={Number(sp.rating)} color={theme.themeColor} size={14} />
            <span className="opacity-60">({sp.reviewCount})</span>
          </span>
        </div>
        <ThemedButton theme={theme} onClick={() => onChat()} size="lg">
          {sp.bioCtaText}
        </ThemedButton>

        {/* Availability */}
        <div className="mt-4">
          <AvailabilityBadge
            availability={{
              isAvailable: sp.isAvailable,
              vacationMode: sp.vacationMode,
              vacationUntil: sp.vacationUntil,
              responseTimeMinutes: sp.responseTimeMinutes,
              activeOrderCount: sp.activeOrderCount,
              maxActiveOrders: sp.maxActiveOrders,
            }}
            theme={theme}
          />
        </div>
      </div>

      {/* Trust Stats */}
      <div className="mb-8">
        <TrustStats seller={seller} theme={theme} />
      </div>

      {/* Services */}
      {sortedServices.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-bold mb-4" style={{ color: theme.textColor }}>
            Services ({sortedServices.length})
          </h2>
          <div className="space-y-3">
            {sortedServices.map((service) => (
              <ServiceCard
                key={service.id}
                service={service}
                theme={theme}
                expanded={expandedId === service.id}
                featured={featuredServiceIds.has(service.id)}
                onToggle={() => setExpandedId(expandedId === service.id ? null : service.id)}
                onChat={() => onChat({ type: 'service', id: service.id, title: service.title })}
                onClick={() => onServiceClick(service)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Courses */}
      {courses.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-bold mb-4" style={{ color: theme.textColor }}>
            Courses ({courses.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {courses.map((course) => (
              <motion.button
                key={course.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  const win = window.open(`/courses/${course.slug}`, '_blank', 'noopener');
                  if (!win) window.location.href = `/courses/${course.slug}`;
                }}
                className="text-left rounded-xl p-3 transition-colors"
                style={{ background: `${theme.themeColor}10`, border: `1px solid ${theme.themeColor}20` }}
              >
                {course.thumbnail && (
                  <img src={course.thumbnail} alt={course.title} className="w-full aspect-video object-cover rounded-lg mb-2" loading="lazy" />
                )}
                <div className="font-semibold text-sm mb-1 line-clamp-2">{course.title}</div>
                <div className="flex items-center justify-between">
                  <span className="text-xs opacity-60">{course.enrollCount} students</span>
                  <PriceBadge price={course.price} theme={theme} />
                </div>
              </motion.button>
            ))}
          </div>
        </div>
      )}

      {/* Digital Products */}
      {sp.digitalProducts && sp.digitalProducts.length > 0 && (
        <DigitalProductStore products={sp.digitalProducts} theme={theme} onBuy={() => onChat()} />
      )}

      {/* Testimonial Wall */}
      {sp.bioShowTestimonials !== false && seller.receivedReviews.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-bold mb-4" style={{ color: theme.textColor }}>Reviews</h2>
          <TestimonialWall reviews={seller.receivedReviews} theme={theme} maxVisible={sp.bioTestimonialCount || 6} />
        </div>
      )}

      <PoweredByFooter theme={theme} />
    </div>
  );
}

function ServiceCard({
  service,
  theme,
  expanded,
  featured,
  onToggle,
  onChat,
  onClick,
}: {
  service: BioLinkService;
  theme: BioLinkTemplateProps['theme'];
  expanded: boolean;
  featured: boolean;
  onToggle: () => void;
  onChat: () => void;
  onClick: () => void;
}) {
  const basicPkg = service.packages[0];
  const allPackages = service.packages;

  return (
    <motion.div
      layout
      className="rounded-xl overflow-hidden"
      style={{
        background: `${theme.themeColor}${featured ? '15' : '08'}`,
        border: `1px solid ${theme.themeColor}${featured ? '40' : '20'}`,
      }}
    >
      <button onClick={onToggle} className="w-full text-left p-3 flex items-center gap-3">
        {service.images?.[0] ? (
          <img src={service.images[0]} alt="" className="w-14 h-14 rounded-lg object-cover flex-shrink-0" loading="lazy" />
        ) : (
          <div className="w-14 h-14 rounded-lg flex-shrink-0 flex items-center justify-center text-xl" style={{ background: `${theme.themeColor}20` }}>
            🛍️
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm line-clamp-1">{service.title}</div>
          <div className="flex items-center gap-2 mt-1">
            <Stars rating={Number(service.rating)} color={theme.themeColor} size={10} />
            <span className="text-xs opacity-50">({service.reviewCount})</span>
          </div>
        </div>
        <div className="flex flex-col items-end flex-shrink-0">
          {basicPkg && <PriceBadge price={basicPkg.price} theme={theme} />}
          <svg
            className={`w-4 h-4 mt-1 transition-transform ${expanded ? 'rotate-180' : ''}`}
            style={{ color: theme.themeColor }}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3">
              <ServiceImage images={service.images} title={service.title} />

              {/* Packages */}
              {allPackages.length > 0 && (
                <div className="mt-3 space-y-2">
                  {allPackages.map((pkg, i) => (
                    <div
                      key={i}
                      className="rounded-lg p-2.5 text-sm"
                      style={{ background: `${theme.themeColor}10` }}
                    >
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-semibold">{pkg.name || pkg.tier}</span>
                        <span className="font-bold" style={{ color: theme.themeColor }}>
                          R{pkg.price.toLocaleString('en-ZA')}
                        </span>
                      </div>
                      {pkg.description && (
                        <p className="text-xs opacity-60 mb-1">{pkg.description}</p>
                      )}
                      {pkg.deliveryDays && (
                        <span className="text-xs opacity-40">🕐 {pkg.deliveryDays} day delivery</span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-2 mt-3">
                <ThemedButton theme={theme} onClick={onChat} size="sm" className="flex-1">
                  💬 Chat about this
                </ThemedButton>
                <button
                  onClick={onClick}
                  className="text-xs px-3 py-2 rounded-lg opacity-60 hover:opacity-100 transition-opacity"
                  style={{ border: `1px solid ${theme.themeColor}40` }}
                >
                  View details →
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
