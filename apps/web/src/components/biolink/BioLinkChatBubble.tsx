import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { conversationsApi, authApi } from '../../lib/api';
import { useAuthStore } from '../../stores/auth.store';
import type { BioLinkTheme, BioLinkSeller, BioLinkFaqEntry } from '../../pages/biolink/templates/index';

interface ChatBubbleProps {
  seller: BioLinkSeller;
  theme: BioLinkTheme;
  context?: { type: 'service' | 'course'; id: string; title: string } | null;
  onClearContext?: () => void;
}

type Phase = 'bubble' | 'gate' | 'chat';

interface LocalMessage {
  id: string;
  role: 'user' | 'system' | 'offer';
  text: string;
  time: string;
  offer?: {
    messageId: string;
    description: string;
    price: number;
    deliveryDays: number;
    revisions?: number;
    buyerFee: number;
    totalAmount: number;
    status: 'PENDING' | 'ACCEPTED' | 'DECLINED';
  };
}

// Guest upgrade modal state
interface GuestUpgradeState {
  visible: boolean;
  pendingOfferId?: string;
  pendingConversationId?: string;
}

export default function BioLinkChatBubble({ seller, theme, context, onClearContext }: ChatBubbleProps) {
  const { isAuthenticated } = useAuthStore();

  const [phase, setPhase] = useState<Phase>('bubble');
  const [messages, setMessages] = useState<LocalMessage[]>([]);
  const [input, setInput] = useState('');
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [gateError, setGateError] = useState('');
  const [sending, setSending] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [guestToken, setGuestToken] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval>>();
  const knownMessageIds = useRef<Set<string>>(new Set());

  // Guest upgrade modal
  const [guestUpgrade, setGuestUpgrade] = useState<GuestUpgradeState>({ visible: false });
  const [upgradeForm, setUpgradeForm] = useState({ username: '', password: '', firstName: '', lastName: '', country: 'ZA' });
  const [upgradeError, setUpgradeError] = useState('');
  const [upgrading, setUpgrading] = useState(false);

  const sp = seller.sellerProfile;
  const faqEntries: BioLinkFaqEntry[] = sp.faqEntries || [];
  const quickReplies = sp.bioQuickReplies?.length
    ? sp.bioQuickReplies
    : ['View services', 'Check pricing', 'Ask me anything'];

  // Auto-open when context arrives (e.g. clicked "Chat about this service")
  useEffect(() => {
    if (context && phase === 'bubble') {
      handleOpen();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [context]);

  // Scroll to bottom on new messages
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  // Poll for new messages (including offers from seller) every 10s
  useEffect(() => {
    if (!conversationId || phase !== 'chat') return;
    const poll = async () => {
      try {
        const token = guestToken;
        // Use the guest token if we have one, otherwise use the auth token
        const headers: Record<string, string> = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;
        const res = await conversationsApi.get(conversationId);
        const msgs = res.data?.messages || [];
        for (const msg of msgs) {
          if (knownMessageIds.current.has(msg.id)) continue;
          knownMessageIds.current.add(msg.id);
          // Skip messages we sent ourselves
          if (msg.senderId !== seller.id) continue;

          if (msg.type === 'QUICK_OFFER' && msg.quickOffer) {
            const offer = msg.quickOffer as any;
            addOfferMessage({
              messageId: msg.id,
              description: offer.description,
              price: offer.price,
              deliveryDays: offer.deliveryDays,
              revisions: offer.revisions,
              buyerFee: offer.buyerFee,
              totalAmount: offer.totalAmount,
              status: offer.status || 'PENDING',
            });
          } else if (msg.type === 'TEXT') {
            addSystemMessage(msg.content);
          }
        }
      } catch {
        // Silent fail on polling
      }
    };
    poll(); // Initial poll
    pollRef.current = setInterval(poll, 10000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, phase, guestToken, seller.id]);

  const handleOpen = () => {
    if (isAuthenticated) {
      setPhase('chat');
      if (messages.length === 0) {
        addSystemMessage(`Hi there! 👋 I'm ${sp.displayName}. How can I help you today?`);
      }
    } else {
      setPhase('gate');
    }
  };

  const addSystemMessage = (text: string) => {
    setMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), role: 'system', text, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
    ]);
  };

  const addUserMessage = (text: string) => {
    setMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), role: 'user', text, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
    ]);
  };

  const addOfferMessage = (offer: LocalMessage['offer']) => {
    if (!offer) return;
    setMessages((prev) => {
      // Avoid duplicates
      if (prev.some((m) => m.offer?.messageId === offer.messageId)) return prev;
      return [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'offer' as const,
          text: offer.description,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          offer,
        },
      ];
    });
  };

  // Accept offer
  const handleAcceptOffer = async (offer: NonNullable<LocalMessage['offer']>) => {
    if (!conversationId) return;
    // If guest (not authenticated fully), show upgrade modal
    if (guestToken && !isAuthenticated) {
      setGuestUpgrade({ visible: true, pendingOfferId: offer.messageId, pendingConversationId: conversationId });
      return;
    }
    // Authenticated user — accept directly
    try {
      setSending(true);
      const res = await conversationsApi.acceptOffer(conversationId, offer.messageId);
      setMessages((prev) => prev.map((m) => m.offer?.messageId === offer.messageId ? { ...m, offer: { ...m.offer!, status: 'ACCEPTED' } } : m));
      addSystemMessage('Offer accepted! Redirecting to payment...');
      if (res.data?.paymentUrl) {
        window.location.href = res.data.paymentUrl;
      }
    } catch {
      addSystemMessage('Failed to accept offer. Please try again.');
    } finally {
      setSending(false);
    }
  };

  // Decline offer
  const handleDeclineOffer = async (offer: NonNullable<LocalMessage['offer']>) => {
    if (!conversationId) return;
    try {
      setSending(true);
      await conversationsApi.declineOffer(conversationId, offer.messageId);
      setMessages((prev) => prev.map((m) => m.offer?.messageId === offer.messageId ? { ...m, offer: { ...m.offer!, status: 'DECLINED' } } : m));
    } catch {
      addSystemMessage('Failed to decline offer. Please try again.');
    } finally {
      setSending(false);
    }
  };

  // Guest upgrade — create full account then accept offer
  const handleGuestUpgrade = async () => {
    const { username, password, firstName, lastName, country } = upgradeForm;
    if (!username.trim() || !password.trim() || !firstName.trim() || !lastName.trim()) {
      setUpgradeError('All fields are required');
      return;
    }
    if (password.length < 8) {
      setUpgradeError('Password must be at least 8 characters');
      return;
    }
    if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
      setUpgradeError('Password needs uppercase, lowercase, and a number');
      return;
    }
    setUpgradeError('');
    setUpgrading(true);
    try {
      const res = await authApi.guestUpgrade({
        username: username.trim().toLowerCase(),
        password,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        country: country.trim() || 'ZA',
      });
      // Store the new auth tokens
      if (res.data?.accessToken) {
        const { setAuthToken } = await import('../../lib/api');
        setAuthToken(res.data.accessToken);
        setGuestToken(null); // No longer guest
      }
      // Now accept the pending offer
      setGuestUpgrade({ visible: false });
      if (guestUpgrade.pendingConversationId && guestUpgrade.pendingOfferId) {
        const acceptRes = await conversationsApi.acceptOffer(guestUpgrade.pendingConversationId, guestUpgrade.pendingOfferId);
        setMessages((prev) => prev.map((m) => m.offer?.messageId === guestUpgrade.pendingOfferId ? { ...m, offer: { ...m.offer!, status: 'ACCEPTED' } } : m));
        addSystemMessage('Account created & offer accepted! Redirecting to payment...');
        if (acceptRes.data?.paymentUrl) {
          window.location.href = acceptRes.data.paymentUrl;
        }
      }
    } catch (e: any) {
      setUpgradeError(e?.message || 'Failed to create account. Try a different username.');
    } finally {
      setUpgrading(false);
    }
  };

  // Gate submit — email capture for guests
  const handleGateSubmit = async () => {
    if (!guestName.trim() || !guestEmail.trim()) {
      setGateError('Name and email are required');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmail)) {
      setGateError('Please enter a valid email');
      return;
    }
    setGateError('');
    setSending(true);
    try {
      const contextMsg = context ? `Hi, I'm interested in: ${context.title}` : undefined;
      const res = await conversationsApi.guestStart({
        sellerUsername: seller.username,
        name: guestName.trim(),
        email: guestEmail.trim(),
        initialMessage: contextMsg,
      });
      setConversationId(res.data?.conversationId || null);
      setGuestToken(res.data?.guestToken || null);
      setPhase('chat');
      addSystemMessage(`Hi ${guestName.split(' ')[0]}! 👋 I'm ${sp.displayName}. How can I help you?`);
      if (contextMsg) {
        addUserMessage(contextMsg);
      }
    } catch {
      setGateError('Something went wrong. Please try again.');
    } finally {
      setSending(false);
    }
  };

  // FAQ keyword matching — returns first matching entry or null
  const matchFaq = (text: string): BioLinkFaqEntry | null => {
    const lower = text.toLowerCase();
    for (const entry of faqEntries) {
      if (entry.keywords.some((kw) => lower.includes(kw.toLowerCase()))) {
        return entry;
      }
    }
    return null;
  };

  // Send message
  const sendMsg = useCallback(
    async (text: string) => {
      if (!text.trim()) return;
      addUserMessage(text.trim());
      setInput('');

      // Check FAQ before sending to API
      const faqMatch = matchFaq(text.trim());
      if (faqMatch) {
        // Small delay to feel natural
        setTimeout(() => addSystemMessage(faqMatch.answer), 400);
      }

      setSending(true);

      try {
        // If we don't have a conversation yet (authenticated user), start one
        if (!conversationId && isAuthenticated) {
          const res = await conversationsApi.start({
            participantId: seller.id,
            content: text.trim(),
          });
          setConversationId(res.data?.conversationId || null);
        } else if (conversationId) {
          // Send to existing conversation
          const headers: Record<string, string> = {};
          if (guestToken) {
            headers['Authorization'] = `Bearer ${guestToken}`;
          }
          await conversationsApi.sendMessage(conversationId, { content: text.trim() });
        }
        // Show a "message delivered" note
        addSystemMessage("Message sent! I'll get back to you soon. You can also check your messages on Zomieks.");
      } catch {
        addSystemMessage("Couldn't send message. Please try again.");
      } finally {
        setSending(false);
      }
    },
    [conversationId, guestToken, isAuthenticated, seller.id, sp.displayName],
  );

  const handleQuickReply = (text: string) => {
    sendMsg(text);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMsg(input);
    }
  };

  // Border radius helper
  const br = theme.buttonStyle === 'pill' ? '24px' : theme.buttonStyle === 'square' ? '0' : '16px';

  return (
    <>
      <AnimatePresence>
        {/* ═══ EXPANDED PANEL ═══ */}
        {phase !== 'bubble' && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-20 right-4 z-50 w-[calc(100vw-2rem)] sm:w-[360px] shadow-2xl overflow-hidden flex flex-col"
            style={{
              maxHeight: 'min(480px, calc(100vh - 6rem))',
              borderRadius: br,
              background: theme.backgroundColor,
              color: theme.textColor,
              border: `1px solid ${theme.themeColor}30`,
              fontFamily: theme.font,
            }}
          >
            {/* Header */}
            <div
              className="flex items-center gap-3 px-4 py-3 flex-shrink-0"
              style={{ background: `${theme.themeColor}15`, borderBottom: `1px solid ${theme.themeColor}20` }}
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold overflow-hidden border-2 flex-shrink-0"
                style={{ borderColor: theme.themeColor, background: theme.backgroundColor }}
              >
                {seller.avatar ? (
                  <img src={seller.avatar} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span style={{ color: theme.themeColor }}>{seller.firstName?.[0]}{seller.lastName?.[0]}</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{sp.displayName}</p>
                <p className="text-xs opacity-50">Usually replies within minutes</p>
              </div>
              <button
                onClick={() => { setPhase('bubble'); onClearContext?.(); }}
                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: `${theme.textColor}10` }}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* ═══ GATE ═══ */}
            {phase === 'gate' && (
              <div className="p-5 space-y-4 flex-1 overflow-y-auto">
                <div className="text-center">
                  <p className="font-semibold">Start a conversation</p>
                  <p className="text-xs opacity-50 mt-1">Enter your details to chat with {sp.displayName}</p>
                </div>
                {context && (
                  <div
                    className="text-xs px-3 py-2 rounded-lg"
                    style={{ background: `${theme.themeColor}10`, color: theme.themeColor }}
                  >
                    Re: {context.title}
                  </div>
                )}
                <div>
                  <label className="text-xs font-medium mb-1 block opacity-70">Your name</label>
                  <input
                    type="text"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    placeholder="John Doe"
                    className="w-full px-3 py-2.5 rounded-lg text-sm border focus:outline-none focus:ring-2"
                    style={{
                      background: `${theme.textColor}05`,
                      borderColor: `${theme.textColor}15`,
                      color: theme.textColor,
                      // @ts-ignore
                      '--tw-ring-color': theme.themeColor,
                    }}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block opacity-70">Email address</label>
                  <input
                    type="email"
                    value={guestEmail}
                    onChange={(e) => setGuestEmail(e.target.value)}
                    placeholder="john@example.com"
                    className="w-full px-3 py-2.5 rounded-lg text-sm border focus:outline-none focus:ring-2"
                    style={{
                      background: `${theme.textColor}05`,
                      borderColor: `${theme.textColor}15`,
                      color: theme.textColor,
                    }}
                  />
                </div>
                {gateError && <p className="text-xs text-red-400">{gateError}</p>}
                <button
                  onClick={handleGateSubmit}
                  disabled={sending}
                  className="w-full py-2.5 rounded-lg font-medium text-sm transition-opacity disabled:opacity-50"
                  style={{
                    background: theme.themeColor,
                    color: '#fff',
                    borderRadius: theme.buttonStyle === 'pill' ? '9999px' : theme.buttonStyle === 'square' ? '0' : '8px',
                  }}
                >
                  {sending ? 'Connecting...' : 'Start Chat'}
                </button>
              </div>
            )}

            {/* ═══ CHAT ═══ */}
            {phase === 'chat' && (
              <>
                <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
                  {messages.map((msg) =>
                    msg.role === 'offer' && msg.offer ? (
                      /* ─── Offer Card ─── */
                      <div key={msg.id} className="flex justify-start">
                        <div
                          className="w-full max-w-[90%] rounded-xl overflow-hidden text-sm"
                          style={{ background: `${theme.textColor}06`, border: `1px solid ${theme.themeColor}25` }}
                        >
                          <div className="px-3.5 py-2.5" style={{ background: `${theme.themeColor}12` }}>
                            <p className="font-semibold text-xs" style={{ color: theme.themeColor }}>💰 Custom Offer</p>
                          </div>
                          <div className="px-3.5 py-3 space-y-2">
                            <p className="font-medium">{msg.offer.description}</p>
                            <div className="flex items-baseline gap-1">
                              <span className="text-lg font-bold" style={{ color: theme.themeColor }}>R{msg.offer.price.toLocaleString()}</span>
                              <span className="text-xs opacity-50">+ R{msg.offer.buyerFee.toLocaleString()} fee</span>
                            </div>
                            <div className="flex gap-3 text-xs opacity-60">
                              <span>📅 {msg.offer.deliveryDays} day{msg.offer.deliveryDays !== 1 ? 's' : ''}</span>
                              {msg.offer.revisions != null && <span>🔄 {msg.offer.revisions} revision{msg.offer.revisions !== 1 ? 's' : ''}</span>}
                            </div>
                            <div className="text-xs font-semibold" style={{ color: theme.themeColor }}>
                              Total: R{msg.offer.totalAmount.toLocaleString()}
                            </div>
                            {msg.offer.status === 'PENDING' ? (
                              <div className="flex gap-2 pt-1">
                                <button
                                  onClick={() => handleAcceptOffer(msg.offer!)}
                                  disabled={sending}
                                  className="flex-1 py-2 rounded-lg text-xs font-semibold text-white transition-opacity disabled:opacity-50"
                                  style={{ background: '#22c55e' }}
                                >
                                  ✓ Accept & Pay
                                </button>
                                <button
                                  onClick={() => handleDeclineOffer(msg.offer!)}
                                  disabled={sending}
                                  className="flex-1 py-2 rounded-lg text-xs font-semibold transition-opacity disabled:opacity-50"
                                  style={{ background: `${theme.textColor}10`, color: theme.textColor }}
                                >
                                  ✕ Decline
                                </button>
                              </div>
                            ) : (
                              <div className="pt-1">
                                <span
                                  className="inline-block px-2.5 py-1 rounded-full text-xs font-semibold"
                                  style={{
                                    background: msg.offer.status === 'ACCEPTED' ? '#22c55e20' : '#ef444420',
                                    color: msg.offer.status === 'ACCEPTED' ? '#22c55e' : '#ef4444',
                                  }}
                                >
                                  {msg.offer.status === 'ACCEPTED' ? '✓ Accepted' : '✕ Declined'}
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="px-3.5 pb-2">
                            <span className="block text-[10px] opacity-40">{msg.time}</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* ─── Normal Message ─── */
                      <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div
                          className="max-w-[80%] px-3.5 py-2 text-sm leading-relaxed"
                          style={{
                            background: msg.role === 'user' ? theme.themeColor : `${theme.textColor}08`,
                            color: msg.role === 'user' ? '#fff' : theme.textColor,
                            borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                          }}
                        >
                          {msg.text}
                          <span className="block text-[10px] mt-1 opacity-40">{msg.time}</span>
                        </div>
                      </div>
                    ),
                  )}

                  {/* Quick reply chips */}
                  {messages.length <= 1 && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {quickReplies.map((qr) => (
                        <button
                          key={qr}
                          onClick={() => handleQuickReply(qr)}
                          className="text-xs px-3 py-1.5 rounded-full border transition-colors"
                          style={{
                            borderColor: `${theme.themeColor}40`,
                            color: theme.themeColor,
                            background: `${theme.themeColor}08`,
                          }}
                        >
                          {qr}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Input */}
                <div
                  className="flex items-center gap-2 px-3 py-2.5 flex-shrink-0"
                  style={{ borderTop: `1px solid ${theme.themeColor}20` }}
                >
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={onKeyDown}
                    placeholder="Type a message..."
                    className="flex-1 bg-transparent text-sm focus:outline-none placeholder:opacity-30"
                    style={{ color: theme.textColor }}
                  />
                  <button
                    onClick={() => sendMsg(input)}
                    disabled={!input.trim() || sending}
                    className="w-8 h-8 rounded-full flex items-center justify-center transition-opacity disabled:opacity-30"
                    style={{ background: theme.themeColor }}
                  >
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                    </svg>
                  </button>
                </div>

                {/* ═══ GUEST UPGRADE MODAL ═══ */}
                {guestUpgrade.visible && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center" style={{ background: `${theme.backgroundColor}ee` }}>
                    <div className="w-full max-w-[300px] p-5 space-y-3">
                      <div className="text-center">
                        <p className="font-semibold text-sm">Create your account</p>
                        <p className="text-xs opacity-50 mt-1">Finish signing up to accept this offer</p>
                      </div>
                      {(['firstName', 'lastName', 'username', 'password'] as const).map((field) => (
                        <div key={field}>
                          <label className="text-xs font-medium mb-1 block opacity-70 capitalize">
                            {field === 'firstName' ? 'First name' : field === 'lastName' ? 'Last name' : field}
                          </label>
                          <input
                            type={field === 'password' ? 'password' : 'text'}
                            value={upgradeForm[field]}
                            onChange={(e) => setUpgradeForm((f) => ({ ...f, [field]: e.target.value }))}
                            placeholder={field === 'username' ? 'Choose a username' : field === 'password' ? 'Min 8 chars (Aa1)' : ''}
                            className="w-full px-3 py-2 rounded-lg text-sm border focus:outline-none focus:ring-2"
                            style={{
                              background: `${theme.textColor}05`,
                              borderColor: `${theme.textColor}15`,
                              color: theme.textColor,
                            }}
                          />
                        </div>
                      ))}
                      {upgradeError && <p className="text-xs text-red-400">{upgradeError}</p>}
                      <button
                        onClick={handleGuestUpgrade}
                        disabled={upgrading}
                        className="w-full py-2.5 rounded-lg font-medium text-sm text-white transition-opacity disabled:opacity-50"
                        style={{ background: '#22c55e', borderRadius: theme.buttonStyle === 'pill' ? '9999px' : '8px' }}
                      >
                        {upgrading ? 'Creating account...' : 'Create Account & Pay'}
                      </button>
                      <button
                        onClick={() => setGuestUpgrade({ visible: false })}
                        className="w-full py-2 text-xs opacity-50 hover:opacity-80"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ FAB BUBBLE ═══ */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => (phase === 'bubble' ? handleOpen() : setPhase('bubble'))}
        className="fixed bottom-4 right-4 z-50 w-14 h-14 rounded-full shadow-lg flex items-center justify-center"
        style={{ background: theme.themeColor }}
      >
        <AnimatePresence mode="wait">
          {phase === 'bubble' ? (
            <motion.svg key="chat" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </motion.svg>
          ) : (
            <motion.svg key="close" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </motion.svg>
          )}
        </AnimatePresence>
        {/* Notification dot when context */}
        {context && phase === 'bubble' && (
          <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-red-500 border-2" style={{ borderColor: theme.backgroundColor }} />
        )}
      </motion.button>
    </>
  );
}
