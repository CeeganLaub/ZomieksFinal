import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { usersApi } from '../lib/api';
import { loadFont } from '../lib/fonts';
import { TEMPLATES, DEFAULT_TEMPLATE } from './biolink/templates/index';
import type { BioLinkSeller, BioLinkTheme, BioLinkService, BioLinkCourse } from './biolink/templates/index';
import BioLinkChatBubble from '../components/biolink/BioLinkChatBubble';
import { Suspense, useEffect, useState, useCallback } from 'react';

export default function BioLinkPage() {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const [chatContext, setChatContext] = useState<{ type: 'service' | 'course'; id: string; title: string } | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['biolink-public', username],
    queryFn: () => usersApi.profile(username!),
    enabled: !!username,
  });

  const seller = data?.data?.user as BioLinkSeller | undefined;
  const sp = seller?.sellerProfile;

  // Load font when seller data arrives
  useEffect(() => {
    if (sp?.bioFont) loadFont(sp.bioFont);
  }, [sp?.bioFont]);

  // Set document title
  useEffect(() => {
    if (sp) {
      document.title = `${sp.displayName} | Zomieks`;
    }
    return () => { document.title = 'Zomieks'; };
  }, [sp]);

  // Track page view
  useEffect(() => {
    if (username && sp?.bioEnabled) {
      usersApi.trackBiolinkEvent({ username, event: 'page_view', metadata: { referrer: document.referrer } }).catch(() => {});
    }
  }, [username, sp?.bioEnabled]);

  // If biolink not enabled or no active sub, redirect to /sellers/:username
  const hasBiolink = sp?.bioEnabled && sp?.subscription?.status === 'ACTIVE';

  useEffect(() => {
    if (!isLoading && seller && !hasBiolink) {
      navigate(`/sellers/${username}`, { replace: true });
    }
  }, [isLoading, seller, hasBiolink, navigate, username]);

  // Template callbacks
  const handleChat = useCallback((ctx?: { type: 'service' | 'course'; id: string; title: string }) => {
    setChatContext(ctx || null);
  }, []);

  const handleServiceClick = useCallback((service: BioLinkService) => {
    navigate(`/services/${username}/${service.slug}`);
  }, [navigate, username]);

  const handleCourseClick = useCallback((course: BioLinkCourse) => {
    navigate(`/courses/${course.slug}`);
  }, [navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-emerald-500" />
      </div>
    );
  }

  if (error || !seller || !sp) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <div className="text-center px-4">
          <h1 className="text-2xl font-bold mb-2">Page not found</h1>
          <p className="opacity-60 mb-4">This BioLink doesn't exist.</p>
          <a href="/explore" className="text-emerald-500 hover:underline">Browse services</a>
        </div>
      </div>
    );
  }

  if (!hasBiolink) return null; // Will redirect

  const theme: BioLinkTheme = {
    backgroundColor: sp.bioBackgroundColor || '#0a0a0a',
    textColor: sp.bioTextColor || '#ffffff',
    themeColor: sp.bioThemeColor || '#10B981',
    buttonStyle: sp.bioButtonStyle || 'rounded',
    font: sp.bioFont || 'Inter',
  };

  const templateId = sp.bioTemplate || DEFAULT_TEMPLATE;
  const entry = TEMPLATES[templateId] || TEMPLATES[DEFAULT_TEMPLATE];
  const TemplateComponent = entry.component;

  return (
    <div
      className="min-h-screen"
      style={{
        backgroundColor: theme.backgroundColor,
        color: theme.textColor,
        fontFamily: `"${theme.font}", system-ui, sans-serif`,
      }}
    >
      <Suspense
        fallback={
          <div className="min-h-screen flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2" style={{ borderColor: theme.themeColor }} />
          </div>
        }
      >
        <TemplateComponent
          seller={seller}
          theme={theme}
          onChat={handleChat}
          onServiceClick={handleServiceClick}
          onCourseClick={handleCourseClick}
        />
      </Suspense>

      <BioLinkChatBubble
        seller={seller}
        theme={theme}
        context={chatContext}
        onClearContext={() => setChatContext(null)}
      />
    </div>
  );
}
