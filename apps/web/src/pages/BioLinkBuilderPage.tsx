import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi, sellerSubscriptionApi } from '../lib/api';
import { useAuthStore } from '../stores/auth.store';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import {
  EyeIcon,
  PaintBrushIcon,
  LinkIcon,
  SparklesIcon,
  ArrowTopRightOnSquareIcon,
  TrashIcon,
  PlusIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { StarIcon, ShieldCheckIcon } from '@heroicons/react/24/solid';

const FONT_OPTIONS = ['Inter', 'Poppins', 'Roboto', 'Playfair Display', 'Space Grotesk', 'DM Sans'];
const BUTTON_STYLES = [
  { value: 'rounded', label: 'Rounded' },
  { value: 'pill', label: 'Pill' },
  { value: 'square', label: 'Square' },
  { value: 'outline', label: 'Outline' },
];

const SOCIAL_PLATFORMS = ['twitter', 'instagram', 'linkedin', 'facebook', 'youtube', 'tiktok', 'website'];

const COLOR_PRESETS = [
  { bg: '#0a0a0a', text: '#ffffff', accent: '#10B981', name: 'Emerald Dark' },
  { bg: '#1a1a2e', text: '#e0e0ff', accent: '#e94560', name: 'Neon Rose' },
  { bg: '#0f0f23', text: '#ccccff', accent: '#ffdd57', name: 'Gold Night' },
  { bg: '#ffffff', text: '#1a1a1a', accent: '#2563eb', name: 'Clean Blue' },
  { bg: '#faf5ff', text: '#3b0764', accent: '#a855f7', name: 'Purple Light' },
  { bg: '#0c4a6e', text: '#f0f9ff', accent: '#38bdf8', name: 'Ocean' },
];

interface SocialLink {
  platform: string;
  url: string;
}

export default function BioLinkBuilderPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [activeSection, setActiveSection] = useState<'design' | 'social' | 'preview'>('design');

  // Check subscription
  const { data: subData, isLoading: subLoading } = useQuery({
    queryKey: ['seller-subscription-status'],
    queryFn: () => sellerSubscriptionApi.status(),
  });

  // Get current biolink settings
  const { data: biolinkData, isLoading: biolinkLoading } = useQuery({
    queryKey: ['biolink-settings'],
    queryFn: () => usersApi.getBiolink(),
  });

  const subscription = subData?.data?.subscription;
  const isSubscribed = subscription?.status === 'ACTIVE';

  // Form state
  const [bioHeadline, setBioHeadline] = useState('');
  const [bioThemeColor, setBioThemeColor] = useState('#10B981');
  const [bioBackgroundColor, setBioBackgroundColor] = useState('#0a0a0a');
  const [bioTextColor, setBioTextColor] = useState('#ffffff');
  const [bioButtonStyle, setBioButtonStyle] = useState('rounded');
  const [bioFont, setBioFont] = useState('Inter');
  const [bioCtaText, setBioCtaText] = useState('Get in Touch');
  const [bioEnabled, setBioEnabled] = useState(false);
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);

  // Load data into form
  useEffect(() => {
    if (biolinkData?.data?.biolink) {
      const b = biolinkData.data.biolink;
      setBioHeadline(b.bioHeadline || '');
      setBioThemeColor(b.bioThemeColor || '#10B981');
      setBioBackgroundColor(b.bioBackgroundColor || '#0a0a0a');
      setBioTextColor(b.bioTextColor || '#ffffff');
      setBioButtonStyle(b.bioButtonStyle || 'rounded');
      setBioFont(b.bioFont || 'Inter');
      setBioCtaText(b.bioCtaText || 'Get in Touch');
      setBioEnabled(b.bioEnabled || false);
      setSocialLinks(b.bioSocialLinks || []);
    }
  }, [biolinkData]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: () =>
      usersApi.updateBiolink({
        bioHeadline,
        bioThemeColor,
        bioBackgroundColor,
        bioTextColor,
        bioButtonStyle,
        bioFont,
        bioCtaText,
        bioEnabled,
        bioSocialLinks: socialLinks.filter(l => l.url.trim()),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['biolink-settings'] });
    },
  });

  // Toggle mutation
  const toggleMutation = useMutation({
    mutationFn: () => usersApi.toggleBiolink(),
    onSuccess: (res) => {
      setBioEnabled(res.data?.bioEnabled ?? !bioEnabled);
      queryClient.invalidateQueries({ queryKey: ['biolink-settings'] });
    },
  });

  // Subscribe mutation
  const subscribeMutation = useMutation({
    mutationFn: () => sellerSubscriptionApi.subscribe(),
    onSuccess: (res) => {
      if (res.data?.paymentUrl) {
        window.location.href = res.data.paymentUrl;
      }
    },
  });

  const addSocialLink = () => {
    setSocialLinks([...socialLinks, { platform: 'website', url: '' }]);
  };

  const removeSocialLink = (index: number) => {
    setSocialLinks(socialLinks.filter((_, i) => i !== index));
  };

  const updateSocialLink = (index: number, field: keyof SocialLink, value: string) => {
    const updated = [...socialLinks];
    updated[index] = { ...updated[index], [field]: value };
    setSocialLinks(updated);
  };

  if (subLoading || biolinkLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
      </div>
    );
  }

  // Not subscribed — show upgrade prompt
  if (!isSubscribed) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4">
        <div className="text-center">
          <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mb-6">
            <SparklesIcon className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold mb-3">Zomieks Pro</h1>
          <p className="text-muted-foreground text-lg mb-8">
            Unlock your BioLink, sell services & courses, and grow your business.
          </p>

          <div className="bg-card border rounded-2xl p-8 mb-8 text-left">
            <div className="flex items-baseline justify-between mb-6">
              <div>
                <span className="text-4xl font-bold">R399</span>
                <span className="text-muted-foreground">/month</span>
              </div>
              <span className="text-xs bg-emerald-500/10 text-emerald-500 px-3 py-1 rounded-full font-medium">
                Pro Plan
              </span>
            </div>
            <ul className="space-y-3 text-sm">
              {[
                'Custom BioLink page (like Linktree for your services)',
                'Sell unlimited services',
                'Create & sell courses (Udemy-style)',
                'Full theme customisation (colors, fonts, buttons)',
                'Social links integration',
                'Direct messaging from your page',
                'Priority in search results',
                'Verified seller badge eligibility',
              ].map((feature, i) => (
                <li key={i} className="flex items-start gap-2">
                  <ShieldCheckIcon className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>

          <Button
            size="lg"
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white"
            onClick={() => subscribeMutation.mutate()}
            isLoading={subscribeMutation.isPending}
          >
            Subscribe to Zomieks Pro — R399/month
          </Button>

          {subscription?.status === 'CANCELLED' && (
            <p className="mt-3 text-sm text-amber-500 flex items-center justify-center gap-1">
              <ExclamationTriangleIcon className="w-4 h-4" />
              Your subscription was cancelled. Subscribe again to re-enable.
            </p>
          )}
        </div>
      </div>
    );
  }

  // ========== BUILDER ==========
  const biolinkUrl = `${window.location.origin}/sellers/${user?.username}`;

  return (
    <div className="max-w-5xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">BioLink Builder</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Customise your public storefront at{' '}
            <a
              href={biolinkUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-500 hover:underline"
            >
              /sellers/{user?.username}
            </a>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => toggleMutation.mutate()}
            isLoading={toggleMutation.isPending}
          >
            {bioEnabled ? 'Disable' : 'Enable'} BioLink
          </Button>
          <a href={biolinkUrl} target="_blank" rel="noopener noreferrer">
            <Button variant="ghost" size="sm">
              <ArrowTopRightOnSquareIcon className="w-4 h-4 mr-1" /> View
            </Button>
          </a>
          <Button
            size="sm"
            className="bg-emerald-500 hover:bg-emerald-600 text-white"
            onClick={() => saveMutation.mutate()}
            isLoading={saveMutation.isPending}
          >
            {saveMutation.isSuccess ? 'Saved!' : 'Save Changes'}
          </Button>
        </div>
      </div>

      {/* Status bar */}
      <div
        className={`mb-6 px-4 py-2 rounded-lg text-sm flex items-center gap-2 ${
          bioEnabled ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'
        }`}
      >
        <div className={`w-2 h-2 rounded-full ${bioEnabled ? 'bg-emerald-500' : 'bg-amber-500'}`} />
        {bioEnabled ? 'Your BioLink is live and visible to everyone' : 'Your BioLink is currently hidden'}
      </div>

      {/* Section tabs */}
      <div className="flex gap-1 mb-6 bg-muted rounded-lg p-1">
        {[
          { key: 'design', icon: PaintBrushIcon, label: 'Design' },
          { key: 'social', icon: LinkIcon, label: 'Social Links' },
          { key: 'preview', icon: EyeIcon, label: 'Preview' },
        ].map(({ key, icon: Icon, label }) => (
          <button
            key={key}
            onClick={() => setActiveSection(key as any)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-md text-sm font-medium transition-colors ${
              activeSection === key
                ? 'bg-background shadow text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Design Section */}
      {activeSection === 'design' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Content */}
          <div className="space-y-6">
            <div className="bg-card border rounded-xl p-6 space-y-4">
              <h3 className="font-semibold">Content</h3>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Headline</label>
                <Input
                  value={bioHeadline}
                  onChange={(e) => setBioHeadline(e.target.value)}
                  placeholder="E.g., Full-stack developer passionate about building great products"
                  maxLength={200}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">CTA Button Text</label>
                <Input
                  value={bioCtaText}
                  onChange={(e) => setBioCtaText(e.target.value)}
                  placeholder="Get in Touch"
                  maxLength={30}
                />
              </div>
            </div>

            {/* Theme presets */}
            <div className="bg-card border rounded-xl p-6 space-y-4">
              <h3 className="font-semibold">Theme Presets</h3>
              <div className="grid grid-cols-3 gap-2">
                {COLOR_PRESETS.map((preset) => (
                  <button
                    key={preset.name}
                    onClick={() => {
                      setBioBackgroundColor(preset.bg);
                      setBioTextColor(preset.text);
                      setBioThemeColor(preset.accent);
                    }}
                    className="p-3 rounded-lg border text-xs text-center hover:ring-2 ring-emerald-500 transition-all"
                    style={{
                      backgroundColor: preset.bg,
                      color: preset.text,
                      borderColor: preset.accent,
                    }}
                  >
                    <div className="w-4 h-4 rounded-full mx-auto mb-1" style={{ backgroundColor: preset.accent }} />
                    {preset.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom colours */}
            <div className="bg-card border rounded-xl p-6 space-y-4">
              <h3 className="font-semibold">Custom Colours</h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-medium mb-1 block">Background</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={bioBackgroundColor}
                      onChange={(e) => setBioBackgroundColor(e.target.value)}
                      className="w-8 h-8 rounded border cursor-pointer"
                    />
                    <Input
                      value={bioBackgroundColor}
                      onChange={(e) => setBioBackgroundColor(e.target.value)}
                      className="text-xs h-8"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block">Text</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={bioTextColor}
                      onChange={(e) => setBioTextColor(e.target.value)}
                      className="w-8 h-8 rounded border cursor-pointer"
                    />
                    <Input
                      value={bioTextColor}
                      onChange={(e) => setBioTextColor(e.target.value)}
                      className="text-xs h-8"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block">Accent</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={bioThemeColor}
                      onChange={(e) => setBioThemeColor(e.target.value)}
                      className="w-8 h-8 rounded border cursor-pointer"
                    />
                    <Input
                      value={bioThemeColor}
                      onChange={(e) => setBioThemeColor(e.target.value)}
                      className="text-xs h-8"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Typography + Button Style */}
          <div className="space-y-6">
            <div className="bg-card border rounded-xl p-6 space-y-4">
              <h3 className="font-semibold">Typography</h3>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Font</label>
                <select
                  value={bioFont}
                  onChange={(e) => setBioFont(e.target.value)}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                >
                  {FONT_OPTIONS.map((font) => (
                    <option key={font} value={font} style={{ fontFamily: font }}>
                      {font}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="bg-card border rounded-xl p-6 space-y-4">
              <h3 className="font-semibold">Button Style</h3>
              <div className="grid grid-cols-2 gap-2">
                {BUTTON_STYLES.map((style) => (
                  <button
                    key={style.value}
                    onClick={() => setBioButtonStyle(style.value)}
                    className={`p-3 border rounded-lg text-sm text-center transition-colors ${
                      bioButtonStyle === style.value
                        ? 'border-emerald-500 bg-emerald-500/10 text-emerald-500'
                        : 'hover:border-muted-foreground'
                    }`}
                  >
                    {style.label}
                    <div
                      className="mt-2 h-8 flex items-center justify-center text-xs text-white"
                      style={{
                        backgroundColor: style.value === 'outline' ? 'transparent' : bioThemeColor,
                        color: style.value === 'outline' ? bioThemeColor : '#fff',
                        border: style.value === 'outline' ? `2px solid ${bioThemeColor}` : 'none',
                        borderRadius:
                          style.value === 'pill' ? '9999px' :
                          style.value === 'square' ? '0' :
                          style.value === 'outline' ? '8px' : '8px',
                      }}
                    >
                      {bioCtaText || 'Button'}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Live mini preview */}
            <div className="bg-card border rounded-xl p-6">
              <h3 className="font-semibold mb-3">Mini Preview</h3>
              <div
                className="rounded-xl p-6 text-center"
                style={{
                  backgroundColor: bioBackgroundColor,
                  color: bioTextColor,
                  fontFamily: bioFont,
                }}
              >
                <div
                  className="w-12 h-12 rounded-full mx-auto border-2 flex items-center justify-center text-sm font-bold"
                  style={{ borderColor: bioThemeColor, color: bioThemeColor }}
                >
                  {user?.firstName?.[0]}{user?.lastName?.[0]}
                </div>
                <p className="font-bold mt-2 text-sm">{user?.firstName} {user?.lastName}</p>
                <p className="text-xs opacity-60 mt-1 truncate">
                  {bioHeadline || 'Your headline here...'}
                </p>
                <button
                  className="mt-3 px-4 py-2 text-xs font-medium w-full"
                  style={{
                    backgroundColor: bioButtonStyle === 'outline' ? 'transparent' : bioThemeColor,
                    color: bioButtonStyle === 'outline' ? bioThemeColor : '#fff',
                    border: bioButtonStyle === 'outline' ? `2px solid ${bioThemeColor}` : 'none',
                    borderRadius:
                      bioButtonStyle === 'pill' ? '9999px' :
                      bioButtonStyle === 'square' ? '0' : '8px',
                  }}
                >
                  {bioCtaText || 'Get in Touch'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Social Links Section */}
      {activeSection === 'social' && (
        <div className="max-w-2xl space-y-4">
          <div className="bg-card border rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Social Links</h3>
              <Button variant="outline" size="sm" onClick={addSocialLink}>
                <PlusIcon className="w-4 h-4 mr-1" /> Add Link
              </Button>
            </div>

            {socialLinks.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">
                No social links added yet. Add your social media profiles to display on your BioLink.
              </p>
            )}

            <div className="space-y-3">
              {socialLinks.map((link, index) => (
                <div key={index} className="flex items-center gap-3">
                  <select
                    value={link.platform}
                    onChange={(e) => updateSocialLink(index, 'platform', e.target.value)}
                    className="rounded-md border bg-background px-3 py-2 text-sm w-32"
                  >
                    {SOCIAL_PLATFORMS.map((p) => (
                      <option key={p} value={p}>
                        {p.charAt(0).toUpperCase() + p.slice(1)}
                      </option>
                    ))}
                  </select>
                  <Input
                    value={link.url}
                    onChange={(e) => updateSocialLink(index, 'url', e.target.value)}
                    placeholder="https://..."
                    className="flex-1"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeSocialLink(index)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <Button
            className="bg-emerald-500 hover:bg-emerald-600 text-white"
            onClick={() => saveMutation.mutate()}
            isLoading={saveMutation.isPending}
          >
            {saveMutation.isSuccess ? 'Saved!' : 'Save Social Links'}
          </Button>
        </div>
      )}

      {/* Preview Section */}
      {activeSection === 'preview' && (
        <div className="flex justify-center">
          <div className="w-full max-w-[400px]">
            <div className="border rounded-2xl overflow-hidden shadow-2xl">
              {/* Phone-style preview */}
              <div
                className="p-6 text-center min-h-[600px]"
                style={{
                  backgroundColor: bioBackgroundColor,
                  color: bioTextColor,
                  fontFamily: bioFont,
                }}
              >
                <div
                  className="w-20 h-20 rounded-full mx-auto border-4 flex items-center justify-center text-xl font-bold overflow-hidden"
                  style={{ borderColor: bioThemeColor, backgroundColor: bioBackgroundColor }}
                >
                  {user?.avatar ? (
                    <img src={user.avatar} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span style={{ color: bioThemeColor }}>
                      {user?.firstName?.[0]}{user?.lastName?.[0]}
                    </span>
                  )}
                </div>

                <h2 className="text-xl font-bold mt-4">
                  {biolinkData?.data?.biolink?.displayName || `${user?.firstName} ${user?.lastName}`}
                </h2>
                <p className="text-sm opacity-70 mt-1">
                  {biolinkData?.data?.biolink?.professionalTitle || 'Professional Title'}
                </p>

                {bioHeadline && (
                  <p className="mt-2 text-sm opacity-80">{bioHeadline}</p>
                )}

                <div className="flex items-center justify-center gap-3 mt-3 text-sm opacity-60">
                  <span className="flex items-center gap-1" style={{ color: bioThemeColor }}>
                    <ShieldCheckIcon className="w-4 h-4" /> Verified
                  </span>
                  <span className="flex items-center gap-1">
                    <StarIcon className="w-4 h-4" style={{ color: '#FBBF24' }} />
                    5.0 (12 reviews)
                  </span>
                </div>

                {/* Social icons */}
                {socialLinks.filter(l => l.url).length > 0 && (
                  <div className="flex items-center justify-center gap-2 mt-4">
                    {socialLinks.filter(l => l.url).map((link, i) => (
                      <div
                        key={i}
                        className="w-9 h-9 rounded-full flex items-center justify-center text-xs"
                        style={{ backgroundColor: `${bioThemeColor}20`, color: bioThemeColor }}
                      >
                        {link.platform[0].toUpperCase()}
                      </div>
                    ))}
                  </div>
                )}

                {/* CTA */}
                <button
                  className="w-full mt-6 py-3 px-6 font-medium text-sm"
                  style={{
                    backgroundColor: bioButtonStyle === 'outline' ? 'transparent' : bioThemeColor,
                    color: bioButtonStyle === 'outline' ? bioThemeColor : '#fff',
                    border: bioButtonStyle === 'outline' ? `2px solid ${bioThemeColor}` : 'none',
                    borderRadius:
                      bioButtonStyle === 'pill' ? '9999px' :
                      bioButtonStyle === 'square' ? '0' : '8px',
                  }}
                >
                  {bioCtaText || 'Get in Touch'}
                </button>

                {/* Sample items */}
                <div className="mt-6 space-y-2">
                  {['Web Development Service', 'UI/UX Design Course'].map((item, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 p-3 rounded-xl text-left"
                      style={{ backgroundColor: `${bioTextColor}08`, border: `1px solid ${bioTextColor}15` }}
                    >
                      <div
                        className="w-12 h-12 rounded-lg flex-shrink-0"
                        style={{ backgroundColor: `${bioThemeColor}20` }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item}</p>
                        <p className="text-xs opacity-50">From R500</p>
                      </div>
                    </div>
                  ))}
                </div>

                <p className="mt-8 text-xs opacity-20">
                  Powered by Zomieks
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
