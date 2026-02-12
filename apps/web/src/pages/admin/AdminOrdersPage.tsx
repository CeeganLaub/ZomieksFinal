import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { ArrowPathIcon } from '@heroicons/react/24/outline';

interface AdminOrder {
  id: string;
  orderNumber: string;
  status: string;
  baseAmount: number;
  grossAmount: number;
  platformRevenue: number;
  buyer: { username: string; email: string; firstName: string; lastName: string } | null;
  seller: { username: string; email: string; firstName: string; lastName: string } | null;
  service: { title: string; slug: string } | null;
  createdAt: string;
  completedAt: string | null;
}

const STATUS_COLORS: Record<string, string> = {
  PENDING_PAYMENT: 'bg-gray-100 text-gray-800',
  PAID: 'bg-blue-100 text-blue-800',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-800',
  DELIVERED: 'bg-purple-100 text-purple-800',
  COMPLETED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
  DISPUTED: 'bg-orange-100 text-orange-800',
};

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    loadOrders();
  }, [page, statusFilter]);

  async function loadOrders() {
    try {
      setLoading(true);
      const params: Record<string, string> = { page: String(page), limit: '20' };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;

      const queryStr = new URLSearchParams(params).toString();
      const res = await api.get<{ success: boolean; data: AdminOrder[]; meta?: { total: number } }>(
        `/admin/orders?${queryStr}`
      );
      setOrders(Array.isArray(res.data) ? res.data : []);
      setTotal(res.meta?.total || 0);
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    loadOrders();
  }

  if (loading && orders.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <ArrowPathIcon className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Orders</h1>
        <p className="text-muted-foreground">Manage all platform orders ({total} total)</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <form onSubmit={handleSearch} className="flex gap-2 flex-1">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by order number..."
            className="flex-1 px-3 py-2 border rounded-lg"
          />
          <button type="submit" className="px-4 py-2 bg-primary text-primary-foreground rounded-lg">
            Search
          </button>
        </form>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 border rounded-lg"
        >
          <option value="">All Statuses</option>
          <option value="PENDING_PAYMENT">Pending Payment</option>
          <option value="PAID">Paid</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="DELIVERED">Delivered</option>
          <option value="COMPLETED">Completed</option>
          <option value="CANCELLED">Cancelled</option>
          <option value="DISPUTED">Disputed</option>
        </select>
      </div>

      {/* Orders Table */}
      <div className="bg-background border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left p-3 text-sm font-medium">Order #</th>
              <th className="text-left p-3 text-sm font-medium">Service</th>
              <th className="text-left p-3 text-sm font-medium">Buyer</th>
              <th className="text-left p-3 text-sm font-medium">Seller</th>
              <th className="text-left p-3 text-sm font-medium">Amount</th>
              <th className="text-left p-3 text-sm font-medium">Status</th>
              <th className="text-left p-3 text-sm font-medium">Date</th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-muted-foreground">
                  No orders found
                </td>
              </tr>
            ) : (
              orders.map((order) => (
                <tr key={order.id} className="border-b hover:bg-muted/30">
                  <td className="p-3 text-sm font-mono">{order.orderNumber}</td>
                  <td className="p-3 text-sm max-w-[200px] truncate">{order.service?.title || '—'}</td>
                  <td className="p-3 text-sm">{order.buyer?.username || '—'}</td>
                  <td className="p-3 text-sm">{order.seller?.username || '—'}</td>
                  <td className="p-3 text-sm font-medium">R{order.grossAmount.toFixed(2)}</td>
                  <td className="p-3">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-800'}`}>
                      {order.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="p-3 text-sm text-muted-foreground">
                    {new Date(order.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {total > 20 && (
        <div className="flex justify-center gap-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1 border rounded disabled:opacity-50"
          >
            Previous
          </button>
          <span className="px-3 py-1 text-sm">Page {page} of {Math.ceil(total / 20)}</span>
          <button
            onClick={() => setPage(p => p + 1)}
            disabled={page >= Math.ceil(total / 20)}
            className="px-3 py-1 border rounded disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
