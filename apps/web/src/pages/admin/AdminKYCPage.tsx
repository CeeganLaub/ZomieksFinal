import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { toast } from 'sonner';
import {
  ArrowPathIcon,
  CheckCircleIcon,
  XCircleIcon,
  ShieldCheckIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';

interface SellerKYC {
  id: string;
  displayName: string;
  professionalTitle: string;
  idNumber: string | null;
  kycStatus: string;
  createdAt: string;
  user: {
    id: string;
    email: string;
    username: string;
    firstName: string;
    lastName: string;
    country: string | null;
    bankDetails: {
      bankName: string;
      accountNumber: string;
      branchCode: string;
      accountType: string;
      accountHolder: string;
    } | null;
  };
}

export default function AdminKYCPage() {
  const [sellers, setSellers] = useState<SellerKYC[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    loadPendingKYC();
  }, []);

  async function loadPendingKYC() {
    try {
      setLoading(true);
      const res = await api.get<{ success: boolean; data: { sellers: SellerKYC[] } }>('/admin/sellers/pending-kyc');
      setSellers(res.data.sellers);
    } catch {
      setSellers([]);
    } finally {
      setLoading(false);
    }
  }

  async function verifyKYC(userId: string, status: 'VERIFIED' | 'REJECTED') {
    try {
      setProcessingId(userId);
      await api.post(`/admin/sellers/${userId}/verify-kyc`, { status });
      toast.success(status === 'VERIFIED' ? 'Seller verified successfully!' : 'Seller verification rejected.');
      setSellers((prev) => prev.filter((s) => s.user.id !== userId));
    } catch (err: any) {
      toast.error(err.message || 'Failed to update KYC status');
    } finally {
      setProcessingId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <ArrowPathIcon className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">KYC Verifications</h1>
          <p className="text-muted-foreground">
            Review and verify seller identity documents ({sellers.length} pending)
          </p>
        </div>
        <button
          onClick={loadPendingKYC}
          className="flex items-center gap-2 px-3 py-2 text-sm border rounded-lg hover:bg-muted transition-colors"
        >
          <ArrowPathIcon className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {sellers.length === 0 ? (
        <div className="bg-background border rounded-lg p-12 text-center">
          <ShieldCheckIcon className="h-12 w-12 mx-auto text-green-500 mb-4" />
          <h3 className="font-semibold mb-2">All caught up!</h3>
          <p className="text-muted-foreground text-sm">No pending KYC verifications at the moment.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sellers.map((seller) => (
            <div key={seller.id} className="bg-background border rounded-lg p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                    {seller.user.firstName?.charAt(0) || seller.user.username?.charAt(0)?.toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-semibold">{seller.user.firstName} {seller.user.lastName}</h3>
                    <p className="text-sm text-muted-foreground">@{seller.user.username} · {seller.user.email}</p>
                  </div>
                </div>
                <span className="flex items-center gap-1 text-xs text-yellow-600 bg-yellow-50 px-2 py-1 rounded-full">
                  <ClockIcon className="h-3.5 w-3.5" /> Pending Review
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Seller Profile Info */}
                <div className="bg-muted/30 rounded-lg p-4 space-y-2">
                  <h4 className="font-medium text-sm mb-2">Seller Profile</h4>
                  <div className="text-sm">
                    <span className="text-muted-foreground">Display Name:</span>{' '}
                    <span className="font-medium">{seller.displayName}</span>
                  </div>
                  <div className="text-sm">
                    <span className="text-muted-foreground">Title:</span>{' '}
                    <span className="font-medium">{seller.professionalTitle}</span>
                  </div>
                  <div className="text-sm">
                    <span className="text-muted-foreground">Country:</span>{' '}
                    <span className="font-medium">{seller.user.country || 'N/A'}</span>
                  </div>
                  <div className="text-sm">
                    <span className="text-muted-foreground">Registered:</span>{' '}
                    <span className="font-medium">{new Date(seller.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>

                {/* KYC & Bank Details */}
                <div className="bg-muted/30 rounded-lg p-4 space-y-2">
                  <h4 className="font-medium text-sm mb-2">KYC & Banking</h4>
                  <div className="text-sm">
                    <span className="text-muted-foreground">ID Number:</span>{' '}
                    <span className="font-medium font-mono">{seller.idNumber || 'Not provided'}</span>
                  </div>
                  {seller.user.bankDetails && (
                    <>
                      <div className="text-sm">
                        <span className="text-muted-foreground">Bank:</span>{' '}
                        <span className="font-medium">{seller.user.bankDetails.bankName}</span>
                      </div>
                      <div className="text-sm">
                        <span className="text-muted-foreground">Account:</span>{' '}
                        <span className="font-medium font-mono">
                          {'•'.repeat(Math.max(0, seller.user.bankDetails.accountNumber.length - 4))}
                          {seller.user.bankDetails.accountNumber.slice(-4)}
                        </span>
                      </div>
                      <div className="text-sm">
                        <span className="text-muted-foreground">Branch:</span>{' '}
                        <span className="font-medium">{seller.user.bankDetails.branchCode}</span>
                      </div>
                      <div className="text-sm">
                        <span className="text-muted-foreground">Holder:</span>{' '}
                        <span className="font-medium">{seller.user.bankDetails.accountHolder}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 mt-4 pt-4 border-t">
                <button
                  onClick={() => verifyKYC(seller.user.id, 'REJECTED')}
                  disabled={processingId === seller.user.id}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                >
                  <XCircleIcon className="h-4 w-4" />
                  Reject
                </button>
                <button
                  onClick={() => verifyKYC(seller.user.id, 'VERIFIED')}
                  disabled={processingId === seller.user.id}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  <CheckCircleIcon className="h-4 w-4" />
                  Verify
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
