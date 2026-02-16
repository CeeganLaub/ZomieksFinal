import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { useAuthStore } from '../../stores/auth.store';
import { projectsApi } from '../../lib/api';
import {
  ArrowLeftIcon,
  CurrencyDollarIcon,
  ClockIcon,
  ChatBubbleLeftIcon,
  CheckCircleIcon,
  XMarkIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline';

const STATUS_BADGES: Record<string, { label: string; className: string }> = {
  OPEN: { label: 'Open', className: 'bg-emerald-100 text-emerald-700' },
  IN_PROGRESS: { label: 'In Progress', className: 'bg-blue-100 text-blue-700' },
  COMPLETED: { label: 'Completed', className: 'bg-gray-100 text-gray-600' },
  CANCELLED: { label: 'Cancelled', className: 'bg-red-100 text-red-600' },
  PENDING: { label: 'Pending', className: 'bg-yellow-100 text-yellow-700' },
  ACCEPTED: { label: 'Accepted', className: 'bg-emerald-100 text-emerald-700' },
  REJECTED: { label: 'Rejected', className: 'bg-red-100 text-red-600' },
};

function formatBudget(min?: number | null, max?: number | null) {
  const fmt = (v: number) => `R${(v / 100).toLocaleString()}`;
  if (min && max) return `${fmt(min)} – ${fmt(max)}`;
  if (min) return `From ${fmt(min)}`;
  if (max) return `Up to ${fmt(max)}`;
  return 'Flexible';
}

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [showBidForm, setShowBidForm] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['project', id],
    queryFn: () => projectsApi.get(id!),
    enabled: !!id,
  });

  const project = data?.data;
  const isOwner = user && project?.buyerId === user.id;
  const isSeller = user?.isSeller;
  const myBid = project?.bids?.find((b: any) => b.sellerUsername === user?.username);

  // Bid form state
  const [bidAmount, setBidAmount] = useState('');
  const [bidDays, setBidDays] = useState('');
  const [bidProposal, setBidProposal] = useState('');

  const placeBid = useMutation({
    mutationFn: () => projectsApi.placeBid(id!, {
      amount: parseFloat(bidAmount),
      deliveryDays: parseInt(bidDays),
      proposal: bidProposal,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', id] });
      toast.success('Bid placed!');
      setShowBidForm(false);
      setBidAmount(''); setBidDays(''); setBidProposal('');
    },
    onError: (e: any) => toast.error(e?.error?.message || 'Failed to place bid'),
  });

  const acceptBid = useMutation({
    mutationFn: (bidId: string) => projectsApi.acceptBid(id!, bidId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', id] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Bid accepted! Project is now in progress.');
    },
    onError: (e: any) => toast.error(e?.error?.message || 'Failed to accept bid'),
  });

  const withdrawBid = useMutation({
    mutationFn: () => projectsApi.withdrawBid(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', id] });
      toast.success('Bid withdrawn');
    },
    onError: (e: any) => toast.error(e?.error?.message || 'Failed to withdraw bid'),
  });

  const cancelProject = useMutation({
    mutationFn: () => projectsApi.cancel(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Project cancelled');
      navigate('/projects');
    },
    onError: (e: any) => toast.error(e?.error?.message || 'Failed to cancel'),
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Project not found</p>
      </div>
    );
  }

  const badge = STATUS_BADGES[project.status] || STATUS_BADGES.OPEN;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back */}
      <button onClick={() => navigate('/projects')} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeftIcon className="h-4 w-4" />
        Back to Projects
      </button>

      {/* Project Header */}
      <div className="bg-card border rounded-2xl p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold">{project.title}</h1>
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${badge.className}`}>{badge.label}</span>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-4">
              <span className="flex items-center gap-1">
                <CurrencyDollarIcon className="h-4 w-4" />
                Budget: {formatBudget(project.budgetMin, project.budgetMax)}
              </span>
              {project.deadline && (
                <span className="flex items-center gap-1">
                  <ClockIcon className="h-4 w-4" />
                  Deadline: {new Date(project.deadline).toLocaleDateString()}
                </span>
              )}
              <span className="flex items-center gap-1">
                <ChatBubbleLeftIcon className="h-4 w-4" />
                {project.bidCount} bid{project.bidCount !== 1 ? 's' : ''}
              </span>
              {project.categoryName && (
                <span className="bg-muted px-2 py-0.5 rounded text-xs">{project.categoryName}</span>
              )}
            </div>
            <div className="prose prose-sm max-w-none text-foreground whitespace-pre-wrap">{project.description}</div>
            {project.skills?.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-4">
                {(project.skills as string[]).map((s) => (
                  <span key={s} className="bg-primary/10 text-primary text-xs px-2.5 py-1 rounded-full">{s}</span>
                ))}
              </div>
            )}
          </div>
          <div className="text-right shrink-0 text-sm text-muted-foreground">
            <p>Posted by</p>
            <p className="font-medium text-foreground">@{project.buyerUsername}</p>
            <p className="mt-1">{new Date(project.createdAt).toLocaleDateString()}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 mt-6 pt-4 border-t">
          {isOwner && project.status === 'OPEN' && (
            <button
              onClick={() => cancelProject.mutate()}
              disabled={cancelProject.isPending}
              className="px-4 py-2 border border-red-200 text-red-600 rounded-xl text-sm font-medium hover:bg-red-50 transition-colors"
            >
              Cancel Project
            </button>
          )}
          {isSeller && !isOwner && project.status === 'OPEN' && !myBid && (
            <button
              onClick={() => setShowBidForm(true)}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              Place a Bid
            </button>
          )}
          {myBid && myBid.status === 'PENDING' && (
            <button
              onClick={() => withdrawBid.mutate()}
              disabled={withdrawBid.isPending}
              className="px-4 py-2 border border-red-200 text-red-600 rounded-xl text-sm font-medium hover:bg-red-50 transition-colors"
            >
              Withdraw My Bid
            </button>
          )}
        </div>
      </div>

      {/* Bids Section */}
      {project.bids?.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-bold">
            {isOwner ? `Bids (${project.bids.length})` : 'Your Bid'}
          </h2>
          {project.bids.map((bid: any) => {
            const bidBadge = STATUS_BADGES[bid.status] || STATUS_BADGES.PENDING;
            return (
              <div key={bid.id} className="bg-card border rounded-2xl p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    {bid.sellerAvatar ? (
                      <img src={bid.sellerAvatar} className="h-10 w-10 rounded-full object-cover" alt="" />
                    ) : (
                      <UserCircleIcon className="h-10 w-10 text-muted-foreground" />
                    )}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold">{bid.sellerDisplayName || `@${bid.sellerUsername}`}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${bidBadge.className}`}>{bidBadge.label}</span>
                      </div>
                      {bid.sellerTitle && (
                        <p className="text-xs text-muted-foreground mb-2">{bid.sellerTitle}</p>
                      )}
                      <p className="text-sm text-foreground whitespace-pre-wrap">{bid.proposal}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-lg text-primary">R{(bid.amount / 100).toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">{bid.deliveryDays} day{bid.deliveryDays !== 1 ? 's' : ''} delivery</p>
                    {isOwner && project.status === 'OPEN' && bid.status === 'PENDING' && (
                      <button
                        onClick={() => acceptBid.mutate(bid.id)}
                        disabled={acceptBid.isPending}
                        className="mt-2 flex items-center gap-1 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-medium hover:bg-emerald-700 transition-colors"
                      >
                        <CheckCircleIcon className="h-4 w-4" />
                        Accept
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Bid Form Modal */}
      <AnimatePresence>
        {showBidForm && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setShowBidForm(false)}
          >
            <motion.div
              className="bg-card border rounded-2xl shadow-2xl w-full max-w-md"
              initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-5 border-b">
                <h2 className="text-lg font-bold">Place a Bid</h2>
                <button onClick={() => setShowBidForm(false)} className="p-1 hover:bg-muted rounded-lg">
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
              <form
                className="p-5 space-y-4"
                onSubmit={(e) => { e.preventDefault(); placeBid.mutate(); }}
              >
                <div>
                  <label className="text-sm font-medium">Your Price (ZAR) *</label>
                  <input
                    type="number" min="50" step="1" required
                    value={bidAmount}
                    onChange={(e) => setBidAmount(e.target.value)}
                    placeholder="e.g. 2500"
                    className="w-full mt-1 px-3 py-2 border rounded-xl bg-background text-sm"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Delivery Time (days) *</label>
                  <input
                    type="number" min="1" max="365" required
                    value={bidDays}
                    onChange={(e) => setBidDays(e.target.value)}
                    placeholder="e.g. 7"
                    className="w-full mt-1 px-3 py-2 border rounded-xl bg-background text-sm"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Proposal *</label>
                  <textarea
                    value={bidProposal}
                    onChange={(e) => setBidProposal(e.target.value)}
                    placeholder="Explain why you're the right person for this project..."
                    className="w-full mt-1 px-3 py-2 border rounded-xl bg-background text-sm min-h-[120px] resize-y"
                    required minLength={20} maxLength={3000}
                  />
                </div>
                <button
                  type="submit"
                  disabled={placeBid.isPending}
                  className="w-full py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                  {placeBid.isPending ? 'Submitting...' : 'Submit Bid'}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
