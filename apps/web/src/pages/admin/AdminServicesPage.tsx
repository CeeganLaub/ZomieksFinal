import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { toast } from 'sonner';
import {
  MagnifyingGlassIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  XCircleIcon,
  EyeIcon,
} from '@heroicons/react/24/outline';

interface AdminService {
  id: string;
  title: string;
  slug: string;
  isActive: boolean;
  status: string;
  rating: number;
  reviewCount: number;
  orderCount: number;
  createdAt: string;
  seller: {
    id: string;
    username: string;
    firstName: string;
    lastName: string;
    sellerProfile?: { displayName: string };
  };
  category?: { name: string };
  packages: { tier: string; price: number }[];
}

export default function AdminServicesPage() {
  const [services, setServices] = useState<AdminService[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    loadServices();
  }, [page, statusFilter]);

  async function loadServices() {
    try {
      setLoading(true);
      const params: Record<string, string> = { page: String(page), limit: '20' };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;

      const queryStr = new URLSearchParams(params).toString();
      const res = await api.get<{ success: boolean; data: AdminService[]; meta?: { total: number } }>(
        `/admin/services?${queryStr}`
      );
      setServices(Array.isArray(res.data) ? res.data : []);
      setTotal(res.meta?.total || 0);
    } catch {
      setServices([]);
    } finally {
      setLoading(false);
    }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    loadServices();
  }

  async function toggleServiceActive(serviceId: string, currentActive: boolean) {
    try {
      await api.post(`/admin/services/${serviceId}/action`, { action: currentActive ? 'suspend' : 'approve' });
      toast.success(currentActive ? 'Service deactivated' : 'Service activated');
      loadServices();
    } catch {
      toast.error('Failed to update service status');
    }
  }

  async function updateServiceStatus(serviceId: string, status: string) {
    try {
      await api.patch(`/admin/services/${serviceId}`, { status, isActive: status === 'ACTIVE' });
      toast.success(`Service ${status === 'ACTIVE' ? 'approved' : status === 'REJECTED' ? 'rejected' : status.toLowerCase()}`);
      loadServices();
    } catch {
      toast.error('Failed to update service status');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Service Management</h1>
          <p className="text-muted-foreground">Manage all platform services ({total} total)</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <form onSubmit={handleSearch} className="flex-1 min-w-[200px] max-w-md">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title or seller..."
              className="w-full h-10 pl-9 pr-4 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
        </form>

        <div className="flex gap-2">
          {['', 'active', 'inactive', 'pending_review'].map((filter) => (
            <button
              key={filter}
              onClick={() => { setStatusFilter(filter); setPage(1); }}
              className={`px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${
                statusFilter === filter ? 'bg-primary text-white border-primary' : 'hover:bg-muted'
              }`}
            >
              {filter === '' ? 'All' : filter === 'active' ? 'Active' : filter === 'inactive' ? 'Inactive' : 'Pending Review'}
            </button>
          ))}
        </div>
      </div>

      {/* Services Table */}
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <ArrowPathIcon className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="bg-background border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Service</th>
                  <th className="text-left px-4 py-3 font-medium">Seller</th>
                  <th className="text-left px-4 py-3 font-medium">Category</th>
                  <th className="text-left px-4 py-3 font-medium">Price Range</th>
                  <th className="text-left px-4 py-3 font-medium">Orders</th>
                  <th className="text-left px-4 py-3 font-medium">Rating</th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                  <th className="text-left px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {services.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                      No services found
                    </td>
                  </tr>
                ) : (
                  services.map((s) => {
                    const prices = s.packages.map(p => p.price);
                    const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
                    const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;

                    return (
                      <tr key={s.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3">
                          <p className="font-medium truncate max-w-[200px]">{s.title}</p>
                          <p className="text-xs text-muted-foreground">{new Date(s.createdAt).toLocaleDateString()}</p>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {s.seller?.sellerProfile?.displayName || s.seller?.username}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {s.category?.name || '-'}
                        </td>
                        <td className="px-4 py-3">
                          R{minPrice.toFixed(0)} - R{maxPrice.toFixed(0)}
                        </td>
                        <td className="px-4 py-3">{s.orderCount || 0}</td>
                        <td className="px-4 py-3">
                          {Number(s.rating) > 0 ? `${Number(s.rating).toFixed(1)} ★` : 'New'}
                        </td>
                        <td className="px-4 py-3">
                          {s.status === 'PENDING_REVIEW' ? (
                            <span className="flex items-center gap-1 text-xs text-yellow-600 font-medium">
                              ⏳ Pending Review
                            </span>
                          ) : s.isActive && s.status === 'ACTIVE' ? (
                            <span className="flex items-center gap-1 text-xs text-green-600">
                              <CheckCircleIcon className="h-4 w-4" /> Active
                            </span>
                          ) : s.status === 'REJECTED' ? (
                            <span className="flex items-center gap-1 text-xs text-red-600">
                              <XCircleIcon className="h-4 w-4" /> Rejected
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-xs text-red-600">
                              <XCircleIcon className="h-4 w-4" /> Inactive
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <a
                              href={`/services/${s.seller?.username}/${s.slug}`}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 hover:bg-muted rounded text-muted-foreground hover:text-foreground"
                              title="View"
                            >
                              <EyeIcon className="h-4 w-4" />
                            </a>
                            {s.status === 'PENDING_REVIEW' ? (
                              <>
                                <button
                                  onClick={() => updateServiceStatus(s.id, 'ACTIVE')}
                                  className="px-2 py-1 text-xs rounded bg-green-50 text-green-600 hover:bg-green-100"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => updateServiceStatus(s.id, 'REJECTED')}
                                  className="px-2 py-1 text-xs rounded bg-red-50 text-red-600 hover:bg-red-100"
                                >
                                  Reject
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => toggleServiceActive(s.id, s.isActive)}
                                className={`px-2 py-1 text-xs rounded ${
                                  s.isActive
                                    ? 'bg-red-50 text-red-600 hover:bg-red-100'
                                    : 'bg-green-50 text-green-600 hover:bg-green-100'
                                }`}
                              >
                                {s.isActive ? 'Deactivate' : 'Activate'}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {total > 20 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <p className="text-sm text-muted-foreground">Page {page} of {Math.ceil(total / 20)}</p>
              <div className="flex gap-2">
                <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1} className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-50 hover:bg-muted">Previous</button>
                <button onClick={() => setPage(page + 1)} disabled={page >= Math.ceil(total / 20)} className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-50 hover:bg-muted">Next</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
