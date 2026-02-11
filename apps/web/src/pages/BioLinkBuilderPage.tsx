import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi, sellerSubscriptionApi, api, coursesApi } from '../lib/api';
import { useAuthStore } from '../stores/auth.store';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { motion, AnimatePresence } from 'framer-motion';
import {
  EyeIcon,
  PaintBrushIcon,
  SparklesIcon,
  ArrowTopRightOnSquareIcon,
  TrashIcon,
  PlusIcon,
  ExclamationTriangleIcon,
  CubeIcon,
  AcademicCapIcon,
  ClipboardDocumentIcon,
  ChatBubbleLeftRightIcon,
  Squares2X2Icon,
  ShoppingBagIcon,
  QuestionMarkCircleIcon,
} from '@heroicons/react/24/outline';
import { ShieldCheckIcon, CheckIcon } from '@heroicons/react/24/solid';
import { toast } from 'sonner';
import { BIOLINK_FONTS, loadAllFonts } from '../lib/fonts';
import { TEMPLATES, TEMPLATE_IDS, DEFAULT_TEMPLATE } from './biolink/templates/index';

const BUTTON_STYLES = [
  { value: 'rounded', label: 'Rounded' },
  { value: 'pill', label: 'Pill' },
  { value: 'square', label: 'Square' },
  { value: 'outline', label: 'Outline' },
];

const COLOR_PRESETS = [
  { bg: '#0a0a0a', text: '#ffffff', accent: '#10B981', name: 'Emerald Dark' },
  { bg: '#1a1a2e', text: '#e0e0ff', accent: '#e94560', name: 'Neon Rose' },
  { bg: '#0f0f23', text: '#ccccff', accent: '#ffdd57', name: 'Gold Night' },
  { bg: '#ffffff', text: '#1a1a1a', accent: '#2563eb', name: 'Clean Blue' },
  { bg: '#faf5ff', text: '#3b0764', accent: '#a855f7', name: 'Purple Light' },
  { bg: '#0c4a6e', text: '#f0f9ff', accent: '#38bdf8', name: 'Ocean' },
  { bg: '#18181b', text: '#fafafa', accent: '#f97316', name: 'Midnight' },
  { bg: '#fef2f2', text: '#7f1d1d', accent: '#ef4444', name: 'Rose Blush' },
  { bg: '#022c22', text: '#d1fae5', accent: '#34d399', name: 'Forest' },
  { bg: '#1e1b4b', text: '#e0e7ff', accent: '#818cf8', name: 'Indigo Night' },
  { bg: '#fffbeb', text: '#78350f', accent: '#f59e0b', name: 'Amber Light' },
  { bg: '#0f172a', text: '#e2e8f0', accent: '#06b6d4', name: 'Cyan Dark' },
  { bg: '#fdf2f8', text: '#831843', accent: '#ec4899', name: 'Pink Blush' },
  { bg: '#14532d', text: '#bbf7d0', accent: '#4ade80', name: 'Lime Forest' },
  { bg: '#27272a', text: '#fafafa', accent: '#fbbf24', name: 'Gold Zinc' },
];

interface FeaturedItem {
  type: 'service' | 'course';
  id: string;
  order: number;
}

type TabKey = 'template' | 'design' | 'featured' | 'chat' | 'products' | 'preview';

