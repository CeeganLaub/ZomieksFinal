import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { useAuthStore } from '../../stores/auth.store';
import { projectsApi, servicesApi } from '../../lib/api';
import {
  PlusIcon,
  XMarkIcon,
  ClockIcon,
  CurrencyDollarIcon,
  ChatBubbleLeftIcon,
  FunnelIcon,
} from '@heroicons/react/24/outline';

const STATUS_BADGES: Record<string, { label: string; className: string }> = {
  OPEN: { label: 'Open', className: 'bg-emerald-100 text-emerald-700' },
  IN_PROGRESS: { label: 'In Progress', className: 'bg-blue-100 text-blue-700' },
  COMPLETED: { label: 'Completed', className: 'bg-gray-100 text-gray-600' },
  CANCELLED: { label: 'Cancelled', className: 'bg-red-100 text-red-600' },
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
  const [filter, setFilter] = useState<'all' | 'mine'>('all');

  const { data: allProjects, isLoading } = useQuery({
    queryKey: ['projects', 'all'],
    queryFn: () => projectsApi.list(),
  });

  const { data: myProjects } = useQuery({
    queryKey: ['projects', 'mine'],
    queryFn: () => projectsApi.mine(),
    enabled: !!user,
  });

  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => servicesApi.categories(),
  });

  const projects = filter === 'mine' ? (myProjects?.data || []) : (allProjects?.data || []);
  const categories = (categoriesData?.data || []) as Array<{ id: string; name: string }>;

  // Create form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [budgetMin, setBudgetMin] = useState('');
  const [budgetMax, setBudgetMax] = useState('');
  const [deadline, setDeadline] = useState('');
  const [skillInput, setSkillInput] = useState('');
  const [skills, setSkills] = useState<string[]>([]);

  const createMutation = useMutation({
    mutationFn: () => projectsApi.create({
      title,
      description,
      categoryId: categoryId || undefined,
      budgetMin: budgetMin ? parseFloat(budgetMin) : undefined,
      budgetMax: budgetMax ? parseFloat(budgetMax) : undefined,
      deadline: deadline || undefined,
      skills: skills.length > 0 ? skills : undefined,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Project posted!');
      setShowCreate(false);
      setTitle(''); setDescription(''); setCategoryId(''); setBudgetMin(''); setBudgetMax(''); setDeadline(''); setSkills([]);
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
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Projects</h1>
          <p className="text-muted-foreground text-sm">
            {user?.isSeller ? 'Browse projects and place bids' : 'Post a project and receive bids from sellers'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {user && (
            <div className="flex bg-muted rounded-lg p-1">
              <button
                onClick={() => setFilter('all')}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${filter === 'all' ? 'bg-background shadow font-medium' : 'text-muted-foreground hover:text-foreground'}`}
              >
                All Projects
              </button>
              <button
                onClick={() => setFilter('mine')}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${filter === 'mine' ? 'bg-background shadow font-medium' : 'text-muted-foreground hover:text-foreground'}`}
              >
                My Projects
              </button>
            </div>
          )}
          {user && !user.isSeller && (
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              <PlusIcon className="h-4 w-4" />
              Post Project
            </button>
          )}
        </div>
      </div>

      {/* Project list */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary" />
        </div>
      ) : projects.length === 0 ? (
        <div className="text-center py-20 bg-card border rounded-2xl">
          <FunnelIcon className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
          <p className="text-muted-foreground font-medium">No projects yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            {filter === 'mine' ? 'You haven\'t posted any projects' : 'Be the first to post a project'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {projects.map((p: any) => {
            const badge = STATUS_BADGES[p.status] || STATUS_BADGES.OPEN;
            return (
              <Link
                key={p.id}
                to={`/projects/${p.id}`}
                className="block bg-card border rounded-2xl p-5 hover:border-primary/40 transition-colors group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-lg group-hover:text-primary transition-colors truncate">
                        {p.title}
                      </h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badge.className}`}>
                        {badge.label}
                      </span>
                    </div>
                    <p className="text-muted-foreground text-sm line-clamp-2 mb-3">{p.description}</p>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <CurrencyDollarIcon className="h-4 w-4" />
                        {formatBudget(p.budgetMin, p.budgetMax)}
                      </span>
                      {p.deadline && (
                        <span className="flex items-center gap-1">
                          <ClockIcon className="h-4 w-4" />
                          {new Date(p.deadline).toLocaleDateString()}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <ChatBubbleLeftIcon className="h-4 w-4" />
                        {p.bidCount} bid{p.bidCount !== 1 ? 's' : ''}
                      </span>
                      {p.categoryName && (
                        <span className="bg-muted px-2 py-0.5 rounded text-xs">{p.categoryName}</span>
                      )}
                    </div>
                    {p.skills?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {(p.skills as string[]).map((s) => (
                          <span key={s} className="bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full">{s}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-muted-foreground">{timeAgo(p.createdAt)}</p>
                    {p.buyerUsername && (
                      <p className="text-xs text-muted-foreground mt-1">by @{p.buyerUsername}</p>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Create Modal */}
      <AnimatePresence>
        {showCreate && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setShowCreate(false)}
          >
            <motion.div
              className="bg-card border rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto"
              initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-5 border-b">
                <h2 className="text-lg font-bold">Post a Project</h2>
                <button onClick={() => setShowCreate(false)} className="p-1 hover:bg-muted rounded-lg">
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
              <form
                className="p-5 space-y-4"
                onSubmit={(e) => { e.preventDefault(); createMutation.mutate(); }}
              >
                <div>
                  <label className="text-sm font-medium">Project Title *</label>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Build a React landing page"
                    className="w-full mt-1 px-3 py-2 border rounded-xl bg-background text-sm"
                    required minLength={10} maxLength={200}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Description *</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe what you need done, include requirements and expectations..."
                    className="w-full mt-1 px-3 py-2 border rounded-xl bg-background text-sm min-h-[120px] resize-y"
                    required minLength={30} maxLength={5000}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Category</label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full mt-1 px-3 py-2 border rounded-xl bg-background text-sm"
                  >
                    <option value="">Any category</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium">Min Budget (ZAR)</label>
                    <input
                      type="number" min="50" step="1"
                      value={budgetMin}
                      onChange={(e) => setBudgetMin(e.target.value)}
                      placeholder="500"
                      className="w-full mt-1 px-3 py-2 border rounded-xl bg-background text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Max Budget (ZAR)</label>
                    <input
                      type="number" min="50" step="1"
                      value={budgetMax}
                      onChange={(e) => setBudgetMax(e.target.value)}
                      placeholder="5000"
                      className="w-full mt-1 px-3 py-2 border rounded-xl bg-background text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Deadline</label>
                  <input
                    type="date"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full mt-1 px-3 py-2 border rounded-xl bg-background text-sm"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Required Skills</label>
                  <div className="flex gap-2 mt-1">
                    <input
                      value={skillInput}
                      onChange={(e) => setSkillInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSkill(); } }}
                      placeholder="e.g. React, Node.js"
                      className="flex-1 px-3 py-2 border rounded-xl bg-background text-sm"
                    />
                    <button type="button" onClick={addSkill} className="px-3 py-2 bg-muted rounded-xl text-sm font-medium hover:bg-muted/80">
                      Add
                    </button>
                  </div>
                  {skills.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {skills.map((s) => (
                        <span key={s} className="bg-primary/10 text-primary text-xs px-2 py-1 rounded-full flex items-center gap-1">
                          {s}
                          <button type="button" onClick={() => setSkills(skills.filter((x) => x !== s))} className="hover:text-red-500">
                            <XMarkIcon className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="w-full py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                  {createMutation.isPending ? 'Posting...' : 'Post Project'}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
