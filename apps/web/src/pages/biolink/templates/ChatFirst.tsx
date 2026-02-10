import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { BioLinkTemplateProps, BioLinkService, BioLinkCourse } from './index';
import { SellerAvatar, Stars, PriceBadge, PoweredByFooter } from './shared';

interface ChatBubble {
  id: string;
  from: 'bot' | 'user';
  content: string;
  items?: (BioLinkService | BioLinkCourse)[];
  type?: 'text' | 'services' | 'courses' | 'pricing';
}

export default function ChatFirst({ seller, theme, onChat, onServiceClick, onCourseClick }: BioLinkTemplateProps) {
  const sp = seller.sellerProfile;
  const [bubbles, setBubbles] = useState<ChatBubble[]>([]);
  const [typing, setTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const quickReplies = sp.bioQuickReplies?.length
    ? sp.bioQuickReplies
    : ['View services', 'See courses', 'Check pricing', 'Ask me anything'];

  // Initial greeting
  useEffect(() => {
    const timer = setTimeout(() => {
      setBubbles([
        {
          id: 'welcome',
          from: 'bot',
          content: sp.bioHeadline || `Hey! 👋 I'm ${sp.displayName}. ${sp.professionalTitle}. How can I help you today?`,
        },
      ]);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [bubbles, typing]);

  const addBotReply = (reply: Omit<ChatBubble, 'id' | 'from'>) => {
    setTyping(true);
    setTimeout(() => {
      setTyping(false);
      setBubbles((prev) => [...prev, { ...reply, id: crypto.randomUUID(), from: 'bot' }]);
    }, 800);
  };

  const handleChip = (chip: string) => {
    setBubbles((prev) => [...prev, { id: crypto.randomUUID(), from: 'user', content: chip }]);

    const chipLower = chip.toLowerCase();
    if (chipLower.includes('service')) {
      addBotReply({
        content: `Here are my services — tap any to learn more:`,
        items: seller.services,
        type: 'services',
      });
    } else if (chipLower.includes('course')) {
      addBotReply({
        content: `Here are my courses:`,
        items: sp.courses as any,
        type: 'courses',
      });
    } else if (chipLower.includes('pric')) {
      const cheapest = seller.services.reduce((min, s) => {
        const p = s.packages[0]?.price || Infinity;
        return p < min ? p : min;
      }, Infinity);
      addBotReply({
        content: `My services start from R${cheapest === Infinity ? '—' : cheapest.toLocaleString('en-ZA')}. Each service has Basic, Standard, and Premium tiers. Want to see the breakdown?`,
        type: 'pricing',
      });
    } else {
      // "Ask me anything" → open real chat
      onChat();
      addBotReply({
        content: `I've opened a live chat for you — let's talk! 💬`,
      });
    }
  };

  return (
    <div className="w-full max-w-lg mx-auto flex flex-col" style={{ minHeight: '100dvh' }}>
      {/* Mini Header */}
      <div className="flex items-center gap-3 p-4 border-b" style={{ borderColor: `${theme.themeColor}20` }}>
        <SellerAvatar seller={seller} theme={theme} size={44} />
        <div className="min-w-0">
          <div className="font-bold text-sm">{sp.displayName}</div>
          <div className="text-xs opacity-50">{sp.professionalTitle}</div>
        </div>
        <div className="ml-auto flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-xs opacity-50">Online</span>
        </div>
      </div>

      {/* Chat Area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3" style={{ minHeight: 0 }}>
        <AnimatePresence>
          {bubbles.map((b) => (
            <motion.div
              key={b.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${b.from === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className="max-w-[85%] rounded-2xl px-4 py-2.5 text-sm"
                style={{
                  background: b.from === 'user' ? theme.themeColor : `${theme.themeColor}15`,
                  color: b.from === 'user' ? '#fff' : theme.textColor,
                  borderBottomRightRadius: b.from === 'user' ? '4px' : undefined,
                  borderBottomLeftRadius: b.from === 'bot' ? '4px' : undefined,
                }}
              >
                <p>{b.content}</p>

                {/* Service/Course cards inline */}
                {b.type === 'services' && b.items && (
                  <div className="mt-2 space-y-2">
                    {(b.items as BioLinkService[]).map((svc) => (
                      <button
                        key={svc.id}
                        onClick={() => onServiceClick(svc)}
                        className="w-full text-left rounded-xl p-2 flex items-center gap-2"
                        style={{ background: `${theme.themeColor}10` }}
                      >
                        {svc.images?.[0] ? (
                          <img src={svc.images[0]} alt="" className="w-10 h-10 rounded-lg object-cover" loading="lazy" />
                        ) : (
                          <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: `${theme.themeColor}20` }}>🛍️</div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium line-clamp-1">{svc.title}</div>
                          <div className="flex items-center gap-1 mt-0.5">
                            <Stars rating={Number(svc.rating)} color={theme.themeColor} size={8} />
                            <PriceBadge price={svc.packages[0]?.price || 0} theme={theme} />
                          </div>
                        </div>
                        <span className="text-xs opacity-40">→</span>
                      </button>
                    ))}
                  </div>
                )}

                {b.type === 'courses' && b.items && (
                  <div className="mt-2 space-y-2">
                    {(b.items as unknown as BioLinkCourse[]).map((course) => (
                      <button
                        key={course.id}
                        onClick={() => onCourseClick(course)}
                        className="w-full text-left rounded-xl p-2 flex items-center gap-2"
                        style={{ background: `${theme.themeColor}10` }}
                      >
                        {course.thumbnail ? (
                          <img src={course.thumbnail} alt="" className="w-10 h-10 rounded-lg object-cover" loading="lazy" />
                        ) : (
                          <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: `${theme.themeColor}20` }}>📚</div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium line-clamp-1">{course.title}</div>
                          <span className="text-xs opacity-50">{course.enrollCount} students · R{course.price}</span>
                        </div>
                        <span className="text-xs opacity-40">→</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Typing indicator */}
        {typing && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
            <div className="rounded-2xl px-4 py-3 flex gap-1" style={{ background: `${theme.themeColor}15` }}>
              <span className="w-2 h-2 rounded-full animate-bounce" style={{ background: theme.themeColor, animationDelay: '0ms' }} />
              <span className="w-2 h-2 rounded-full animate-bounce" style={{ background: theme.themeColor, animationDelay: '150ms' }} />
              <span className="w-2 h-2 rounded-full animate-bounce" style={{ background: theme.themeColor, animationDelay: '300ms' }} />
            </div>
          </motion.div>
        )}
      </div>

      {/* Quick Reply Chips */}
      <div className="px-4 py-3 border-t" style={{ borderColor: `${theme.themeColor}20` }}>
        <div className="flex flex-wrap gap-2 mb-3">
          {quickReplies.map((chip) => (
            <motion.button
              key={chip}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleChip(chip)}
              className="text-xs px-3 py-1.5 rounded-full font-medium"
              style={{ background: `${theme.themeColor}15`, color: theme.themeColor, border: `1px solid ${theme.themeColor}30` }}
            >
              {chip}
            </motion.button>
          ))}
        </div>
        <button
          onClick={() => onChat()}
          className="w-full py-3 rounded-xl font-semibold text-sm"
          style={{ background: theme.themeColor, color: '#fff', borderRadius: theme.buttonStyle === 'pill' ? '9999px' : '12px' }}
        >
          💬 Start a live conversation
        </button>
      </div>

      <PoweredByFooter theme={theme} />
    </div>
  );
}
