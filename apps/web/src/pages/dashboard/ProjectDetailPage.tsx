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
  DocumentIcon,
  StarIcon,
  TrashIcon,
  ArrowUpTrayIcon,
  BoltIcon,
  FireIcon,
  PencilIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarSolid } from '@heroicons/react/24/solid';

const STATUS_BADGES: Record<string, { label: string; className: string }> = {
  OPEN: { label: 'Open', className: 'bg-emerald-100 text-emerald-700' },
  IN_PROGRESS: { label: 'In Progress', className: 'bg-blue-100 text-blue-700' },
  COMPLETED: { label: 'Completed', className: 'bg-gray-100 text-gray-600' },
  CANCELLED: { label: 'Cancelled', className: 'bg-red-100 text-red-600' },
  PENDING: { label: 'Pending', className: 'bg-yellow-100 text-yellow-700' },
  ACCEPTED: { label: 'Accepted', className: 'bg-emerald-100 text-emerald-700' },
  REJECTED: { label: 'Rejected', className: 'bg-red-100 text-red-600' },
  HELD: { label: 'Held', className: 'bg-yellow-100 text-yellow-700' },
  RELEASED: { label: 'Released', className: 'bg-emerald-100 text-emerald-700' },
  REFUNDED: { label: 'Refunded', className: 'bg-gray-100 text-gray-600' },
  PAID: { label: 'Paid', className: 'bg-emerald-100 text-emerald-700' },
};

const TABS = ['Details', 'Proposals', 'Upgrades', 'Payments', 'Files', 'Reviews'] as const;
type Tab = typeof TABS[number];