export default function BioLinkBuilderPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [activeSection, setActiveSection] = useState<TabKey>('template');

  // Load all fonts for the dropdown previews
  useEffect(() => { loadAllFonts(); }, []);

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

  // Get seller's services for featured items selection
  const { data: sellerServicesData } = useQuery({
    queryKey: ['seller-services-list'],
    queryFn: () => api.get<any>('/services/seller/mine'),
    select: (res) => res.data,
  });

  // Get seller's courses for featured items selection
  const { data: sellerCoursesData } = useQuery({
    queryKey: ['seller-courses'],
    queryFn: () => coursesApi.sellerCourses(),
  });

  // Get FAQ entries
  const { data: faqData } = useQuery({
    queryKey: ['seller-faq'],
    queryFn: () => usersApi.getFaq(),
  });

  // Get digital products
  const { data: productsData } = useQuery({
    queryKey: ['seller-products'],
    queryFn: () => usersApi.getProducts(),
  });

  const subscription = subData?.data?.subscription;
  const isSubscribed = subscription?.status === 'ACTIVE';

  const sellerServices = sellerServicesData || [];
  const sellerCourses = sellerCoursesData?.data || [];

  // Form state
  const [bioHeadline, setBioHeadline] = useState('');
  const [bioThemeColor, setBioThemeColor] = useState('#10B981');
  const [bioBackgroundColor, setBioBackgroundColor] = useState('#0a0a0a');
  const [bioTextColor, setBioTextColor] = useState('#ffffff');
  const [bioButtonStyle, setBioButtonStyle] = useState('rounded');
  const [bioFont, setBioFont] = useState('Inter');
  const [bioCtaText, setBioCtaText] = useState('Get in Touch');
  const [bioEnabled, setBioEnabled] = useState(false);
  const [bioTemplate, setBioTemplate] = useState(DEFAULT_TEMPLATE);
  const [bioQuickReplies, setBioQuickReplies] = useState<string[]>([]);
  const [featuredItems, setFeaturedItems] = useState<FeaturedItem[]>([]);
  const [newChip, setNewChip] = useState('');
  const [linkCopied, setLinkCopied] = useState(false);

  // Availability state
  const [isAvailable, setIsAvailable] = useState(true);
  const [vacationMode, setVacationMode] = useState(false);
  const [maxActiveOrders, setMaxActiveOrders] = useState(5);

  // Testimonials state
  const [bioShowTestimonials, setBioShowTestimonials] = useState(true);
  const [bioTestimonialCount, setBioTestimonialCount] = useState(6);

  // FAQ state
  const [faqEntries, setFaqEntries] = useState<{ id?: string; question: string; answer: string; keywords: string[] }[]>([]);
  const [newFaq, setNewFaq] = useState({ question: '', answer: '', keywords: '' });
  const [editingFaqIdx, setEditingFaqIdx] = useState<number | null>(null);

  // Product state
  const [products, setProducts] = useState<any[]>([]);
  const [newProduct, setNewProduct] = useState({ title: '', description: '', price: '', fileUrl: '', fileName: '', fileSize: 0 });
  const [editingProductIdx, setEditingProductIdx] = useState<number | null>(null);

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
      setBioTemplate(b.bioTemplate || DEFAULT_TEMPLATE);
      setBioQuickReplies(b.bioQuickReplies || []);
      setFeaturedItems(b.bioFeaturedItems || []);
      setIsAvailable(b.isAvailable ?? true);
      setVacationMode(b.vacationMode ?? false);
      setMaxActiveOrders(b.maxActiveOrders ?? 5);
      setBioShowTestimonials(b.bioShowTestimonials ?? true);
      setBioTestimonialCount(b.bioTestimonialCount ?? 6);
    }
  }, [biolinkData]);

  // Load FAQ entries
  useEffect(() => {
    const faq = faqData?.data?.faq ?? faqData?.data;
    if (Array.isArray(faq)) setFaqEntries(faq);
  }, [faqData]);

  // Load products
  useEffect(() => {
    const prods = productsData?.data?.products ?? productsData?.data;
    if (Array.isArray(prods)) setProducts(prods);
  }, [productsData]);

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
        bioTemplate,
        bioQuickReplies,
        bioFeaturedItems: featuredItems,
        bioShowTestimonials,
        bioTestimonialCount,
        maxActiveOrders,
        isAvailable,
        vacationMode,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['biolink-settings'] });
      toast.success('BioLink saved!');
    },
    onError: () => toast.error('Failed to save'),
  });

  // Toggle mutation
  const toggleMutation = useMutation({
    mutationFn: () => usersApi.toggleBiolink(),
    onSuccess: (res) => {
      setBioEnabled(res.data?.bioEnabled ?? !bioEnabled);
      queryClient.invalidateQueries({ queryKey: ['biolink-settings'] });
      toast.success(res.data?.bioEnabled ? 'BioLink enabled' : 'BioLink disabled');
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

  // FAQ mutations
  const faqCreateMutation = useMutation({
    mutationFn: (data: { question: string; answer: string; keywords: string[] }) => usersApi.createFaq(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['seller-faq'] }); toast.success('FAQ added'); },
  });
  const faqUpdateMutation = useMutation({
    mutationFn: ({ id, ...data }: { id: string; question: string; answer: string; keywords: string[] }) => usersApi.updateFaq(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['seller-faq'] }); toast.success('FAQ updated'); },
  });
  const faqDeleteMutation = useMutation({
    mutationFn: (id: string) => usersApi.deleteFaq(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['seller-faq'] }); toast.success('FAQ deleted'); },
  });

  // Product mutations
  const productCreateMutation = useMutation({
    mutationFn: (data: any) => usersApi.createProduct(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['seller-products'] }); toast.success('Product added'); },
  });
  const productUpdateMutation = useMutation({
    mutationFn: ({ id, ...data }: any) => usersApi.updateProduct(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['seller-products'] }); toast.success('Product updated'); },
  });
  const productDeleteMutation = useMutation({
    mutationFn: (id: string) => usersApi.deleteProduct(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['seller-products'] }); toast.success('Product deleted'); },
  });

  const addQuickReply = () => {
    const text = newChip.trim();
    if (!text || bioQuickReplies.includes(text)) return;
    setBioQuickReplies([...bioQuickReplies, text]);
    setNewChip('');
  };

  const removeQuickReply = (index: number) => {
    setBioQuickReplies(bioQuickReplies.filter((_, i) => i !== index));
  };

  const toggleFeaturedItem = (type: 'service' | 'course', id: string) => {
    const exists = featuredItems.find(item => item.type === type && item.id === id);
    if (exists) {
      setFeaturedItems(featuredItems.filter(item => !(item.type === type && item.id === id)));
    } else {
      setFeaturedItems([...featuredItems, { type, id, order: featuredItems.length }]);
    }
  };

  const isFeatured = (type: 'service' | 'course', id: string) =>
    featuredItems.some(item => item.type === type && item.id === id);

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
  const biolinkUrl = `${window.location.origin}/${user?.username}`;

  const copyLink = () => {
    navigator.clipboard.writeText(biolinkUrl).then(() => {
      setLinkCopied(true);
      toast.success('Link copied!');
      setTimeout(() => setLinkCopied(false), 2000);
    });
  };

  const tabs: { key: TabKey; icon: typeof PaintBrushIcon; label: string }[] = [
    { key: 'template', icon: Squares2X2Icon, label: 'Template' },
    { key: 'design', icon: PaintBrushIcon, label: 'Design' },
    { key: 'featured', icon: CubeIcon, label: 'Featured' },
    { key: 'chat', icon: ChatBubbleLeftRightIcon, label: 'Chat' },
    { key: 'products', icon: ShoppingBagIcon, label: 'Products' },
    { key: 'preview', icon: EyeIcon, label: 'Preview' },
  ];

  return (
    <div className="max-w-5xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
        <div>
          <h1 className="text-2xl font-bold">BioLink Builder</h1>
          <p className="text-muted-foreground text-sm mt-1">Your standalone storefront page</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => toggleMutation.mutate()}
            isLoading={toggleMutation.isPending}
          >
            {bioEnabled ? 'Disable' : 'Enable'}
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
            Save Changes
          </Button>
        </div>
      </div>

      {/* Share link bar */}
      <div className="mb-4 flex items-center gap-2 bg-muted rounded-xl px-4 py-2.5">
        <span className="text-sm text-muted-foreground truncate flex-1 font-mono">{biolinkUrl}</span>
        <Button variant="outline" size="sm" onClick={copyLink} className="flex-shrink-0">
          {linkCopied ? <CheckIcon className="w-4 h-4 mr-1 text-emerald-500" /> : <ClipboardDocumentIcon className="w-4 h-4 mr-1" />}
          {linkCopied ? 'Copied' : 'Copy'}
        </Button>
      </div>

      {/* Status bar */}
      <div
        className={`mb-6 px-4 py-2.5 rounded-xl text-sm flex items-center gap-2 font-medium ${
          bioEnabled ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'
        }`}
      >
        <div className={`w-2.5 h-2.5 rounded-full animate-pulse ${bioEnabled ? 'bg-emerald-500' : 'bg-amber-500'}`} />
        {bioEnabled ? 'Your BioLink is live and visible to everyone' : 'Your BioLink is currently hidden'}
      </div>

      {/* Section tabs */}
      <div className="flex gap-1 mb-6 bg-muted rounded-xl p-1 overflow-x-auto">
        {tabs.map(({ key, icon: Icon, label }) => (
          <button
            key={key}
            onClick={() => setActiveSection(key)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
              activeSection === key
                ? 'bg-background shadow-sm text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Icon className="w-4 h-4" />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* Template Section */}
        {activeSection === 'template' && (
          <motion.div key="template" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
            <div className="max-w-3xl space-y-6">
              <div className="bg-card border rounded-xl p-6">
                <h3 className="font-semibold flex items-center gap-2 mb-1">
                  <Squares2X2Icon className="w-4 h-4 text-primary" /> Choose a Template
                </h3>
                <p className="text-sm text-muted-foreground mb-6">
                  Pick a layout that best matches your brand. You can switch anytime.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {TEMPLATE_IDS.map((tid) => {
                    const t = TEMPLATES[tid];
                    const isActive = bioTemplate === tid;
                    return (
                      <button
                        key={tid}
                        onClick={() => setBioTemplate(tid)}
                        className={`text-left p-4 rounded-xl border-2 transition-all ${
                          isActive
                            ? 'border-emerald-500 bg-emerald-500/5 ring-2 ring-emerald-500/20'
                            : 'border-border hover:border-muted-foreground/30'
                        }`}
                      >
                        <div className="text-3xl mb-2">{t.icon}</div>
                        <h4 className="font-semibold text-sm">{t.name}</h4>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{t.description}</p>
                        {isActive && (
                          <span className="inline-flex items-center gap-1 mt-2 text-xs text-emerald-500 font-medium">
                            <CheckIcon className="w-3.5 h-3.5" /> Active
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Design Section */}
        {activeSection === 'design' && (
          <motion.div key="design" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-6">
                <div className="bg-card border rounded-xl p-6 space-y-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <SparklesIcon className="w-4 h-4 text-primary" /> Content
                  </h3>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Headline</label>
                    <Input
                      value={bioHeadline}
                      onChange={(e) => setBioHeadline(e.target.value)}
                      placeholder="E.g., Full-stack developer passionate about building great products"
                      maxLength={200}
                    />
                    <p className="text-xs text-muted-foreground mt-1">{bioHeadline.length}/200</p>
                  </div>
                </div>

                {/* Theme presets */}
                <div className="bg-card border rounded-xl p-6 space-y-4">
                  <h3 className="font-semibold">Theme Presets</h3>
                  <div className="grid grid-cols-3 gap-2">
                    {COLOR_PRESETS.map((preset) => {
                      const isActive = bioBackgroundColor === preset.bg && bioTextColor === preset.text && bioThemeColor === preset.accent;
                      return (
                        <button
                          key={preset.name}
                          onClick={() => {
                            setBioBackgroundColor(preset.bg);
                            setBioTextColor(preset.text);
                            setBioThemeColor(preset.accent);
                          }}
                          className={`p-3 rounded-lg border text-xs text-center transition-all ${isActive ? 'ring-2 ring-emerald-500 ring-offset-2 ring-offset-background' : 'hover:ring-1 ring-muted-foreground/30'}`}
                          style={{
                            backgroundColor: preset.bg,
                            color: preset.text,
                            borderColor: preset.accent,
                          }}
                        >
                          <div className="w-4 h-4 rounded-full mx-auto mb-1" style={{ backgroundColor: preset.accent }} />
                          {preset.name}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Custom colours */}
                <div className="bg-card border rounded-xl p-6 space-y-4">
                  <h3 className="font-semibold">Custom Colours</h3>
                  <div className="grid grid-cols-3 gap-4">
                    {[
                      { label: 'Background', value: bioBackgroundColor, setter: setBioBackgroundColor },
                      { label: 'Text', value: bioTextColor, setter: setBioTextColor },
                      { label: 'Accent', value: bioThemeColor, setter: setBioThemeColor },
                    ].map(({ label, value, setter }) => (
                      <div key={label}>
                        <label className="text-xs font-medium mb-1 block">{label}</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={value}
                            onChange={(e) => setter(e.target.value)}
                            className="w-8 h-8 rounded border cursor-pointer"
                          />
                          <Input value={value} onChange={(e) => setter(e.target.value)} className="text-xs h-8" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-card border rounded-xl p-6 space-y-4">
                  <h3 className="font-semibold">Typography</h3>
                  <select
                    value={bioFont}
                    onChange={(e) => setBioFont(e.target.value)}
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  >
                    {BIOLINK_FONTS.map((font) => (
                      <option key={font} value={font} style={{ fontFamily: font }}>{font}</option>
                    ))}
                  </select>
                </div>

                <div className="bg-card border rounded-xl p-6 space-y-4">
                  <h3 className="font-semibold">Button Style</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {BUTTON_STYLES.map((style) => (
                      <button
                        key={style.value}
                        onClick={() => setBioButtonStyle(style.value)}
                        className={`p-3 border rounded-lg text-sm text-center transition-all ${
                          bioButtonStyle === style.value ? 'border-emerald-500 bg-emerald-500/10 text-emerald-500' : 'hover:border-muted-foreground'
                        }`}
                      >
                        {style.label}
                        <div
                          className="mt-2 h-8 flex items-center justify-center text-xs"
                          style={{
                            backgroundColor: style.value === 'outline' ? 'transparent' : bioThemeColor,
                            color: style.value === 'outline' ? bioThemeColor : '#fff',
                            border: style.value === 'outline' ? `2px solid ${bioThemeColor}` : 'none',
                            borderRadius: style.value === 'pill' ? '9999px' : style.value === 'square' ? '0' : '8px',
                          }}
                        >
                          {bioCtaText || 'Button'}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Mini preview */}
                <div className="bg-card border rounded-xl p-6">
                  <h3 className="font-semibold mb-3">Mini Preview</h3>
                  <div className="rounded-xl p-6 text-center" style={{ backgroundColor: bioBackgroundColor, color: bioTextColor, fontFamily: bioFont }}>
                    <div className="w-12 h-12 rounded-full mx-auto border-2 flex items-center justify-center text-sm font-bold" style={{ borderColor: bioThemeColor, color: bioThemeColor }}>
                      {user?.firstName?.[0]}{user?.lastName?.[0]}
                    </div>
                    <p className="font-bold mt-2 text-sm">{user?.firstName} {user?.lastName}</p>
                    <p className="text-xs opacity-60 mt-1 truncate">{bioHeadline || 'Your headline here...'}</p>
                    <div className="mt-3 w-full py-2 text-xs font-medium" style={{
                      backgroundColor: bioButtonStyle === 'outline' ? 'transparent' : bioThemeColor,
                      color: bioButtonStyle === 'outline' ? bioThemeColor : '#fff',
                      border: bioButtonStyle === 'outline' ? `2px solid ${bioThemeColor}` : 'none',
                      borderRadius: bioButtonStyle === 'pill' ? '9999px' : bioButtonStyle === 'square' ? '0' : '8px',
                    }}>
                      {bioCtaText || 'Get in Touch'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Featured Items Section */}
        {activeSection === 'featured' && (
          <motion.div key="featured" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
            <div className="max-w-3xl space-y-6">
              <div className="bg-card border rounded-xl p-6">
                <h3 className="font-semibold flex items-center gap-2 mb-1">
                  <CubeIcon className="w-4 h-4 text-primary" /> Featured Items
                </h3>
                <p className="text-sm text-muted-foreground mb-6">
                  Select which services and courses to highlight on your BioLink. Featured items appear prominently with a detail modal visitors can expand.
                </p>

                {/* Services */}
                <div className="mb-8">
                  <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                    <CubeIcon className="w-3.5 h-3.5" /> Services ({sellerServices.length})
                  </h4>
                  {sellerServices.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center bg-muted/30 rounded-lg">
                      No services yet. Create a service to feature it here.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {sellerServices.map((svc: any) => {
                        const featured = isFeatured('service', svc.id);
                        return (
                          <button
                            key={svc.id}
                            onClick={() => toggleFeaturedItem('service', svc.id)}
                            className={`w-full flex items-center gap-4 p-3 rounded-xl border transition-all text-left ${
                              featured ? 'border-emerald-500 bg-emerald-500/5' : 'border-border hover:border-muted-foreground/30'
                            }`}
                          >
                            <div className="w-14 h-14 rounded-lg bg-muted overflow-hidden flex-shrink-0">
                              {svc.images?.[0] && <img src={svc.images[0]} alt="" className="w-full h-full object-cover" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">{svc.title}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {svc.packages?.[0]?.price ? `From R${Number(svc.packages[0].price).toFixed(0)}` : 'No price'} · {svc.reviewCount || 0} reviews
                              </p>
                            </div>
                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                              featured ? 'border-emerald-500 bg-emerald-500' : 'border-muted-foreground/30'
                            }`}>
                              {featured && <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Courses */}
                <div>
                  <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                    <AcademicCapIcon className="w-3.5 h-3.5" /> Courses ({sellerCourses.length})
                  </h4>
                  {sellerCourses.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center bg-muted/30 rounded-lg">
                      No courses yet. Create a course to feature it here.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {sellerCourses.map((course: any) => {
                        const featured = isFeatured('course', course.id);
                        return (
                          <button
                            key={course.id}
                            onClick={() => toggleFeaturedItem('course', course.id)}
                            className={`w-full flex items-center gap-4 p-3 rounded-xl border transition-all text-left ${
                              featured ? 'border-emerald-500 bg-emerald-500/5' : 'border-border hover:border-muted-foreground/30'
                            }`}
                          >
                            <div className="w-14 h-14 rounded-lg bg-muted overflow-hidden flex-shrink-0">
                              {course.thumbnail && <img src={course.thumbnail} alt="" className="w-full h-full object-cover" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">{course.title}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                R{Number(course.price || 0).toFixed(0)} · {course._count?.enrollments || 0} students
                              </p>
                            </div>
                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                              featured ? 'border-emerald-500 bg-emerald-500' : 'border-muted-foreground/30'
                            }`}>
                              {featured && <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                <p className="text-xs text-muted-foreground mt-4">
                  {featuredItems.length} item{featuredItems.length !== 1 ? 's' : ''} featured
                </p>
              </div>

              {/* Testimonial Settings */}
              <div className="bg-card border rounded-xl p-6">
                <h3 className="font-semibold flex items-center gap-2 mb-1">
                  ⭐ Testimonials
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Control whether reviews are shown on your BioLink and how many.
                </p>
                <div className="space-y-4">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={bioShowTestimonials}
                      onChange={(e) => setBioShowTestimonials(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 text-emerald-500 focus:ring-emerald-500"
                    />
                    <span className="text-sm">Show testimonials</span>
                  </label>
                  {bioShowTestimonials && (
                    <div>
                      <label className="text-xs font-medium mb-1.5 block">Max reviews shown</label>
                      <div className="flex items-center gap-3">
                        <input
                          type="range"
                          min={2}
                          max={20}
                          value={bioTestimonialCount}
                          onChange={(e) => setBioTestimonialCount(Number(e.target.value))}
                          className="flex-1"
                        />
                        <span className="text-sm font-medium w-8 text-center">{bioTestimonialCount}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Chat & Quick Replies Section */}
        {activeSection === 'chat' && (
          <motion.div key="chat" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
            <div className="max-w-2xl space-y-6">
              <div className="bg-card border rounded-xl p-6">
                <h3 className="font-semibold flex items-center gap-2 mb-1">
                  <ChatBubbleLeftRightIcon className="w-4 h-4 text-primary" /> Quick Reply Chips
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Add suggested messages visitors can tap to start a conversation. These appear in the chat bubble and Chat-First template.
                </p>

                {/* Current chips */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {bioQuickReplies.map((chip, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                    >
                      {chip}
                      <button
                        onClick={() => removeQuickReply(i)}
                        className="ml-0.5 hover:text-red-400 transition-colors"
                      >
                        <TrashIcon className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  ))}
                  {bioQuickReplies.length === 0 && (
                    <p className="text-sm text-muted-foreground py-2">
                      No quick replies yet. Defaults will be used: "View services", "Check pricing", "Ask me anything"
                    </p>
                  )}
                </div>

                {/* Add new chip */}
                <div className="flex items-center gap-2">
                  <Input
                    value={newChip}
                    onChange={(e) => setNewChip(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addQuickReply())}
                    placeholder="e.g., What are your rates?"
                    maxLength={50}
                    className="flex-1"
                  />
                  <Button variant="outline" size="sm" onClick={addQuickReply} disabled={!newChip.trim()}>
                    <PlusIcon className="w-4 h-4 mr-1" /> Add
                  </Button>
                </div>
              </div>

              <div className="bg-card border rounded-xl p-6">
                <h3 className="font-semibold flex items-center gap-2 mb-1">
                  <ChatBubbleLeftRightIcon className="w-4 h-4 text-primary" /> CTA Button Text
                </h3>
                <p className="text-sm text-muted-foreground mb-3">
                  The main call-to-action button text shown on your BioLink.
                </p>
                <Input
                  value={bioCtaText}
                  onChange={(e) => setBioCtaText(e.target.value)}
                  placeholder="Get in Touch"
                  maxLength={30}
                />
              </div>

              {/* Availability Settings */}
              <div className="bg-card border rounded-xl p-6">
                <h3 className="font-semibold flex items-center gap-2 mb-1">
                  🟢 Availability
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Control your availability status and order capacity shown on your BioLink.
                </p>
                <div className="space-y-4">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isAvailable}
                      onChange={(e) => setIsAvailable(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 text-emerald-500 focus:ring-emerald-500"
                    />
                    <span className="text-sm">Available for work</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={vacationMode}
                      onChange={(e) => setVacationMode(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 text-amber-500 focus:ring-amber-500"
                    />
                    <span className="text-sm">Vacation mode</span>
                  </label>
                  <div>
                    <label className="text-xs font-medium mb-1.5 block">Max active orders</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min={1}
                        max={20}
                        value={maxActiveOrders}
                        onChange={(e) => setMaxActiveOrders(Number(e.target.value))}
                        className="flex-1"
                      />
                      <span className="text-sm font-medium w-8 text-center">{maxActiveOrders}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* FAQ Concierge */}
              <div className="bg-card border rounded-xl p-6">
                <h3 className="font-semibold flex items-center gap-2 mb-1">
                  <QuestionMarkCircleIcon className="w-4 h-4 text-primary" /> FAQ Auto-Replies
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Add FAQ entries that auto-reply when visitors type matching keywords in your chat bubble.
                </p>

                {/* Existing entries */}
                <div className="space-y-2 mb-4">
                  {faqEntries.map((faq, idx) => (
                    <div key={faq.id || idx} className="p-3 rounded-lg border bg-muted/20">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{faq.question}</p>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{faq.answer}</p>
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {faq.keywords.map((kw, ki) => (
                              <span key={ki} className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500">{kw}</span>
                            ))}
                          </div>
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          <button
                            onClick={() => {
                              setEditingFaqIdx(idx);
                              setNewFaq({ question: faq.question, answer: faq.answer, keywords: faq.keywords.join(', ') });
                            }}
                            className="text-xs text-muted-foreground hover:text-foreground"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => { if (faq.id) faqDeleteMutation.mutate(faq.id); }}
                            className="text-xs text-red-400 hover:text-red-500"
                          >
                            <TrashIcon className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {faqEntries.length === 0 && (
                    <p className="text-sm text-muted-foreground py-3 text-center bg-muted/30 rounded-lg">
                      No FAQ entries yet. Add one below.
                    </p>
                  )}
                </div>

                {/* Add/Edit form */}
                <div className="space-y-2 p-3 rounded-lg border border-dashed">
                  <Input
                    value={newFaq.question}
                    onChange={(e) => setNewFaq({ ...newFaq, question: e.target.value })}
                    placeholder="Question (e.g., What are your rates?)"
                    maxLength={200}
                  />
                  <textarea
                    value={newFaq.answer}
                    onChange={(e) => setNewFaq({ ...newFaq, answer: e.target.value })}
                    placeholder="Answer shown to visitors..."
                    maxLength={500}
                    rows={2}
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <Input
                    value={newFaq.keywords}
                    onChange={(e) => setNewFaq({ ...newFaq, keywords: e.target.value })}
                    placeholder="Keywords (comma-separated, e.g., rates, pricing, cost)"
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="bg-emerald-500 hover:bg-emerald-600 text-white"
                      onClick={() => {
                        const data = {
                          question: newFaq.question.trim(),
                          answer: newFaq.answer.trim(),
                          keywords: newFaq.keywords.split(',').map((k) => k.trim()).filter(Boolean),
                        };
                        if (!data.question || !data.answer || data.keywords.length === 0) {
                          toast.error('Fill in question, answer, and at least one keyword');
                          return;
                        }
                        if (editingFaqIdx !== null && faqEntries[editingFaqIdx]?.id) {
                          faqUpdateMutation.mutate({ id: faqEntries[editingFaqIdx].id!, ...data });
                        } else {
                          faqCreateMutation.mutate(data);
                        }
                        setNewFaq({ question: '', answer: '', keywords: '' });
                        setEditingFaqIdx(null);
                      }}
                      disabled={faqCreateMutation.isPending || faqUpdateMutation.isPending}
                    >
                      <PlusIcon className="w-4 h-4 mr-1" />
                      {editingFaqIdx !== null ? 'Update FAQ' : 'Add FAQ'}
                    </Button>
                    {editingFaqIdx !== null && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => { setEditingFaqIdx(null); setNewFaq({ question: '', answer: '', keywords: '' }); }}
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Products Section */}
        {activeSection === 'products' && (
          <motion.div key="products" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
            <div className="max-w-2xl space-y-6">
              <div className="bg-card border rounded-xl p-6">
                <h3 className="font-semibold flex items-center gap-2 mb-1">
                  <ShoppingBagIcon className="w-4 h-4 text-primary" /> Digital Products
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Sell digital files (PDFs, templates, presets, etc.) directly from your BioLink.
                </p>

                {/* Existing products */}
                <div className="space-y-2 mb-4">
                  {products.map((prod, idx) => (
                    <div key={prod.id || idx} className="flex items-center gap-3 p-3 rounded-xl border">
                      {prod.thumbnail && (
                        <img src={prod.thumbnail} alt="" className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{prod.title}</p>
                        <p className="text-xs text-muted-foreground">R{Number(prod.price).toFixed(0)} · {prod.fileName}</p>
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <button
                          onClick={() => {
                            setEditingProductIdx(idx);
                            setNewProduct({
                              title: prod.title,
                              description: prod.description || '',
                              price: String(prod.price),
                              fileUrl: prod.fileUrl,
                              fileName: prod.fileName,
                              fileSize: prod.fileSize,
                            });
                          }}
                          className="text-xs text-muted-foreground hover:text-foreground px-2 py-1"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => { if (prod.id) productDeleteMutation.mutate(prod.id); }}
                          className="text-xs text-red-400 hover:text-red-500 px-2 py-1"
                        >
                          <TrashIcon className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {products.length === 0 && (
                    <p className="text-sm text-muted-foreground py-4 text-center bg-muted/30 rounded-lg">
                      No products yet. Add your first digital product below.
                    </p>
                  )}
                </div>

                {/* Add/Edit form */}
                <div className="space-y-2 p-3 rounded-lg border border-dashed">
                  <Input
                    value={newProduct.title}
                    onChange={(e) => setNewProduct({ ...newProduct, title: e.target.value })}
                    placeholder="Product title"
                    maxLength={100}
                  />
                  <textarea
                    value={newProduct.description}
                    onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                    placeholder="Short description (optional)"
                    maxLength={500}
                    rows={2}
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      value={newProduct.price}
                      onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
                      placeholder="Price (e.g., 99)"
                      type="number"
                      min="0"
                      step="1"
                    />
                    <Input
                      value={newProduct.fileUrl}
                      onChange={(e) => setNewProduct({ ...newProduct, fileUrl: e.target.value })}
                      placeholder="File URL (uploaded)"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      value={newProduct.fileName}
                      onChange={(e) => setNewProduct({ ...newProduct, fileName: e.target.value })}
                      placeholder="File name (e.g., guide.pdf)"
                    />
                    <Input
                      value={String(newProduct.fileSize || '')}
                      onChange={(e) => setNewProduct({ ...newProduct, fileSize: Number(e.target.value) || 0 })}
                      placeholder="File size (bytes)"
                      type="number"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="bg-emerald-500 hover:bg-emerald-600 text-white"
                      onClick={() => {
                        const data = {
                          title: newProduct.title.trim(),
                          description: newProduct.description.trim() || undefined,
                          price: Number(newProduct.price),
                          fileUrl: newProduct.fileUrl.trim(),
                          fileName: newProduct.fileName.trim(),
                          fileSize: newProduct.fileSize,
                        };
                        if (!data.title || !data.price || !data.fileUrl || !data.fileName) {
                          toast.error('Title, price, file URL, and file name are required');
                          return;
                        }
                        if (editingProductIdx !== null && products[editingProductIdx]?.id) {
                          productUpdateMutation.mutate({ id: products[editingProductIdx].id, ...data });
                        } else {
                          productCreateMutation.mutate(data);
                        }
                        setNewProduct({ title: '', description: '', price: '', fileUrl: '', fileName: '', fileSize: 0 });
                        setEditingProductIdx(null);
                      }}
                      disabled={productCreateMutation.isPending || productUpdateMutation.isPending}
                    >
                      <PlusIcon className="w-4 h-4 mr-1" />
                      {editingProductIdx !== null ? 'Update Product' : 'Add Product'}
                    </Button>
                    {editingProductIdx !== null && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => { setEditingProductIdx(null); setNewProduct({ title: '', description: '', price: '', fileUrl: '', fileName: '', fileSize: 0 }); }}
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Preview Section */}
        {activeSection === 'preview' && (
          <motion.div key="preview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
            <div className="flex justify-center">
              <div className="w-full max-w-[420px]">
                {/* Template badge */}
                <div className="text-center mb-4">
                  <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-muted rounded-full text-sm">
                    <span>{TEMPLATES[bioTemplate]?.icon || '🛍️'}</span>
                    <span className="font-medium">{TEMPLATES[bioTemplate]?.name || 'Services Showcase'}</span>
                  </span>
                </div>

                <div className="border rounded-2xl overflow-hidden shadow-2xl">
                    <div
                    className={`p-6 text-center min-h-[500px]`}
                    style={{ backgroundColor: bioBackgroundColor, color: bioTextColor, fontFamily: bioFont }}
                  >
                    <div
                      className="w-20 h-20 rounded-full mx-auto border-4 flex items-center justify-center text-xl font-bold overflow-hidden"
                      style={{ borderColor: bioThemeColor, backgroundColor: bioBackgroundColor }}
                    >
                      {user?.avatar ? (
                        <img src={user.avatar} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span style={{ color: bioThemeColor }}>{user?.firstName?.[0]}{user?.lastName?.[0]}</span>
                      )}
                    </div>

                    <h2 className="text-xl font-bold mt-4">
                      {biolinkData?.data?.biolink?.displayName || `${user?.firstName} ${user?.lastName}`}
                    </h2>
                    <p className="text-sm opacity-70 mt-1">
                      {biolinkData?.data?.biolink?.professionalTitle || 'Professional Title'}
                    </p>
                    {bioHeadline && <p className="mt-2 text-sm opacity-80">{bioHeadline}</p>}

                    <div className="flex items-center justify-center gap-3 mt-3 text-sm opacity-60">
                      <span className="flex items-center gap-1" style={{ color: bioThemeColor }}>
                        <ShieldCheckIcon className="w-4 h-4" /> Verified
                      </span>
                    </div>

                    {/* CTA */}
                    <div
                      className="w-full mt-6 py-3 px-6 font-medium text-sm cursor-pointer"
                      style={{
                        backgroundColor: bioButtonStyle === 'outline' ? 'transparent' : bioThemeColor,
                        color: bioButtonStyle === 'outline' ? bioThemeColor : '#fff',
                        border: bioButtonStyle === 'outline' ? `2px solid ${bioThemeColor}` : 'none',
                        borderRadius: bioButtonStyle === 'pill' ? '9999px' : bioButtonStyle === 'square' ? '0' : '8px',
                      }}
                    >
                      {bioCtaText || 'Get in Touch'}
                    </div>

                    {/* Quick reply chips preview */}
                    {bioQuickReplies.length > 0 && (
                      <div className="flex flex-wrap justify-center gap-2 mt-4">
                        {bioQuickReplies.map((chip, i) => (
                          <span
                            key={i}
                            className="text-xs px-3 py-1 rounded-full border"
                            style={{ borderColor: `${bioThemeColor}40`, color: bioThemeColor }}
                          >
                            {chip}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Featured items preview */}
                    {featuredItems.length > 0 && (
                      <div className="mt-6 space-y-2">
                        {featuredItems.slice(0, 4).map((item, i) => {
                          const isService = item.type === 'service';
                          const data = isService
                            ? sellerServices.find((s: any) => s.id === item.id)
                            : sellerCourses.find((c: any) => c.id === item.id);
                          if (!data) return null;
                          return (
                            <div
                              key={i}
                              className="flex items-center gap-3 p-3 rounded-xl text-left"
                              style={{ backgroundColor: `${bioTextColor}08`, border: `1px solid ${bioTextColor}15` }}
                            >
                              <div className="w-12 h-12 rounded-lg flex-shrink-0 overflow-hidden" style={{ backgroundColor: `${bioThemeColor}20` }}>
                                {isService && data.images?.[0] && <img src={data.images[0]} alt="" className="w-full h-full object-cover" />}
                                {!isService && data.thumbnail && <img src={data.thumbnail} alt="" className="w-full h-full object-cover" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{data.title}</p>
                                <p className="text-xs opacity-50">
                                  {isService
                                    ? `From R${Number(data.packages?.[0]?.price || 0).toFixed(0)}`
                                    : `R${Number(data.price || 0).toFixed(0)}`}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    <p className="mt-8 text-xs opacity-20">Powered by Zomieks</p>
                  </div>
                </div>

                {/* Open full preview link */}
                <div className="text-center mt-4">
                  <a
                    href={biolinkUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-emerald-500 hover:underline inline-flex items-center gap-1"
                  >
                    <ArrowTopRightOnSquareIcon className="w-4 h-4" />
                    Open full BioLink page
                  </a>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
