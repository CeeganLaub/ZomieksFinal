import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { adminApi } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import {
  BanknotesIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
  DocumentArrowDownIcon,
  BoltIcon,
  Cog6ToothIcon,
  InformationCircleIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  BuildingLibraryIcon,
  ClockIcon,
  CheckBadgeIcon,
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
  sellerId: string;
  amount: number;
  fee: number;
  netAmount: number;
  currency: string;
  status: string;
  batchId: string | null;
  bankReference: string | null;
  failedReason: string | null;
  processedAt: string | null;
  failedAt: string | null;
  createdAt: string;
  seller: {
    username: string;
    email: string;
    country: string;
    kycStatus: string;
    isKycVerified: boolean;
    bankDetails: BankDetails | null;
  };
}

interface PayoutSummary {
  pending: { amount: number; count: number };
  processing: { amount: number; count: number };
  completed: { amount: number; count: number };
  failed: { amount: number; count: number };
  eligibleSellers: { kycVerified: number; withBankDetails: number };
}

type StatusFilter = 'ALL' | 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
const R = (v: number) => `R ${v.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function AdminPayoutsPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [page, setPage] = useState(1);

  const [processModal, setProcessModal] = useState<Payout | null>(null);
  const [rejectModal, setRejectModal] = useState<Payout | null>(null);
  const [bankReference, setBankReference] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [batchResult, setBatchResult] = useState<{
    batchId: string; totalAmount: number; payoutCount: number;
    mode: string; ozowResult?: { successCount: number; failCount: number };
  } | null>(null);

  // Summary stats
  const { data: summaryData } = useQuery<PayoutSummary>({
    queryKey: ['payout-summary'],
    queryFn: async () => {
      const res = await adminApi.payoutSummary();
      return (res as any).data;
    },
  });

  // Payouts list
  const { data, isLoading, isFetching } = useQuery<{
    payouts: Payout[];
    meta: { page: number; total: number; totalPages: number };
  }>({
    queryKey: ['admin-payouts', statusFilter, page],
    queryFn: async () => {
      const params: Record<string, any> = { page, limit: 20 };
      if (statusFilter !== 'ALL') params.status = statusFilter;
      const res = await adminApi.payouts(params);
      return {
        payouts: (res as any).data || [],
        meta: (res as any).meta || { page: 1, total: 0, totalPages: 1 },
      };
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
      queryClient.invalidateQueries({ queryKey: ['payout-summary'] });
    },
    onError: (error: any) => toast.error(error.message || 'Failed to process payout'),
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
      queryClient.invalidateQueries({ queryKey: ['payout-summary'] });
    },
    onError: (error: any) => toast.error(error.message || 'Failed to reject payout'),
  });

  const createBatchMutation = useMutation({
    mutationFn: async () => {
      const res = await adminApi.createPayoutBatch();
      return (res as any).data;
    },
    onSuccess: (data) => {
      setBatchResult(data);
      toast.success(`Batch created: ${data.payoutCount} payouts (${R(Number(data.totalAmount))})`);
      queryClient.invalidateQueries({ queryKey: ['admin-payouts'] });
      queryClient.invalidateQueries({ queryKey: ['payout-summary'] });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.error?.message || error.message || 'Failed to create batch');
    },
  });

  const handleProcess = () => {
    if (!bankReference.trim()) { toast.error('Bank reference is required'); return; }
    if (processModal) processMutation.mutate({ id: processModal.id, ref: bankReference.trim() });
  };

  const handleReject = () => {
    if (rejectModal) rejectMutation.mutate({ id: rejectModal.id, reason: rejectReason.trim() || undefined });
  };

  const handleDownloadCSV = async (batchId: string) => {
    try {
      const res = await adminApi.downloadBatchCSV(batchId);
      const csvData = typeof res === 'string' ? res : (res as any)?.data || '';
      const blob = new Blob([csvData], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `payout-batch-${batchId}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('CSV downloaded');
    } catch { toast.error('Failed to download CSV'); }
  };

  const statusTabs: { value: StatusFilter; label: string }[] = [
    { value: 'ALL', label: 'All' },
    { value: 'PENDING', label: 'Pending' },
    { value: 'PROCESSING', label: 'Processing' },
    { value: 'COMPLETED', label: 'Completed' },
    { value: 'FAILED', label: 'Failed' },
  ];

  const statusBadge: Record<string, { label: string; color: string }> = {
    PENDING: { label: 'Pending', color: 'text-yellow-600 bg-yellow-500/10' },
    PROCESSING: { label: 'Processing', color: 'text-blue-600 bg-blue-500/10' },
    COMPLETED: { label: 'Completed', color: 'text-green-600 bg-green-500/10' },
    PAID: { label: 'Paid', color: 'text-green-600 bg-green-500/10' },
    FAILED: { label: 'Failed', color: 'text-red-600 bg-red-500/10' },
  };

  const payouts = data?.payouts || [];
  const meta = data?.meta || { page: 1, total: 0, totalPages: 1 };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold mb-1">Payouts</h1>
          <p className="text-muted-foreground">
            Process seller withdrawal requests via Direct EFT ({meta.total} total)
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isFetching && <ArrowPathIcon className="h-5 w-5 animate-spin text-muted-foreground" />}
          <Button
            onClick={() => createBatchMutation.mutate()}
            disabled={createBatchMutation.isPending}
          >
            {createBatchMutation.isPending ? (
              <ArrowPathIcon className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <BoltIcon className="h-4 w-4 mr-2" />
            )}
            Create Batch
          </Button>
        </div>
      </div>

      {/* Summary Stats Cards */}
      {summaryData && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <SummaryCard
            label="Pending"
            amount={R(summaryData.pending.amount)}
            count={summaryData.pending.count}
            icon={ClockIcon}
            color="amber"
          />
          <SummaryCard
            label="Processing"
            amount={R(summaryData.processing.amount)}
            count={summaryData.processing.count}
            icon={ArrowPathIcon}
            color="blue"
          />
          <SummaryCard
            label="Completed"
            amount={R(summaryData.completed.amount)}
            count={summaryData.completed.count}
            icon={CheckCircleIcon}
            color="green"
          />
          <SummaryCard
            label="Failed"
            amount={R(summaryData.failed.amount)}
            count={summaryData.failed.count}
            icon={XCircleIcon}
            color="red"
          />
          <div className="bg-card border rounded-lg p-4 border-l-4 border-l-indigo-500">
            <p className="text-xs text-muted-foreground mb-1">Eligible Sellers</p>
            <div className="space-y-1">
              <div className="flex items-center gap-1.5">
                <ShieldCheckIcon className="h-3.5 w-3.5 text-green-600" />
                <span className="text-sm font-medium">{summaryData.eligibleSellers.kycVerified} KYC Verified</span>
              </div>
              <div className="flex items-center gap-1.5">
                <BuildingLibraryIcon className="h-3.5 w-3.5 text-blue-600" />
                <span className="text-sm font-medium">{summaryData.eligibleSellers.withBankDetails} With Bank Details</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Direct EFT Info Banner */}
      <div className="flex items-center justify-between p-4 rounded-lg border bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800">
        <div className="flex items-center gap-3">
          <BuildingLibraryIcon className="h-5 w-5 text-blue-600" />
          <div>
            <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
              Payout Method: Direct EFT Bank Transfer
            </p>
            <p className="text-xs text-blue-600 dark:text-blue-400">
              Sellers must be <strong>KYC verified</strong> (South African ID) and have <strong>valid bank details</strong> on file to receive payouts.
            </p>
          </div>
        </div>
        <Link
          to="/admin/configuration"
          className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg text-blue-700 hover:bg-blue-100 dark:text-blue-300 dark:hover:bg-blue-900/40 transition-colors"
        >
          <Cog6ToothIcon className="h-4 w-4" />
          Configure
        </Link>
      </div>

      {/* Batch Result Banner */}
      {batchResult && (
        <div className="bg-green-50 border border-green-200 dark:bg-green-950/20 dark:border-green-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-800 dark:text-green-200">
                Batch Created: {batchResult.batchId}
              </p>
              <p className="text-xs text-green-600 dark:text-green-400">
                {batchResult.payoutCount} payouts — {R(Number(batchResult.totalAmount))} total
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => handleDownloadCSV(batchResult.batchId)}>
                <DocumentArrowDownIcon className="h-4 w-4 mr-1" /> Download CSV
              </Button>
              <button onClick={() => setBatchResult(null)} className="text-green-500 hover:text-green-700 text-sm">
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Status Filter Tabs */}
      <div className="flex gap-1 border-b">
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
            {tab.value !== 'ALL' && summaryData && (
              <span className="ml-1.5 text-xs opacity-70">
                ({(summaryData[tab.value.toLowerCase() as keyof PayoutSummary] as any)?.count || 0})
              </span>
            )}
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
          <p className="font-medium">No payouts found</p>
          <p className="text-sm mt-1">
            Payouts are created when sellers request withdrawals from their available balance.
          </p>
        </div>
      ) : (
        <div className="bg-card border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-3 font-medium">Seller</th>
                  <th className="text-left p-3 font-medium">Verification</th>
                  <th className="text-left p-3 font-medium">Bank Details</th>
                  <th className="text-right p-3 font-medium">Amount</th>
                  <th className="text-left p-3 font-medium">Status</th>
                  <th className="text-left p-3 font-medium">Date</th>
                  <th className="text-right p-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {payouts.map((payout) => {
                  const badge = statusBadge[payout.status] || statusBadge.PENDING;
                  const bank = payout.seller?.bankDetails;
                  const isKycOk = payout.seller?.isKycVerified;
                  const hasBankDetails = !!bank;
                  const canProcess = isKycOk && hasBankDetails;

                  return (
                    <tr key={payout.id} className="hover:bg-muted/30">
                      <td className="p-3">
                        <p className="font-medium">{payout.seller?.username}</p>
                        <p className="text-xs text-muted-foreground">{payout.seller?.email}</p>
                        {payout.seller?.country && (
                          <p className="text-xs text-muted-foreground">{payout.seller.country}</p>
                        )}
                      </td>
                      <td className="p-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1">
                            {isKycOk ? (
                              <CheckBadgeIcon className="h-4 w-4 text-green-600" />
                            ) : (
                              <ExclamationTriangleIcon className="h-4 w-4 text-red-500" />
                            )}
                            <span className={cn('text-xs font-medium', isKycOk ? 'text-green-700' : 'text-red-600')}>
                              KYC {payout.seller?.kycStatus || 'PENDING'}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            {hasBankDetails ? (
                              <BuildingLibraryIcon className="h-4 w-4 text-green-600" />
                            ) : (
                              <ExclamationTriangleIcon className="h-4 w-4 text-red-500" />
                            )}
                            <span className={cn('text-xs font-medium', hasBankDetails ? 'text-green-700' : 'text-red-600')}>
                              {hasBankDetails ? 'Bank Details OK' : 'No Bank Details'}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="p-3">
                        {bank ? (
                          <div className="text-xs">
                            <p className="font-medium">{bank.bankName}</p>
                            <p className="text-muted-foreground">
                              {bank.accountNumber} ({bank.accountType})
                            </p>
                            <p className="text-muted-foreground">{bank.accountHolder}</p>
                            {bank.branchCode && (
                              <p className="text-muted-foreground">Branch: {bank.branchCode}</p>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-red-500 font-medium">Missing</span>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        <p className="font-semibold">{R(payout.amount)}</p>
                        {payout.fee > 0 && (
                          <p className="text-xs text-muted-foreground">Fee: {R(payout.fee)}</p>
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
                        {payout.batchId && (
                          <p className="text-xs text-muted-foreground mt-1 font-mono">{payout.batchId.slice(0, 12)}...</p>
                        )}
                      </td>
                      <td className="p-3 text-muted-foreground whitespace-nowrap text-xs">
                        <p>{new Date(payout.createdAt).toLocaleDateString('en-ZA', {
                          day: 'numeric', month: 'short', year: 'numeric',
                        })}</p>
                        {payout.processedAt && (
                          <p className="text-green-600">
                            Paid {new Date(payout.processedAt).toLocaleDateString('en-ZA', {
                              day: 'numeric', month: 'short',
                            })}
                          </p>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        {(payout.status === 'PENDING' || payout.status === 'PROCESSING') && (
                          <div className="flex gap-2 justify-end">
                            {!canProcess && (
                              <span className="text-xs text-amber-600 mr-2 self-center" title="Seller needs KYC verification and bank details">
                                <ExclamationTriangleIcon className="h-4 w-4 inline" />
                              </span>
                            )}
                            <Button
                              size="sm"
                              onClick={() => { setProcessModal(payout); setBankReference(''); }}
                              disabled={!canProcess}
                              title={!canProcess ? 'Seller must be KYC verified with valid bank details' : 'Process payout'}
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
                Page {meta.page} of {meta.totalPages} ({meta.total} total)
              </p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                  Previous
                </Button>
                <Button size="sm" variant="outline" disabled={page >= meta.totalPages} onClick={() => setPage(p => p + 1)}>
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Payout Requirements Info */}
      <div className="bg-card border rounded-lg p-5">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <InformationCircleIcon className="h-5 w-5 text-blue-600" />
          Payout Requirements
        </h3>
        <div className="grid md:grid-cols-3 gap-4 text-sm">
          <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
            <ShieldCheckIcon className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium">KYC Verification</p>
              <p className="text-muted-foreground text-xs mt-0.5">
                Seller must have a verified South African ID number. Verify via KYC Verifications page.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
            <BuildingLibraryIcon className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium">Valid Bank Details</p>
              <p className="text-muted-foreground text-xs mt-0.5">
                Seller must have bank account details (bank name, account number, branch code, account holder) on file.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
            <BanknotesIcon className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium">Manual EFT Process</p>
              <p className="text-muted-foreground text-xs mt-0.5">
                Create a batch → download CSV → process bank transfers → mark as completed with EFT reference number.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Process Modal */}
      {processModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card rounded-lg p-6 w-full max-w-md mx-4 border">
            <h2 className="text-lg font-bold mb-4">Process Payout — Direct EFT</h2>
            <div className="mb-4 p-3 bg-muted/50 rounded-lg text-sm space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Seller</span>
                <span className="font-medium">{processModal.seller?.username}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount</span>
                <span className="font-semibold">{R(processModal.amount)}</span>
              </div>
              {processModal.seller?.bankDetails && (
                <>
                  <div className="border-t pt-2 mt-2">
                    <p className="text-xs font-medium text-muted-foreground mb-1">Bank Transfer Details</p>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Bank</span>
                    <span>{processModal.seller.bankDetails.bankName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Account</span>
                    <span>{processModal.seller.bankDetails.accountNumber} ({processModal.seller.bankDetails.accountType})</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Branch</span>
                    <span>{processModal.seller.bankDetails.branchCode}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Holder</span>
                    <span>{processModal.seller.bankDetails.accountHolder}</span>
                  </div>
                </>
              )}
              <div className="flex items-center gap-1.5 pt-1">
                {processModal.seller?.isKycVerified ? (
                  <CheckBadgeIcon className="h-4 w-4 text-green-600" />
                ) : (
                  <ExclamationTriangleIcon className="h-4 w-4 text-red-500" />
                )}
                <span className={cn('text-xs', processModal.seller?.isKycVerified ? 'text-green-700' : 'text-red-600')}>
                  KYC: {processModal.seller?.kycStatus}
                </span>
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">EFT Bank Reference</label>
              <input
                type="text"
                value={bankReference}
                onChange={(e) => setBankReference(e.target.value)}
                placeholder="e.g. EFT-20260217-001"
                className="w-full px-3 py-2 border rounded-lg bg-background focus:ring-2 focus:ring-primary focus:outline-none"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Enter the bank EFT reference number after processing the transfer
              </p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setProcessModal(null)}>Cancel</Button>
              <Button className="flex-1" onClick={handleProcess} disabled={processMutation.isPending}>
                {processMutation.isPending ? 'Processing...' : 'Confirm EFT Payment'}
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
                <span className="font-semibold">{R(rejectModal.amount)}</span>
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Reason</label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. Invalid bank details, KYC not verified, suspicious activity"
                rows={3}
                className="w-full px-3 py-2 border rounded-lg bg-background focus:ring-2 focus:ring-primary focus:outline-none resize-none"
              />
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setRejectModal(null)}>Cancel</Button>
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

function SummaryCard({ label, amount, count, icon: Icon, color }: {
  label: string; amount: string; count: number;
  icon: React.ComponentType<{ className?: string }>;
  color: 'amber' | 'blue' | 'green' | 'red';
}) {
  const colors = {
    amber: 'border-l-amber-500',
    blue: 'border-l-blue-500',
    green: 'border-l-green-500',
    red: 'border-l-red-500',
  };
  const iconColors = {
    amber: 'text-amber-600',
    blue: 'text-blue-600',
    green: 'text-green-600',
    red: 'text-red-600',
  };
  return (
    <div className={cn('bg-card border rounded-lg p-4 border-l-4', colors[color])}>
      <div className="flex items-center gap-2 mb-1">
        <Icon className={cn('h-4 w-4', iconColors[color])} />
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
      <p className="text-lg font-bold">{amount}</p>
      <p className="text-xs text-muted-foreground">{count} payout{count !== 1 ? 's' : ''}</p>
    </div>
  );
}