function formatBudget(min?: number | null, max?: number | null) {
  const fmt = (v: number) => `R${(v / 100).toLocaleString()}`;
  if (min && max) return `${fmt(min)} – ${fmt(max)}`;
  if (min) return `From ${fmt(min)}`;
  if (max) return `Up to ${fmt(max)}`;
  return 'Flexible';
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<Tab>('Details');
  const [showBidForm, setShowBidForm] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['project', id],
    queryFn: () => projectsApi.get(id!),
    enabled: !!id,
  });

  const project = data?.data;
  const isOwner = user && project?.buyerId === user.id;
  const isSeller = user?.isSeller;
  const isAwardedSeller = user && project?.awardedSellerId === user.id;
  const myBid = project?.bids?.find((b: any) => b.sellerId === user?.id);

  // Bid form state
  const [bidAmount, setBidAmount] = useState('');
  const [bidDays, setBidDays] = useState('');
  const [bidProposal, setBidProposal] = useState('');

  // Payment form state
  const [payAmount, setPayAmount] = useState('');
  const [payLabel, setPayLabel] = useState('');

  // Review form state
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');

  // Edit form state
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');

  // File upload state
  const [fileName, setFileName] = useState('');
  const [fileUrl, setFileUrl] = useState('');

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['project', id] });

  const placeBid = useMutation({
    mutationFn: () => projectsApi.placeBid(id!, {
      amount: parseFloat(bidAmount),
      deliveryDays: parseInt(bidDays),
      proposal: bidProposal,
    }),
    onSuccess: () => { invalidate(); toast.success('Bid placed!'); setShowBidForm(false); setBidAmount(''); setBidDays(''); setBidProposal(''); },
    onError: (e: any) => toast.error(e?.error?.message || 'Failed to place bid'),
  });

  const acceptBid = useMutation({
    mutationFn: (bidId: string) => projectsApi.acceptBid(id!, bidId),
    onSuccess: () => { invalidate(); toast.success('Bid accepted! Project is now in progress.'); },
    onError: (e: any) => toast.error(e?.error?.message || 'Failed to accept bid'),
  });

  const withdrawBid = useMutation({
    mutationFn: () => projectsApi.withdrawBid(id!),
    onSuccess: () => { invalidate(); toast.success('Bid withdrawn'); },
    onError: (e: any) => toast.error(e?.error?.message || 'Failed to withdraw bid'),
  });

  const cancelProject = useMutation({
    mutationFn: () => projectsApi.cancel(id!),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['projects'] }); toast.success('Project cancelled'); navigate('/projects'); },
    onError: (e: any) => toast.error(e?.error?.message || 'Failed to cancel'),
  });

  const deleteProject = useMutation({
    mutationFn: () => projectsApi.delete(id!),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['projects'] }); toast.success('Project deleted'); navigate('/projects'); },
    onError: (e: any) => toast.error(e?.error?.message || 'Failed to delete'),
  });

  const completeProject = useMutation({
    mutationFn: () => projectsApi.complete(id!),
    onSuccess: () => { invalidate(); toast.success('Project marked as completed!'); },
    onError: (e: any) => toast.error(e?.error?.message || 'Failed to complete'),
  });

  const upgradeProject = useMutation({
    mutationFn: (type: 'FEATURED' | 'URGENT') => projectsApi.upgrade(id!, type),
    onSuccess: (_, type) => { invalidate(); toast.success(`Project upgraded to ${type}! (R100)`); },
    onError: (e: any) => toast.error(e?.error?.message || 'Failed to upgrade'),
  });

  const createPayment = useMutation({
    mutationFn: () => projectsApi.createPayment(id!, { amount: parseFloat(payAmount), milestoneLabel: payLabel || undefined }),
    onSuccess: () => { invalidate(); toast.success('Payment created and held in escrow'); setShowPaymentForm(false); setPayAmount(''); setPayLabel(''); },
    onError: (e: any) => toast.error(e?.error?.message || 'Failed to create payment'),
  });

  const releasePayment = useMutation({
    mutationFn: (paymentId: string) => projectsApi.releasePayment(id!, paymentId),
    onSuccess: () => { invalidate(); toast.success('Payment released to seller'); },
    onError: (e: any) => toast.error(e?.error?.message || 'Failed to release payment'),
  });

  const uploadFile = useMutation({
    mutationFn: () => projectsApi.uploadFile(id!, { fileName, fileUrl, fileSize: 0 }),
    onSuccess: () => { invalidate(); toast.success('File added'); setFileName(''); setFileUrl(''); },
    onError: (e: any) => toast.error(e?.error?.message || 'Failed to add file'),
  });

  const deleteFile = useMutation({
    mutationFn: (fileId: string) => projectsApi.deleteFile(id!, fileId),
    onSuccess: () => { invalidate(); toast.success('File deleted'); },
    onError: (e: any) => toast.error(e?.error?.message || 'Failed to delete file'),
  });

  const createReview = useMutation({
    mutationFn: () => {
      const revieweeId = isOwner ? project.awardedSellerId : project.buyerId;
      return projectsApi.createReview(id!, { revieweeId, rating: reviewRating, comment: reviewComment || undefined });
    },
    onSuccess: () => { invalidate(); toast.success('Review submitted'); setShowReviewForm(false); setReviewRating(5); setReviewComment(''); },
    onError: (e: any) => toast.error(e?.error?.message || 'Failed to submit review'),
  });

  const updateProject = useMutation({
    mutationFn: () => projectsApi.update(id!, { title: editTitle, description: editDesc }),
    onSuccess: () => { invalidate(); toast.success('Project updated'); setShowEditForm(false); },
    onError: (e: any) => toast.error(e?.error?.message || 'Failed to update'),
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
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Back */}
      <button onClick={() => navigate('/projects')} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeftIcon className="h-4 w-4" />
        Back to Projects
      </button>

      {/* Project Header */}
      <div className="bg-card border rounded-2xl p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <h1 className="text-2xl font-bold">{project.title}</h1>
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${badge.className}`}>{badge.label}</span>
              {project.isFeatured && (
                <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-amber-100 text-amber-700 flex items-center gap-1">
                  <BoltIcon className="h-3 w-3" /> Featured
                </span>
              )}
              {project.isUrgent && (
                <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-red-100 text-red-700 flex items-center gap-1">
                  <FireIcon className="h-3 w-3" /> Urgent
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
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
          </div>
          <div className="text-right shrink-0 text-sm text-muted-foreground">
            <p>Posted by</p>
            <p className="font-medium text-foreground">@{project.buyerUsername}</p>
            <p className="mt-1">{new Date(project.createdAt).toLocaleDateString()}</p>
          </div>
        </div>

        {/* Management Actions */}
        {isOwner && (
          <div className="flex items-center gap-3 mt-4 pt-4 border-t flex-wrap">
            {project.status === 'OPEN' && (
              <>
                <button onClick={() => { setEditTitle(project.title); setEditDesc(project.description); setShowEditForm(true); }} className="px-3 py-1.5 border rounded-xl text-sm font-medium hover:bg-muted transition-colors flex items-center gap-1">
                  <PencilIcon className="h-4 w-4" /> Edit
                </button>
                <button onClick={() => cancelProject.mutate()} disabled={cancelProject.isPending} className="px-3 py-1.5 border border-red-200 text-red-600 rounded-xl text-sm font-medium hover:bg-red-50 transition-colors">
                  Cancel
                </button>
                <button onClick={() => { if (confirm('Delete this project permanently?')) deleteProject.mutate(); }} disabled={deleteProject.isPending} className="px-3 py-1.5 border border-red-200 text-red-600 rounded-xl text-sm font-medium hover:bg-red-50 transition-colors flex items-center gap-1">
                  <TrashIcon className="h-4 w-4" /> Delete
                </button>
              </>
            )}
            {project.status === 'IN_PROGRESS' && (
              <button onClick={() => completeProject.mutate()} disabled={completeProject.isPending} className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 transition-colors flex items-center gap-1">
                <CheckCircleIcon className="h-4 w-4" /> Mark Complete
              </button>
            )}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b">
        <div className="flex gap-1 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30'
              }`}
            >
              {tab}
              {tab === 'Proposals' && project.bidCount > 0 && (
                <span className="ml-1.5 text-xs bg-muted px-1.5 py-0.5 rounded-full">{project.bidCount}</span>
              )}
              {tab === 'Files' && project.files?.length > 0 && (
                <span className="ml-1.5 text-xs bg-muted px-1.5 py-0.5 rounded-full">{project.files.length}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="min-h-[300px]">
        {/* ── DETAILS TAB ── */}
        {activeTab === 'Details' && (
          <div className="bg-card border rounded-2xl p-6 space-y-4">
            <h2 className="text-lg font-bold">Project Description</h2>
            <div className="prose prose-sm max-w-none text-foreground whitespace-pre-wrap">{project.description}</div>
            {project.skills?.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-2">Required Skills</h3>
                <div className="flex flex-wrap gap-1.5">
                  {(project.skills as string[]).map((s) => (
                    <span key={s} className="bg-primary/10 text-primary text-xs px-2.5 py-1 rounded-full">{s}</span>
                  ))}
                </div>
              </div>
            )}
            {project.attachments?.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-2">Attachments</h3>
                <div className="space-y-1">
                  {(project.attachments as string[]).map((url, i) => (
                    <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline flex items-center gap-1">
                      <DocumentIcon className="h-4 w-4" /> Attachment {i + 1}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── PROPOSALS TAB ── */}
        {activeTab === 'Proposals' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">
                {isOwner ? `Proposals (${project.bids?.length || 0})` : 'Your Proposal'}
              </h2>
              {isSeller && !isOwner && project.status === 'OPEN' && !myBid && (
                <button onClick={() => setShowBidForm(true)} className="px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors">
                  Place a Bid
                </button>
              )}
            </div>

            {myBid && myBid.status === 'PENDING' && (
              <button onClick={() => withdrawBid.mutate()} disabled={withdrawBid.isPending} className="px-3 py-1.5 border border-red-200 text-red-600 rounded-xl text-sm font-medium hover:bg-red-50 transition-colors">
                Withdraw My Bid
              </button>
            )}

            {project.bids?.length > 0 ? (
              project.bids.map((bid: any) => {
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
                          {bid.sellerTitle && <p className="text-xs text-muted-foreground mb-2">{bid.sellerTitle}</p>}
                          <p className="text-sm text-foreground whitespace-pre-wrap">{bid.proposal}</p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-bold text-lg text-primary">R{(bid.amount / 100).toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">{bid.deliveryDays} day{bid.deliveryDays !== 1 ? 's' : ''}</p>
                        {isOwner && project.status === 'OPEN' && bid.status === 'PENDING' && (
                          <button onClick={() => acceptBid.mutate(bid.id)} disabled={acceptBid.isPending} className="mt-2 flex items-center gap-1 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-medium hover:bg-emerald-700 transition-colors">
                            <CheckCircleIcon className="h-4 w-4" /> Award
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="bg-card border rounded-2xl p-8 text-center text-muted-foreground">
                <ChatBubbleLeftIcon className="h-10 w-10 mx-auto mb-2 opacity-40" />
                <p>No proposals yet</p>
              </div>
            )}
          </div>
        )}

        {/* ── UPGRADES TAB ── */}
        {activeTab === 'Upgrades' && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold">Project Upgrades</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Featured */}
              <div className={`border rounded-2xl p-5 ${project.isFeatured ? 'border-amber-300 bg-amber-50/50' : 'bg-card'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <BoltIcon className="h-5 w-5 text-amber-600" />
                  <h3 className="font-semibold">Featured</h3>
                  {project.isFeatured && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Active</span>}
                </div>
                <p className="text-sm text-muted-foreground mb-3">Your project appears at the top of search results, attracting more freelancers.</p>
                <p className="font-bold text-lg mb-3">R100</p>
                {isOwner && !project.isFeatured && (
                  <button onClick={() => upgradeProject.mutate('FEATURED')} disabled={upgradeProject.isPending} className="w-full py-2 bg-amber-600 text-white rounded-xl text-sm font-medium hover:bg-amber-700 transition-colors">
                    Upgrade to Featured
                  </button>
                )}
              </div>
              {/* Urgent */}
              <div className={`border rounded-2xl p-5 ${project.isUrgent ? 'border-red-300 bg-red-50/50' : 'bg-card'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <FireIcon className="h-5 w-5 text-red-600" />
                  <h3 className="font-semibold">Urgent</h3>
                  {project.isUrgent && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">Active</span>}
                </div>
                <p className="text-sm text-muted-foreground mb-3">Marks the project as urgent so freelancers prioritize it in their queue.</p>
                <p className="font-bold text-lg mb-3">R100</p>
                {isOwner && !project.isUrgent && (
                  <button onClick={() => upgradeProject.mutate('URGENT')} disabled={upgradeProject.isPending} className="w-full py-2 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 transition-colors">
                    Upgrade to Urgent
                  </button>
                )}
              </div>
            </div>

            {/* Upgrade History */}
            {project.upgrades?.length > 0 && (
              <div className="mt-4">
                <h3 className="text-sm font-semibold mb-2">Upgrade History</h3>
                <div className="space-y-2">
                  {project.upgrades.map((u: any) => (
                    <div key={u.id} className="flex items-center justify-between bg-card border rounded-xl px-4 py-2 text-sm">
                      <span className="flex items-center gap-2">
                        {u.type === 'FEATURED' ? <BoltIcon className="h-4 w-4 text-amber-600" /> : <FireIcon className="h-4 w-4 text-red-600" />}
                        {u.type}
                      </span>
                      <span>R{(u.amount / 100).toFixed(2)}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_BADGES[u.status]?.className || ''}`}>
                        {u.status}
                      </span>
                      <span className="text-muted-foreground">{new Date(u.createdAt).toLocaleDateString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── PAYMENTS TAB ── */}
        {activeTab === 'Payments' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">Payments</h2>
              {isOwner && project.status === 'IN_PROGRESS' && (
                <button onClick={() => setShowPaymentForm(true)} className="px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors">
                  Create Payment
                </button>
              )}
            </div>

            {project.payments?.length > 0 ? (
              <div className="space-y-3">
                {project.payments.map((p: any) => {
                  const pBadge = STATUS_BADGES[p.status] || STATUS_BADGES.PENDING;
                  return (
                    <div key={p.id} className="bg-card border rounded-2xl p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{p.milestoneLabel || 'Payment'}</p>
                          <p className="text-sm text-muted-foreground">
                            Amount: R{(p.amount / 100).toFixed(2)} | Fee: R{(p.platformFee / 100).toFixed(2)}
                          </p>
                          <p className="text-xs text-muted-foreground">{new Date(p.createdAt).toLocaleDateString()}</p>
                        </div>
                        <div className="text-right">
                          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${pBadge.className}`}>{pBadge.label}</span>
                          {isOwner && p.status === 'HELD' && (
                            <button onClick={() => releasePayment.mutate(p.id)} disabled={releasePayment.isPending} className="block mt-2 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-medium hover:bg-emerald-700 transition-colors">
                              Release
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-card border rounded-2xl p-8 text-center text-muted-foreground">
                <CurrencyDollarIcon className="h-10 w-10 mx-auto mb-2 opacity-40" />
                <p>No payments yet</p>
              </div>
            )}
          </div>
        )}

        {/* ── FILES TAB ── */}
        {activeTab === 'Files' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">Files</h2>
            </div>

            {/* Upload Form (inline) */}
            {(isOwner || isAwardedSeller) && (
              <div className="bg-card border rounded-2xl p-4">
                <h3 className="text-sm font-semibold mb-2">Add File</h3>
                <div className="flex gap-2">
                  <input value={fileName} onChange={(e) => setFileName(e.target.value)} placeholder="File name" className="flex-1 px-3 py-2 border rounded-xl bg-background text-sm" />
                  <input value={fileUrl} onChange={(e) => setFileUrl(e.target.value)} placeholder="File URL" className="flex-1 px-3 py-2 border rounded-xl bg-background text-sm" />
                  <button onClick={() => uploadFile.mutate()} disabled={!fileName || !fileUrl || uploadFile.isPending} className="px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center gap-1">
                    <ArrowUpTrayIcon className="h-4 w-4" /> Add
                  </button>
                </div>
              </div>
            )}

            {project.files?.length > 0 ? (
              <div className="space-y-2">
                {project.files.map((f: any) => (
                  <div key={f.id} className="bg-card border rounded-xl px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <DocumentIcon className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <a href={f.fileUrl} target="_blank" rel="noopener noreferrer" className="font-medium text-sm hover:text-primary transition-colors">
                          {f.fileName}
                        </a>
                        <p className="text-xs text-muted-foreground">
                          {f.uploadedByUsername && `@${f.uploadedByUsername} · `}
                          {f.fileSize > 0 && `${formatFileSize(f.fileSize)} · `}
                          {new Date(f.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    {user && f.uploadedByUsername === user.username && (
                      <button onClick={() => deleteFile.mutate(f.id)} disabled={deleteFile.isPending} className="p-1 text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-card border rounded-2xl p-8 text-center text-muted-foreground">
                <DocumentIcon className="h-10 w-10 mx-auto mb-2 opacity-40" />
                <p>No files shared yet</p>
              </div>
            )}
          </div>
        )}

        {/* ── REVIEWS TAB ── */}
        {activeTab === 'Reviews' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">Reviews</h2>
              {project.status === 'COMPLETED' && (isOwner || isAwardedSeller) && (
                <button onClick={() => setShowReviewForm(true)} className="px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors">
                  Leave Review
                </button>
              )}
            </div>

            {project.reviews?.length > 0 ? (
              <div className="space-y-3">
                {project.reviews.map((r: any) => (
                  <div key={r.id} className="bg-card border rounded-2xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-medium text-sm">@{r.reviewerUsername}</span>
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((n) => (
                          n <= r.rating
                            ? <StarSolid key={n} className="h-4 w-4 text-amber-500" />
                            : <StarIcon key={n} className="h-4 w-4 text-gray-300" />
                        ))}
                      </div>
                      <span className="text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleDateString()}</span>
                    </div>
                    {r.comment && <p className="text-sm text-foreground">{r.comment}</p>}
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-card border rounded-2xl p-8 text-center text-muted-foreground">
                <StarIcon className="h-10 w-10 mx-auto mb-2 opacity-40" />
                <p>No reviews yet</p>
                {project.status !== 'COMPLETED' && <p className="text-xs mt-1">Reviews can be left after project completion</p>}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── MODALS ── */}

      {/* Bid Form Modal */}
      <AnimatePresence>
        {showBidForm && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowBidForm(false)}>
            <motion.div className="bg-card border rounded-2xl shadow-2xl w-full max-w-md" initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between p-5 border-b">
                <h2 className="text-lg font-bold">Place a Bid</h2>
                <button onClick={() => setShowBidForm(false)} className="p-1 hover:bg-muted rounded-lg"><XMarkIcon className="h-5 w-5" /></button>
              </div>
              <form className="p-5 space-y-4" onSubmit={(e) => { e.preventDefault(); placeBid.mutate(); }}>
                <div>
                  <label className="text-sm font-medium">Your Price (ZAR) *</label>
                  <input type="number" min="50" step="1" required value={bidAmount} onChange={(e) => setBidAmount(e.target.value)} placeholder="e.g. 2500" className="w-full mt-1 px-3 py-2 border rounded-xl bg-background text-sm" />
                </div>
                <div>
                  <label className="text-sm font-medium">Delivery Time (days) *</label>
                  <input type="number" min="1" max="365" required value={bidDays} onChange={(e) => setBidDays(e.target.value)} placeholder="e.g. 7" className="w-full mt-1 px-3 py-2 border rounded-xl bg-background text-sm" />
                </div>
                <div>
                  <label className="text-sm font-medium">Proposal *</label>
                  <textarea value={bidProposal} onChange={(e) => setBidProposal(e.target.value)} placeholder="Explain why you're the right person..." className="w-full mt-1 px-3 py-2 border rounded-xl bg-background text-sm min-h-[120px] resize-y" required minLength={20} maxLength={3000} />
                </div>
                <button type="submit" disabled={placeBid.isPending} className="w-full py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors">
                  {placeBid.isPending ? 'Submitting...' : 'Submit Bid'}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Payment Form Modal */}
      <AnimatePresence>
        {showPaymentForm && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowPaymentForm(false)}>
            <motion.div className="bg-card border rounded-2xl shadow-2xl w-full max-w-md" initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between p-5 border-b">
                <h2 className="text-lg font-bold">Create Payment</h2>
                <button onClick={() => setShowPaymentForm(false)} className="p-1 hover:bg-muted rounded-lg"><XMarkIcon className="h-5 w-5" /></button>
              </div>
              <form className="p-5 space-y-4" onSubmit={(e) => { e.preventDefault(); createPayment.mutate(); }}>
                <div>
                  <label className="text-sm font-medium">Amount (ZAR) *</label>
                  <input type="number" min="50" step="1" required value={payAmount} onChange={(e) => setPayAmount(e.target.value)} placeholder="e.g. 500" className="w-full mt-1 px-3 py-2 border rounded-xl bg-background text-sm" />
                  <p className="text-xs text-muted-foreground mt-1">8% platform fee applies</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Milestone Label (optional)</label>
                  <input value={payLabel} onChange={(e) => setPayLabel(e.target.value)} placeholder="e.g. First deliverable" className="w-full mt-1 px-3 py-2 border rounded-xl bg-background text-sm" />
                </div>
                <button type="submit" disabled={createPayment.isPending} className="w-full py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors">
                  {createPayment.isPending ? 'Creating...' : 'Create Payment'}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Review Form Modal */}
      <AnimatePresence>
        {showReviewForm && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowReviewForm(false)}>
            <motion.div className="bg-card border rounded-2xl shadow-2xl w-full max-w-md" initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between p-5 border-b">
                <h2 className="text-lg font-bold">Leave a Review</h2>
                <button onClick={() => setShowReviewForm(false)} className="p-1 hover:bg-muted rounded-lg"><XMarkIcon className="h-5 w-5" /></button>
              </div>
              <form className="p-5 space-y-4" onSubmit={(e) => { e.preventDefault(); createReview.mutate(); }}>
                <div>
                  <label className="text-sm font-medium mb-2 block">Rating *</label>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button key={n} type="button" onClick={() => setReviewRating(n)} className="p-0.5">
                        {n <= reviewRating ? <StarSolid className="h-7 w-7 text-amber-500" /> : <StarIcon className="h-7 w-7 text-gray-300 hover:text-amber-300 transition-colors" />}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Comment (optional)</label>
                  <textarea value={reviewComment} onChange={(e) => setReviewComment(e.target.value)} placeholder="Share your experience..." className="w-full mt-1 px-3 py-2 border rounded-xl bg-background text-sm min-h-[100px] resize-y" maxLength={2000} />
                </div>
                <button type="submit" disabled={createReview.isPending} className="w-full py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors">
                  {createReview.isPending ? 'Submitting...' : 'Submit Review'}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Form Modal */}
      <AnimatePresence>
        {showEditForm && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowEditForm(false)}>
            <motion.div className="bg-card border rounded-2xl shadow-2xl w-full max-w-lg" initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between p-5 border-b">
                <h2 className="text-lg font-bold">Edit Project</h2>
                <button onClick={() => setShowEditForm(false)} className="p-1 hover:bg-muted rounded-lg"><XMarkIcon className="h-5 w-5" /></button>
              </div>
              <form className="p-5 space-y-4" onSubmit={(e) => { e.preventDefault(); updateProject.mutate(); }}>
                <div>
                  <label className="text-sm font-medium">Title *</label>
                  <input required minLength={10} value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="w-full mt-1 px-3 py-2 border rounded-xl bg-background text-sm" />
                </div>
                <div>
                  <label className="text-sm font-medium">Description *</label>
                  <textarea required minLength={30} value={editDesc} onChange={(e) => setEditDesc(e.target.value)} className="w-full mt-1 px-3 py-2 border rounded-xl bg-background text-sm min-h-[150px] resize-y" />
                </div>
                <button type="submit" disabled={updateProject.isPending} className="w-full py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors">
                  {updateProject.isPending ? 'Saving...' : 'Save Changes'}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
