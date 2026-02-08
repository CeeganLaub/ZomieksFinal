import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';
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
} from '@heroicons/react/24/outline';

interface Wallet {
  id: string;
  balance: number;
  pendingBalance: number;
  currency: string;
}

interface Payout {
  id: string;
  amount: number;
  status: string;
  method: string;
  createdAt: string;
  processedAt: string | null;
}

interface EarningsSummary {
  totalEarnings: number;
  thisMonth: number;
  pendingClearance: number;
  availableForWithdrawal: number;
}

export default function EarningsPage() {
  const queryClient = useQueryClient();
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);

  const { data: wallet, isLoading: walletLoading } = useQuery<Wallet>({
    queryKey: ['wallet'],
    queryFn: async () => {
      const res = await api.get('/payments/balance');
      return (res as any).data;
    },
  });

  const { data: payouts, isLoading: payoutsLoading } = useQuery<Payout[]>({
    queryKey: ['payouts'],
    queryFn: async () => {
      const res = await api.get('/payments/payouts');
      return (res as any).data?.payouts || [];
    },
  });

  const { data: summary } = useQuery<EarningsSummary>({
    queryKey: ['earnings-summary'],
    queryFn: async () => {
      const res = await api.get('/payments/earnings');
      return (res as any).data;
    },
  });

  // Fetch KYC status for withdrawal banner
  const { data: kycData } = useQuery<{ kycStatus: string }>({
    queryKey: ['kyc-status'],
    queryFn: async () => {
      const res = await api.get('/users/seller/fee-status');
      return (res as any).data;
    },
  });
  const kycStatus = kycData?.kycStatus || 'PENDING';

  const requestPayoutMutation = useMutation({
    mutationFn: async (amount: number) => {
      await api.post('/payments/withdraw', { amount, method: 'BANK_TRANSFER' });
    },
    onSuccess: () => {
      toast.success('Payout request submitted');
      setShowWithdrawModal(false);
      setWithdrawAmount('');
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      queryClient.invalidateQueries({ queryKey: ['payouts'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Failed to request payout');
    },
  });

  const handleWithdraw = () => {
    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Enter a valid amount');
      return;
    }
    if (wallet && amount > wallet.balance) {
      toast.error('Insufficient balance');
      return;
    }
    requestPayoutMutation.mutate(amount);
  };

  const payoutStatusConfig: Record<string, { label: string; color: string }> = {
    PENDING: { label: 'Pending', color: 'text-yellow-600 bg-yellow-50' },
    PROCESSING: { label: 'Processing', color: 'text-blue-600 bg-blue-50' },
    COMPLETED: { label: 'Completed', color: 'text-green-600 bg-green-50' },
    FAILED: { label: 'Failed', color: 'text-red-600 bg-red-50' },
  };

  if (walletLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold mb-2">Earnings</h1>
          <p className="text-muted-foreground">Track your earnings and request payouts</p>
        </div>
        <Button onClick={() => setShowWithdrawModal(true)} disabled={!wallet || wallet.balance <= 0}>
          <ArrowDownTrayIcon className="h-5 w-5 mr-2" />
          Withdraw
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white border rounded-lg p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-100 rounded-lg">
              <BanknotesIcon className="h-6 w-6 text-green-600" />
            </div>
            <span className="text-sm text-muted-foreground">Available Balance</span>
          </div>
          <p className="text-2xl font-bold">R{wallet?.balance.toFixed(2) || '0.00'}</p>
        </div>

        <div className="bg-white border rounded-lg p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <ClockIcon className="h-6 w-6 text-yellow-600" />
            </div>
            <span className="text-sm text-muted-foreground">Pending Clearance</span>
          </div>
          <p className="text-2xl font-bold">R{wallet?.pendingBalance.toFixed(2) || '0.00'}</p>
        </div>

        <div className="bg-white border rounded-lg p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-100 rounded-lg">
              <ArrowTrendingUpIcon className="h-6 w-6 text-blue-600" />
            </div>
            <span className="text-sm text-muted-foreground">This Month</span>
          </div>
          <p className="text-2xl font-bold">R{summary?.thisMonth.toFixed(2) || '0.00'}</p>
        </div>

        <div className="bg-white border rounded-lg p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-purple-100 rounded-lg">
              <CheckCircleIcon className="h-6 w-6 text-purple-600" />
            </div>
            <span className="text-sm text-muted-foreground">Total Earned</span>
          </div>
          <p className="text-2xl font-bold">R{summary?.totalEarnings.toFixed(2) || '0.00'}</p>
        </div>
      </div>

      {/* KYC Withdrawal Notice */}
      {kycStatus !== 'VERIFIED' && (
        <div className={cn(
          'border rounded-lg p-4 mb-8 flex items-start gap-3',
          kycStatus === 'PENDING' ? 'bg-yellow-50 border-yellow-200' : 'bg-red-50 border-red-200'
        )}>
          {kycStatus === 'PENDING' ? (
            <ExclamationTriangleIcon className="h-6 w-6 text-yellow-600 shrink-0 mt-0.5" />
          ) : (
            <ShieldExclamationIcon className="h-6 w-6 text-red-600 shrink-0 mt-0.5" />
          )}
          <div>
            <h3 className={cn(
              'font-semibold mb-1',
              kycStatus === 'PENDING' ? 'text-yellow-900' : 'text-red-900'
            )}>
              {kycStatus === 'PENDING' ? 'KYC Verification Pending' : 'KYC Verification Required'}
            </h3>
            <p className={cn(
              'text-sm',
              kycStatus === 'PENDING' ? 'text-yellow-800' : 'text-red-800'
            )}>
              {kycStatus === 'PENDING'
                ? 'Your identity verification is being reviewed. You can receive payments but withdrawals require verified KYC status. This usually takes 1-2 business days.'
                : 'Your identity verification was rejected. Please update your KYC documents in Settings to enable withdrawals. Contact support if you need help.'}
            </p>
          </div>
        </div>
      )}

      {/* Fee Breakdown Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
        <h3 className="font-medium text-blue-900 mb-2">How earnings work</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>- Platform fee: 8% is deducted from each completed order</li>
          <li>- Funds are held in escrow until order completion</li>
          <li>- Earnings become available after a 14-day clearance period</li>
          <li>- Minimum payout: R100</li>
        </ul>
      </div>

      {/* Payout History */}
      <div className="bg-white border rounded-lg">
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
                    <p className="font-medium">R{payout.amount.toFixed(2)}</p>
                    <p className="text-sm text-muted-foreground">
                      {payout.method.replace('_', ' ')} - {new Date(payout.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs ${status.color}`}>
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
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h2 className="text-xl font-bold mb-4">Request Payout</h2>
            
            <div className="mb-4">
              <p className="text-sm text-muted-foreground mb-2">
                Available: R{wallet?.balance.toFixed(2)}
              </p>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">R</span>
                <input
                  type="number"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  placeholder="0.00"
                  min="100"
                  max={wallet?.balance}
                  className="w-full pl-8 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">Minimum: R100</p>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowWithdrawModal(false)}
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
