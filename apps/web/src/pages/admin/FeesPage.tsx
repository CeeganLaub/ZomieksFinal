import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { toast } from 'sonner';
import { 
  BanknotesIcon, 
  ArrowPathIcon,
  PlusIcon,
  TrashIcon,
  CheckIcon,
} from '@heroicons/react/24/outline';
import { cn } from '../../lib/utils';

interface SellerTier {
  maxAmount: number | null;
  pct: number;
  min: number;
}

interface FeePolicy {
  id: string;
  name: string;
  isActive: boolean;
  buyerPlatformPct: number;
  buyerPlatformMin: number;
  buyerProcessingMin: number;
  sellerTiers: SellerTier[];
  bufferPct: number;
  bufferFixed: number;
  vatPct: number;
  reserveDays: number;
  payoutMinimum: number;
  createdAt?: string;
}

interface FeePreview {
  baseAmount: number;
  buyerPlatformFee: number;
  buyerProcessingFee: number;
  grossAmount: number;
  sellerPlatformFee: number;
  sellerPayoutAmount: number;
  platformRevenue: number;
  baseAmountDisplay: string;
  buyerPlatformFeeDisplay: string;
  buyerProcessingFeeDisplay: string;
  sellerPlatformFeeDisplay: string;
  grossAmountDisplay: string;
  platformRevenueDisplay: string;
  sellerPayoutAmountDisplay: string;
}

