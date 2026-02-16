import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { useAuthStore } from '../../stores/auth.store';
import { projectsApi, servicesApi } from '../../lib/api';
import {
  PlusIcon,
  XMarkIcon,
  ClockIcon,
  ChatBubbleLeftIcon,
  BoltIcon,
  FireIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  AdjustmentsHorizontalIcon,
  RocketLaunchIcon,
  LockClosedIcon,
  EyeSlashIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};

const STATUS_BADGES: Record<string, { label: string; className: string }> = {
  OPEN: { label: 'Open', className: 'bg-emerald-100 text-emerald-700' },
  IN_PROGRESS: { label: 'In Progress', className: 'bg-blue-100 text-blue-700' },
  COMPLETED: { label: 'Completed', className: 'bg-gray-100 text-gray-600' },
  CANCELLED: { label: 'Cancelled', className: 'bg-red-100 text-red-600' },
};

const UPGRADE_PRICES: Record<string, number> = {
  FEATURED: 50,
  URGENT: 100,
  SEALED: 50,
  PRIVATE: 150,
  IP_AGREEMENT: 200,
};

function formatBudget(min?: number | null, max?: number | null) {
  const fmt = (v: number) => `R${(v / 100).toLocaleString()}`;
  if (min && max) return `${fmt(min)} – ${fmt(max)}`;
  if (min) return `From ${fmt(min)}`;
  if (max) return `Up to ${fmt(max)}`;
  return 'Flexible';
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function ProjectsPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  // URL-driven filters
  const search = searchParams.get('search') || '';
  const category = searchParams.get('category') || '';
  const sortBy = searchParams.get('sortBy') || 'newest';
  const budgetMin = searchParams.get('budgetMin') || '';
  const budgetMax = searchParams.get('budgetMax') || '';
  const page = parseInt(searchParams.get('page') || '1');
  const view = searchParams.get('view') || 'all';

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value) params.set(key, value);
    else params.delete(key);
    if (key !== 'page') params.delete('page');
    setSearchParams(params);
  };

  const clearFilters = () => {
    const params = new URLSearchParams();
    if (view !== 'all') params.set('view', view);
    setSearchParams(params);
  };

  const { data: allData, isLoading } = useQuery({
    queryKey: ['projects', 'list', { search, category, sortBy, budgetMin, budgetMax, page }],
    queryFn: () => projectsApi.list({
      search: search || undefined,
      category: category || undefined,
      sortBy: sortBy || undefined,
      budgetMin: budgetMin ? parseFloat(budgetMin) : undefined,
      budgetMax: budgetMax ? parseFloat(budgetMax) : undefined,
      page,
      limit: 18,
    }),
    enabled: view === 'all',
  });

  const { data: myData } = useQuery({
    queryKey: ['projects', 'mine'],
    queryFn: () => projectsApi.mine(),
    enabled: view === 'mine' && !!user,
  });

  const { data: myBidsData } = useQuery({
    queryKey: ['projects', 'my-bids'],
    queryFn: () => projectsApi.myBids(),
    enabled: view === 'bids' && !!user?.isSeller,
  });

  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => servicesApi.categories(),
  });

  const projectItems = view === 'mine' ? (myData?.data || [])
    : view === 'bids' ? [] // bids have a different shape
    : (allData?.data || []);
  const bidItems = view === 'bids' ? (myBidsData?.data || []) : [];
  const categories = (categoriesData?.data || []) as Array<{ id: string; name: string }>;
  const totalPages = allData?.meta?.total && allData?.meta?.limit ? Math.ceil(allData.meta.total / allData.meta.limit) : 1;
  const resultsCount = allData?.meta?.total || 0;
  const hasActiveFilters = search || category || budgetMin || budgetMax;

  // Create form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [formBudgetMin, setFormBudgetMin] = useState('');
  const [formBudgetMax, setFormBudgetMax] = useState('');
  const [deadline, setDeadline] = useState('');
  const [skillInput, setSkillInput] = useState('');
  const [skills, setSkills] = useState<string[]>([]);
  const [upgrades, setUpgrades] = useState<string[]>([]);

  const upgradeTotal = upgrades.reduce((sum, u) => sum + (UPGRADE_PRICES[u] || 0), 0);

  const createMutation = useMutation({
    mutationFn: () => projectsApi.create({
      title,
      description,
      categoryId: categoryId || undefined,
      budgetMin: formBudgetMin ? parseFloat(formBudgetMin) : undefined,
      budgetMax: formBudgetMax ? parseFloat(formBudgetMax) : undefined,
      deadline: deadline || undefined,
      skills: skills.length > 0 ? skills : undefined,
      upgrades: upgrades.length > 0 ? upgrades : undefined,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Project posted successfully!');
      setShowCreate(false);
      setTitle(''); setDescription(''); setCategoryId(''); setFormBudgetMin(''); setFormBudgetMax(''); setDeadline(''); setSkills([]); setUpgrades([]);
    },
    onError: (e: any) => toast.error(e?.error?.message || 'Failed to post project'),
  });

  const addSkill = () => {
    const s = skillInput.trim();
    if (s && skills.length < 10 && !skills.includes(s)) {
      setSkills([...skills, s]);
      setSkillInput('');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-muted/30 to-background">
      {/* ───── Colorful CTA Hero ───── */}
      <motion.div
        className="relative overflow-hidden bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        {/* Decorative circles */}
        <div className="absolute -top-20 -left-20 w-72 h-72 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-10 right-10 w-60 h-60 bg-pink-400/20 rounded-full blur-3xl" />
        <div className="absolute top-10 right-1/4 w-40 h-40 bg-cyan-400/15 rounded-full blur-2xl" />

        <div className="relative container py-12 md:py-16">
          <motion.div
            className="max-w-3xl"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/15 backdrop-blur-sm rounded-full text-white/90 text-sm font-medium mb-4">
              <RocketLaunchIcon className="h-4 w-4" />
              {resultsCount > 0 ? `${resultsCount} open projects` : 'Post your first project'}
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-3 leading-tight">
              {search ? `Results for "${search}"` : 'Find & Post Projects'}
            </h1>
            <p className="text-lg text-white/80 mb-6 max-w-xl">
              {user?.isSeller
                ? 'Browse open projects and submit proposals to win work from buyers.'
                : 'Tell us what you need done and receive competitive bids from skilled freelancers.'}
            </p>

            {/* Hero actions */}
            <div className="flex flex-wrap gap-3 mb-8">
              {user && !user.isSeller && (
                <button
                  onClick={() => setShowCreate(true)}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-white text-purple-700 rounded-xl text-sm font-bold hover:bg-white/90 transition-all shadow-xl shadow-purple-900/30"
                >
                  <PlusIcon className="h-5 w-5" />
                  Post a Project
                </button>
              )}
              {user?.isSeller && (
                <button
                  onClick={() => updateFilter('view', 'bids')}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-white/15 backdrop-blur text-white border border-white/20 rounded-xl text-sm font-bold hover:bg-white/25 transition-all"
                >
                  My Bids
                </button>
              )}
            </div>
          </motion.div>

          {/* Search bar in hero */}
          <motion.div
            className="max-w-2xl"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <input
                type="search"
                placeholder="Search projects by keyword, skill, or title..."
                value={search}
                onChange={(e) => updateFilter('search', e.target.value)}
                className="w-full h-14 pl-12 pr-4 text-lg rounded-xl border-0 bg-white shadow-2xl shadow-black/20 focus:ring-2 focus:ring-white/50 focus:outline-none"
              />
            </div>
          </motion.div>
        </div>
      </motion.div>

      <div className="container py-8">
        {/* View tabs & controls bar */}
        <motion.div
          className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between mb-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <div className="flex items-center gap-4 flex-wrap">
            {/* View tabs */}
            <div className="flex bg-muted rounded-lg p-1">
              {[
                { key: 'all', label: 'All Projects' },
                ...(user ? [{ key: 'mine', label: 'My Projects' }] : []),
                ...(user?.isSeller ? [{ key: 'bids', label: 'My Bids' }] : []),
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => updateFilter('view', tab.key === 'all' ? '' : tab.key)}
                  className={`px-4 py-2 text-sm rounded-md transition-colors font-medium ${
                    view === tab.key || (tab.key === 'all' && !view)
                      ? 'bg-background shadow text-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className="md:hidden inline-flex items-center gap-2 px-4 py-2 border rounded-lg text-sm font-medium hover:bg-muted transition-colors"
            >
              <AdjustmentsHorizontalIcon className="h-4 w-4" />
              Filters
              {hasActiveFilters && (
                <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">!</span>
              )}
            </button>

            {!isLoading && view === 'all' && (
              <p className="text-muted-foreground text-sm">
                <span className="font-semibold text-foreground">{resultsCount.toLocaleString()}</span> projects found
              </p>
            )}
          </div>

          {view === 'all' && (
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => updateFilter('sortBy', e.target.value)}
                className="h-10 px-4 rounded-lg border bg-background hover:border-primary transition-colors cursor-pointer text-sm"
              >
                <option value="newest">Newest First</option>
                <option value="budget_high">Budget: High to Low</option>
                <option value="budget_low">Budget: Low to High</option>
                <option value="most_bids">Most Bids</option>
                <option value="deadline">Deadline</option>
              </select>
            </div>
          )}
        </motion.div>

        {view === 'all' ? (
          <div className="flex gap-8">
            {/* ───── Sidebar Filters ───── */}
            <AnimatePresence>
              <motion.aside
                className={`w-72 shrink-0 ${showFilters ? 'block' : 'hidden md:block'}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
              >
                <div className="sticky top-24 space-y-6 p-6 bg-background rounded-2xl border shadow-sm">
                  <div className="flex justify-between items-center pb-4 border-b">
                    <h2 className="font-bold text-lg flex items-center gap-2">
                      <FunnelIcon className="h-5 w-5 text-primary" />
                      Filters
                    </h2>
                    {hasActiveFilters && (
                      <button onClick={clearFilters} className="text-sm text-primary hover:underline font-medium">
                        Clear all
                      </button>
                    )}
                  </div>

                  {/* Categories */}
                  <div>
                    <h3 className="font-semibold mb-4 text-sm uppercase tracking-wide text-muted-foreground">Category</h3>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      <label className={`flex items-center space-x-3 p-2.5 rounded-lg cursor-pointer transition-all ${
                        !category ? 'bg-primary/10 text-primary' : 'hover:bg-muted'
                      }`}>
                        <input type="radio" name="category" checked={!category} onChange={() => updateFilter('category', '')} className="h-4 w-4 accent-primary" />
                        <span className="text-sm font-medium">All Categories</span>
                      </label>
                      {categories.map((cat) => (
                        <label key={cat.id} className={`flex items-center space-x-3 p-2.5 rounded-lg cursor-pointer transition-all ${
                          category === cat.id ? 'bg-primary/10 text-primary' : 'hover:bg-muted'
                        }`}>
                          <input type="radio" name="category" checked={category === cat.id} onChange={() => updateFilter('category', cat.id)} className="h-4 w-4 accent-primary" />
                          <span className="text-sm font-medium">{cat.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Budget Range */}
                  <div>
                    <h3 className="font-semibold mb-4 text-sm uppercase tracking-wide text-muted-foreground">Budget (ZAR)</h3>
                    <div className="flex gap-3 items-center">
                      <div className="relative flex-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R</span>
                        <input
                          type="number"
                          placeholder="Min"
                          value={budgetMin}
                          onChange={(e) => updateFilter('budgetMin', e.target.value)}
                          className="w-full h-10 pl-8 pr-3 border rounded-lg bg-background text-sm"
                        />
                      </div>
                      <span className="text-muted-foreground">–</span>
                      <div className="relative flex-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R</span>
                        <input
                          type="number"
                          placeholder="Max"
                          value={budgetMax}
                          onChange={(e) => updateFilter('budgetMax', e.target.value)}
                          className="w-full h-10 pl-8 pr-3 border rounded-lg bg-background text-sm"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Quick budget ranges */}
                  <div>
                    <h3 className="font-semibold mb-4 text-sm uppercase tracking-wide text-muted-foreground">Quick Ranges</h3>
                    <div className="space-y-2">
                      {[
                        { label: 'Micro (R50 – R500)', min: '50', max: '500' },
                        { label: 'Small (R500 – R2,000)', min: '500', max: '2000' },
                        { label: 'Medium (R2,000 – R10,000)', min: '2000', max: '10000' },
                        { label: 'Large (R10,000+)', min: '10000', max: '' },
                      ].map((range) => (
                        <button
                          key={range.label}
                          onClick={() => {
                            updateFilter('budgetMin', range.min);
                            updateFilter('budgetMax', range.max);
                          }}
                          className={`w-full text-left p-2.5 rounded-lg text-sm transition-all ${
                            budgetMin === range.min && budgetMax === range.max
                              ? 'bg-primary/10 text-primary font-medium'
                              : 'hover:bg-muted text-muted-foreground'
                          }`}
                        >
                          {range.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Post Project CTA in sidebar */}
                  {user && !user.isSeller && (
                    <button
                      onClick={() => setShowCreate(true)}
                      className="w-full py-3 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl text-sm font-bold hover:opacity-90 transition-all flex items-center justify-center gap-2"
                    >
                      <PlusIcon className="h-4 w-4" />
                      Post a Project
                    </button>
                  )}
                </div>
              </motion.aside>
            </AnimatePresence>

            {/* ───── Projects Grid ───── */}
            <div className="flex-1">
              {/* Active filter pills */}
              <AnimatePresence>
                {hasActiveFilters && (
                  <motion.div
                    className="flex flex-wrap gap-2 mb-6"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    {search && (
                      <motion.span className="inline-flex items-center px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-medium shadow-sm" initial={{ scale: 0.8 }} animate={{ scale: 1 }}>
                        "{search}"
                        <button onClick={() => updateFilter('search', '')} className="ml-2 hover:bg-white/20 rounded-full p-0.5"><XMarkIcon className="h-4 w-4" /></button>
                      </motion.span>
                    )}
                    {category && (
                      <motion.span className="inline-flex items-center px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-medium shadow-sm" initial={{ scale: 0.8 }} animate={{ scale: 1 }}>
                        {categories.find((c) => c.id === category)?.name || category}
                        <button onClick={() => updateFilter('category', '')} className="ml-2 hover:bg-white/20 rounded-full p-0.5"><XMarkIcon className="h-4 w-4" /></button>
                      </motion.span>
                    )}
                    {(budgetMin || budgetMax) && (
                      <motion.span className="inline-flex items-center px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-medium shadow-sm" initial={{ scale: 0.8 }} animate={{ scale: 1 }}>
                        R{budgetMin || '0'} – R{budgetMax || '∞'}
                        <button onClick={() => { updateFilter('budgetMin', ''); updateFilter('budgetMax', ''); }} className="ml-2 hover:bg-white/20 rounded-full p-0.5"><XMarkIcon className="h-4 w-4" /></button>
                      </motion.span>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {isLoading ? (
                <motion.div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5" variants={staggerContainer} initial="hidden" animate="visible">
                  {[...Array(6)].map((_, i) => (
                    <motion.div key={i} variants={fadeInUp}>
                      <div className="bg-card border rounded-2xl p-5 space-y-4 animate-pulse">
                        <div className="h-5 bg-muted rounded w-3/4" />
                        <div className="h-3 bg-muted rounded w-full" />
                        <div className="h-3 bg-muted rounded w-2/3" />
                        <div className="flex gap-2"><div className="h-6 w-16 bg-muted rounded-full" /><div className="h-6 w-20 bg-muted rounded-full" /></div>
                        <div className="flex justify-between"><div className="h-4 w-24 bg-muted rounded" /><div className="h-4 w-16 bg-muted rounded" /></div>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              ) : projectItems.length === 0 ? (
                <motion.div className="text-center py-20 bg-muted/30 rounded-2xl" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                  <RocketLaunchIcon className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No projects found</h3>
                  <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                    {hasActiveFilters
                      ? "We couldn't find any projects matching your criteria. Try adjusting your filters."
                      : 'Be the first to post a project and get bids from talented freelancers!'}
                  </p>
                  {hasActiveFilters ? (
                    <button onClick={clearFilters} className="px-6 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium">Clear all filters</button>
                  ) : user && !user.isSeller ? (
                    <button onClick={() => setShowCreate(true)} className="px-6 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl text-sm font-bold">Post a Project</button>
                  ) : null}
                </motion.div>
              ) : (
                <>
                  <motion.div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5" variants={staggerContainer} initial="hidden" animate="visible">
                    {projectItems.map((p: any) => {
                      const badge = STATUS_BADGES[p.status] || STATUS_BADGES.OPEN;
                      return (
                        <motion.div key={p.id} variants={fadeInUp}>
                          <Link
                            to={`/projects/${p.id}`}
                            className="block bg-card border-2 border-transparent rounded-2xl p-5 hover:border-primary/20 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 h-full group"
                          >
                            {/* Badges row */}
                            <div className="flex items-center gap-1.5 flex-wrap mb-3">
                              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${badge.className}`}>{badge.label}</span>
                              {p.isFeatured && (
                                <span className="text-xs px-2 py-1 rounded-full font-medium bg-gradient-to-r from-amber-100 to-yellow-100 text-amber-700 flex items-center gap-0.5">
                                  <BoltIcon className="h-3 w-3" /> Featured
                                </span>
                              )}
                              {p.isUrgent && (
                                <span className="text-xs px-2 py-1 rounded-full font-medium bg-red-100 text-red-700 flex items-center gap-0.5">
                                  <FireIcon className="h-3 w-3" /> Urgent
                                </span>
                              )}
                              {p.isSealed ? (
                                <span className="text-xs px-2 py-1 rounded-full font-medium bg-purple-100 text-purple-700 flex items-center gap-0.5">
                                  <EyeSlashIcon className="h-3 w-3" /> Sealed
                                </span>
                              ) : null}
                              {p.hasIpAgreement ? (
                                <span className="text-xs px-2 py-1 rounded-full font-medium bg-blue-100 text-blue-700 flex items-center gap-0.5">
                                  <ShieldCheckIcon className="h-3 w-3" /> IP
                                </span>
                              ) : null}
                            </div>

                            {/* Title */}
                            <h3 className="font-semibold text-base group-hover:text-primary transition-colors line-clamp-2 mb-2 leading-snug">
                              {p.title}
                            </h3>

                            {/* Description preview */}
                            <p className="text-muted-foreground text-sm line-clamp-2 mb-4">{p.description}</p>

                            {/* Skills */}
                            {p.skills?.length > 0 && (
                              <div className="flex flex-wrap gap-1 mb-4">
                                {(p.skills as string[]).slice(0, 4).map((s) => (
                                  <span key={s} className="bg-primary/8 text-primary text-xs px-2 py-0.5 rounded-full">{s}</span>
                                ))}
                                {p.skills.length > 4 && <span className="text-xs text-muted-foreground">+{p.skills.length - 4}</span>}
                              </div>
                            )}

                            {/* Budget & meta */}
                            <div className="mt-auto pt-3 border-t space-y-2">
                              <div className="flex items-center justify-between text-sm">
                                <span className="font-bold text-emerald-600">{formatBudget(p.budgetMin, p.budgetMax)}</span>
                                <span className="text-xs text-muted-foreground">{timeAgo(p.createdAt)}</span>
                              </div>
                              <div className="flex items-center justify-between text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <ChatBubbleLeftIcon className="h-3.5 w-3.5" />
                                  {p.bidCount} bid{p.bidCount !== 1 ? 's' : ''}
                                </span>
                                {p.deadline && (
                                  <span className="flex items-center gap-1">
                                    <ClockIcon className="h-3.5 w-3.5" />
                                    {new Date(p.deadline).toLocaleDateString()}
                                  </span>
                                )}
                                {p.buyerUsername && (
                                  <span>@{p.buyerUsername}</span>
                                )}
                              </div>
                            </div>
                          </Link>
                        </motion.div>
                      );
                    })}
                  </motion.div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <motion.div className="flex justify-center items-center mt-12 gap-2" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
                      <button
                        disabled={page <= 1}
                        onClick={() => updateFilter('page', String(page - 1))}
                        className="inline-flex items-center gap-2 px-4 py-2 border rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-muted transition-colors"
                      >
                        <ChevronLeftIcon className="h-4 w-4" /> Previous
                      </button>
                      <div className="flex items-center gap-1 px-4">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          const pn = Math.max(1, Math.min(page - 2 + i, totalPages - 4 + i));
                          return (
                            <button
                              key={pn}
                              onClick={() => updateFilter('page', String(pn))}
                              className={`w-10 h-10 rounded-lg font-medium transition-all ${
                                page === pn ? 'bg-primary text-primary-foreground shadow-lg' : 'hover:bg-muted'
                              }`}
                            >
                              {pn}
                            </button>
                          );
                        })}
                      </div>
                      <button
                        disabled={page >= totalPages}
                        onClick={() => updateFilter('page', String(page + 1))}
                        className="inline-flex items-center gap-2 px-4 py-2 border rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-muted transition-colors"
                      >
                        Next <ChevronRightIcon className="h-4 w-4" />
                      </button>
                    </motion.div>
                  )}
                </>
              )}
            </div>
          </div>
        ) : view === 'mine' ? (
          /* ───── My Projects ───── */
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">My Posted Projects</h2>
              {user && !user.isSeller && (
                <button onClick={() => setShowCreate(true)} className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90">
                  <PlusIcon className="h-4 w-4" /> New Project
                </button>
              )}
            </div>
            {(myData?.data || []).length === 0 ? (
              <div className="text-center py-16 bg-muted/30 rounded-2xl">
                <p className="text-muted-foreground">You haven't posted any projects yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {(myData?.data || []).map((p: any) => {
                  const badge = STATUS_BADGES[p.status] || STATUS_BADGES.OPEN;
                  return (
                    <Link key={p.id} to={`/projects/${p.id}`} className="block bg-card border rounded-2xl p-5 hover:border-primary/40 transition-colors">
                      <div className="flex items-center gap-1.5 flex-wrap mb-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badge.className}`}>{badge.label}</span>
                        {p.isFeatured && <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-amber-100 text-amber-700">Featured</span>}
                        {p.isSealed ? <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-purple-100 text-purple-700">Sealed</span> : null}
                        {p.isPrivate ? <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-gray-200 text-gray-700">Private</span> : null}
                      </div>
                      <h3 className="font-semibold mb-1 line-clamp-2">{p.title}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{p.description}</p>
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-bold text-emerald-600">{formatBudget(p.budgetMin, p.budgetMax)}</span>
                        <span className="text-xs text-muted-foreground">{p.bidCount} bids</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        ) : view === 'bids' ? (
          /* ───── My Bids ───── */
          <div>
            <h2 className="text-xl font-bold mb-6">My Bids</h2>
            {bidItems.length === 0 ? (
              <div className="text-center py-16 bg-muted/30 rounded-2xl">
                <p className="text-muted-foreground">You haven't placed any bids yet. Browse open projects to get started!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {bidItems.map((b: any) => (
                  <Link key={b.bidId} to={`/projects/${b.projectId}`} className="block bg-card border rounded-2xl p-5 hover:border-primary/40 transition-colors">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        b.bidStatus === 'ACCEPTED' ? 'bg-emerald-100 text-emerald-700' :
                        b.bidStatus === 'REJECTED' ? 'bg-red-100 text-red-600' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {b.bidStatus}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        STATUS_BADGES[b.projectStatus]?.className || 'bg-gray-100 text-gray-600'
                      }`}>
                        {STATUS_BADGES[b.projectStatus]?.label || b.projectStatus}
                      </span>
                    </div>
                    <h3 className="font-semibold mb-2 line-clamp-2">{b.projectTitle}</h3>
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <p>Your Bid: <span className="font-bold text-foreground">R{(b.amount / 100).toLocaleString()}</span></p>
                      <p>Delivery: {b.deliveryDays} days</p>
                      <p>Project Budget: {formatBudget(b.budgetMin, b.budgetMax)}</p>
                    </div>
                    <div className="flex items-center justify-between mt-3 pt-3 border-t text-xs text-muted-foreground">
                      <span>@{b.buyerUsername}</span>
                      <span>{timeAgo(b.bidCreatedAt)}</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        ) : null}
      </div>

      {/* ───── Create Project Modal ───── */}
      <AnimatePresence>
        {showCreate && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setShowCreate(false)}
          >
            <motion.div
              className="bg-card border rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
              initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-5 border-b sticky top-0 bg-card z-10">
                <h2 className="text-lg font-bold">Post a Project</h2>
                <button onClick={() => setShowCreate(false)} className="p-1 hover:bg-muted rounded-lg">
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
              <form className="p-5 space-y-4" onSubmit={(e) => { e.preventDefault(); createMutation.mutate(); }}>
                <div>
                  <label className="text-sm font-medium">Project Title *</label>
                  <input
                    value={title} onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Build a React landing page"
                    className="w-full mt-1 px-3 py-2 border rounded-xl bg-background text-sm"
                    required minLength={10} maxLength={200}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Description *</label>
                  <textarea
                    value={description} onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe what you need done..."
                    className="w-full mt-1 px-3 py-2 border rounded-xl bg-background text-sm min-h-[120px] resize-y"
                    required minLength={30} maxLength={5000}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Category</label>
                  <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="w-full mt-1 px-3 py-2 border rounded-xl bg-background text-sm">
                    <option value="">Any category</option>
                    {categories.map((cat) => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium">Min Budget (ZAR)</label>
                    <input type="number" min="50" step="1" value={formBudgetMin} onChange={(e) => setFormBudgetMin(e.target.value)} placeholder="500" className="w-full mt-1 px-3 py-2 border rounded-xl bg-background text-sm" />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Max Budget (ZAR)</label>
                    <input type="number" min="50" step="1" value={formBudgetMax} onChange={(e) => setFormBudgetMax(e.target.value)} placeholder="5000" className="w-full mt-1 px-3 py-2 border rounded-xl bg-background text-sm" />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Deadline</label>
                  <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} min={new Date().toISOString().split('T')[0]} className="w-full mt-1 px-3 py-2 border rounded-xl bg-background text-sm" />
                </div>
                <div>
                  <label className="text-sm font-medium">Required Skills</label>
                  <div className="flex gap-2 mt-1">
                    <input value={skillInput} onChange={(e) => setSkillInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSkill(); }}} placeholder="e.g. React, Node.js" className="flex-1 px-3 py-2 border rounded-xl bg-background text-sm" />
                    <button type="button" onClick={addSkill} className="px-3 py-2 bg-muted rounded-xl text-sm font-medium hover:bg-muted/80">Add</button>
                  </div>
                  {skills.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {skills.map((s) => (
                        <span key={s} className="bg-primary/10 text-primary text-xs px-2 py-1 rounded-full flex items-center gap-1">
                          {s}
                          <button type="button" onClick={() => setSkills(skills.filter((x) => x !== s))} className="hover:text-red-500"><XMarkIcon className="h-3 w-3" /></button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* ─── Upgrades ─── */}
                <div>
                  <label className="text-sm font-medium">Boost Your Project (optional)</label>
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    {/* Featured */}
                    <label className={`flex items-start gap-3 p-3 border rounded-xl cursor-pointer transition-colors ${
                      upgrades.includes('FEATURED') ? 'border-amber-400 bg-amber-50/50' : 'hover:border-muted-foreground/30'
                    }`}>
                      <input type="checkbox" checked={upgrades.includes('FEATURED')} onChange={(e) => setUpgrades(e.target.checked ? [...upgrades, 'FEATURED'] : upgrades.filter(u => u !== 'FEATURED'))} className="mt-0.5" />
                      <div>
                        <div className="flex items-center gap-1 font-medium text-sm"><BoltIcon className="h-4 w-4 text-amber-600" /> Featured</div>
                        <p className="text-xs text-muted-foreground">Top of results</p>
                        <p className="text-xs font-semibold text-amber-700 mt-0.5">R50</p>
                      </div>
                    </label>
                    {/* Urgent */}
                    <label className={`flex items-start gap-3 p-3 border rounded-xl cursor-pointer transition-colors ${
                      upgrades.includes('URGENT') ? 'border-red-400 bg-red-50/50' : 'hover:border-muted-foreground/30'
                    }`}>
                      <input type="checkbox" checked={upgrades.includes('URGENT')} onChange={(e) => setUpgrades(e.target.checked ? [...upgrades, 'URGENT'] : upgrades.filter(u => u !== 'URGENT'))} className="mt-0.5" />
                      <div>
                        <div className="flex items-center gap-1 font-medium text-sm"><FireIcon className="h-4 w-4 text-red-600" /> Urgent</div>
                        <p className="text-xs text-muted-foreground">Priority listing</p>
                        <p className="text-xs font-semibold text-red-700 mt-0.5">R100</p>
                      </div>
                    </label>
                    {/* Sealed */}
                    <label className={`flex items-start gap-3 p-3 border rounded-xl cursor-pointer transition-colors ${
                      upgrades.includes('SEALED') ? 'border-purple-400 bg-purple-50/50' : 'hover:border-muted-foreground/30'
                    }`}>
                      <input type="checkbox" checked={upgrades.includes('SEALED')} onChange={(e) => setUpgrades(e.target.checked ? [...upgrades, 'SEALED'] : upgrades.filter(u => u !== 'SEALED'))} className="mt-0.5" />
                      <div>
                        <div className="flex items-center gap-1 font-medium text-sm"><EyeSlashIcon className="h-4 w-4 text-purple-600" /> Sealed</div>
                        <p className="text-xs text-muted-foreground">Hide bids from others</p>
                        <p className="text-xs font-semibold text-purple-700 mt-0.5">R50</p>
                      </div>
                    </label>
                    {/* Private */}
                    <label className={`flex items-start gap-3 p-3 border rounded-xl cursor-pointer transition-colors ${
                      upgrades.includes('PRIVATE') ? 'border-gray-500 bg-gray-50/50' : 'hover:border-muted-foreground/30'
                    }`}>
                      <input type="checkbox" checked={upgrades.includes('PRIVATE')} onChange={(e) => setUpgrades(e.target.checked ? [...upgrades, 'PRIVATE'] : upgrades.filter(u => u !== 'PRIVATE'))} className="mt-0.5" />
                      <div>
                        <div className="flex items-center gap-1 font-medium text-sm"><LockClosedIcon className="h-4 w-4 text-gray-600" /> Private</div>
                        <p className="text-xs text-muted-foreground">Invite only</p>
                        <p className="text-xs font-semibold text-gray-700 mt-0.5">R150</p>
                      </div>
                    </label>
                    {/* IP Agreement */}
                    <label className={`flex items-start gap-3 p-3 border rounded-xl cursor-pointer transition-colors col-span-2 ${
                      upgrades.includes('IP_AGREEMENT') ? 'border-blue-400 bg-blue-50/50' : 'hover:border-muted-foreground/30'
                    }`}>
                      <input type="checkbox" checked={upgrades.includes('IP_AGREEMENT')} onChange={(e) => setUpgrades(e.target.checked ? [...upgrades, 'IP_AGREEMENT'] : upgrades.filter(u => u !== 'IP_AGREEMENT'))} className="mt-0.5" />
                      <div>
                        <div className="flex items-center gap-1 font-medium text-sm"><ShieldCheckIcon className="h-4 w-4 text-blue-600" /> IP Agreement</div>
                        <p className="text-xs text-muted-foreground">Sellers must accept IP transfer agreement before bidding</p>
                        <p className="text-xs font-semibold text-blue-700 mt-0.5">R200</p>
                      </div>
                    </label>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="w-full py-3 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl text-sm font-bold hover:opacity-90 disabled:opacity-50 transition-all"
                >
                  {createMutation.isPending ? 'Posting...' : `Post Project${upgradeTotal > 0 ? ` (+R${upgradeTotal} upgrades)` : ''}`}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
