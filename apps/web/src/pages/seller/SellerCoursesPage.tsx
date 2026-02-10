import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { coursesApi, sellerFeeApi } from '../../lib/api';
import { Button } from '../../components/ui/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card';
import { toast } from 'sonner';
import {
  AcademicCapIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ArrowUpOnSquareIcon,
  LockClosedIcon,
  UsersIcon,
  StarIcon,
  CurrencyDollarIcon,
} from '@heroicons/react/24/outline';

export default function SellerCoursesPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Check seller fee status
  const { data: feeData, isLoading: feeLoading } = useQuery({
    queryKey: ['seller-fee-status'],
    queryFn: () => sellerFeeApi.checkStatus(),
  });

  const feePaid = feeData?.data?.feePaid ?? false;
  const feeAmount = feeData?.data?.feeAmount ?? 399;

  // Pay fee mutation
  const payFeeMutation = useMutation({
    mutationFn: () => sellerFeeApi.payFee(),
    onSuccess: () => {
      toast.success('Seller fee paid! You can now create courses.');
      queryClient.invalidateQueries({ queryKey: ['seller-fee-status'] });
      queryClient.invalidateQueries({ queryKey: ['seller-courses'] });
    },
    onError: (err: any) => toast.error(err.message || 'Payment failed'),
  });

  // Get seller's courses (only if fee is paid)
  const { data: coursesData, isLoading: coursesLoading } = useQuery({
    queryKey: ['seller-courses'],
    queryFn: () => coursesApi.sellerCourses(),
    enabled: feePaid,
  });

  const courses = coursesData?.data || [];

  // Publish/unpublish
  const publishMutation = useMutation({
    mutationFn: (courseId: string) => coursesApi.publishCourse(courseId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-courses'] });
      toast.success('Course status updated');
    },
    onError: (err: any) => toast.error(err.message),
  });

  // Delete
  const deleteMutation = useMutation({
    mutationFn: (courseId: string) => coursesApi.deleteCourse(courseId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-courses'] });
      toast.success('Course deleted');
    },
    onError: (err: any) => toast.error(err.message),
  });

  if (feeLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary" />
      </div>
    );
  }

  // Fee not paid — show upgrade prompt
  if (!feePaid) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center mb-4">
              <LockClosedIcon className="h-8 w-8 text-white" />
            </div>
            <CardTitle className="text-2xl">Unlock Course Creation</CardTitle>
            <CardDescription className="text-base">
              Pay a one-time fee of R{feeAmount} to start creating and selling courses on Zomieks
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="bg-muted/50 rounded-xl p-4 space-y-3">
                <h4 className="font-semibold">What you get:</h4>
                <ul className="space-y-2">
                  {[
                    'Create unlimited video courses',
                    'Sell courses to all Zomieks users',
                    'Add sections, lessons & resources',
                    'Track student enrollment & progress',
                    'Earn from course sales (92% payout)',
                    'Lifetime access — no monthly fees',
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm">
                      <div className="w-5 h-5 rounded-full bg-green-500/15 flex items-center justify-center shrink-0">
                        <svg className="w-3 h-3 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                      </div>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-gradient-to-r from-primary to-purple-600 rounded-xl p-6 text-white text-center">
                <p className="text-4xl font-bold">R{feeAmount}</p>
                <p className="text-sm opacity-80 mt-1">One-time payment • No recurring fees</p>
              </div>

              <Button
                className="w-full"
                size="lg"
                onClick={() => payFeeMutation.mutate()}
                isLoading={payFeeMutation.isPending}
              >
                <CurrencyDollarIcon className="h-5 w-5 mr-2" />
                Pay R{feeAmount} & Unlock Courses
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Courses list
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">My Courses</h1>
          <p className="text-muted-foreground">Create and manage your video courses</p>
        </div>
        <Button onClick={() => navigate('/seller/courses/new')}>
          <PlusIcon className="h-4 w-4 mr-2" /> Create Course
        </Button>
      </div>

      {coursesLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="animate-pulse border rounded-xl p-4 space-y-3">
              <div className="h-32 bg-muted rounded-lg" />
              <div className="h-4 bg-muted rounded w-3/4" />
              <div className="h-3 bg-muted rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : courses.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <AcademicCapIcon className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No courses yet</h3>
            <p className="text-muted-foreground mb-4">Start by creating your first course</p>
            <Button onClick={() => navigate('/seller/courses/new')}>
              <PlusIcon className="h-4 w-4 mr-2" /> Create Your First Course
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {courses.map((course: any) => (
            <div key={course.id} className="border rounded-xl overflow-hidden bg-card hover:shadow-md transition-shadow">
              {/* Thumbnail */}
              <div className="aspect-video bg-muted relative">
                {course.thumbnail ? (
                  <img src={course.thumbnail} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-purple-500/10">
                    <AcademicCapIcon className="h-10 w-10 text-primary/30" />
                  </div>
                )}
                {/* Status badge */}
                <div className={`absolute top-2 right-2 px-2 py-0.5 rounded text-xs font-medium ${
                  course.status === 'PUBLISHED' ? 'bg-green-500/15 text-green-500' :
                  course.status === 'ARCHIVED' ? 'bg-muted text-muted-foreground' :
                  'bg-yellow-500/15 text-yellow-500'
                }`}>
                  {course.status}
                </div>
              </div>

              <div className="p-4">
                <h3 className="font-semibold text-sm line-clamp-2">{course.title}</h3>
                <p className="text-xs text-muted-foreground mt-1">{course.category?.name || 'Uncategorized'}</p>

                <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <UsersIcon className="h-3.5 w-3.5" /> {course._count?.enrollments || 0}
                  </span>
                  <span className="flex items-center gap-1">
                    <StarIcon className="h-3.5 w-3.5" /> {Number(course.rating || 0).toFixed(1)}
                  </span>
                  <span className="font-medium text-foreground">
                    R{Number(course.price || 0).toFixed(0)}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 mt-3 pt-3 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => navigate(`/seller/courses/${course.id}/edit`)}
                  >
                    <PencilIcon className="h-3.5 w-3.5 mr-1" /> Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => publishMutation.mutate(course.id)}
                  >
                    <ArrowUpOnSquareIcon className="h-3.5 w-3.5" />
                  </Button>
                  {course._count?.enrollments === 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (confirm('Delete this course?')) deleteMutation.mutate(course.id);
                      }}
                    >
                      <TrashIcon className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
