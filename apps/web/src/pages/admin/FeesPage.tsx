import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { toast } from 'sonner';
import { 
  BanknotesIcon, 
  ArrowPathIcon,
  PlusIcon,
  TrashIcon,
  CheckIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  CurrencyDollarIcon,
  ArrowsRightLeftIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';
import { cn } from '../../lib/utils';

// ---- Types ----
interface SellerTier { maxAmount: number | null; pct: number; min: number; }
interface FeePolicy {
  id: string; name: string; isActive: boolean;
  buyerPlatformPct: number; buyerPlatformMin: number; buyerProcessingMin: number;
  sellerTiers: SellerTier[]; bufferPct: number; bufferFixed: number;
  vatPct: number; reserveDays: number; payoutMinimum: number; createdAt?: string;
}
interface FeePreview {
  baseAmount: number; buyerPlatformFee: number; buyerProcessingFee: number;
  grossAmount: number; sellerPlatformFee: number; sellerPayoutAmount: number;
  platformRevenue: number; baseAmountDisplay: string; buyerPlatformFeeDisplay: string;
  buyerProcessingFeeDisplay: string; sellerPlatformFeeDisplay: string;
  grossAmountDisplay: string; platformRevenueDisplay: string; sellerPayoutAmountDisplay: string;
}
interface MonthlyRow {
  month: string; income: number; gmv: number; buyerFees: number; sellerFees: number;
  courseSales: number; payouts: number; refunds: number; expenses: number;
  netProfit: number; orders: number; isPartial: boolean;
}
interface TxRow {
  id: string; type: string; status: string; grossAmount: number; gatewayFee: number;
  netAmount: number; platformRevenue: number; gateway: string; method: string;
  orderNumber: string | null; createdAt: string; paidAt: string | null;
}
interface PayoutRow {
  id: string; seller: string; sellerEmail: string; amount: number; fee: number;
  netAmount: number; status: string; currency: string; processedAt: string | null; createdAt: string;
}
interface RefundRow {
  id: string; amount: number; processingFee: number; reason: string;
  status: string; type: string; createdAt: string;
}
interface FinanceSummary {
  totalGMV: number; totalPlatformRevenue: number;
  totalBuyerPlatformFees: number; totalBuyerProcessingFees: number;
  totalSellerFees: number; totalCourseSales: number; totalCourseRefunds: number;
  totalSubscriptionIncome: number; totalSubscriptionGross: number;
  orderCount: number; enrollmentCount: number; subPaymentCount: number;
  completedPayouts: number; pendingPayouts: number; failedPayouts: number;
  completedPayoutCount: number; pendingPayoutCount: number;
  totalRefunds: number; refundCount: number; refundProcessingFees: number;
  totalGatewayFees: number; gatewayTxCount: number;
  estimatedVAT: number; vatPct: number;
  escrowHeld: number; escrowReleased: number; escrowRefunded: number; escrowHeldCount: number;
  netPlatformIncome: number;
}

type Tab = 'overview' | 'calculator' | 'policies' | 'activity';
const R = (v: number) => `R ${v.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function FeesPage() {
  const [tab, setTab] = useState<Tab>('overview');

  // Finance data
  const [financeLoading, setFinanceLoading] = useState(true);
  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [monthly, setMonthly] = useState<MonthlyRow[]>([]);
  const [recentTx, setRecentTx] = useState<TxRow[]>([]);
  const [recentPayouts, setRecentPayouts] = useState<PayoutRow[]>([]);
  const [recentRefunds, setRecentRefunds] = useState<RefundRow[]>([]);

  // Fee policies
  const [policies, setPolicies] = useState<FeePolicy[]>([]);
  const [activePolicy, setActivePolicy] = useState<FeePolicy | null>(null);
  const [policyLoading, setPolicyLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<FeePolicy | null>(null);

  // Calculator
  const [previewAmount, setPreviewAmount] = useState(10000);
  const [previewGateway, setPreviewGateway] = useState<'OZOW'>('OZOW');
  const [previewMethod, setPreviewMethod] = useState<'CARD' | 'EFT'>('CARD');
  const [previewResult, setPreviewResult] = useState<FeePreview | null>(null);
  const [calculating, setCalculating] = useState(false);

  useEffect(() => { loadFinance(); loadPolicies(); }, []);

  async function loadFinance() {
    try {
      setFinanceLoading(true);
      const res = await api.get<{
        success: boolean;
        data: {
          summary: FinanceSummary;
          monthlyData: MonthlyRow[];
          recentTransactions: TxRow[];
          recentPayouts: PayoutRow[];
          recentRefunds: RefundRow[];
        };
      }>('/admin/finance');
      setSummary(res.data.summary);
      setMonthly(res.data.monthlyData);
      setRecentTx(res.data.recentTransactions);
      setRecentPayouts(res.data.recentPayouts);
      setRecentRefunds(res.data.recentRefunds);
    } catch {
      toast.error('Failed to load financial data');
    } finally {
      setFinanceLoading(false);
    }
  }

  async function loadPolicies() {
    try {
      setPolicyLoading(true);
      const [policiesRes, activeRes] = await Promise.all([
        api.get<{ success: boolean; data: FeePolicy[] }>('/admin/settings/fees'),
        api.get<{ success: boolean; data: FeePolicy; isDefault?: boolean }>('/admin/settings/fees/active'),
      ]);
      setPolicies(policiesRes.data || []);
      setActivePolicy(activeRes.data);
    } catch { toast.error('Failed to load fee policies'); }
    finally { setPolicyLoading(false); }
  }

  async function calculatePreview() {
    try {
      setCalculating(true);
      const res = await api.post<{ success: boolean; data: FeePreview }>('/admin/settings/fees/preview', {
        baseAmount: previewAmount, gateway: previewGateway,
        method: previewMethod, policyId: editingPolicy?.id,
      });
      setPreviewResult(res.data);
    } catch { toast.error('Failed to calculate fees'); }
    finally { setCalculating(false); }
  }

  async function savePolicy() {
    if (!editingPolicy) return;
    try {
      setSaving(true);
      if (editingPolicy.id === 'new') {
        await api.post('/admin/settings/fees', {
          name: editingPolicy.name, buyerPlatformPct: editingPolicy.buyerPlatformPct,
          buyerPlatformMin: editingPolicy.buyerPlatformMin, buyerProcessingMin: editingPolicy.buyerProcessingMin,
          sellerTiers: editingPolicy.sellerTiers, bufferPct: editingPolicy.bufferPct,
          bufferFixed: editingPolicy.bufferFixed, vatPct: editingPolicy.vatPct,
          reserveDays: editingPolicy.reserveDays, payoutMinimum: editingPolicy.payoutMinimum,
        });
        toast.success('Fee policy created');
      } else {
        await api.patch(`/admin/settings/fees/${editingPolicy.id}`, editingPolicy);
        toast.success('Fee policy updated');
      }
      setEditingPolicy(null);
      loadPolicies();
    } catch { toast.error('Failed to save policy'); }
    finally { setSaving(false); }
  }

  async function activatePolicyFn(id: string) {
    try { await api.post(`/admin/settings/fees/${id}/activate`); toast.success('Policy activated'); loadPolicies(); }
    catch { toast.error('Failed to activate policy'); }
  }

  async function deletePolicy(id: string) {
    if (!confirm('Are you sure you want to delete this policy?')) return;
    try { await api.delete(`/admin/settings/fees/${id}`); toast.success('Policy deleted'); loadPolicies(); }
    catch (error: any) { toast.error(error.message || 'Failed to delete policy'); }
  }

  function createNewPolicy() {
    setEditingPolicy({
      id: 'new', name: 'New Policy', isActive: false,
      buyerPlatformPct: 300, buyerPlatformMin: 1000, buyerProcessingMin: 1500,
      sellerTiers: [
        { maxAmount: 50000, pct: 1200, min: 1500 },
        { maxAmount: 200000, pct: 1000, min: 2000 },
        { maxAmount: null, pct: 800, min: 3000 },
      ],
      bufferPct: 20, bufferFixed: 100, vatPct: 1500, reserveDays: 7, payoutMinimum: 10000,
    });
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'overview', label: 'Financial Overview' },
    { key: 'calculator', label: 'Fee Calculator' },
    { key: 'policies', label: 'Fee Policies' },
    { key: 'activity', label: 'Recent Activity' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Income & Expenses</h1>
          <p className="text-muted-foreground">Track all platform finances — revenue, fees, payouts, refunds & VAT</p>
        </div>
        <button onClick={() => { loadFinance(); loadPolicies(); }} className="flex items-center gap-2 text-sm border px-3 py-2 rounded-lg hover:bg-muted">
          <ArrowPathIcon className="h-4 w-4" /> Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b flex gap-1">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={cn('px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors',
              tab === t.key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >{t.label}</button>
        ))}
      </div>

      {/* =============== OVERVIEW TAB =============== */}
      {tab === 'overview' && (
        financeLoading ? (
          <div className="flex items-center justify-center h-64"><ArrowPathIcon className="h-8 w-8 animate-spin text-muted-foreground" /></div>
        ) : summary ? (
          <div className="space-y-6">
            {/* KPI Cards: Income */}
            <div>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
                <ArrowTrendingUpIcon className="h-4 w-4 text-green-600" /> Income
              </h2>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiCard label="Total GMV" value={R(summary.totalGMV)} sub={`${summary.orderCount} orders`} color="blue" />
                <KpiCard label="Platform Revenue" value={R(summary.totalPlatformRevenue)} sub="Buyer + seller fees" color="green" />
                <KpiCard label="Buyer Fees" value={R(summary.totalBuyerPlatformFees + summary.totalBuyerProcessingFees)}
                  sub={`Platform: ${R(summary.totalBuyerPlatformFees)} | Processing: ${R(summary.totalBuyerProcessingFees)}`} color="blue" />
                <KpiCard label="Seller Fees" value={R(summary.totalSellerFees)} sub="Commission from sellers" color="blue" />
                <KpiCard label="Course Sales" value={R(summary.totalCourseSales)} sub={`${summary.enrollmentCount} enrollments`} color="green" />
                <KpiCard label="Subscription Income" value={R(summary.totalSubscriptionIncome)} sub={`${summary.subPaymentCount} payments`} color="green" />
                <KpiCard label="Net Platform Income" value={R(summary.netPlatformIncome)}
                  sub="After payouts, refunds, fees" color={summary.netPlatformIncome >= 0 ? 'green' : 'red'} />
                <KpiCard label="Estimated VAT" value={R(summary.estimatedVAT)} sub={`${summary.vatPct}% inclusive`} color="amber" />
              </div>
            </div>

            {/* KPI Cards: Expenses */}
            <div>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
                <ArrowTrendingDownIcon className="h-4 w-4 text-red-600" /> Expenses
              </h2>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiCard label="Seller Payouts" value={R(summary.completedPayouts)}
                  sub={`${summary.completedPayoutCount} completed`} color="red" />
                <KpiCard label="Pending Payouts" value={R(summary.pendingPayouts)}
                  sub={`${summary.pendingPayoutCount} pending`} color="amber" />
                <KpiCard label="Refunds" value={R(summary.totalRefunds)}
                  sub={`${summary.refundCount} refunds | Fee: ${R(summary.refundProcessingFees)}`} color="red" />
                <KpiCard label="Gateway Fees" value={R(summary.totalGatewayFees)}
                  sub={`${summary.gatewayTxCount} transactions`} color="red" />
              </div>
            </div>

            {/* Escrow */}
            <div>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
                <ShieldCheckIcon className="h-4 w-4 text-indigo-600" /> Escrow Status
              </h2>
              <div className="grid grid-cols-3 gap-4">
                <KpiCard label="Held in Escrow" value={R(summary.escrowHeld)} sub={`${summary.escrowHeldCount} holds`} color="amber" />
                <KpiCard label="Released" value={R(summary.escrowReleased)} sub="Paid out to sellers" color="green" />
                <KpiCard label="Refunded" value={R(summary.escrowRefunded)} sub="Returned to buyers" color="red" />
              </div>
            </div>

            {/* Monthly Chart Table */}
            <div className="bg-background border rounded-lg p-6">
              <h2 className="font-semibold mb-4 flex items-center gap-2">
                <CurrencyDollarIcon className="h-5 w-5" /> Monthly Breakdown (12 Months)
              </h2>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="pb-2 pr-4 font-medium text-muted-foreground">Month</th>
                      <th className="pb-2 pr-4 font-medium text-muted-foreground text-right">GMV</th>
                      <th className="pb-2 pr-4 font-medium text-green-600 text-right">Income</th>
                      <th className="pb-2 pr-4 font-medium text-muted-foreground text-right">Course Sales</th>
                      <th className="pb-2 pr-4 font-medium text-red-600 text-right">Payouts</th>
                      <th className="pb-2 pr-4 font-medium text-red-600 text-right">Refunds</th>
                      <th className="pb-2 pr-4 font-medium text-blue-600 text-right">Net Profit</th>
                      <th className="pb-2 font-medium text-muted-foreground text-right">Orders</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthly.map((m) => (
                      <tr key={m.month} className={cn('border-b last:border-0', m.isPartial && 'bg-muted/30')}>
                        <td className="py-2 pr-4 font-medium">{m.month}{m.isPartial ? ' *' : ''}</td>
                        <td className="py-2 pr-4 text-right">{R(m.gmv)}</td>
                        <td className="py-2 pr-4 text-right text-green-600">{R(m.income)}</td>
                        <td className="py-2 pr-4 text-right">{R(m.courseSales)}</td>
                        <td className="py-2 pr-4 text-right text-red-600">{R(m.payouts)}</td>
                        <td className="py-2 pr-4 text-right text-red-600">{R(m.refunds)}</td>
                        <td className={cn('py-2 pr-4 text-right font-medium', m.netProfit >= 0 ? 'text-blue-600' : 'text-red-600')}>
                          {R(m.netProfit)}
                        </td>
                        <td className="py-2 text-right">{m.orders}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 font-semibold">
                      <td className="pt-2 pr-4">Total</td>
                      <td className="pt-2 pr-4 text-right">{R(monthly.reduce((s, m) => s + m.gmv, 0))}</td>
                      <td className="pt-2 pr-4 text-right text-green-600">{R(monthly.reduce((s, m) => s + m.income, 0))}</td>
                      <td className="pt-2 pr-4 text-right">{R(monthly.reduce((s, m) => s + m.courseSales, 0))}</td>
                      <td className="pt-2 pr-4 text-right text-red-600">{R(monthly.reduce((s, m) => s + m.payouts, 0))}</td>
                      <td className="pt-2 pr-4 text-right text-red-600">{R(monthly.reduce((s, m) => s + m.refunds, 0))}</td>
                      <td className={cn('pt-2 pr-4 text-right', monthly.reduce((s, m) => s + m.netProfit, 0) >= 0 ? 'text-blue-600' : 'text-red-600')}>
                        {R(monthly.reduce((s, m) => s + m.netProfit, 0))}
                      </td>
                      <td className="pt-2 text-right">{monthly.reduce((s, m) => s + m.orders, 0)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              <p className="text-xs text-muted-foreground mt-2">* Current month (partial data)</p>
            </div>
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-8">No financial data available.</p>
        )
      )}

      {/* =============== FEE CALCULATOR TAB =============== */}
      {tab === 'calculator' && (
        <div className="space-y-6">
          {activePolicy && (
            <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-6">
              <div className="flex items-center gap-2 mb-4">
                <CheckIcon className="h-5 w-5 text-green-600" />
                <h2 className="font-semibold text-green-800 dark:text-green-200">Active Policy: {activePolicy.name}</h2>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div><p className="text-muted-foreground">Buyer Platform Fee</p><p className="font-medium">{(activePolicy.buyerPlatformPct / 100).toFixed(1)}%</p></div>
                <div><p className="text-muted-foreground">Buyer Processing Min</p><p className="font-medium">R{(activePolicy.buyerProcessingMin / 100).toFixed(2)}</p></div>
                <div><p className="text-muted-foreground">Reserve Period</p><p className="font-medium">{activePolicy.reserveDays} days</p></div>
                <div><p className="text-muted-foreground">Minimum Payout</p><p className="font-medium">R{(activePolicy.payoutMinimum / 100).toFixed(2)}</p></div>
              </div>
            </div>
          )}

          <div className="bg-background border rounded-lg p-6">
            <h2 className="font-semibold mb-4 flex items-center gap-2"><BanknotesIcon className="h-5 w-5" /> Fee Calculator</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium mb-1">Service Price (Rands)</label>
                <input type="number" value={previewAmount / 100} onChange={(e) => setPreviewAmount(Number(e.target.value) * 100)}
                  className="w-full px-3 py-2 border rounded-lg" min={0} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Gateway</label>
                <select value={previewGateway} onChange={(e) => setPreviewGateway(e.target.value as 'OZOW')}
                  className="w-full px-3 py-2 border rounded-lg bg-background"><option value="OZOW">Ozow</option></select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Method</label>
                <select value={previewMethod} onChange={(e) => setPreviewMethod(e.target.value as 'CARD' | 'EFT')}
                  className="w-full px-3 py-2 border rounded-lg bg-background">
                  <option value="CARD">Card</option><option value="EFT">EFT</option>
                </select>
              </div>
              <div className="flex items-end">
                <button onClick={calculatePreview} disabled={calculating}
                  className="w-full bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 disabled:opacity-50">
                  {calculating ? 'Calculating...' : 'Calculate'}
                </button>
              </div>
            </div>
            {previewResult && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
                <div className="p-3 bg-muted/50 rounded-lg"><p className="text-xs text-muted-foreground">Buyer Pays</p><p className="text-lg font-bold">R{previewResult.grossAmountDisplay}</p></div>
                <div className="p-3 bg-muted/50 rounded-lg"><p className="text-xs text-muted-foreground">Seller Gets</p><p className="text-lg font-bold text-green-600">R{previewResult.sellerPayoutAmountDisplay}</p></div>
                <div className="p-3 bg-muted/50 rounded-lg"><p className="text-xs text-muted-foreground">Platform Revenue</p><p className="text-lg font-bold text-blue-600">R{previewResult.platformRevenueDisplay}</p></div>
                <div className="p-3 bg-muted/50 rounded-lg"><p className="text-xs text-muted-foreground">Processing Fee</p><p className="text-lg font-bold">R{previewResult.buyerProcessingFeeDisplay}</p></div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =============== POLICIES TAB =============== */}
      {tab === 'policies' && (
        <div className="space-y-6">
          <div className="flex justify-end">
            <button onClick={createNewPolicy} className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90">
              <PlusIcon className="h-5 w-5" /> Create Policy
            </button>
          </div>

          {policyLoading ? (
            <div className="flex items-center justify-center h-32"><ArrowPathIcon className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : (
            <div className="bg-background border rounded-lg p-6">
              <h2 className="font-semibold mb-4">All Fee Policies</h2>
              <div className="space-y-4">
                {policies.map((policy) => (
                  <div key={policy.id} className={cn('p-4 border rounded-lg', policy.isActive && 'border-green-500 bg-green-50/50 dark:bg-green-950/20')}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{policy.name}</h3>
                        {policy.isActive && <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">Active</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => setEditingPolicy(policy)} className="text-sm text-primary hover:underline">Edit</button>
                        {!policy.isActive && (
                          <>
                            <button onClick={() => activatePolicyFn(policy.id)} className="text-sm text-green-600 hover:underline">Activate</button>
                            <button onClick={() => deletePolicy(policy.id)} className="text-sm text-red-600 hover:underline">Delete</button>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-sm text-muted-foreground">
                      <div>Buyer: {(policy.buyerPlatformPct / 100).toFixed(1)}%</div>
                      <div>Processing Min: R{(policy.buyerProcessingMin / 100).toFixed(0)}</div>
                      <div>VAT: {(policy.vatPct / 100).toFixed(0)}%</div>
                      <div>Reserve: {policy.reserveDays}d</div>
                      <div>Payout Min: R{(policy.payoutMinimum / 100).toFixed(0)}</div>
                    </div>
                  </div>
                ))}
                {policies.length === 0 && <p className="text-center text-muted-foreground py-8">No fee policies found. Create one to get started.</p>}
              </div>
            </div>
          )}
        </div>
      )}

      {/* =============== ACTIVITY TAB =============== */}
      {tab === 'activity' && (
        financeLoading ? (
          <div className="flex items-center justify-center h-64"><ArrowPathIcon className="h-8 w-8 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="space-y-6">
            {/* Recent Transactions */}
            <div className="bg-background border rounded-lg p-6">
              <h2 className="font-semibold mb-4 flex items-center gap-2"><ArrowsRightLeftIcon className="h-5 w-5" /> Recent Transactions</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead><tr className="border-b text-left">
                    <th className="pb-2 pr-3 font-medium text-muted-foreground">Order</th>
                    <th className="pb-2 pr-3 font-medium text-muted-foreground">Type</th>
                    <th className="pb-2 pr-3 font-medium text-muted-foreground">Status</th>
                    <th className="pb-2 pr-3 font-medium text-muted-foreground text-right">Gross</th>
                    <th className="pb-2 pr-3 font-medium text-muted-foreground text-right">Gateway Fee</th>
                    <th className="pb-2 pr-3 font-medium text-muted-foreground text-right">Platform Rev</th>
                    <th className="pb-2 pr-3 font-medium text-muted-foreground">Gateway</th>
                    <th className="pb-2 font-medium text-muted-foreground">Date</th>
                  </tr></thead>
                  <tbody>
                    {recentTx.map((tx) => (
                      <tr key={tx.id} className="border-b last:border-0">
                        <td className="py-2 pr-3 font-mono text-xs">{tx.orderNumber || '—'}</td>
                        <td className="py-2 pr-3"><StatusBadge value={tx.type} /></td>
                        <td className="py-2 pr-3"><StatusBadge value={tx.status} /></td>
                        <td className="py-2 pr-3 text-right">{R(tx.grossAmount)}</td>
                        <td className="py-2 pr-3 text-right text-red-600">{R(tx.gatewayFee)}</td>
                        <td className="py-2 pr-3 text-right text-green-600">{R(tx.platformRevenue)}</td>
                        <td className="py-2 pr-3 text-xs">{tx.gateway}/{tx.method}</td>
                        <td className="py-2 text-xs text-muted-foreground">{new Date(tx.createdAt).toLocaleDateString('en-ZA')}</td>
                      </tr>
                    ))}
                    {recentTx.length === 0 && <tr><td colSpan={8} className="py-8 text-center text-muted-foreground">No transactions yet.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Recent Payouts */}
            <div className="bg-background border rounded-lg p-6">
              <h2 className="font-semibold mb-4">Recent Seller Payouts</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead><tr className="border-b text-left">
                    <th className="pb-2 pr-3 font-medium text-muted-foreground">Seller</th>
                    <th className="pb-2 pr-3 font-medium text-muted-foreground text-right">Amount</th>
                    <th className="pb-2 pr-3 font-medium text-muted-foreground text-right">Fee</th>
                    <th className="pb-2 pr-3 font-medium text-muted-foreground text-right">Net</th>
                    <th className="pb-2 pr-3 font-medium text-muted-foreground">Status</th>
                    <th className="pb-2 font-medium text-muted-foreground">Date</th>
                  </tr></thead>
                  <tbody>
                    {recentPayouts.map((p) => (
                      <tr key={p.id} className="border-b last:border-0">
                        <td className="py-2 pr-3"><span className="font-medium">{p.seller}</span><br /><span className="text-xs text-muted-foreground">{p.sellerEmail}</span></td>
                        <td className="py-2 pr-3 text-right">{R(p.amount)}</td>
                        <td className="py-2 pr-3 text-right text-red-600">{R(p.fee)}</td>
                        <td className="py-2 pr-3 text-right font-medium">{R(p.netAmount)}</td>
                        <td className="py-2 pr-3"><StatusBadge value={p.status} /></td>
                        <td className="py-2 text-xs text-muted-foreground">{p.processedAt ? new Date(p.processedAt).toLocaleDateString('en-ZA') : '—'}</td>
                      </tr>
                    ))}
                    {recentPayouts.length === 0 && <tr><td colSpan={6} className="py-8 text-center text-muted-foreground">No payouts yet.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Recent Refunds */}
            <div className="bg-background border rounded-lg p-6">
              <h2 className="font-semibold mb-4">Recent Refunds</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead><tr className="border-b text-left">
                    <th className="pb-2 pr-3 font-medium text-muted-foreground text-right">Amount</th>
                    <th className="pb-2 pr-3 font-medium text-muted-foreground text-right">Processing Fee</th>
                    <th className="pb-2 pr-3 font-medium text-muted-foreground">Reason</th>
                    <th className="pb-2 pr-3 font-medium text-muted-foreground">Type</th>
                    <th className="pb-2 pr-3 font-medium text-muted-foreground">Status</th>
                    <th className="pb-2 font-medium text-muted-foreground">Date</th>
                  </tr></thead>
                  <tbody>
                    {recentRefunds.map((r) => (
                      <tr key={r.id} className="border-b last:border-0">
                        <td className="py-2 pr-3 text-right">{R(r.amount)}</td>
                        <td className="py-2 pr-3 text-right text-red-600">{R(r.processingFee)}</td>
                        <td className="py-2 pr-3 text-xs max-w-[200px] truncate">{r.reason || '—'}</td>
                        <td className="py-2 pr-3"><StatusBadge value={r.type} /></td>
                        <td className="py-2 pr-3"><StatusBadge value={r.status} /></td>
                        <td className="py-2 text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleDateString('en-ZA')}</td>
                      </tr>
                    ))}
                    {recentRefunds.length === 0 && <tr><td colSpan={6} className="py-8 text-center text-muted-foreground">No refunds yet.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )
      )}

      {/* =============== POLICY EDIT/CREATE MODAL =============== */}
      {editingPolicy && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background border rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">{editingPolicy.id === 'new' ? 'Create Fee Policy' : 'Edit Fee Policy'}</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Policy Name</label>
                <input type="text" value={editingPolicy.name} onChange={(e) => setEditingPolicy({ ...editingPolicy, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium mb-1">Buyer Platform Fee (%)</label>
                  <input type="number" value={editingPolicy.buyerPlatformPct / 100}
                    onChange={(e) => setEditingPolicy({ ...editingPolicy, buyerPlatformPct: Number(e.target.value) * 100 })}
                    className="w-full px-3 py-2 border rounded-lg" step="0.1" min={0} /></div>
                <div><label className="block text-sm font-medium mb-1">Min Buyer Fee (R)</label>
                  <input type="number" value={editingPolicy.buyerPlatformMin / 100}
                    onChange={(e) => setEditingPolicy({ ...editingPolicy, buyerPlatformMin: Number(e.target.value) * 100 })}
                    className="w-full px-3 py-2 border rounded-lg" step="1" min={0} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium mb-1">Processing Fee Min (R)</label>
                  <input type="number" value={editingPolicy.buyerProcessingMin / 100}
                    onChange={(e) => setEditingPolicy({ ...editingPolicy, buyerProcessingMin: Number(e.target.value) * 100 })}
                    className="w-full px-3 py-2 border rounded-lg" step="1" min={0} /></div>
                <div><label className="block text-sm font-medium mb-1">VAT (%)</label>
                  <input type="number" value={editingPolicy.vatPct / 100}
                    onChange={(e) => setEditingPolicy({ ...editingPolicy, vatPct: Number(e.target.value) * 100 })}
                    className="w-full px-3 py-2 border rounded-lg" step="0.1" min={0} /></div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Seller Fee Tiers</label>
                <div className="space-y-2">
                  {editingPolicy.sellerTiers.map((tier, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <input type="number" placeholder="Max amount (R)" value={tier.maxAmount ? tier.maxAmount / 100 : ''}
                        onChange={(e) => { const t = [...editingPolicy.sellerTiers]; t[i] = { ...tier, maxAmount: e.target.value ? Number(e.target.value) * 100 : null }; setEditingPolicy({ ...editingPolicy, sellerTiers: t }); }}
                        className="flex-1 px-3 py-2 border rounded-lg" />
                      <input type="number" placeholder="Fee %" value={tier.pct / 100}
                        onChange={(e) => { const t = [...editingPolicy.sellerTiers]; t[i] = { ...tier, pct: Number(e.target.value) * 100 }; setEditingPolicy({ ...editingPolicy, sellerTiers: t }); }}
                        className="w-24 px-3 py-2 border rounded-lg" step="0.1" />
                      <input type="number" placeholder="Min (R)" value={tier.min / 100}
                        onChange={(e) => { const t = [...editingPolicy.sellerTiers]; t[i] = { ...tier, min: Number(e.target.value) * 100 }; setEditingPolicy({ ...editingPolicy, sellerTiers: t }); }}
                        className="w-24 px-3 py-2 border rounded-lg" />
                      <button onClick={() => { const t = editingPolicy.sellerTiers.filter((_, j) => j !== i); setEditingPolicy({ ...editingPolicy, sellerTiers: t }); }}
                        className="p-2 text-red-600 hover:bg-red-50 rounded"><TrashIcon className="h-4 w-4" /></button>
                    </div>
                  ))}
                  <button onClick={() => setEditingPolicy({ ...editingPolicy, sellerTiers: [...editingPolicy.sellerTiers, { maxAmount: null, pct: 500, min: 1000 }] })}
                    className="text-sm text-primary hover:underline">+ Add tier</button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium mb-1">Reserve Period (days)</label>
                  <input type="number" value={editingPolicy.reserveDays} onChange={(e) => setEditingPolicy({ ...editingPolicy, reserveDays: Number(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-lg" min={0} max={90} /></div>
                <div><label className="block text-sm font-medium mb-1">Minimum Payout (R)</label>
                  <input type="number" value={editingPolicy.payoutMinimum / 100} onChange={(e) => setEditingPolicy({ ...editingPolicy, payoutMinimum: Number(e.target.value) * 100 })}
                    className="w-full px-3 py-2 border rounded-lg" min={0} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium mb-1">Buffer % (gateway fee margin)</label>
                  <input type="number" value={editingPolicy.bufferPct / 100} onChange={(e) => setEditingPolicy({ ...editingPolicy, bufferPct: Number(e.target.value) * 100 })}
                    className="w-full px-3 py-2 border rounded-lg" step="0.1" min={0} /></div>
                <div><label className="block text-sm font-medium mb-1">Buffer Fixed (R)</label>
                  <input type="number" value={editingPolicy.bufferFixed / 100} onChange={(e) => setEditingPolicy({ ...editingPolicy, bufferFixed: Number(e.target.value) * 100 })}
                    className="w-full px-3 py-2 border rounded-lg" step="1" min={0} /></div>
              </div>
            </div>
            <div className="flex justify-end gap-4 mt-6 pt-4 border-t">
              <button onClick={() => setEditingPolicy(null)} className="px-4 py-2 border rounded-lg hover:bg-muted">Cancel</button>
              <button onClick={savePolicy} disabled={saving}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50">
                {saving ? 'Saving...' : 'Save Policy'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---- Helper Components ----
function KpiCard({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
  const colors: Record<string, string> = {
    green: 'border-l-green-500', red: 'border-l-red-500', blue: 'border-l-blue-500',
    amber: 'border-l-amber-500', indigo: 'border-l-indigo-500',
  };
  return (
    <div className={cn('bg-background border rounded-lg p-4 border-l-4', colors[color] || 'border-l-gray-500')}>
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className="text-lg font-bold">{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{sub}</p>
    </div>
  );
}

function StatusBadge({ value }: { value: string }) {
  const styles: Record<string, string> = {
    COMPLETED: 'bg-green-100 text-green-800', PENDING: 'bg-amber-100 text-amber-800',
    FAILED: 'bg-red-100 text-red-800', HELD: 'bg-blue-100 text-blue-800',
    RELEASED: 'bg-green-100 text-green-800', REFUNDED: 'bg-red-100 text-red-800',
    PAYMENT: 'bg-blue-100 text-blue-800', GATEWAY: 'bg-purple-100 text-purple-800',
    CREDIT: 'bg-teal-100 text-teal-800',
  };
  return (
    <span className={cn('text-xs px-2 py-0.5 rounded font-medium', styles[value] || 'bg-gray-100 text-gray-800')}>
      {value}
    </span>
  );
}
