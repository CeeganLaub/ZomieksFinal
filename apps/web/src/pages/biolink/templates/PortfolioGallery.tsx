import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { BioLinkTemplateProps, BioLinkService } from './index';
import { SellerAvatar, ThemedButton, Stars, VerifiedBadge, PoweredByFooter, PriceBadge } from './shared';

export default function PortfolioGallery({ seller, theme, onChat, onServiceClick }: BioLinkTemplateProps) {
  const sp = seller.sellerProfile;
  const [lightbox, setLightbox] = useState<{ src: string; service: BioLinkService } | null>(null);
  const [filter, setFilter] = useState<string>('all');

  // Collect all images + their parent service
  const gallery: { src: string; service: BioLinkService }[] = [];
  for (const svc of seller.services) {
    for (const img of svc.images || []) {
      gallery.push({ src: img, service: svc });
    }
  }

  // Unique service names for filter chips
  const serviceNames = [...new Set(seller.services.map((s) => s.title))];

  const filtered = filter === 'all' ? gallery : gallery.filter((g) => g.service.title === filter);

  return (
    <div className="w-full max-w-3xl mx-auto px-4 py-8">
      {/* Cover Image */}
      {sp.bioCoverImage && (
        <div className="w-full aspect-[3/1] rounded-2xl overflow-hidden mb-6">
          <img src={sp.bioCoverImage} alt="" className="w-full h-full object-cover" />
        </div>
      )}

      {/* Profile Header */}
      <div className="text-center mb-8">
        <div className="flex justify-center mb-3">
          <SellerAvatar seller={seller} theme={theme} size={80} />
        </div>
        <h1 className="text-2xl font-bold mb-1">{sp.displayName}</h1>
        <p className="text-sm opacity-60 mb-1">{sp.professionalTitle}</p>
        {sp.bioHeadline && <p className="opacity-80 mb-3">{sp.bioHeadline}</p>}
        <div className="flex items-center justify-center gap-3 mb-4">
          {sp.isVerified && <VerifiedBadge color={theme.themeColor} />}
          <span className="inline-flex items-center gap-1 text-sm">
            <Stars rating={Number(sp.rating)} color={theme.themeColor} size={13} />
            <span className="opacity-50">({sp.reviewCount})</span>
          </span>
        </div>
        <ThemedButton theme={theme} onClick={() => onChat()}>
          {sp.bioCtaText}
        </ThemedButton>
      </div>

      {/* Filter Chips */}
      {serviceNames.length > 1 && (
        <div className="flex flex-wrap gap-2 mb-6 justify-center">
          <FilterChip label="All" active={filter === 'all'} theme={theme} onClick={() => setFilter('all')} />
          {serviceNames.map((name) => (
            <FilterChip key={name} label={name} active={filter === name} theme={theme} onClick={() => setFilter(name)} />
          ))}
        </div>
      )}

      {/* Masonry Grid */}
      {filtered.length > 0 ? (
        <div className="columns-2 md:columns-3 gap-3 space-y-3">
          {filtered.map((item, i) => (
            <motion.button
              key={`${item.src}-${i}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              whileHover={{ scale: 1.03 }}
              className="w-full break-inside-avoid rounded-xl overflow-hidden relative group"
              onClick={() => setLightbox(item)}
            >
              <img src={item.src} alt={item.service.title} className="w-full object-cover" loading="lazy" />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                <span className="text-white text-sm font-medium line-clamp-1">{item.service.title}</span>
                <span className="text-white/70 text-xs">
                  ★ {Number(item.service.rating).toFixed(1)} · From R{item.service.packages[0]?.price || 0}
                </span>
              </div>
            </motion.button>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 opacity-50">No portfolio images yet</div>
      )}

      {/* Skills */}
      {sp.skills.length > 0 && (
        <div className="mt-8 flex flex-wrap justify-center gap-2">
          {sp.skills.map((skill) => (
            <span
              key={skill}
              className="text-xs px-3 py-1 rounded-full"
              style={{ background: `${theme.themeColor}15`, color: theme.themeColor }}
            >
              {skill}
            </span>
          ))}
        </div>
      )}

      <PoweredByFooter theme={theme} />

      {/* Lightbox */}
      <AnimatePresence>
        {lightbox && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
            onClick={() => setLightbox(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="max-w-2xl w-full rounded-2xl overflow-hidden"
              style={{ background: theme.backgroundColor }}
              onClick={(e) => e.stopPropagation()}
            >
              <img src={lightbox.src} alt="" className="w-full max-h-[60vh] object-contain bg-black" />
              <div className="p-4">
                <h3 className="font-bold text-lg mb-1">{lightbox.service.title}</h3>
                <div className="flex items-center gap-2 mb-3">
                  <Stars rating={Number(lightbox.service.rating)} color={theme.themeColor} size={14} />
                  <span className="text-sm opacity-60">({lightbox.service.reviewCount})</span>
                  <PriceBadge price={lightbox.service.packages[0]?.price || 0} theme={theme} />
                </div>
                <div className="flex gap-2">
                  <ThemedButton
                    theme={theme}
                    onClick={() => {
                      setLightbox(null);
                      onChat({ type: 'service', id: lightbox.service.id, title: lightbox.service.title });
                    }}
                    size="sm"
                    className="flex-1"
                  >
                    💬 Chat about this
                  </ThemedButton>
                  <button
                    onClick={() => {
                      setLightbox(null);
                      onServiceClick(lightbox.service);
                    }}
                    className="text-xs px-3 py-2 rounded-lg"
                    style={{ border: `1px solid ${theme.themeColor}40`, color: theme.textColor }}
                  >
                    Details →
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function FilterChip({
  label,
  active,
  theme,
  onClick,
}: {
  label: string;
  active: boolean;
  theme: BioLinkTemplateProps['theme'];
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="text-xs px-3 py-1.5 rounded-full transition-colors max-w-[150px] truncate"
      style={{
        background: active ? theme.themeColor : `${theme.themeColor}15`,
        color: active ? '#fff' : theme.textColor,
      }}
    >
      {label}
    </button>
  );
}
