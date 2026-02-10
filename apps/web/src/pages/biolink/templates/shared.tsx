import { motion } from 'framer-motion';
import type { BioLinkTheme, BioLinkSeller, BioLinkReview } from './index';

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
