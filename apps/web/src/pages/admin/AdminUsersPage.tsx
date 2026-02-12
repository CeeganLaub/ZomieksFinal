import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../../lib/api';
import { toast } from 'sonner';
import {
  MagnifyingGlassIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  NoSymbolIcon,
  ShieldCheckIcon,
  PlusIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

interface AdminUser {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  avatar: string | null;
  isSeller: boolean;
  isAdmin: boolean;
  isEmailVerified: boolean;
  isSuspended: boolean;
  createdAt: string;
  sellerProfile: {
    displayName: string;
    level: number;
    rating: number;
    isVerified: boolean;
  } | null;
}

export default function AdminUsersPage() {
  const [searchParams] = useSearchParams();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [sellerFilter, setSellerFilter] = useState(searchParams.get('isSeller') || '');
  const [page, setPage] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newUser, setNewUser] = useState({
    email: '', username: '', password: '', firstName: '', lastName: '',
    role: 'BUYER' as string, country: 'ZA',
  });

  useEffect(() => {
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, sellerFilter]);

  async function loadUsers() {
    try {
      setLoading(true);
      const params: Record<string, string> = { page: String(page), limit: '20' };
      if (search) params.search = search;
      if (sellerFilter) params.isSeller = sellerFilter;

      const queryStr = new URLSearchParams(params).toString();
      const res = await api.get<{ success: boolean; data: AdminUser[]; meta: { total: number } }>(
        `/admin/users?${queryStr}`
      );
      setUsers(res.data as unknown as AdminUser[]);
      setTotal(res.meta?.total || 0);
    } catch {
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    loadUsers();
  }

  async function userAction(userId: string, action: string, reason?: string) {
    try {
      await api.post(`/admin/users/${userId}/action`, { action, reason });
      toast.success(`User ${action} successful`);
      loadUsers();
    } catch {
      toast.error(`Failed to ${action} user`);
    }
  }

  async function suspendUser(userId: string) {
    const reason = window.prompt('Enter suspension reason:');
    if (!reason) return;
    await userAction(userId, 'suspend', reason);
  }

  async function unsuspendUser(userId: string) {
    await userAction(userId, 'unsuspend');
  }

  async function toggleAdmin(userId: string, isCurrentlyAdmin: boolean) {
    const action = isCurrentlyAdmin ? 'remove-admin' : 'make-admin';
    const confirmMsg = isCurrentlyAdmin
      ? 'Remove admin access from this user?'
      : 'Grant admin access to this user? They will have full platform control.';
    if (!window.confirm(confirmMsg)) return;
    await userAction(userId, action);
  }

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    if (!newUser.email || !newUser.username || !newUser.password || !newUser.firstName || !newUser.lastName) {
      toast.error('All fields are required');
      return;
    }
    try {
      setCreating(true);
      await api.post('/admin/users/create', newUser);
      toast.success(`User ${newUser.username} created successfully`);
      setShowCreateModal(false);
      setNewUser({ email: '', username: '', password: '', firstName: '', lastName: '', role: 'BUYER', country: 'ZA' });
      loadUsers();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to create user');
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Users</h1>
          <p className="text-muted-foreground">Manage platform users ({total} total)</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90"
        >
          <PlusIcon className="h-5 w-5" />
          Add User
        </button>
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
              placeholder="Search by name, email, or username..."
              className="w-full h-10 pl-9 pr-4 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
        </form>

        <div className="flex gap-2">
          <button
            onClick={() => { setSellerFilter(''); setPage(1); }}
            className={`px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${
              !sellerFilter ? 'bg-primary text-white border-primary' : 'hover:bg-muted'
            }`}
          >
            All
          </button>
          <button
            onClick={() => { setSellerFilter('true'); setPage(1); }}
            className={`px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${
              sellerFilter === 'true' ? 'bg-primary text-white border-primary' : 'hover:bg-muted'
            }`}
          >
            Sellers
          </button>
          <button
            onClick={() => { setSellerFilter('false'); setPage(1); }}
            className={`px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${
              sellerFilter === 'false' ? 'bg-primary text-white border-primary' : 'hover:bg-muted'
            }`}
          >
            Buyers Only
          </button>
        </div>
      </div>

      {/* Users Table */}
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
                  <th className="text-left px-4 py-3 font-medium">User</th>
                  <th className="text-left px-4 py-3 font-medium">Email</th>
                  <th className="text-left px-4 py-3 font-medium">Role</th>
                  <th className="text-left px-4 py-3 font-medium">Seller Level</th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                  <th className="text-left px-4 py-3 font-medium">Joined</th>
                  <th className="text-left px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                      No users found
                    </td>
                  </tr>
                ) : (
                  users.map((u) => (
                    <tr key={u.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {u.avatar ? (
                            <img src={u.avatar} alt="" className="h-8 w-8 rounded-full object-cover" />
                          ) : (
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                              {u.firstName?.charAt(0) || u.username?.charAt(0)?.toUpperCase()}
                            </div>
                          )}
                          <div>
                            <p className="font-medium">{u.firstName} {u.lastName}</p>
                            <p className="text-xs text-muted-foreground">@{u.username}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {u.isAdmin && (
                            <span className="px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700 rounded-full">Admin</span>
                          )}
                          {u.isSeller && (
                            <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded-full">Seller</span>
                          )}
                          {!u.isSeller && !u.isAdmin && (
                            <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">Buyer</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-muted-foreground">
                          {u.sellerProfile ? `Level ${u.sellerProfile.level}` : '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {u.isSuspended ? (
                          <span className="flex items-center gap-1 text-xs text-red-600">
                            <XCircleIcon className="h-4 w-4" /> Suspended
                          </span>
                        ) : u.isEmailVerified ? (
                          <span className="flex items-center gap-1 text-xs text-green-600">
                            <CheckCircleIcon className="h-4 w-4" /> Active
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-xs text-yellow-600">
                            <ClockIcon className="h-4 w-4" /> Email Unverified
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1.5">
                          {u.isSuspended ? (
                            <button
                              onClick={() => unsuspendUser(u.id)}
                              className="flex items-center gap-1 px-2 py-1 text-xs rounded bg-green-50 text-green-600 hover:bg-green-100"
                            >
                              <ShieldCheckIcon className="h-3.5 w-3.5" /> Unsuspend
                            </button>
                          ) : (
                            <button
                              onClick={() => suspendUser(u.id)}
                              className="flex items-center gap-1 px-2 py-1 text-xs rounded bg-red-50 text-red-600 hover:bg-red-100"
                            >
                              <NoSymbolIcon className="h-3.5 w-3.5" /> Suspend
                            </button>
                          )}
                          <button
                            onClick={() => toggleAdmin(u.id, u.isAdmin)}
                            className={`flex items-center gap-1 px-2 py-1 text-xs rounded ${
                              u.isAdmin
                                ? 'bg-orange-50 text-orange-600 hover:bg-orange-100'
                                : 'bg-purple-50 text-purple-600 hover:bg-purple-100'
                            }`}
                          >
                            <ShieldCheckIcon className="h-3.5 w-3.5" />
                            {u.isAdmin ? 'Remove Admin' : 'Make Admin'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {total > 20 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <p className="text-sm text-muted-foreground">
                Page {page} of {Math.ceil(total / 20)}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page <= 1}
                  className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-50 hover:bg-muted"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={page >= Math.ceil(total / 20)}
                  className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-50 hover:bg-muted"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background border rounded-lg p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">Add New User</h2>
              <button onClick={() => setShowCreateModal(false)} className="p-1 hover:bg-muted rounded">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">First Name *</label>
                  <input
                    type="text"
                    value={newUser.firstName}
                    onChange={(e) => setNewUser(p => ({ ...p, firstName: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Last Name *</label>
                  <input
                    type="text"
                    value={newUser.lastName}
                    onChange={(e) => setNewUser(p => ({ ...p, lastName: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Email *</label>
                <input
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser(p => ({ ...p, email: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                  placeholder="user@example.com"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Username *</label>
                <input
                  type="text"
                  value={newUser.username}
                  onChange={(e) => setNewUser(p => ({ ...p, username: e.target.value.replace(/[^a-zA-Z0-9_]/g, '') }))}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                  placeholder="username"
                  minLength={3}
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">Letters, numbers, and underscores only</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Password *</label>
                <input
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser(p => ({ ...p, password: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                  placeholder="Minimum 8 characters"
                  minLength={8}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Role *</label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser(p => ({ ...p, role: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg text-sm bg-background"
                >
                  <option value="BUYER">Buyer</option>
                  <option value="ADMIN">Admin</option>
                  <option value="MODERATOR">Moderator</option>
                  <option value="SUPPORT">Support</option>
                  <option value="FINANCE">Finance</option>
                </select>
                <p className="text-xs text-muted-foreground mt-1">
                  {newUser.role === 'ADMIN' && 'Full platform access including settings and user management'}
                  {newUser.role === 'MODERATOR' && 'Can manage content, services, and handle disputes'}
                  {newUser.role === 'SUPPORT' && 'Can view users, orders, and respond to support tickets'}
                  {newUser.role === 'FINANCE' && 'Can manage payouts, transactions, and financial reports'}
                  {newUser.role === 'BUYER' && 'Standard user account with no admin privileges'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Country</label>
                <input
                  type="text"
                  value={newUser.country}
                  onChange={(e) => setNewUser(p => ({ ...p, country: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                  placeholder="ZA"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border rounded-lg hover:bg-muted text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 text-sm flex items-center gap-2"
                >
                  {creating ? (
                    <>
                      <ArrowPathIcon className="h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <PlusIcon className="h-4 w-4" />
                      Create User
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
