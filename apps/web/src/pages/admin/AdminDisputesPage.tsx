import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { toast } from 'sonner';
import { ArrowPathIcon } from '@heroicons/react/24/outline';

interface AdminDispute {
  id: string;
  orderId: string;
  raisedBy: string;
  reason: string;
  status: string;
  resolution: string | null;
  resolvedAt: string | null;
  createdAt: string;
  order: {
    orderNumber: string;
    totalAmount: number;
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

export default function AdminDisputesPage() {
  const [disputes, setDisputes] = useState<AdminDispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('OPEN');
  const [resolving, setResolving] = useState<string | null>(null);

  useEffect(() => {
    loadDisputes();
  }, [page, statusFilter]);

  async function loadDisputes() {
    try {
      setLoading(true);
      const params: Record<string, string> = { page: String(page), limit: '20' };
      if (statusFilter) params.status = statusFilter;

      const queryStr = new URLSearchParams(params).toString();
      const res = await api.get<{ success: boolean; data: AdminDispute[] }>(
        `/admin/disputes?${queryStr}`
      );
      setDisputes(Array.isArray(res.data) ? res.data : []);
    } catch {
      setDisputes([]);
    } finally {
      setLoading(false);
    }
  }

  async function resolveDispute(id: string, resolution: string) {
    const notes = prompt('Resolution notes (optional):');
    try {
      setResolving(id);
      await api.post(`/admin/disputes/${id}/resolve`, {
        resolution,
        buyerRefundPercent: resolution === 'BUYER_FAVOR' ? 100 : resolution === 'SPLIT' ? 50 : 0,
        notes: notes || undefined,
      });
      toast.success('Dispute resolved');
      loadDisputes();
    } catch {
      toast.error('Failed to resolve dispute');
    } finally {
      setResolving(null);
    }
  }

  if (loading && disputes.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <ArrowPathIcon className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Disputes</h1>
        <p className="text-muted-foreground">Review and resolve order disputes</p>
      </div>

      {/* Status Filter */}
      <div className="flex gap-2">
        {['OPEN', 'UNDER_REVIEW', 'RESOLVED_BUYER', 'RESOLVED_SELLER', 'CLOSED'].map((s) => (
          <button
            key={s}
            onClick={() => { setStatusFilter(s); setPage(1); }}
            className={`px-3 py-1.5 text-sm rounded-lg border ${statusFilter === s ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
          >
            {s.replace(/_/g, ' ')}
          </button>
        ))}
      </div>

      {/* Disputes List */}
      <div className="space-y-4">
        {disputes.length === 0 ? (
          <div className="bg-background border rounded-lg p-8 text-center text-muted-foreground">
            No disputes found with status: {statusFilter.replace(/_/g, ' ')}
          </div>
        ) : (
          disputes.map((dispute) => (
            <div key={dispute.id} className="bg-background border rounded-lg p-6">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold">
                      Order #{dispute.order?.orderNumber || dispute.orderId.slice(0, 8)}
                    </h3>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLORS[dispute.status] || 'bg-gray-100 text-gray-800'}`}>
                      {dispute.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{dispute.reason}</p>
                  <div className="flex gap-4 text-sm text-muted-foreground">
                    <span>Buyer: <strong>{dispute.order?.buyer?.username || '—'}</strong></span>
                    <span>Seller: <strong>{dispute.order?.seller?.username || '—'}</strong></span>
                    <span>Raised: {new Date(dispute.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>

                {(dispute.status === 'OPEN' || dispute.status === 'UNDER_REVIEW') && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => resolveDispute(dispute.id, 'BUYER_FAVOR')}
                      disabled={resolving === dispute.id}
                      className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      Buyer Wins
                    </button>
                    <button
                      onClick={() => resolveDispute(dispute.id, 'SELLER_FAVOR')}
                      disabled={resolving === dispute.id}
                      className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                    >
                      Seller Wins
                    </button>
                    <button
                      onClick={() => resolveDispute(dispute.id, 'SPLIT')}
                      disabled={resolving === dispute.id}
                      className="px-3 py-1.5 text-sm bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50"
                    >
                      Split
                    </button>
                    <button
                      onClick={() => resolveDispute(dispute.id, 'DISMISSED')}
                      disabled={resolving === dispute.id}
                      className="px-3 py-1.5 text-sm border rounded-lg hover:bg-muted disabled:opacity-50"
                    >
                      Dismiss
                    </button>
                  </div>
                )}
              </div>

              {dispute.resolution && (
                <div className="mt-3 pt-3 border-t text-sm">
                  <span className="text-muted-foreground">Resolution:</span>{' '}
                  <strong>{dispute.resolution.replace(/_/g, ' ')}</strong>
                  {dispute.resolvedAt && (
                    <span className="text-muted-foreground ml-2">
                      on {new Date(dispute.resolvedAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
