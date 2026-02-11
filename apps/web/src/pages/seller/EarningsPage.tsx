import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { paymentsApi } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import {
  BanknotesIcon,
  ArrowTrendingUpIcon,
  ClockIcon,
  CheckCircleIcon,
  ArrowDownTrayIcon,
  ShieldExclamationIcon,
  ExclamationTriangleIcon,
  BuildingLibraryIcon,
  PencilIcon,
} from '@heroicons/react/24/outline';

interface BalanceData {
  available: number;
  pending: number;
  withdrawn: number;
}

interface EarningsData {
  pendingEscrow: number;
  availableToWithdraw: number;
  totalWithdrawn: number;
  totalEarned: number;
  thisMonth: number;
  kycStatus: string;
}

interface Payout {
  id: string;
  amount: number;
  status: string;
  bankReference: string | null;
  failedReason: string | null;
  createdAt: string;
  processedAt: string | null;
}

interface BankDetails {
  id: string;
  bankName: string;
  accountNumber: string;
  branchCode: string;
  accountType: string;
  accountHolder: string;
  isVerified: boolean;
}

export default function EarningsPage() {
  const queryClient = useQueryClient();
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [editingBank, setEditingBank] = useState(false);
  const [bankForm, setBankForm] = useState({
    bankName: '',
    accountNumber: '',
    branchCode: '',
    accountType: 'SAVINGS',
    accountHolder: '',
  });

  const { data: balance, isLoading: balanceLoading } = useQuery<BalanceData>({
    queryKey: ['wallet'],
    queryFn: async () => {
      const res = await paymentsApi.balance();
      return (res as any).data;
    },
  });

  const { data: earnings } = useQuery<EarningsData>({
    queryKey: ['earnings-summary'],
    queryFn: async () => {
      const res = await paymentsApi.earnings();
      return (res as any).data;
    },
  });

  const { data: payouts, isLoading: payoutsLoading } = useQuery<Payout[]>({
    queryKey: ['payouts'],
    queryFn: async () => {
      const res = await paymentsApi.payouts();
      return (res as any).data?.payouts || [];
    },
  });

  const { data: bankDetails, isLoading: bankLoading } = useQuery<BankDetails | null>({
    queryKey: ['bank-details'],
    queryFn: async () => {
      const res = await paymentsApi.bankDetails();
      return (res as any).data?.bankDetails || null;
    },
  });

  const kycStatus = earnings?.kycStatus || 'PENDING';

  const requestPayoutMutation = useMutation({
    mutationFn: async (amount: number) => {
      await paymentsApi.withdraw({ amount });
    },
    onSuccess: () => {
      toast.success('Payout request submitted');
      setShowWithdrawModal(false);
      setWithdrawAmount('');
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      queryClient.invalidateQueries({ queryKey: ['payouts'] });
      queryClient.invalidateQueries({ queryKey: ['earnings-summary'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to request payout');
    },
  });

  const updateBankMutation = useMutation({
    mutationFn: async (data: typeof bankForm) => {
      await paymentsApi.updateBankDetails(data);
    },
    onSuccess: () => {
      toast.success('Bank details updated');
      setEditingBank(false);
      queryClient.invalidateQueries({ queryKey: ['bank-details'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update bank details');
    },
  });

  const handleWithdraw = () => {
    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Enter a valid amount');
      return;
    }
    if (amount < 100) {
      toast.error('Minimum withdrawal is R100');
      return;
    }
    const available = balance?.available ?? 0;
    if (amount > available) {
      toast.error('Insufficient balance');
      return;
    }
    requestPayoutMutation.mutate(amount);
  };

  const startEditBank = () => {
    if (bankDetails) {
      setBankForm({
        bankName: bankDetails.bankName,
        accountNumber: bankDetails.accountNumber,
        branchCode: bankDetails.branchCode,
        accountType: bankDetails.accountType,
        accountHolder: bankDetails.accountHolder,
      });
    }
    setEditingBank(true);
  };

  const handleSaveBank = () => {
    if (!bankForm.bankName || !bankForm.accountNumber || !bankForm.branchCode || !bankForm.accountHolder) {
      toast.error('All bank detail fields are required');
      return;
    }
    updateBankMutation.mutate(bankForm);
  };

  const payoutStatusConfig: Record<string, { label: string; color: string }> = {
    PENDING: { label: 'Pending', color: 'text-yellow-600 bg-yellow-500/10' },
    PROCESSING: { label: 'Processing', color: 'text-blue-600 bg-blue-500/10' },
    COMPLETED: { label: 'Completed', color: 'text-green-600 bg-green-500/10' },
    FAILED: { label: 'Failed', color: 'text-red-600 bg-red-500/10' },
  };

  if (balanceLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const available = balance?.available ?? 0;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold mb-2">Earnings</h1>
          <p className="text-muted-foreground">Track your earnings and request payouts</p>
        </div>
        <Button onClick={() => setShowWithdrawModal(true)} disabled={available <= 0 || !bankDetails}>
          <ArrowDownTrayIcon className="h-5 w-5 mr-2" />
          Withdraw
        </Button>
      </div>

      {/* KYC Withdrawal Notice */}
      {kycStatus !== 'VERIFIED' && (
        <div className={cn(
          'border rounded-lg p-4 mb-6 flex items-start gap-3',
          kycStatus === 'PENDING' ? 'bg-yellow-50 border-yellow-200 dark:bg-yellow-950/20 dark:border-yellow-800' : 'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800'
        )}>
          {kycStatus === 'PENDING' ? (
            <ExclamationTriangleIcon className="h-6 w-6 text-yellow-600 shrink-0 mt-0.5" />
          ) : (
            <ShieldExclamationIcon className="h-6 w-6 text-red-600 shrink-0 mt-0.5" />
          )}
          <div>
            <h3 className={cn(
              'font-semibold mb-1',
              kycStatus === 'PENDING' ? 'text-yellow-900 dark:text-yellow-200' : 'text-red-900 dark:text-red-200'
            )}>
              {kycStatus === 'PENDING' ? 'KYC Verification Pending' : 'KYC Verification Required'}
            </h3>
            <p className={cn(
              'text-sm',
              kycStatus === 'PENDING' ? 'text-yellow-800 dark:text-yellow-300' : 'text-red-800 dark:text-red-300'
            )}>
              {kycStatus === 'PENDING'
                ? 'Your identity verification is being reviewed. You can receive payments but withdrawals require verified KYC status. This usually takes 1-2 business days.'
                : 'Your identity verification was rejected. Please update your KYC documents in Settings to enable withdrawals.'}
            </p>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-card border rounded-lg p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-500/10 rounded-lg">
              <BanknotesIcon className="h-6 w-6 text-green-600" />
            </div>
            <span className="text-sm text-muted-foreground">Available Balance</span>
          </div>
          <p className="text-2xl font-bold">R{available.toFixed(2)}</p>
        </div>

        <div className="bg-card border rounded-lg p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-yellow-500/10 rounded-lg">
              <ClockIcon className="h-6 w-6 text-yellow-600" />
            </div>
            <span className="text-sm text-muted-foreground">Pending Clearance</span>
          </div>
          <p className="text-2xl font-bold">R{(balance?.pending ?? 0).toFixed(2)}</p>
        </div>

        <div className="bg-card border rounded-lg p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <ArrowTrendingUpIcon className="h-6 w-6 text-blue-600" />
            </div>
            <span className="text-sm text-muted-foreground">This Month</span>
          </div>
          <p className="text-2xl font-bold">R{(earnings?.thisMonth ?? 0).toFixed(2)}</p>
        </div>

        <div className="bg-card border rounded-lg p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-purple-500/10 rounded-lg">
              <CheckCircleIcon className="h-6 w-6 text-purple-600" />
            </div>
            <span className="text-sm text-muted-foreground">Total Earned</span>
          </div>
          <p className="text-2xl font-bold">R{(earnings?.totalEarned ?? 0).toFixed(2)}</p>
        </div>
      </div>

      {/* Fee Breakdown Info */}
      <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 mb-8">
        <h3 className="font-medium text-foreground mb-2">How earnings work</h3>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>- Platform fee: 8% is deducted from each completed order</li>
          <li>- Funds are held in escrow until order completion</li>
          <li>- Earnings become available after a 14-day clearance period</li>
          <li>- Minimum payout: R100</li>
        </ul>
      </div>

      {/* Bank Details Section */}
      <div className="bg-card border rounded-lg mb-8">
        <div className="p-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BuildingLibraryIcon className="h-5 w-5 text-muted-foreground" />
            <h2 className="font-semibold">Bank Details</h2>
          </div>
          {bankDetails && !editingBank && (
            <Button variant="ghost" size="sm" onClick={startEditBank}>
              <PencilIcon className="h-4 w-4 mr-1" />
              Edit
            </Button>
          )}
        </div>

        {bankLoading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto" />
          </div>
        ) : editingBank || !bankDetails ? (
          <div className="p-4 space-y-4">
            {!bankDetails && !editingBank && (
              <p className="text-sm text-muted-foreground mb-2">
                Add your bank details to enable withdrawals.
              </p>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Account Holder</label>
                <input
                  type="text"
                  value={bankForm.accountHolder}
                  onChange={(e) => setBankForm(f => ({ ...f, accountHolder: e.target.value }))}
                  placeholder="Full name as on account"
                  className="w-full px-3 py-2 border rounded-lg bg-background focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Bank Name</label>
                <input
                  type="text"
                  value={bankForm.bankName}
                  onChange={(e) => setBankForm(f => ({ ...f, bankName: e.target.value }))}
                  placeholder="e.g. FNB, Standard Bank"
                  className="w-full px-3 py-2 border rounded-lg bg-background focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Account Number</label>
                <input
                  type="text"
                  value={bankForm.accountNumber}
                  onChange={(e) => setBankForm(f => ({ ...f, accountNumber: e.target.value }))}
                  placeholder="Account number"
                  className="w-full px-3 py-2 border rounded-lg bg-background focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Branch Code</label>
                <input
                  type="text"
                  value={bankForm.branchCode}
                  onChange={(e) => setBankForm(f => ({ ...f, branchCode: e.target.value }))}
                  placeholder="Branch code"
                  className="w-full px-3 py-2 border rounded-lg bg-background focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Account Type</label>
                <select
                  value={bankForm.accountType}
                  onChange={(e) => setBankForm(f => ({ ...f, accountType: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg bg-background focus:ring-2 focus:ring-primary focus:outline-none"
                >
                  <option value="SAVINGS">Savings</option>
                  <option value="CURRENT">Current / Cheque</option>
                  <option value="TRANSMISSION">Transmission</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              {(editingBank || bankDetails) && (
                <Button variant="outline" onClick={() => setEditingBank(false)}>
                  Cancel
                </Button>
              )}
              <Button onClick={handleSaveBank} disabled={updateBankMutation.isPending}>
                {updateBankMutation.isPending ? 'Saving...' : bankDetails ? 'Update Details' : 'Save Details'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Account Holder</span>
                <p className="font-medium">{bankDetails.accountHolder}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Bank</span>
                <p className="font-medium">{bankDetails.bankName}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Account Number</span>
                <p className="font-medium">****{bankDetails.accountNumber.slice(-4)}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Branch Code</span>
                <p className="font-medium">{bankDetails.branchCode}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Account Type</span>
                <p className="font-medium">{bankDetails.accountType.charAt(0) + bankDetails.accountType.slice(1).toLowerCase()}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Status</span>
                <p className={cn('font-medium', bankDetails.isVerified ? 'text-green-600' : 'text-yellow-600')}>
                  {bankDetails.isVerified ? 'Verified' : 'Pending Verification'}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Payout History */}
      <div className="bg-card border rounded-lg">
        <div className="p-4 border-b">
          <h2 className="font-semibold">Payout History</h2>
        </div>
        
        {payoutsLoading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto" />
          </div>
        ) : payouts && payouts.length > 0 ? (
          <div className="divide-y">
            {payouts.map((payout) => {
              const status = payoutStatusConfig[payout.status] || payoutStatusConfig.PENDING;
              return (
                <div key={payout.id} className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium">R{Number(payout.amount).toFixed(2)}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(payout.createdAt).toLocaleDateString('en-ZA', { 
                        day: 'numeric', month: 'short', year: 'numeric' 
                      })}
                      {payout.bankReference && (
                        <span className="ml-2 text-xs">Ref: {payout.bankReference}</span>
                      )}
                      {payout.status === 'FAILED' && payout.failedReason && (
                        <span className="ml-2 text-xs text-red-500">{payout.failedReason}</span>
                      )}
                    </p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${status.color}`}>
                    {status.label}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-8 text-center text-muted-foreground">
            No payout history yet
          </div>
        )}
      </div>

      {/* Withdraw Modal */}
      {showWithdrawModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card rounded-lg p-6 w-full max-w-md mx-4 border">
            <h2 className="text-xl font-bold mb-4">Request Payout</h2>
            
            <div className="mb-4">
              <p className="text-sm text-muted-foreground mb-2">
                Available: <span className="font-semibold text-foreground">R{available.toFixed(2)}</span>
              </p>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">R</span>
                <input
                  type="number"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  placeholder="0.00"
                  min="100"
                  max={available}
                  step="0.01"
                  className="w-full pl-8 pr-4 py-2 border rounded-lg bg-background focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">Minimum: R100.00</p>
            </div>

            {bankDetails && (
              <div className="mb-4 p-3 bg-muted/50 rounded-lg text-sm">
                <p className="text-muted-foreground">Paying to</p>
                <p className="font-medium">{bankDetails.bankName} - ****{bankDetails.accountNumber.slice(-4)}</p>
                <p className="text-xs text-muted-foreground">{bankDetails.accountHolder}</p>
              </div>
            )}

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => { setShowWithdrawModal(false); setWithdrawAmount(''); }}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={handleWithdraw}
                disabled={requestPayoutMutation.isPending}
              >
                {requestPayoutMutation.isPending ? 'Processing...' : 'Request Payout'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
