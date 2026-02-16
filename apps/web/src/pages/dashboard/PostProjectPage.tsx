import { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { useAuthStore } from '../../stores/auth.store';
import { projectsApi, servicesApi } from '../../lib/api';
import {
  PlusIcon,
  XMarkIcon,
  ChevronRightIcon,
  ChevronLeftIcon,
  BoltIcon,
  FireIcon,
  EyeSlashIcon,
  LockClosedIcon,
  ShieldCheckIcon,
  CheckIcon,
  RocketLaunchIcon,
  UserIcon,
} from '@heroicons/react/24/outline';

const UPGRADE_PRICES: Record<string, number> = {
  FEATURED: 50,
  URGENT: 100,
  SEALED: 50,
  PRIVATE: 150,
  IP_AGREEMENT: 200,
};

const STEPS = [
  { id: 1, label: 'Details' },
  { id: 2, label: 'Budget & Skills' },
  { id: 3, label: 'Upgrades' },
  { id: 4, label: 'Review & Post' },
];

export default function PostProjectPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [budgetMin, setBudgetMin] = useState('');
  const [budgetMax, setBudgetMax] = useState('');
  const [deadline, setDeadline] = useState('');
  const [skillInput, setSkillInput] = useState('');
  const [skills, setSkills] = useState<string[]>([]);
  const [upgrades, setUpgrades] = useState<string[]>([]);

  // Resume from auth redirect — restore saved form data
  useEffect(() => {
    if (searchParams.get('resume') === 'true') {
      try {
        const saved = sessionStorage.getItem('pendingProject');
        if (saved) {
          const data = JSON.parse(saved);
          if (data.title) setTitle(data.title);
          if (data.description) setDescription(data.description);
          if (data.categoryId) setCategoryId(data.categoryId);
          if (data.budgetMin) setBudgetMin(data.budgetMin);
          if (data.budgetMax) setBudgetMax(data.budgetMax);
          if (data.deadline) setDeadline(data.deadline);
          if (data.skills) setSkills(data.skills);
          if (data.upgrades) setUpgrades(data.upgrades);
          setStep(4); // Go straight to review
          sessionStorage.removeItem('pendingProject');
        }
      } catch { /* ignore parse errors */ }
    }
  }, [searchParams]);

  const upgradeTotal = upgrades.reduce((sum, u) => sum + (UPGRADE_PRICES[u] || 0), 0);

  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => servicesApi.categories(),
  });
  const categories = (categoriesData?.data || []) as Array<{ id: string; name: string }>;

  const createMutation = useMutation({
    mutationFn: () => projectsApi.create({
      title,
      description,
      categoryId: categoryId || undefined,
      budgetMin: budgetMin ? parseFloat(budgetMin) : undefined,
      budgetMax: budgetMax ? parseFloat(budgetMax) : undefined,
      deadline: deadline || undefined,
      skills: skills.length > 0 ? skills : undefined,
      upgrades: upgrades.length > 0 ? upgrades : undefined,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Project posted successfully!');
      navigate('/projects?view=mine');
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

  const canProceed = (): boolean => {
    if (step === 1) return title.trim().length >= 10 && description.trim().length >= 30;
    return true;
  };

  const handleNext = () => {
    if (step < 4) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSubmit = () => {
    if (!user) {
      // Save form data to sessionStorage so it persists through auth flow
      sessionStorage.setItem('pendingProject', JSON.stringify({
        title, description, categoryId, budgetMin, budgetMax, deadline, skills, upgrades,
      }));
      setShowAuthPrompt(true);
      return;
    }
    createMutation.mutate();
  };

  const formatBudget = () => {
    if (budgetMin && budgetMax) return `R${Number(budgetMin).toLocaleString()} – R${Number(budgetMax).toLocaleString()}`;
    if (budgetMin) return `From R${Number(budgetMin).toLocaleString()}`;
    if (budgetMax) return `Up to R${Number(budgetMax).toLocaleString()}`;
    return 'Flexible';
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-muted/30 to-background">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 via-primary to-teal-600 relative overflow-hidden">
        <div className="absolute -top-20 -left-20 w-72 h-72 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-10 right-10 w-60 h-60 bg-teal-400/20 rounded-full blur-3xl" />
        <div className="relative container py-10">
          <Link to="/projects" className="inline-flex items-center gap-1 text-white/70 hover:text-white text-sm mb-3 transition-colors">
            <ChevronLeftIcon className="h-4 w-4" /> Back to Projects
          </Link>
          <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-2">Post a Project</h1>
          <p className="text-white/80 max-w-xl">
            Describe what you need and get competitive bids from skilled freelancers.
          </p>
        </div>
      </div>

      <div className="container py-8 max-w-3xl">
        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-10">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center flex-1 last:flex-initial">
              <div className="flex flex-col items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                  step > s.id
                    ? 'bg-primary text-white'
                    : step === s.id
                      ? 'bg-primary text-white shadow-lg shadow-primary/30'
                      : 'bg-muted text-muted-foreground'
                }`}>
                  {step > s.id ? <CheckIcon className="h-5 w-5" /> : s.id}
                </div>
                <span className={`text-xs mt-2 font-medium ${
                  step >= s.id ? 'text-foreground' : 'text-muted-foreground'
                }`}>{s.label}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 mx-3 mt-[-1rem] ${
                  step > s.id ? 'bg-primary' : 'bg-muted'
                }`} />
              )}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            <div className="bg-card border rounded-2xl p-6 md:p-8 shadow-sm">
              {step === 1 && (
                <div className="space-y-5">
                  <div>
                    <h2 className="text-xl font-bold mb-1">Project Details</h2>
                    <p className="text-sm text-muted-foreground">Tell freelancers what you need done.</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Project Title <span className="text-red-500">*</span></label>
                    <input
                      value={title} onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. Build a React landing page"
                      className="w-full mt-1.5 px-4 py-3 border rounded-xl bg-background text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                      maxLength={200}
                    />
                    <p className="text-xs text-muted-foreground mt-1">{title.length}/200 characters (min 10)</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Description <span className="text-red-500">*</span></label>
                    <textarea
                      value={description} onChange={(e) => setDescription(e.target.value)}
                      placeholder="Describe what you need, your requirements, and any preferences..."
                      className="w-full mt-1.5 px-4 py-3 border rounded-xl bg-background text-sm min-h-[160px] resize-y focus:ring-2 focus:ring-primary focus:outline-none"
                      maxLength={5000}
                    />
                    <p className="text-xs text-muted-foreground mt-1">{description.length}/5000 characters (min 30)</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Category</label>
                    <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="w-full mt-1.5 px-4 py-3 border rounded-xl bg-background text-sm focus:ring-2 focus:ring-primary focus:outline-none">
                      <option value="">Any category</option>
                      {categories.map((cat) => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                    </select>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-5">
                  <div>
                    <h2 className="text-xl font-bold mb-1">Budget & Skills</h2>
                    <p className="text-sm text-muted-foreground">Set your budget range and required skills.</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Min Budget (ZAR)</label>
                      <div className="relative mt-1.5">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R</span>
                        <input type="number" min="50" step="1" value={budgetMin} onChange={(e) => setBudgetMin(e.target.value)} placeholder="500" className="w-full pl-8 pr-4 py-3 border rounded-xl bg-background text-sm focus:ring-2 focus:ring-primary focus:outline-none" />
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Max Budget (ZAR)</label>
                      <div className="relative mt-1.5">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R</span>
                        <input type="number" min="50" step="1" value={budgetMax} onChange={(e) => setBudgetMax(e.target.value)} placeholder="5000" className="w-full pl-8 pr-4 py-3 border rounded-xl bg-background text-sm focus:ring-2 focus:ring-primary focus:outline-none" />
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Deadline</label>
                    <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} min={new Date().toISOString().split('T')[0]} className="w-full mt-1.5 px-4 py-3 border rounded-xl bg-background text-sm focus:ring-2 focus:ring-primary focus:outline-none" />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Required Skills</label>
                    <div className="flex gap-2 mt-1.5">
                      <input value={skillInput} onChange={(e) => setSkillInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSkill(); }}} placeholder="e.g. React, Node.js, Python" className="flex-1 px-4 py-3 border rounded-xl bg-background text-sm focus:ring-2 focus:ring-primary focus:outline-none" />
                      <button type="button" onClick={addSkill} className="px-4 py-3 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors">
                        <PlusIcon className="h-5 w-5" />
                      </button>
                    </div>
                    {skills.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {skills.map((s) => (
                          <span key={s} className="bg-primary/10 text-primary text-sm px-3 py-1.5 rounded-full flex items-center gap-1.5 font-medium">
                            {s}
                            <button type="button" onClick={() => setSkills(skills.filter((x) => x !== s))} className="hover:text-red-500"><XMarkIcon className="h-3.5 w-3.5" /></button>
                          </span>
                        ))}
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground mt-2">{skills.length}/10 skills added</p>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-5">
                  <div>
                    <h2 className="text-xl font-bold mb-1">Boost Your Project</h2>
                    <p className="text-sm text-muted-foreground">Optional upgrades to get more visibility and better bids.</p>
                  </div>
                  <div className="space-y-3">
                    {[
                      { key: 'FEATURED', icon: BoltIcon, label: 'Featured', desc: 'Highlighted at the top of search results', price: 50, color: 'amber' },
                      { key: 'URGENT', icon: FireIcon, label: 'Urgent', desc: 'Marked as priority — attracts faster responses', price: 100, color: 'red' },
                      { key: 'SEALED', icon: EyeSlashIcon, label: 'Sealed Bids', desc: 'Freelancers can\'t see each other\'s bids', price: 50, color: 'emerald' },
                      { key: 'PRIVATE', icon: LockClosedIcon, label: 'Private Project', desc: 'Only invited freelancers can bid', price: 150, color: 'gray' },
                      { key: 'IP_AGREEMENT', icon: ShieldCheckIcon, label: 'IP Agreement', desc: 'Freelancers must accept IP transfer before bidding', price: 200, color: 'blue' },
                    ].map((upgrade) => {
                      const isActive = upgrades.includes(upgrade.key);
                      return (
                        <label
                          key={upgrade.key}
                          className={`flex items-center gap-4 p-4 border-2 rounded-xl cursor-pointer transition-all ${
                            isActive
                              ? `border-${upgrade.color}-400 bg-${upgrade.color}-50/50`
                              : 'border-transparent bg-muted/30 hover:bg-muted/50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isActive}
                            onChange={(e) => setUpgrades(e.target.checked ? [...upgrades, upgrade.key] : upgrades.filter(u => u !== upgrade.key))}
                            className="sr-only"
                          />
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                            isActive ? `bg-${upgrade.color}-100 text-${upgrade.color}-600` : 'bg-muted text-muted-foreground'
                          }`}>
                            <upgrade.icon className="h-5 w-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm">{upgrade.label}</p>
                            <p className="text-xs text-muted-foreground">{upgrade.desc}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className={`font-bold text-sm ${isActive ? `text-${upgrade.color}-700` : 'text-foreground'}`}>R{upgrade.price}</p>
                            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ml-auto mt-1 ${
                              isActive ? 'bg-primary border-primary' : 'border-muted-foreground/30'
                            }`}>
                              {isActive && <CheckIcon className="h-3 w-3 text-white" />}
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                  {upgradeTotal > 0 && (
                    <div className="flex items-center justify-between p-4 bg-primary/5 rounded-xl border border-primary/20">
                      <span className="text-sm font-medium">Total upgrade cost:</span>
                      <span className="text-lg font-bold text-primary">R{upgradeTotal}</span>
                    </div>
                  )}
                </div>
              )}

              {step === 4 && (
                <div className="space-y-5">
                  <div>
                    <h2 className="text-xl font-bold mb-1">Review Your Project</h2>
                    <p className="text-sm text-muted-foreground">Check everything looks good before posting.</p>
                  </div>

                  <div className="space-y-4">
                    <div className="p-4 bg-muted/30 rounded-xl space-y-3">
                      <div>
                        <p className="text-xs uppercase tracking-wide text-muted-foreground font-medium">Title</p>
                        <p className="font-semibold">{title}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-wide text-muted-foreground font-medium">Description</p>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{description}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs uppercase tracking-wide text-muted-foreground font-medium">Category</p>
                          <p className="text-sm">{categories.find(c => c.id === categoryId)?.name || 'Any'}</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-wide text-muted-foreground font-medium">Budget</p>
                          <p className="text-sm font-semibold text-emerald-600">{formatBudget()}</p>
                        </div>
                      </div>
                      {deadline && (
                        <div>
                          <p className="text-xs uppercase tracking-wide text-muted-foreground font-medium">Deadline</p>
                          <p className="text-sm">{new Date(deadline).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                        </div>
                      )}
                      {skills.length > 0 && (
                        <div>
                          <p className="text-xs uppercase tracking-wide text-muted-foreground font-medium mb-1.5">Skills</p>
                          <div className="flex flex-wrap gap-1.5">
                            {skills.map(s => <span key={s} className="bg-primary/10 text-primary text-xs px-2.5 py-1 rounded-full font-medium">{s}</span>)}
                          </div>
                        </div>
                      )}
                    </div>

                    {upgrades.length > 0 && (
                      <div className="p-4 bg-muted/30 rounded-xl">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground font-medium mb-2">Upgrades</p>
                        <div className="space-y-2">
                          {upgrades.map(u => (
                            <div key={u} className="flex items-center justify-between text-sm">
                              <span>{u.replace('_', ' ')}</span>
                              <span className="font-medium">R{UPGRADE_PRICES[u]}</span>
                            </div>
                          ))}
                          <div className="flex items-center justify-between text-sm font-bold pt-2 border-t">
                            <span>Total</span>
                            <span className="text-primary">R{upgradeTotal}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between mt-6">
              {step > 1 ? (
                <button
                  onClick={handleBack}
                  className="inline-flex items-center gap-2 px-5 py-2.5 border rounded-xl text-sm font-medium hover:bg-muted transition-colors"
                >
                  <ChevronLeftIcon className="h-4 w-4" /> Back
                </button>
              ) : (
                <Link
                  to="/projects"
                  className="inline-flex items-center gap-2 px-5 py-2.5 border rounded-xl text-sm font-medium hover:bg-muted transition-colors"
                >
                  Cancel
                </Link>
              )}

              {step < 4 ? (
                <button
                  onClick={handleNext}
                  disabled={!canProceed()}
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary/90 disabled:opacity-50 transition-all"
                >
                  Next <ChevronRightIcon className="h-4 w-4" />
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={createMutation.isPending}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl text-sm font-bold hover:opacity-90 disabled:opacity-50 transition-all shadow-lg shadow-emerald-600/20"
                >
                  {createMutation.isPending ? (
                    <>Posting...</>
                  ) : (
                    <>
                      <RocketLaunchIcon className="h-5 w-5" />
                      Post Project{upgradeTotal > 0 ? ` (+R${upgradeTotal})` : ''}
                    </>
                  )}
                </button>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Auth Prompt Modal */}
      <AnimatePresence>
        {showAuthPrompt && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setShowAuthPrompt(false)}
          >
            <motion.div
              className="bg-card border rounded-2xl shadow-2xl w-full max-w-md p-8 text-center"
              initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center mb-5">
                <UserIcon className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-xl font-bold mb-2">Sign up to post your project</h2>
              <p className="text-muted-foreground text-sm mb-6">
                Create a free account or sign in to post your project and start receiving bids from freelancers.
              </p>
              <p className="text-xs text-muted-foreground mb-6 bg-muted/50 rounded-lg p-3">
                Your project details have been saved and will be ready to post after you sign in.
              </p>
              <div className="space-y-3">
                <Link
                  to={`/register?redirect=${encodeURIComponent('/projects/post?resume=true')}`}
                  className="block w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl text-sm font-bold hover:opacity-90 transition-all"
                >
                  Create Free Account
                </Link>
                <Link
                  to={`/login?redirect=${encodeURIComponent('/projects/post?resume=true')}`}
                  className="block w-full py-3 border-2 border-primary text-primary rounded-xl text-sm font-bold hover:bg-primary/5 transition-all"
                >
                  Sign In
                </Link>
              </div>
              <button
                onClick={() => setShowAuthPrompt(false)}
                className="mt-4 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Go back and edit
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
