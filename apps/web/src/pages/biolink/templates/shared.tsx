import { motion } from 'framer-motion';
import type { BioLinkTheme, BioLinkSeller, BioLinkReview, BioLinkService, BioLinkCourse, BioLinkDigitalProduct } from './index';

// ─── Button with seller's theme ───
export function ThemedButton({
  theme,
  style,
  children,
  onClick,
  className = '',
  size = 'md',
}: {
  theme: BioLinkTheme;
  style?: string; // override buttonStyle
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  const bs = style || theme.buttonStyle;
  const radius = bs === 'pill' ? '9999px' : bs === 'square' ? '0' : '8px';
  const isOutline = bs === 'outline';
  const pad = size === 'sm' ? '8px 16px' : size === 'lg' ? '16px 32px' : '12px 24px';
  const fontSize = size === 'sm' ? '0.875rem' : size === 'lg' ? '1.125rem' : '1rem';

  return (
    <motion.button
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className={`font-semibold transition-colors ${className}`}
      style={{
        borderRadius: radius,
        padding: pad,
        fontSize,
        background: isOutline ? 'transparent' : theme.themeColor,
        color: isOutline ? theme.themeColor : '#fff',
        border: isOutline ? `2px solid ${theme.themeColor}` : 'none',
        cursor: 'pointer',
      }}
    >
      {children}
    </motion.button>
  );
}

// ─── Avatar ───
export function SellerAvatar({
  seller,
  theme,
  size = 80,
}: {
  seller: BioLinkSeller;
  theme: BioLinkTheme;
  size?: number;
}) {
  const initials = `${seller.sellerProfile.displayName.charAt(0)}`;
  return (
    <div
      className="flex-shrink-0 flex items-center justify-center rounded-full font-bold border-4"
      style={{
        width: size,
        height: size,
        borderColor: theme.themeColor,
        background: seller.avatar
          ? `url(${seller.avatar}) center/cover`
          : `${theme.themeColor}22`,
        color: theme.themeColor,
        fontSize: size * 0.35,
      }}
    >
      {!seller.avatar && initials}
    </div>
  );
}

// ─── Stars ───
export function Stars({ rating, color, size = 14 }: { rating: number; color: string; size?: number }) {
  return (
    <span className="inline-flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <svg
          key={i}
          width={size}
          height={size}
          viewBox="0 0 20 20"
          fill={i <= Math.round(rating) ? color : 'none'}
          stroke={color}
          strokeWidth={1.5}
        >
          <path d="M10 1l2.39 4.84L18 6.71l-4 3.9.94 5.49L10 13.48l-4.94 2.62L6 10.61l-4-3.9 5.61-.87z" />
        </svg>
      ))}
    </span>
  );
}

// ─── Verified Badge ───
export function VerifiedBadge({ color }: { color: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium" style={{ color }}>
      <svg width="14" height="14" viewBox="0 0 20 20" fill={color}>
        <path d="M10 0l2.5 3.5H17l-1 4.5 3 3.5-3.5 2.5.5 4.5-4.5-.5L10 20l-1.5-2.5-4.5.5.5-4.5L1 11l3-3.5-1-4.5h4.5z" />
        <path d="M7 10l2 2 4-4" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      Verified
    </span>
  );
}

// ─── Trust Stats ───
export function TrustStats({ seller, theme }: { seller: BioLinkSeller; theme: BioLinkTheme }) {
  const sp = seller.sellerProfile;
  const stats = [
    { label: 'Orders', value: sp.completedOrders },
    { label: 'Rating', value: Number(sp.rating).toFixed(1) },
    { label: 'Reviews', value: sp.reviewCount },
  ];
  if (sp.responseTimeMinutes) {
    stats.push({
      label: 'Responds',
      value: sp.responseTimeMinutes < 60 ? `${sp.responseTimeMinutes}m` : `${Math.round(sp.responseTimeMinutes / 60)}h`,
    });
  }
  return (
    <div className="flex flex-wrap justify-center gap-4 md:gap-6">
      {stats.map((s) => (
        <div key={s.label} className="text-center">
          <div className="text-lg md:text-xl font-bold" style={{ color: theme.themeColor }}>
            {s.value}
          </div>
          <div className="text-xs opacity-60">{s.label}</div>
        </div>
      ))}
    </div>
  );
}

