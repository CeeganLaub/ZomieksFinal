import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { adminApi } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import {
  BanknotesIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';

interface BankDetails {
  bankName: string;
  accountNumber: string;
  branchCode: string;
  accountType: string;
  accountHolder: string;
  isVerified: boolean;
}

interface Payout {
  id: string;
  amount: number;
  status: string;
  bankReference: string | null;
  failedReason: string | null;
  createdAt: string;
  processedAt: string | null;
  failedAt: string | null;
  seller: {
    username: string;
    email: string;
    bankDetails: BankDetails | null;
  };
}

type StatusFilter = 'ALL' | 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export default function AdminPayoutsPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [page, setPage] = useState(1);

  const [processModal, setProcessModal] = useState<Payout | null>(null);
  const [rejectModal, setRejectModal] = useState<Payout | null>(null);
  const [bankReference, setBankReference] = useState('');
  const [rejectReason, setRejectReason] = useState('');

  const { data, isLoading, isFetching } = useQuery<{
    payouts: Payout[];
    meta: { page: number; total: number; totalPages: number };
  }>({
    queryKey: ['admin-payouts', statusFilter, page],
    queryFn: async () => {
      const params: Record<string, any> = { page, limit: 20 };
      if (statusFilter !== 'ALL') params.status = statusFilter;
      const res = await adminApi.payouts(params);
      return { payouts: (res as any).data?.payouts || [], meta: (res as any).meta || { page: 1, total: 0, totalPages: 1 } };
    },
  });

  const processMutation = useMutation({
    mutationFn: async ({ id, ref }: { id: string; ref: string }) => {
      await adminApi.processPayout(id, ref);
    },
    onSuccess: () => {
      toast.success('Payout marked as completed');
      setProcessModal(null);
      setBankReference('');
      queryClient.invalidateQueries({ queryKey: ['admin-payouts'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to process payout');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason?: string }) => {
      await adminApi.rejectPayout(id, reason);
    },
    onSuccess: () => {
      toast.success('Payout rejected');
      setRejectModal(null);
      setRejectReason('');
      queryClient.invalidateQueries({ queryKey: ['admin-payouts'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to reject payout');
    },
  });

  const handleProcess = () => {
    if (!bankReference.trim()) {
      toast.error('Bank reference is required');
      return;
    }
    if (processModal) {
      processMutation.mutate({ id: processModal.id, ref: bankReference.trim() });
    }
  };

  const handleReject = () => {
    if (rejectModal) {
      rejectMutation.mutate({ id: rejectModal.id, reason: rejectReason.trim() || undefined });
    }
  };

  const statusTabs: { value: StatusFilter; label: string; color: string }[] = [
    { value: 'ALL', label: 'All', color: '' },
    { value: 'PENDING', label: 'Pending', color: 'text-yellow-600' },
    { value: 'PROCESSING', label: 'Processing', color: 'text-blue-600' },
    { value: 'COMPLETED', label: 'Completed', color: 'text-green-600' },
    { value: 'FAILED', label: 'Failed', color: 'text-red-600' },
  ];

  const statusBadge: Record<string, { label: string; color: string }> = {
    PENDING: { label: 'Pending', color: 'text-yellow-600 bg-yellow-500/10' },
    PROCESSING: { label: 'Processing', color: 'text-blue-600 bg-blue-500/10' },
    COMPLETED: { label: 'Completed', color: 'text-green-600 bg-green-500/10' },
    FAILED: { label: 'Failed', color: 'text-red-600 bg-red-500/10' },
  };

  const payouts = data?.payouts || [];
  const meta = data?.meta || { page: 1, total: 0, totalPages: 1 };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-1">Payouts</h1>
          <p className="text-muted-foreground">
            Review and process seller withdrawal requests ({meta.total} total)
          </p>
        </div>
        {isFetching && <ArrowPathIcon className="h-5 w-5 animate-spin text-muted-foreground" />}
      </div>

      {/* Status Filter Tabs */}
      <div className="flex gap-1 mb-6 border-b">
        {statusTabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => { setStatusFilter(tab.value); setPage(1); }}
            className={cn(
              'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
              statusFilter === tab.value
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Payouts Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : payouts.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <BanknotesIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>No payouts found</p>
        </div>
      ) : (
        <div className="bg-card border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-3 font-medium">Seller</th>
                  <th className="text-left p-3 font-medium">Amount</th>
                  <th className="text-left p-3 font-medium">Bank Details</th>
                  <th className="text-left p-3 font-medium">Status</th>
                  <th className="text-left p-3 font-medium">Date</th>
                  <th className="text-right p-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {payouts.map((payout) => {
                  const badge = statusBadge[payout.status] || statusBadge.PENDING;
                  const bank = payout.seller?.bankDetails;
                  return (
                    <tr key={payout.id} className="hover:bg-muted/30">
                      <td className="p-3">
                        <p className="font-medium">{payout.seller?.username}</p>
                        <p className="text-xs text-muted-foreground">{payout.seller?.email}</p>
                      </td>
                      <td className="p-3 font-semibold">R{Number(payout.amount).toFixed(2)}</td>
                      <td className="p-3">
                        {bank ? (
                          <div className="text-xs">
                            <p>{bank.bankName}</p>
                            <p className="text-muted-foreground">
                              ****{bank.accountNumber.slice(-4)} ({bank.accountType})
                            </p>
                            <p className="text-muted-foreground">{bank.accountHolder}</p>
                          </div>
                        ) : (
                          <span className="text-xs text-red-500">No bank details</span>
                        )}
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}>
                          {badge.label}
                        </span>
                        {payout.bankReference && (
                          <p className="text-xs text-muted-foreground mt-1">Ref: {payout.bankReference}</p>
                        )}
                        {payout.failedReason && (
                          <p className="text-xs text-red-500 mt-1">{payout.failedReason}</p>
                        )}
                      </td>
                      <td className="p-3 text-muted-foreground whitespace-nowrap">
                        {new Date(payout.createdAt).toLocaleDateString('en-ZA', {
                          day: 'numeric', month: 'short', year: 'numeric',
                        })}
                      </td>
                      <td className="p-3 text-right">
                        {(payout.status === 'PENDING' || payout.status === 'PROCESSING') && (
                          <div className="flex gap-2 justify-end">
                            <Button
                              size="sm"
                              onClick={() => { setProcessModal(payout); setBankReference(''); }}
                            >
                              <CheckCircleIcon className="h-4 w-4 mr-1" />
                              Process
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => { setRejectModal(payout); setRejectReason(''); }}
                              className="text-red-600 hover:text-red-700"
                            >
                              <XCircleIcon className="h-4 w-4 mr-1" />
                              Reject
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {meta.totalPages > 1 && (
            <div className="flex items-center justify-between p-3 border-t">
              <p className="text-sm text-muted-foreground">
                Page {meta.page} of {meta.totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page <= 1}
                  onClick={() => setPage(p => p - 1)}
                >
                  Previous
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page >= meta.totalPages}
                  onClick={() => setPage(p => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Process Modal */}
      {processModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card rounded-lg p-6 w-full max-w-md mx-4 border">
            <h2 className="text-lg font-bold mb-4">Process Payout</h2>
            <div className="mb-4 p-3 bg-muted/50 rounded-lg text-sm">
              <div className="flex justify-between mb-1">
                <span className="text-muted-foreground">Seller</span>
                <span className="font-medium">{processModal.seller?.username}</span>
              </div>
              <div className="flex justify-between mb-1">
                <span className="text-muted-foreground">Amount</span>
                <span className="font-semibold">R{Number(processModal.amount).toFixed(2)}</span>
              </div>
              {processModal.seller?.bankDetails && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Bank</span>
                  <span>
                    {processModal.seller.bankDetails.bankName} - ****{processModal.seller.bankDetails.accountNumber.slice(-4)}
                  </span>
                </div>
              )}
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Bank Transfer Reference</label>
              <input
                type="text"
                value={bankReference}
                onChange={(e) => setBankReference(e.target.value)}
                placeholder="e.g. EFT-20260211-001"
                className="w-full px-3 py-2 border rounded-lg bg-background focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setProcessModal(null)}>
                Cancel
              </Button>
              <Button className="flex-1" onClick={handleProcess} disabled={processMutation.isPending}>
                {processMutation.isPending ? 'Processing...' : 'Confirm Payment'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card rounded-lg p-6 w-full max-w-md mx-4 border">
            <h2 className="text-lg font-bold mb-4">Reject Payout</h2>
            <div className="mb-4 p-3 bg-muted/50 rounded-lg text-sm">
              <div className="flex justify-between mb-1">
                <span className="text-muted-foreground">Seller</span>
                <span className="font-medium">{rejectModal.seller?.username}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount</span>
                <span className="font-semibold">R{Number(rejectModal.amount).toFixed(2)}</span>
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Reason (optional)</label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. Invalid bank details, KYC not verified"
                rows={3}
                className="w-full px-3 py-2 border rounded-lg bg-background focus:ring-2 focus:ring-primary focus:outline-none resize-none"
              />
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setRejectModal(null)}>
                Cancel
              </Button>
              <Button
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                onClick={handleReject}
                disabled={rejectMutation.isPending}
              >
                {rejectMutation.isPending ? 'Rejecting...' : 'Reject Payout'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
