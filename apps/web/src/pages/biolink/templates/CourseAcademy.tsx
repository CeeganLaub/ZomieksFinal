import { motion } from 'framer-motion';
import type { BioLinkTemplateProps } from './index';
import { SellerAvatar, ThemedButton, Stars, VerifiedBadge, ReviewCard, PoweredByFooter } from './shared';

export default function CourseAcademy({ seller, theme, onChat, onCourseClick: _onCourseClick }: BioLinkTemplateProps) {
  const sp = seller.sellerProfile;
  const courses = sp.courses;
  const totalStudents = courses.reduce((sum, c) => sum + c.enrollCount, 0);

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-8">
      {/* Hero */}
      <div className="text-center mb-10">
        <div className="flex justify-center mb-4">
          <SellerAvatar seller={seller} theme={theme} size={100} />
        </div>
        <p className="text-sm font-medium uppercase tracking-wider opacity-50 mb-1">Learn from</p>
        <h1 className="text-3xl md:text-4xl font-bold mb-2">{sp.displayName}</h1>
        <p className="opacity-60 mb-1">{sp.professionalTitle}</p>
        {sp.bioHeadline && <p className="text-lg opacity-80 mb-4">{sp.bioHeadline}</p>}
        <div className="flex items-center justify-center gap-4 mb-6">
          {sp.isVerified && <VerifiedBadge color={theme.themeColor} />}
          <span className="inline-flex items-center gap-1 text-sm">
            <Stars rating={Number(sp.rating)} color={theme.themeColor} size={14} />
            <span className="opacity-50">({sp.reviewCount})</span>
          </span>
        </div>

        {/* Quick Stats */}
        <div className="flex justify-center gap-8 mb-6">
          <div className="text-center">
            <div className="text-2xl font-bold" style={{ color: theme.themeColor }}>{courses.length}</div>
            <div className="text-xs opacity-50">Courses</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold" style={{ color: theme.themeColor }}>{totalStudents}</div>
            <div className="text-xs opacity-50">Students</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold" style={{ color: theme.themeColor }}>{Number(sp.rating).toFixed(1)}</div>
            <div className="text-xs opacity-50">Rating</div>
          </div>
        </div>

        <ThemedButton theme={theme} onClick={() => onChat()} size="lg">
          {sp.bioCtaText}
        </ThemedButton>
      </div>

      {/* Courses */}
      {courses.length > 0 && (
        <div className="mb-10">
          <h2 className="text-xl font-bold mb-4">📚 My Courses</h2>
          <div className="space-y-4">
            {courses.map((course, i) => (
              <motion.div
                key={course.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className="rounded-xl overflow-hidden"
                style={{ background: `${theme.themeColor}08`, border: `1px solid ${theme.themeColor}20` }}
              >
                {course.thumbnail && (
                  <img src={course.thumbnail} alt={course.title} className="w-full aspect-video object-cover" loading="lazy" />
                )}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-bold text-lg">{course.title}</h3>
                    <span
                      className="text-xs px-2 py-0.5 rounded-full flex-shrink-0"
                      style={{ background: `${theme.themeColor}20`, color: theme.themeColor }}
                    >
                      {course.level}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mb-3 text-sm">
                    <span className="inline-flex items-center gap-1">
                      <Stars rating={Number(course.rating)} color={theme.themeColor} size={12} />
                      <span className="opacity-50">({course.reviewCount})</span>
                    </span>
                    <span className="opacity-40">·</span>
                    <span className="opacity-60">{course.enrollCount} students</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-xl font-bold" style={{ color: theme.themeColor }}>
                      {course.price ? `R${course.price}` : 'Free'}
                    </div>
                    <div className="flex gap-2">
                      <ThemedButton
                        theme={theme}
                        onClick={() => onChat({ type: 'course', id: course.id, title: course.title })}
                        size="sm"
                      >
                        💬 Ask
                      </ThemedButton>
                      <motion.a
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        href={`/courses/${course.slug}`}
                        target="_blank"
                        rel="noopener"
                        className="text-sm px-4 py-2 rounded-lg font-semibold"
                        style={{
                          background: theme.themeColor,
                          color: '#fff',
                          borderRadius: theme.buttonStyle === 'pill' ? '9999px' : theme.buttonStyle === 'square' ? '0' : '8px',
                        }}
                      >
                        Enroll →
                      </motion.a>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Also Offers Services */}
      {seller.services.length > 0 && (
        <div className="mb-10">
          <h2 className="text-xl font-bold mb-4">🛠️ Also Available</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {seller.services.slice(0, 4).map((svc) => (
              <motion.button
                key={svc.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onChat({ type: 'service', id: svc.id, title: svc.title })}
                className="text-left rounded-xl p-3 flex items-center gap-3"
                style={{ background: `${theme.themeColor}08`, border: `1px solid ${theme.themeColor}15` }}
              >
                {svc.images?.[0] ? (
                  <img src={svc.images[0]} alt="" className="w-12 h-12 rounded-lg object-cover flex-shrink-0" loading="lazy" />
                ) : (
                  <div className="w-12 h-12 rounded-lg flex-shrink-0 flex items-center justify-center" style={{ background: `${theme.themeColor}15` }}>🛍️</div>
                )}
                <div className="min-w-0">
                  <div className="text-sm font-medium line-clamp-1">{svc.title}</div>
                  <div className="text-xs opacity-50">From R{svc.packages[0]?.price || 0}</div>
                </div>
              </motion.button>
            ))}
          </div>
        </div>
      )}

      {/* Reviews */}
      {seller.receivedReviews.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4">⭐ Student Reviews</h2>
          <div className="space-y-3">
            {seller.receivedReviews.map((r) => (
              <ReviewCard key={r.id} review={r} theme={theme} />
            ))}
          </div>
        </div>
      )}

      {/* Skills */}
      <div className="flex flex-wrap justify-center gap-2 mb-8">
        {sp.skills.map((skill) => (
          <span
            key={skill}
            className="text-xs px-3 py-1 rounded-full"
            style={{ background: `${theme.themeColor}12`, color: theme.themeColor }}
          >
            {skill}
          </span>
        ))}
      </div>

      <PoweredByFooter theme={theme} />
    </div>
  );
}