export default function FeesPage() {
  const [policies, setPolicies] = useState<FeePolicy[]>([]);
  const [activePolicy, setActivePolicy] = useState<FeePolicy | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Preview calculator
  const [previewAmount, setPreviewAmount] = useState(10000); // R100 in cents
  const [previewGateway, setPreviewGateway] = useState<'PAYFAST' | 'OZOW'>('PAYFAST');
  const [previewMethod, setPreviewMethod] = useState<'CARD' | 'EFT'>('CARD');
  const [previewResult, setPreviewResult] = useState<FeePreview | null>(null);
  const [calculating, setCalculating] = useState(false);
  
  // Editing state
  const [editingPolicy, setEditingPolicy] = useState<FeePolicy | null>(null);

  useEffect(() => {
    loadPolicies();
  }, []);

  async function loadPolicies() {
    try {
      setLoading(true);
      const [policiesRes, activeRes] = await Promise.all([
        api.get<{ success: boolean; data: FeePolicy[] }>('/admin/settings/fees'),
        api.get<{ success: boolean; data: FeePolicy; isDefault?: boolean }>('/admin/settings/fees/active'),
      ]);
      
      setPolicies(policiesRes.data || []);
      setActivePolicy(activeRes.data);
    } catch (error) {
      toast.error('Failed to load fee policies');
    } finally {
      setLoading(false);
    }
  }

  async function calculatePreview() {
    try {
      setCalculating(true);
      const res = await api.post<{ success: boolean; data: FeePreview }>('/admin/settings/fees/preview', {
        baseAmount: previewAmount,
        gateway: previewGateway,
        method: previewMethod,
        policyId: editingPolicy?.id,
      });
      setPreviewResult(res.data);
    } catch (error) {
      toast.error('Failed to calculate fees');
    } finally {
      setCalculating(false);
    }
  }

  async function savePolicy() {
    if (!editingPolicy) return;
    
    try {
      setSaving(true);
      
      if (editingPolicy.id === 'new') {
        await api.post('/admin/settings/fees', {
          name: editingPolicy.name,
          buyerPlatformPct: editingPolicy.buyerPlatformPct,
          buyerPlatformMin: editingPolicy.buyerPlatformMin,
          buyerProcessingMin: editingPolicy.buyerProcessingMin,
          sellerTiers: editingPolicy.sellerTiers,
          bufferPct: editingPolicy.bufferPct,
          bufferFixed: editingPolicy.bufferFixed,
          vatPct: editingPolicy.vatPct,
          reserveDays: editingPolicy.reserveDays,
          payoutMinimum: editingPolicy.payoutMinimum,
        });
        toast.success('Fee policy created');
      } else {
        await api.patch(`/admin/settings/fees/${editingPolicy.id}`, editingPolicy);
        toast.success('Fee policy updated');
      }
      
      setEditingPolicy(null);
      loadPolicies();
    } catch (error) {
      toast.error('Failed to save policy');
    } finally {
      setSaving(false);
    }
  }

  async function activatePolicy(id: string) {
    try {
      await api.post(`/admin/settings/fees/${id}/activate`);
      toast.success('Policy activated');
      loadPolicies();
    } catch (error) {
      toast.error('Failed to activate policy');
    }
  }

  async function deletePolicy(id: string) {
    if (!confirm('Are you sure you want to delete this policy?')) return;
    
    try {
      await api.delete(`/admin/settings/fees/${id}`);
      toast.success('Policy deleted');
      loadPolicies();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete policy');
    }
  }

  function createNewPolicy() {
    setEditingPolicy({
      id: 'new',
      name: 'New Policy',
      isActive: false,
      buyerPlatformPct: 300, // 3%
      buyerPlatformMin: 1000, // R10
      buyerProcessingMin: 1500, // R15
      sellerTiers: [
        { maxAmount: 50000, pct: 1200, min: 1500 },
        { maxAmount: 200000, pct: 1000, min: 2000 },
        { maxAmount: null, pct: 800, min: 3000 },
      ],
      bufferPct: 20, // 0.2%
      bufferFixed: 100, // R1
      vatPct: 1500, // 15%
      reserveDays: 7,
      payoutMinimum: 10000, // R100
    });
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Fees & Calculations</h1>
          <p className="text-muted-foreground">Manage platform fee structure and payout settings</p>
        </div>
        <button
          onClick={createNewPolicy}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90"
        >
          <PlusIcon className="h-5 w-5" />
          Create Policy
        </button>
      </div>

      {/* Active Policy */}
      {activePolicy && (
        <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <CheckIcon className="h-5 w-5 text-green-600" />
            <h2 className="font-semibold text-green-800 dark:text-green-200">Active Policy: {activePolicy.name}</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Buyer Platform Fee</p>
              <p className="font-medium">{(activePolicy.buyerPlatformPct / 100).toFixed(1)}%</p>
            </div>
            <div>
              <p className="text-muted-foreground">Buyer Processing Min</p>
              <p className="font-medium">R{(activePolicy.buyerProcessingMin / 100).toFixed(2)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Reserve Period</p>
              <p className="font-medium">{activePolicy.reserveDays} days</p>
            </div>
            <div>
              <p className="text-muted-foreground">Minimum Payout</p>
              <p className="font-medium">R{(activePolicy.payoutMinimum / 100).toFixed(2)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Fee Calculator */}
      <div className="bg-background border rounded-lg p-6">
        <h2 className="font-semibold mb-4 flex items-center gap-2">
          <BanknotesIcon className="h-5 w-5" />
          Fee Calculator
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-1">Service Price (Rands)</label>
            <input
              type="number"
              value={previewAmount / 100}
              onChange={(e) => setPreviewAmount(Number(e.target.value) * 100)}
              className="w-full px-3 py-2 border rounded-lg"
              min={0}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Gateway</label>
            <select
              value={previewGateway}
              onChange={(e) => setPreviewGateway(e.target.value as 'PAYFAST' | 'OZOW')}
              className="w-full px-3 py-2 border rounded-lg bg-background"
            >
              <option value="PAYFAST">PayFast</option>
              <option value="OZOW">Ozow</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Method</label>
            <select
              value={previewMethod}
              onChange={(e) => setPreviewMethod(e.target.value as 'CARD' | 'EFT')}
              className="w-full px-3 py-2 border rounded-lg bg-background"
            >
              <option value="CARD">Card</option>
              <option value="EFT">EFT</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={calculatePreview}
              disabled={calculating}
              className="w-full bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 disabled:opacity-50"
            >
              {calculating ? 'Calculating...' : 'Calculate'}
            </button>
          </div>
        </div>

        {previewResult && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground">Buyer Pays</p>
              <p className="text-lg font-bold">R{previewResult.grossAmountDisplay}</p>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground">Seller Gets</p>
              <p className="text-lg font-bold text-green-600">R{previewResult.sellerPayoutAmountDisplay}</p>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground">Platform Revenue</p>
              <p className="text-lg font-bold text-blue-600">R{previewResult.platformRevenueDisplay}</p>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground">Processing Fee</p>
              <p className="text-lg font-bold">R{previewResult.buyerProcessingFeeDisplay}</p>
            </div>
          </div>
        )}
      </div>

      {/* All Policies */}
      <div className="bg-background border rounded-lg p-6">
        <h2 className="font-semibold mb-4">All Fee Policies</h2>
        <div className="space-y-4">
          {policies.map((policy) => (
            <div
              key={policy.id}
              className={cn(
                "p-4 border rounded-lg",
                policy.isActive && "border-green-500 bg-green-50/50 dark:bg-green-950/20"
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium">{policy.name}</h3>
                  {policy.isActive && (
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">Active</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setEditingPolicy(policy)}
                    className="text-sm text-primary hover:underline"
                  >
                    Edit
                  </button>
                  {!policy.isActive && (
                    <>
                      <button
                        onClick={() => activatePolicy(policy.id)}
                        className="text-sm text-green-600 hover:underline"
                      >
                        Activate
                      </button>
                      <button
                        onClick={() => deletePolicy(policy.id)}
                        className="text-sm text-red-600 hover:underline"
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-sm text-muted-foreground">
                <div>Buyer: {(policy.buyerPlatformPct / 100).toFixed(1)}%</div>
                <div>Processing Min: R{(policy.buyerProcessingMin / 100).toFixed(0)}</div>
                <div>Reserve: {policy.reserveDays}d</div>
                <div>Payout Min: R{(policy.payoutMinimum / 100).toFixed(0)}</div>
              </div>
            </div>
          ))}
          
          {policies.length === 0 && (
            <p className="text-center text-muted-foreground py-8">
              No fee policies found. Create one to get started.
            </p>
          )}
        </div>
      </div>

      {/* Edit/Create Modal */}
      {editingPolicy && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background border rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">
              {editingPolicy.id === 'new' ? 'Create Fee Policy' : 'Edit Fee Policy'}
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Policy Name</label>
                <input
                  type="text"
                  value={editingPolicy.name}
                  onChange={(e) => setEditingPolicy({ ...editingPolicy, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Buyer Platform Fee (%)</label>
                  <input
                    type="number"
                    value={editingPolicy.buyerPlatformPct / 100}
                    onChange={(e) => setEditingPolicy({ ...editingPolicy, buyerPlatformPct: Number(e.target.value) * 100 })}
                    className="w-full px-3 py-2 border rounded-lg"
                    step="0.1"
                    min={0}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Min Buyer Fee (R)</label>
                  <input
                    type="number"
                    value={editingPolicy.buyerPlatformMin / 100}
                    onChange={(e) => setEditingPolicy({ ...editingPolicy, buyerPlatformMin: Number(e.target.value) * 100 })}
                    className="w-full px-3 py-2 border rounded-lg"
                    step="1"
                    min={0}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Processing Fee Min (R)</label>
                  <input
                    type="number"
                    value={editingPolicy.buyerProcessingMin / 100}
                    onChange={(e) => setEditingPolicy({ ...editingPolicy, buyerProcessingMin: Number(e.target.value) * 100 })}
                    className="w-full px-3 py-2 border rounded-lg"
                    step="1"
                    min={0}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">VAT (%)</label>
                  <input
                    type="number"
                    value={editingPolicy.vatPct / 100}
                    onChange={(e) => setEditingPolicy({ ...editingPolicy, vatPct: Number(e.target.value) * 100 })}
                    className="w-full px-3 py-2 border rounded-lg"
                    step="0.1"
                    min={0}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Seller Fee Tiers</label>
                <div className="space-y-2">
                  {editingPolicy.sellerTiers.map((tier, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <input
                        type="number"
                        placeholder="Max amount (R)"
                        value={tier.maxAmount ? tier.maxAmount / 100 : ''}
                        onChange={(e) => {
                          const newTiers = [...editingPolicy.sellerTiers];
                          newTiers[i] = { ...tier, maxAmount: e.target.value ? Number(e.target.value) * 100 : null };
                          setEditingPolicy({ ...editingPolicy, sellerTiers: newTiers });
                        }}
                        className="flex-1 px-3 py-2 border rounded-lg"
                      />
                      <input
                        type="number"
                        placeholder="Fee %"
                        value={tier.pct / 100}
                        onChange={(e) => {
                          const newTiers = [...editingPolicy.sellerTiers];
                          newTiers[i] = { ...tier, pct: Number(e.target.value) * 100 };
                          setEditingPolicy({ ...editingPolicy, sellerTiers: newTiers });
                        }}
                        className="w-24 px-3 py-2 border rounded-lg"
                        step="0.1"
                      />
                      <input
                        type="number"
                        placeholder="Min (R)"
                        value={tier.min / 100}
                        onChange={(e) => {
                          const newTiers = [...editingPolicy.sellerTiers];
                          newTiers[i] = { ...tier, min: Number(e.target.value) * 100 };
                          setEditingPolicy({ ...editingPolicy, sellerTiers: newTiers });
                        }}
                        className="w-24 px-3 py-2 border rounded-lg"
                      />
                      <button
                        onClick={() => {
                          const newTiers = editingPolicy.sellerTiers.filter((_, j) => j !== i);
                          setEditingPolicy({ ...editingPolicy, sellerTiers: newTiers });
                        }}
                        className="p-2 text-red-600 hover:bg-red-50 rounded"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => {
                      setEditingPolicy({
                        ...editingPolicy,
                        sellerTiers: [...editingPolicy.sellerTiers, { maxAmount: null, pct: 500, min: 1000 }]
                      });
                    }}
                    className="text-sm text-primary hover:underline"
                  >
                    + Add tier
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Reserve Period (days)</label>
                  <input
                    type="number"
                    value={editingPolicy.reserveDays}
                    onChange={(e) => setEditingPolicy({ ...editingPolicy, reserveDays: Number(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-lg"
                    min={0}
                    max={90}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Minimum Payout (R)</label>
                  <input
                    type="number"
                    value={editingPolicy.payoutMinimum / 100}
                    onChange={(e) => setEditingPolicy({ ...editingPolicy, payoutMinimum: Number(e.target.value) * 100 })}
                    className="w-full px-3 py-2 border rounded-lg"
                    min={0}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Buffer % (gateway fee margin)</label>
                  <input
                    type="number"
                    value={editingPolicy.bufferPct / 100}
                    onChange={(e) => setEditingPolicy({ ...editingPolicy, bufferPct: Number(e.target.value) * 100 })}
                    className="w-full px-3 py-2 border rounded-lg"
                    step="0.1"
                    min={0}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Buffer Fixed (R)</label>
                  <input
                    type="number"
                    value={editingPolicy.bufferFixed / 100}
                    onChange={(e) => setEditingPolicy({ ...editingPolicy, bufferFixed: Number(e.target.value) * 100 })}
                    className="w-full px-3 py-2 border rounded-lg"
                    step="1"
                    min={0}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-4 mt-6 pt-4 border-t">
              <button
                onClick={() => setEditingPolicy(null)}
                className="px-4 py-2 border rounded-lg hover:bg-muted"
              >
                Cancel
              </button>
              <button
                onClick={savePolicy}
                disabled={saving}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Policy'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
