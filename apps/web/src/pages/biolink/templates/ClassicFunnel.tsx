import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import type { BioLinkTemplateProps } from './index';
import {
  SellerAvatar,
  ThemedButton,
  Stars,
  VerifiedBadge,
  TrustStats,
  ReviewCard,
  PriceBadge,
  PoweredByFooter,
} from './shared';

export default function ClassicFunnel({ seller, theme, onChat, onServiceClick, onCourseClick: _onCourseClick }: BioLinkTemplateProps) {
  const sp = seller.sellerProfile;
  const featured = sp.bioFeaturedItems || [];
  const featuredServices = seller.services.filter((s) => featured.some((f) => f.type === 'service' && f.id === s.id));
  const featuredCourses = sp.courses.filter((c) => featured.some((f) => f.type === 'course' && f.id === c.id));
  const topItems = [...featuredServices.slice(0, 2), ...featuredCourses.slice(0, 1)];

  // Testimonials carousel
  const reviews = seller.receivedReviews;
  const [reviewIdx, setReviewIdx] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    if (reviews.length <= 1) return;
    intervalRef.current = setInterval(() => {
      setReviewIdx((i) => (i + 1) % reviews.length);
    }, 5000);
    return () => clearInterval(intervalRef.current);
  }, [reviews.length]);

  return (
    <div className="w-full">
      {/* ═══ HERO ═══ */}
      <section
        className="relative py-16 md:py-24 px-4"
        style={{
          background: sp.bioCoverImage
            ? `linear-gradient(to bottom, ${theme.backgroundColor}88, ${theme.backgroundColor}), url(${sp.bioCoverImage}) center/cover`
            : `linear-gradient(135deg, ${theme.backgroundColor}, ${theme.themeColor}22)`,
        }}
      >
        <div className="max-w-2xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <div className="flex justify-center mb-5">
              <SellerAvatar seller={seller} theme={theme} size={110} />
            </div>
            <h1 className="text-3xl md:text-5xl font-bold mb-3">{sp.displayName}</h1>
            <p className="text-lg opacity-70 mb-2">{sp.professionalTitle}</p>
            {sp.bioHeadline && <p className="text-xl md:text-2xl opacity-90 mb-6">{sp.bioHeadline}</p>}
            <div className="flex items-center justify-center gap-4 mb-6">
              {sp.isVerified && <VerifiedBadge color={theme.themeColor} />}
              <span className="inline-flex items-center gap-1">
                <Stars rating={Number(sp.rating)} color={theme.themeColor} size={16} />
                <span className="opacity-50 text-sm">({sp.reviewCount} reviews)</span>
              </span>
            </div>
            <ThemedButton theme={theme} onClick={() => onChat()} size="lg">
              {sp.bioCtaText}
            </ThemedButton>
          </motion.div>
        </div>
      </section>

      {/* ═══ TRUST STRIP ═══ */}
      <section className="py-8 px-4" style={{ background: `${theme.themeColor}08` }}>
        <div className="max-w-2xl mx-auto">
          <TrustStats seller={seller} theme={theme} />
        </div>
      </section>

      {/* ═══ FEATURED WORK ═══ */}
      {topItems.length > 0 && (
        <section className="py-12 px-4">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold text-center mb-8">Featured Work</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {topItems.map((item, i) => {
                const isService = 'packages' in item;
                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 * i }}
                    className="rounded-xl overflow-hidden"
                    style={{ background: `${theme.themeColor}08`, border: `1px solid ${theme.themeColor}20` }}
                  >
                    {isService && (item as any).images?.[0] && (
                      <img src={(item as any).images[0]} alt="" className="w-full aspect-video object-cover" loading="lazy" />
                    )}
                    {!isService && (item as any).thumbnail && (
                      <img src={(item as any).thumbnail} alt="" className="w-full aspect-video object-cover" loading="lazy" />
                    )}
                    <div className="p-3">
                      <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full" style={{ background: `${theme.themeColor}20`, color: theme.themeColor }}>
                        {isService ? 'Service' : 'Course'}
                      </span>
                      <h3 className="font-semibold mt-2 text-sm line-clamp-2">{item.title}</h3>
                      <div className="flex items-center justify-between mt-2">
                        <Stars rating={Number(item.rating)} color={theme.themeColor} size={11} />
                        <PriceBadge
                          price={isService ? ((item as any).packages[0]?.price || 0) : (item as any).price}
                          theme={theme}
                        />
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ═══ TESTIMONIALS CAROUSEL ═══ */}
      {reviews.length > 0 && (
        <section className="py-12 px-4" style={{ background: `${theme.themeColor}05` }}>
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-2xl font-bold mb-6">What Clients Say</h2>
            <div className="relative min-h-[120px]">
              <motion.div key={reviewIdx} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}>
                <ReviewCard review={reviews[reviewIdx]} theme={theme} />
              </motion.div>
            </div>
            {reviews.length > 1 && (
              <div className="flex justify-center gap-1.5 mt-4">
                {reviews.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setReviewIdx(i)}
                    className="w-2 h-2 rounded-full transition-colors"
                    style={{ background: i === reviewIdx ? theme.themeColor : `${theme.themeColor}30` }}
                  />
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* ═══ ALL SERVICES ═══ */}
      {seller.services.length > 0 && (
        <section className="py-12 px-4">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold text-center mb-6">Services</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {seller.services.map((svc) => (
                <motion.button
                  key={svc.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onServiceClick(svc)}
                  className="text-left rounded-xl p-3 flex items-center gap-3"
                  style={{ background: `${theme.themeColor}08`, border: `1px solid ${theme.themeColor}15` }}
                >
                  {svc.images?.[0] ? (
                    <img src={svc.images[0]} alt="" className="w-14 h-14 rounded-lg object-cover flex-shrink-0" loading="lazy" />
                  ) : (
                    <div className="w-14 h-14 rounded-lg flex-shrink-0 flex items-center justify-center" style={{ background: `${theme.themeColor}15` }}>🛍️</div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm line-clamp-1">{svc.title}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <Stars rating={Number(svc.rating)} color={theme.themeColor} size={10} />
                      <PriceBadge price={svc.packages[0]?.price || 0} theme={theme} />
                    </div>
                  </div>
                </motion.button>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ═══ COURSES ═══ */}
      {sp.courses.length > 0 && (
        <section className="py-12 px-4" style={{ background: `${theme.themeColor}05` }}>
          <div className="max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold text-center mb-6">Courses</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {sp.courses.map((course) => (
                <motion.a
                  key={course.id}
                  whileHover={{ scale: 1.02 }}
                  href={`/courses/${course.slug}`}
                  target="_blank"
                  rel="noopener"
                  className="block rounded-xl overflow-hidden"
                  style={{ background: `${theme.themeColor}08`, border: `1px solid ${theme.themeColor}15` }}
                >
                  {course.thumbnail && (
                    <img src={course.thumbnail} alt="" className="w-full aspect-video object-cover" loading="lazy" />
                  )}
                  <div className="p-3">
                    <div className="font-medium text-sm line-clamp-1 mb-1">{course.title}</div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs opacity-50">{course.enrollCount} students</span>
                      <PriceBadge price={course.price} theme={theme} />
                    </div>
                  </div>
                </motion.a>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ═══ FINAL CTA ═══ */}
      <section className="py-16 px-4 text-center" style={{ background: `linear-gradient(135deg, ${theme.themeColor}15, ${theme.themeColor}05)` }}>
        <div className="max-w-md mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold mb-3">Ready to get started?</h2>
          <p className="opacity-60 mb-6">Let's discuss your project and bring your ideas to life.</p>
          <ThemedButton theme={theme} onClick={() => onChat()} size="lg">
            {sp.bioCtaText}
          </ThemedButton>
        </div>
      </section>

      <div className="max-w-2xl mx-auto">
        <PoweredByFooter theme={theme} />
      </div>
    </div>
  );
}