// ─── Review Card ───
export function ReviewCard({ review, theme }: { review: BioLinkReview; theme: BioLinkTheme }) {
  return (
    <div
      className="rounded-xl p-4"
      style={{ background: `${theme.themeColor}10`, border: `1px solid ${theme.themeColor}20` }}
    >
      <div className="flex items-center gap-2 mb-2">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
          style={{ background: `${theme.themeColor}30`, color: theme.themeColor }}
        >
          {review.author.firstName?.charAt(0) || '?'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium truncate">{review.author.firstName}</div>
        </div>
        <Stars rating={review.rating} color={theme.themeColor} size={12} />
      </div>
      <p className="text-sm opacity-80 line-clamp-3">{review.comment}</p>
    </div>
  );
}

// ─── Price Badge ───
export function PriceBadge({ price, theme }: { price: number; theme: BioLinkTheme }) {
  if (!price)
    return (
      <span className="text-sm font-semibold" style={{ color: theme.themeColor }}>
        Free
      </span>
    );
  return (
    <span className="text-sm font-bold" style={{ color: theme.themeColor }}>
      R{price.toLocaleString('en-ZA')}
    </span>
  );
}

// ─── Service Image ───
export function ServiceImage({ images, title }: { images: string[]; title: string }) {
  const src = images?.[0];
  if (!src) {
    return (
      <div className="w-full aspect-video bg-gray-200/10 rounded-lg flex items-center justify-center text-2xl">
        🖼️
      </div>
    );
  }
  return <img src={src} alt={title} className="w-full aspect-video object-cover rounded-lg" loading="lazy" />;
}

// ─── Section Header ───
export function SectionHeader({
  children,
  theme,
}: {
  children: React.ReactNode;
  theme: BioLinkTheme;
}) {
  return (
    <h2
      className="text-xl md:text-2xl font-bold mb-4"
      style={{ color: theme.textColor }}
    >
      {children}
    </h2>
  );
}

// ─── WhatsApp-Style Service PDP Card (for chat) ───
export function ChatServiceCard({
  service,
  theme,
  onChat,
  onClick,
}: {
  service: BioLinkService;
  theme: BioLinkTheme;
  onChat?: () => void;
  onClick?: () => void;
}) {
  const pkg = service.packages[0];
  return (
    <div
      className="rounded-xl overflow-hidden w-full mt-2"
      style={{ background: theme.backgroundColor, border: `1px solid ${theme.themeColor}25` }}
    >
      {/* Thumbnail */}
      {service.images?.[0] ? (
        <img src={service.images[0]} alt={service.title} className="w-full aspect-[16/9] object-cover" loading="lazy" />
      ) : (
        <div className="w-full aspect-[16/9] flex items-center justify-center text-3xl" style={{ background: `${theme.themeColor}12` }}>🛍️</div>
      )}
      {/* Body */}
      <div className="p-3 space-y-2">
        <h4 className="font-semibold text-sm line-clamp-1" style={{ color: theme.textColor }}>{service.title}</h4>
        <div className="flex items-center gap-2">
          <Stars rating={Number(service.rating)} color={theme.themeColor} size={11} />
          <span className="text-xs opacity-50" style={{ color: theme.textColor }}>({service.reviewCount})</span>
        </div>
        {pkg && (
          <div className="flex items-center gap-2">
            <span className="text-base font-bold" style={{ color: theme.themeColor }}>R{Number(pkg.price).toLocaleString('en-ZA')}</span>
            {pkg.deliveryDays && <span className="text-xs opacity-50" style={{ color: theme.textColor }}>· {pkg.deliveryDays} day delivery</span>}
          </div>
        )}
        <div className="flex gap-2 pt-1">
          {onChat && (
            <button
              onClick={(e) => { e.stopPropagation(); onChat(); }}
              className="flex-1 py-2 rounded-lg text-xs font-semibold"
              style={{ background: theme.themeColor, color: '#fff' }}
            >
              💬 Chat about this
            </button>
          )}
          {onClick && (
            <button
              onClick={(e) => { e.stopPropagation(); onClick(); }}
              className="py-2 px-3 rounded-lg text-xs font-medium"
              style={{ border: `1px solid ${theme.themeColor}40`, color: theme.textColor }}
            >
              Details →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── WhatsApp-Style Course PDP Card (for chat) ───
export function ChatCourseCard({
  course,
  theme,
  onClick,
}: {
  course: BioLinkCourse;
  theme: BioLinkTheme;
  onClick?: () => void;
}) {
  return (
    <div
      className="rounded-xl overflow-hidden w-full mt-2"
      style={{ background: theme.backgroundColor, border: `1px solid ${theme.themeColor}25` }}
    >
      {course.thumbnail ? (
        <img src={course.thumbnail} alt={course.title} className="w-full aspect-[16/9] object-cover" loading="lazy" />
      ) : (
        <div className="w-full aspect-[16/9] flex items-center justify-center text-3xl" style={{ background: `${theme.themeColor}12` }}>📚</div>
      )}
      <div className="p-3 space-y-2">
        <h4 className="font-semibold text-sm line-clamp-1" style={{ color: theme.textColor }}>{course.title}</h4>
        <div className="flex items-center gap-2">
          <Stars rating={Number(course.rating)} color={theme.themeColor} size={11} />
          <span className="text-xs opacity-50" style={{ color: theme.textColor }}>({course.reviewCount})</span>
          <span className="text-xs opacity-50" style={{ color: theme.textColor }}>· {course.enrollCount} students</span>
        </div>
        <div className="flex items-center justify-between pt-1">
          <span className="text-base font-bold" style={{ color: theme.themeColor }}>R{Number(course.price).toLocaleString('en-ZA')}</span>
          <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-medium" style={{ background: `${theme.themeColor}15`, color: theme.themeColor }}>{course.level}</span>
        </div>
        {onClick && (
          <button
            onClick={(e) => { e.stopPropagation(); onClick(); }}
            className="w-full py-2 rounded-lg text-xs font-semibold mt-1"
            style={{ background: theme.themeColor, color: '#fff' }}
          >
            View Course →
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Availability Badge ───
export function AvailabilityBadge({
  availability,
  theme,
}: {
  availability: {
    isAvailable: boolean;
    vacationMode?: boolean;
    vacationUntil?: string;
    responseTimeMinutes?: number;
    activeOrderCount?: number;
    maxActiveOrders?: number;
  };
  theme: BioLinkTheme;
}) {
  const { isAvailable, vacationMode, vacationUntil, responseTimeMinutes, activeOrderCount = 0, maxActiveOrders = 5 } = availability;
  const queuePosition = Math.max(0, activeOrderCount - maxActiveOrders + 1);

  let dotColor = '#6b7280'; // grey
  let label = 'Unavailable';

  if (vacationMode) {
    dotColor = '#ef4444'; // red
    label = vacationUntil ? `On vacation until ${new Date(vacationUntil).toLocaleDateString('en-ZA', { month: 'short', day: 'numeric' })}` : 'On vacation';
  } else if (isAvailable && queuePosition > 0) {
    dotColor = '#f59e0b'; // amber
    label = `Busy — ~${queuePosition} in queue`;
  } else if (isAvailable) {
    dotColor = '#22c55e'; // green
    label = 'Available now';
  }

  const responseLabel = responseTimeMinutes
    ? responseTimeMinutes < 60
      ? `Usually responds in ${responseTimeMinutes}m`
      : `Usually responds in ${Math.round(responseTimeMinutes / 60)}h`
    : null;

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="flex items-center gap-1.5">
        <span
          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
          style={{
            backgroundColor: dotColor,
            boxShadow: isAvailable && !vacationMode && queuePosition === 0 ? `0 0 6px ${dotColor}` : 'none',
            animation: isAvailable && !vacationMode && queuePosition === 0 ? 'pulse 2s infinite' : 'none',
          }}
        />
        <span className="text-xs font-medium" style={{ color: theme.textColor, opacity: 0.7 }}>{label}</span>
      </div>
      {responseLabel && (
        <span className="text-[10px] opacity-50" style={{ color: theme.textColor }}>{responseLabel}</span>
      )}
    </div>
  );
}

// ─── Testimonial Wall ───
export function TestimonialWall({
  reviews,
  theme,
  maxVisible = 6,
}: {
  reviews: BioLinkReview[];
  theme: BioLinkTheme;
  maxVisible?: number;
}) {
  if (reviews.length === 0) return null;

  const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
  const distribution = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => r.rating === star).length,
    pct: (reviews.filter((r) => r.rating === star).length / reviews.length) * 100,
  }));

  const visible = reviews.slice(0, maxVisible);

  return (
    <div>
      {/* Aggregate header */}
      <div className="text-center mb-6">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Stars rating={Math.round(avgRating)} color={theme.themeColor} size={18} />
          <span className="text-lg font-bold" style={{ color: theme.themeColor }}>{avgRating.toFixed(1)}</span>
        </div>
        <p className="text-sm opacity-60" style={{ color: theme.textColor }}>{reviews.length} review{reviews.length !== 1 ? 's' : ''} from Zomieks clients</p>
        {/* Distribution bars */}
        <div className="max-w-xs mx-auto mt-3 space-y-1">
          {distribution.map(({ star, count, pct }) => (
            <div key={star} className="flex items-center gap-2 text-xs">
              <span className="w-4 text-right opacity-60" style={{ color: theme.textColor }}>{star}★</span>
              <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: `${theme.themeColor}15` }}>
                <div className="h-full rounded-full" style={{ width: `${pct}%`, background: theme.themeColor }} />
              </div>
              <span className="w-5 text-right opacity-40" style={{ color: theme.textColor }}>{count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Review grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {visible.map((review) => (
          <ReviewCard key={review.id} review={review} theme={theme} />
        ))}
      </div>
    </div>
  );
}

// ─── Digital Product Card ───
export function DigitalProductCard({
  product,
  theme,
  onBuy,
}: {
  product: BioLinkDigitalProduct;
  theme: BioLinkTheme;
  onBuy: (product: BioLinkDigitalProduct) => void;
}) {
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div
      className="rounded-xl overflow-hidden border"
      style={{ borderColor: `${theme.themeColor}20`, background: `${theme.themeColor}05` }}
    >
      {product.thumbnail && (
        <img src={product.thumbnail} alt={product.title} className="w-full h-32 object-cover" />
      )}
      <div className="p-4">
        <h4 className="font-semibold text-sm" style={{ color: theme.textColor }}>
          {product.title}
        </h4>
        {product.description && (
          <p className="text-xs mt-1 opacity-60 line-clamp-2" style={{ color: theme.textColor }}>
            {product.description}
          </p>
        )}
        <div className="flex items-center justify-between mt-3">
          <div>
            <span className="font-bold text-sm" style={{ color: theme.themeColor }}>
              ${product.price}
            </span>
            <span className="text-xs opacity-40 ml-2" style={{ color: theme.textColor }}>
              {product.fileName} · {formatSize(product.fileSize)}
            </span>
          </div>
          <button
            onClick={() => onBuy(product)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: theme.themeColor }}
          >
            Buy
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Digital Product Store Section ───
export function DigitalProductStore({
  products,
  theme,
  onBuy,
}: {
  products: BioLinkDigitalProduct[];
  theme: BioLinkTheme;
  onBuy: (product: BioLinkDigitalProduct) => void;
}) {
  if (!products || products.length === 0) return null;
  return (
    <div className="mb-8">
      <h2 className="text-lg font-bold mb-4" style={{ color: theme.textColor }}>
        📦 Digital Products
      </h2>
      <div className="grid grid-cols-2 gap-3">
        {products.map((p) => (
          <DigitalProductCard key={p.id} product={p} theme={theme} onBuy={onBuy} />
        ))}
      </div>
    </div>
  );
}

// ─── Powered By Footer ───
export function PoweredByFooter({ theme }: { theme: BioLinkTheme }) {
  return (
    <div className="py-6 text-center">
      <a
        href="/"
        className="text-xs opacity-40 hover:opacity-60 transition-opacity"
        style={{ color: theme.textColor }}
      >
        Powered by <span className="font-semibold">Zomieks</span>
      </a>
    </div>
  );
}
