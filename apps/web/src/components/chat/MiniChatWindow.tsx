import { useEffect, useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useChatStore } from '../../stores/chat.store';
import { useFloatingChatStore } from '../../stores/floatingChat.store';
import { useAuthStore } from '../../stores/auth.store';
import { socketClient } from '../../lib/socket';
import ChatBubble from './ChatBubble';
import { cn } from '../../lib/utils';
import {
  XMarkIcon,
  MinusIcon,
  ArrowTopRightOnSquareIcon,
  PaperAirplaneIcon,
} from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';

interface MiniChatWindowProps {
  conversationId: string;
  index: number; // position from right (0 = furthest right, next to inbox)
}

interface ConvData {
  id: string;
  buyerId: string;
  sellerId: string;
  buyer: { id: string; username: string; firstName?: string; avatar?: string };
  seller: { id: string; username: string; firstName?: string; avatar?: string };
  messages: any[];
}

interface MsgData {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  type: string;
  quickOffer?: any;
  attachments?: string[];
  createdAt: string;
  sender: { id: string; username: string; firstName?: string; avatar?: string };
}

export default function MiniChatWindow({ conversationId, index }: MiniChatWindowProps) {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { closeChat, toggleMinimize, minimizedChats } = useFloatingChatStore();
  const { addMessage } = useChatStore();

  const [conversation, setConversation] = useState<ConvData | null>(null);
  const [messages, setMessages] = useState<MsgData[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [typingUser, setTypingUser] = useState<string | null>(null);

  const isMinimized = minimizedChats.includes(conversationId);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Offset from right: inbox (340px) + gap (8px) + index × (320+8)
  const rightOffset = 340 + 8 + index * 328;

  // Fetch conversation data
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setIsLoading(true);
      try {
        const res = await api.get<{
          success: boolean;
          data: { conversation: ConvData; messages: MsgData[] };
        }>(`/conversations/${conversationId}`);
        if (!cancelled) {
          setConversation(res.data.conversation);
          setMessages(res.data.messages);
        }
      } catch (err) {
        console.error('Failed to load conversation:', err);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [conversationId]);

  // Socket: join conversation for real-time
  useEffect(() => {
    if (!user) return;
    try {
      socketClient.joinConversation(conversationId);

      const unsubMsg = socketClient.onChatMessage(conversationId, (data: any) => {
        if (data.message) {
          setMessages((prev) => [...prev, data.message]);
          addMessage(data.message);
        }
      });

      const unsubTyping = socketClient.onTyping(conversationId, (data: any) => {
        if (data.userId !== user.id) {
          setTypingUser(data.username || 'Someone');
          if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = setTimeout(() => setTypingUser(null), 3000);
        }
      });

      return () => {
        unsubMsg();
        unsubTyping();
        socketClient.leaveConversation(conversationId);
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      };
    } catch {
      // Socket not available — gracefully degrade to polling
    }
  }, [conversationId, user, addMessage]);

  // Auto-scroll
  const prevCount = useRef(0);
  useEffect(() => {
    if (!isMinimized) {
      const isNew = messages.length === prevCount.current + 1 && prevCount.current > 0;
      messagesEndRef.current?.scrollIntoView({ behavior: isNew ? 'smooth' : 'instant' });
    }
    prevCount.current = messages.length;
  }, [messages, isMinimized]);

  // Focus input when expanded
  useEffect(() => {
    if (!isMinimized) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isMinimized]);

  const handleSend = useCallback(async () => {
    if (!newMessage.trim() || isSending) return;
    const content = newMessage.trim();
    setNewMessage('');
    setIsSending(true);
    try {
      const res = await api.post<{ success: boolean; data: { message: MsgData } }>(
        `/conversations/${conversationId}/messages`,
        { content }
      );
      if (res.data?.message) {
        setMessages((prev) => [...prev, res.data.message]);
        addMessage(res.data.message as any);
      }
    } catch {
      setNewMessage(content); // restore on fail
    } finally {
      setIsSending(false);
    }
  }, [newMessage, conversationId, isSending, addMessage]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    // Send typing indicator
    try { socketClient.sendTyping(conversationId); } catch { /* ignore */ }
  };

  const handlePopout = () => {
    closeChat(conversationId);
    navigate(`/messages/${conversationId}`);
  };

  const otherUser = conversation
    ? (conversation.buyerId === user?.id ? conversation.seller : conversation.buyer)
    : null;

  return (
    <motion.div
      className="fixed bottom-0 z-[59] flex flex-col"
      style={{ right: rightOffset }}
      initial={{ y: 40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 40, opacity: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
    >
      {/* Chat body — hidden when minimized */}
      {!isMinimized && (
        <div className="w-[320px] bg-card border border-border/60 rounded-t-xl shadow-2xl overflow-hidden flex flex-col"
          style={{ height: '400px' }}>
          {/* Messages area */}
          <div className="flex-1 overflow-y-auto overscroll-contain p-2.5 space-y-1.5 bg-muted/20">
            {isLoading ? (
              <div className="flex justify-center items-center h-full">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex items-center justify-center h-full text-muted-foreground text-xs">
                Start a conversation
              </div>
            ) : (
              <>
                {messages.map((msg) => (
                  <ChatBubble
                    key={msg.id}
                    message={msg}
                    isOwn={msg.senderId === user?.id}
                    compact
                    showAvatar={msg.senderId !== user?.id}
                  />
                ))}
                {typingUser && (
                  <div className="flex items-center gap-1.5 px-1">
                    <div className="flex gap-0.5">
                      <span className="w-1.5 h-1.5 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                    <span className="text-[10px] text-muted-foreground">{typingUser} is typing...</span>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Input area */}
          <div className="border-t p-2 bg-card">
            <div className="flex items-end gap-1.5">
              <textarea
                ref={inputRef}
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a message"
                rows={1}
                className="flex-1 resize-none text-xs px-3 py-2 rounded-xl border bg-muted/40 focus:bg-background focus:outline-none focus:border-primary/50 transition-colors placeholder:text-muted-foreground/60 max-h-20"
                style={{ minHeight: '34px' }}
              />
              <button
                onClick={handleSend}
                disabled={!newMessage.trim() || isSending}
                className={cn(
                  'p-2 rounded-xl transition-colors shrink-0',
                  newMessage.trim()
                    ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                    : 'bg-muted text-muted-foreground'
                )}
              >
                <PaperAirplaneIcon className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header bar — always visible */}
      <div
        className={cn(
          'flex items-center justify-between w-[320px] h-10 px-3 cursor-pointer select-none',
          'bg-[hsl(220,20%,18%)] text-white hover:bg-[hsl(220,20%,22%)]',
          'shadow-lg border border-border/20 transition-colors',
          isMinimized ? 'rounded-xl shadow-xl' : 'rounded-t-none'
        )}
        onClick={() => toggleMinimize(conversationId)}
      >
        <div className="flex items-center gap-2 min-w-0">
          {/* Avatar */}
          {otherUser?.avatar ? (
            <img src={otherUser.avatar} alt="" className="h-6 w-6 rounded-full object-cover shrink-0" />
          ) : (
            <div className="h-6 w-6 rounded-full bg-gradient-to-br from-primary/80 to-purple-500 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
              {otherUser?.firstName?.charAt(0) || otherUser?.username?.charAt(0) || '?'}
            </div>
          )}
          <span className="text-xs font-medium truncate">
            {otherUser?.firstName || otherUser?.username || 'Loading...'}
          </span>
          {/* Online dot */}
          <span className="h-2 w-2 rounded-full bg-green-400 shrink-0" />
        </div>

        <div className="flex items-center gap-0.5">
          <button
            onClick={(e) => { e.stopPropagation(); handlePopout(); }}
            className="p-1 hover:bg-white/10 rounded transition-colors"
            title="Open full conversation"
          >
            <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); toggleMinimize(conversationId); }}
            className="p-1 hover:bg-white/10 rounded transition-colors"
            title={isMinimized ? 'Expand' : 'Minimize'}
          >
            <MinusIcon className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); closeChat(conversationId); }}
            className="p-1 hover:bg-white/10 rounded transition-colors"
            title="Close"
          >
            <XMarkIcon className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
