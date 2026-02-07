import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { toast } from 'sonner';
import {
  MagnifyingGlassIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  XCircleIcon,
  EyeIcon,
  AcademicCapIcon,
} from '@heroicons/react/24/outline';

interface AdminCourse {
  id: string;
  title: string;
  slug: string;
  status: string;
  price: number;
  rating: number;
  reviewCount: number;
  enrollCount: number;
  level: string;
  createdAt: string;
  seller: {
    displayName: string;
    user?: { username: string };
  };
  category?: { name: string };
}

export default function AdminCoursesPage() {
  const [courses, setCourses] = useState<AdminCourse[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    loadCourses();
  }, [page, statusFilter]);

  async function loadCourses() {
    try {
      setLoading(true);
      const params: Record<string, string> = { page: String(page), limit: '20' };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;

      const queryStr = new URLSearchParams(params).toString();
      const res = await api.get<{ success: boolean; data: { courses: AdminCourse[] }; meta?: { total: number } }>(
        `/admin/courses?${queryStr}`
      );
      setCourses(res.data?.courses || []);
      setTotal(res.meta?.total || 0);
    } catch {
      setCourses([]);
    } finally {
      setLoading(false);
    }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    loadCourses();
  }

  async function updateCourseStatus(courseId: string, status: string) {
    try {
      await api.patch(`/admin/courses/${courseId}`, { status });
      toast.success(`Course ${status.toLowerCase()}`);
      loadCourses();
    } catch {
      toast.error('Failed to update course status');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Course Management</h1>
          <p className="text-muted-foreground">Manage all platform courses ({total} total)</p>
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
              placeholder="Search courses..."
              className="w-full h-10 pl-9 pr-4 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
        </form>

        <div className="flex gap-2">
          {['', 'PUBLISHED', 'DRAFT', 'ARCHIVED'].map((filter) => (
            <button
              key={filter}
              onClick={() => { setStatusFilter(filter); setPage(1); }}
              className={`px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${
                statusFilter === filter ? 'bg-primary text-white border-primary' : 'hover:bg-muted'
              }`}
            >
              {filter === '' ? 'All' : filter.charAt(0) + filter.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Courses Table */}
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
                  <th className="text-left px-4 py-3 font-medium">Course</th>
                  <th className="text-left px-4 py-3 font-medium">Instructor</th>
                  <th className="text-left px-4 py-3 font-medium">Price</th>
                  <th className="text-left px-4 py-3 font-medium">Students</th>
                  <th className="text-left px-4 py-3 font-medium">Rating</th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                  <th className="text-left px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {courses.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                      <AcademicCapIcon className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                      No courses found
                    </td>
                  </tr>
                ) : (
                  courses.map((c) => (
                    <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium truncate max-w-[200px]">{c.title}</p>
                        <p className="text-xs text-muted-foreground">{c.level?.replace('_', ' ') || 'All Levels'}</p>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {c.seller?.displayName || c.seller?.user?.username || '-'}
                      </td>
                      <td className="px-4 py-3">
                        {Number(c.price) === 0 ? (
                          <span className="text-green-600 font-medium">Free</span>
                        ) : (
                          <span>R{Number(c.price).toFixed(0)}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">{c.enrollCount || 0}</td>
                      <td className="px-4 py-3">
                        {Number(c.rating) > 0 ? `${Number(c.rating).toFixed(1)} ★` : 'New'}
                      </td>
                      <td className="px-4 py-3">
                        {c.status === 'PUBLISHED' ? (
                          <span className="flex items-center gap-1 text-xs text-green-600">
                            <CheckCircleIcon className="h-4 w-4" /> Published
                          </span>
                        ) : c.status === 'DRAFT' ? (
                          <span className="flex items-center gap-1 text-xs text-yellow-600">Draft</span>
                        ) : (
                          <span className="flex items-center gap-1 text-xs text-red-600">
                            <XCircleIcon className="h-4 w-4" /> Archived
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <a
                            href={`/courses/${c.slug}`}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 hover:bg-muted rounded text-muted-foreground hover:text-foreground"
                            title="View"
                          >
                            <EyeIcon className="h-4 w-4" />
                          </a>
                          {c.status === 'PUBLISHED' ? (
                            <button
                              onClick={() => updateCourseStatus(c.id, 'ARCHIVED')}
                              className="px-2 py-1 text-xs rounded bg-red-50 text-red-600 hover:bg-red-100"
                            >
                              Archive
                            </button>
                          ) : (
                            <button
                              onClick={() => updateCourseStatus(c.id, 'PUBLISHED')}
                              className="px-2 py-1 text-xs rounded bg-green-50 text-green-600 hover:bg-green-100"
                            >
                              Publish
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
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
