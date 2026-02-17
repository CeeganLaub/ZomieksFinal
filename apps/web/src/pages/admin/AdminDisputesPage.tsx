import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { toast } from 'sonner';
import {
  ArrowPathIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ScaleIcon,
  BanknotesIcon,
  CalendarDaysIcon,
} from '@heroicons/react/24/outline';

interface AdminDispute {
  id: string;
  orderId: string;
  raisedBy: string;
  reason: string;
  evidence?: { url: string; description: string }[];
  status: string;
  resolution: string | null;
  resolvedBy: string | null;
  resolvedAt: string | null;
  createdAt: string;
  order: {
    orderNumber: string;
    totalAmount: number;
    baseAmount?: number;
    buyer: { username: string; email: string } | null;
    seller: { username: string; email: string } | null;
  } | null;
}

const STATUS_COLORS: Record<string, string> = {
  OPEN: 'bg-red-100 text-red-800',
  UNDER_REVIEW: 'bg-yellow-100 text-yellow-800',
  RESOLVED_BUYER: 'bg-green-100 text-green-800',
  RESOLVED_SELLER: 'bg-green-100 text-green-800',
  RESOLVED_SPLIT: 'bg-blue-100 text-blue-800',
  CLOSED: 'bg-gray-100 text-gray-800',
};

const RESOLUTION_LABELS: Record<string, { label: string; description: string; color: string }> = {
  BUYER_FAVOR: { label: 'Buyer Wins', description: 'Full refund to buyer', color: 'bg-blue-600 hover:bg-blue-700' },
  SELLER_FAVOR: { label: 'Seller Wins', description: 'Payment released to seller', color: 'bg-green-600 hover:bg-green-700' },
  SPLIT: { label: 'Split', description: 'Partial refund based on percentage', color: 'bg-yellow-600 hover:bg-yellow-700' },
  DISMISSED: { label: 'Dismiss', description: 'Close without action', color: 'bg-gray-600 hover:bg-gray-700' },
};

export default function AdminDisputesPage() {
  const [disputes, setDisputes] = useState<AdminDispute[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('OPEN');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Resolution modal state
  const [resolveModal, setResolveModal] = useState<{ dispute: AdminDispute; resolution: string } | null>(null);
  const [resolveNotes, setResolveNotes] = useState('');
  const [refundPercent, setRefundPercent] = useState(50);
  const [resolving, setResolving] = useState(false);

  useEffect(() => {
    loadDisputes();
  }, [page, statusFilter]);

  async function loadDisputes() {
    try {
      setLoading(true);
      const params: Record<string, string> = { page: String(page), limit: '20' };
      if (statusFilter) params.status = statusFilter;

      const queryStr = new URLSearchParams(params).toString();
      const res = await api.get<{ success: boolean; data: AdminDispute[]; meta?: { total: number } }>(
        `/admin/disputes?${queryStr}`
      );
      setDisputes(Array.isArray(res.data) ? res.data : []);
      setTotal(res.meta?.total || 0);
    } catch {
      setDisputes([]);
    } finally {
      setLoading(false);
    }
  }

  function openResolveModal(dispute: AdminDispute, resolution: string) {
    setResolveModal({ dispute, resolution });
    setResolveNotes('');
    setRefundPercent(resolution === 'BUYER_FAVOR' ? 100 : resolution === 'SPLIT' ? 50 : 0);
  }

  async function confirmResolve() {
    if (!resolveModal) return;
    const { dispute, resolution } = resolveModal;
    try {
      setResolving(true);
      await api.post(`/admin/disputes/${dispute.id}/resolve`, {
        resolution,
        buyerRefundPercent: refundPercent,
        notes: resolveNotes || undefined,
      });
      toast.success('Dispute resolved successfully');
      setResolveModal(null);
      loadDisputes();
    } catch {
      toast.error('Failed to resolve dispute');
    } finally {
      setResolving(false);
    }
  }

  if (loading && disputes.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <ArrowPathIcon className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const orderAmount = resolveModal?.dispute.order?.totalAmount
    ? resolveModal.dispute.order.totalAmount / 100
    : 0;
  const refundAmount = (orderAmount * refundPercent) / 100;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Disputes</h1>
          <p className="text-muted-foreground">Review and resolve order disputes ({total} total)</p>
        </div>
        <button
          onClick={loadDisputes}
          className="flex items-center gap-2 px-3 py-2 text-sm border rounded-lg hover:bg-muted transition-colors"
        >
          <ArrowPathIcon className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {/* Status Filter */}
      <div className="flex flex-wrap gap-2">
        {['OPEN', 'UNDER_REVIEW', 'RESOLVED_BUYER', 'RESOLVED_SELLER', 'RESOLVED_SPLIT', 'CLOSED'].map((s) => (
          <button
            key={s}
            onClick={() => { setStatusFilter(s); setPage(1); }}
            className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${statusFilter === s ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
          >
            {s.replace(/_/g, ' ')}
          </button>
        ))}
      </div>

      {/* Disputes List */}
      <div className="space-y-4">
        {disputes.length === 0 ? (
          <div className="bg-background border rounded-lg p-12 text-center">
            <ExclamationTriangleIcon className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="font-semibold mb-2">No disputes found</h3>
            <p className="text-muted-foreground text-sm">
              No disputes with status: {statusFilter.replace(/_/g, ' ')}
            </p>
          </div>
        ) : (
          disputes.map((dispute) => {
            const isExpanded = expandedId === dispute.id;
            const isResolvable = dispute.status === 'OPEN' || dispute.status === 'UNDER_REVIEW';
            const amount = dispute.order?.totalAmount ? dispute.order.totalAmount / 100 : 0;

            return (
              <div key={dispute.id} className="bg-background border rounded-lg overflow-hidden">
                {/* Header */}
                <div className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-3 flex-wrap">
                        <h3 className="font-semibold">
                          Order #{dispute.order?.orderNumber || dispute.orderId.slice(0, 8)}
                        </h3>
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLORS[dispute.status] || 'bg-gray-100 text-gray-800'}`}>
                          {dispute.status.replace(/_/g, ' ')}
                        </span>
                        {amount > 0 && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                            <BanknotesIcon className="h-3.5 w-3.5" />
                            R{amount.toFixed(2)}
                          </span>
                        )}
                      </div>

                      <p className="text-sm">{dispute.reason}</p>

                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                        <span>Buyer: <strong className="text-foreground">{dispute.order?.buyer?.username || '—'}</strong></span>
                        <span>Seller: <strong className="text-foreground">{dispute.order?.seller?.username || '—'}</strong></span>
                        <span className="flex items-center gap-1">
                          <CalendarDaysIcon className="h-3.5 w-3.5" />
                          {new Date(dispute.createdAt).toLocaleDateString()}
                        </span>
                        <span className="text-xs">Raised by: {dispute.raisedBy}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {isResolvable && (
                        <div className="flex gap-1.5">
                          {Object.entries(RESOLUTION_LABELS).map(([key, { label, color }]) => (
                            <button
                              key={key}
                              onClick={() => openResolveModal(dispute, key)}
                              className={`px-3 py-1.5 text-xs text-white rounded-lg transition-colors ${color}`}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      )}
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : dispute.id)}
                        className="p-1.5 hover:bg-muted rounded transition-colors"
                        title={isExpanded ? 'Collapse' : 'Expand details'}
                      >
                        {isExpanded ? <ChevronUpIcon className="h-4 w-4" /> : <ChevronDownIcon className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="border-t px-6 py-4 bg-muted/20 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Order Details */}
                      <div className="bg-background rounded-lg p-4 border">
                        <h4 className="font-medium text-sm mb-2">Order Details</h4>
                        <div className="space-y-1.5 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Order #</span>
                            <span className="font-mono">{dispute.order?.orderNumber || '—'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Amount</span>
                            <span className="font-medium">R{amount.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Dispute ID</span>
                            <span className="font-mono text-xs">{dispute.id.slice(0, 12)}…</span>
                          </div>
                        </div>
                      </div>

                      {/* Parties */}
                      <div className="bg-background rounded-lg p-4 border">
                        <h4 className="font-medium text-sm mb-2">Parties Involved</h4>
                        <div className="space-y-1.5 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Buyer</span>
                            <span>@{dispute.order?.buyer?.username || '—'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Seller</span>
                            <span>@{dispute.order?.seller?.username || '—'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Raised by</span>
                            <span className="capitalize">{dispute.raisedBy}</span>
                          </div>
                        </div>
                      </div>

                      {/* Timeline */}
                      <div className="bg-background rounded-lg p-4 border">
                        <h4 className="font-medium text-sm mb-2">Timeline</h4>
                        <div className="space-y-1.5 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Opened</span>
                            <span>{new Date(dispute.createdAt).toLocaleString()}</span>
                          </div>
                          {dispute.resolvedAt && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Resolved</span>
                              <span>{new Date(dispute.resolvedAt).toLocaleString()}</span>
                            </div>
                          )}
                          {dispute.resolvedAt && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Duration</span>
                              <span>
                                {Math.ceil((new Date(dispute.resolvedAt).getTime() - new Date(dispute.createdAt).getTime()) / (1000 * 60 * 60 * 24))} days
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Evidence */}
                    {dispute.evidence && dispute.evidence.length > 0 && (
                      <div className="bg-background rounded-lg p-4 border">
                        <h4 className="font-medium text-sm mb-2">Evidence ({dispute.evidence.length} items)</h4>
                        <div className="space-y-2">
                          {dispute.evidence.map((e, i) => (
                            <div key={i} className="flex items-center gap-3 text-sm bg-muted/30 rounded p-2">
                              <a href={e.url} target="_blank" rel="noreferrer" className="text-primary hover:underline truncate">
                                {e.url.split('/').pop() || `Evidence ${i + 1}`}
                              </a>
                              {e.description && <span className="text-muted-foreground">— {e.description}</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Resolution Info */}
                    {dispute.resolution && (
                      <div className="bg-background rounded-lg p-4 border">
                        <h4 className="font-medium text-sm mb-2">Resolution</h4>
                        <div className="flex items-center gap-3 text-sm">
                          <ScaleIcon className="h-5 w-5 text-muted-foreground" />
                          <span className="font-medium">{dispute.resolution.replace(/_/g, ' ')}</span>
                          {dispute.resolvedAt && (
                            <span className="text-muted-foreground">
                              on {new Date(dispute.resolvedAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Pagination */}
      {total > 20 && (
        <div className="flex items-center justify-between px-4 py-3 bg-background border rounded-lg">
          <p className="text-sm text-muted-foreground">Page {page} of {Math.ceil(total / 20)}</p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page <= 1}
              className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-50 hover:bg-muted"
            >
              Previous
            </button>
            <button
              onClick={() => setPage(page + 1)}
              disabled={page >= Math.ceil(total / 20)}
              className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-50 hover:bg-muted"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Resolution Modal */}
      {resolveModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background border rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <div>
                <h2 className="text-lg font-bold">Resolve Dispute</h2>
                <p className="text-sm text-muted-foreground">
                  Order #{resolveModal.dispute.order?.orderNumber || resolveModal.dispute.orderId.slice(0, 8)}
                </p>
              </div>
              <button onClick={() => setResolveModal(null)} className="p-1 hover:bg-muted rounded">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Resolution Type */}
              <div>
                <label className="block text-sm font-medium mb-2">Resolution</label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(RESOLUTION_LABELS).map(([key, { label, description }]) => (
                    <button
                      key={key}
                      onClick={() => {
                        setResolveModal({ ...resolveModal, resolution: key });
                        setRefundPercent(key === 'BUYER_FAVOR' ? 100 : key === 'SPLIT' ? 50 : 0);
                      }}
                      className={`p-3 rounded-lg border text-left transition-colors ${
                        resolveModal.resolution === key
                          ? 'border-primary bg-primary/5 ring-1 ring-primary'
                          : 'hover:bg-muted'
                      }`}
                    >
                      <p className="font-medium text-sm">{label}</p>
                      <p className="text-xs text-muted-foreground">{description}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Refund Percentage */}
              {(resolveModal.resolution === 'SPLIT' || resolveModal.resolution === 'BUYER_FAVOR') && orderAmount > 0 && (
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Buyer Refund: {refundPercent}% (R{refundAmount.toFixed(2)} of R{orderAmount.toFixed(2)})
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={refundPercent}
                    onChange={(e) => setRefundPercent(Number(e.target.value))}
                    className="w-full accent-primary"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>0%</span>
                    <span>50%</span>
                    <span>100%</span>
                  </div>
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium mb-2">Resolution Notes (optional)</label>
                <textarea
                  value={resolveNotes}
                  onChange={(e) => setResolveNotes(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border rounded-lg text-sm bg-background resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  placeholder="Add notes about this resolution..."
                  maxLength={2000}
                />
              </div>

              {/* Summary */}
              <div className="bg-muted/30 rounded-lg p-4 text-sm space-y-1">
                <p><span className="text-muted-foreground">Action:</span> <strong>{RESOLUTION_LABELS[resolveModal.resolution]?.label}</strong></p>
                <p><span className="text-muted-foreground">Buyer:</span> @{resolveModal.dispute.order?.buyer?.username || '—'}</p>
                <p><span className="text-muted-foreground">Seller:</span> @{resolveModal.dispute.order?.seller?.username || '—'}</p>
                {orderAmount > 0 && (
                  <p><span className="text-muted-foreground">Refund:</span> R{refundAmount.toFixed(2)} ({refundPercent}%)</p>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 p-6 border-t">
              <button
                onClick={() => setResolveModal(null)}
                className="px-4 py-2 border rounded-lg hover:bg-muted text-sm"
              >
                Cancel
              </button>
              <button
                onClick={confirmResolve}
                disabled={resolving}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 text-sm flex items-center gap-2"
              >
                {resolving ? (
                  <>
                    <ArrowPathIcon className="h-4 w-4 animate-spin" />
                    Resolving...
                  </>
                ) : (
                  <>
                    <ScaleIcon className="h-4 w-4" />
                    Confirm Resolution
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
