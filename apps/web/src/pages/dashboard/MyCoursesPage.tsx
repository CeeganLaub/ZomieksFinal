import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { coursesApi } from '../../lib/api';
import { AcademicCapIcon, PlayIcon, ClockIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export default function MyCoursesPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['my-enrollments'],
    queryFn: () => coursesApi.myEnrollments(),
  });

  const enrollments = data?.data || [];
  const active = enrollments.filter((e: any) => !e.refundedAt && (Number(e.amountPaid) === 0 || e.paidAt));
  const pending = enrollments.filter((e: any) => !e.refundedAt && Number(e.amountPaid) > 0 && !e.paidAt);

  if (isLoading) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">My Courses</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="border rounded-xl overflow-hidden animate-pulse">
              <div className="h-40 bg-muted" />
              <div className="p-4 space-y-2">
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-3 bg-muted rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (active.length === 0 && pending.length === 0) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">My Courses</h1>
        <div className="text-center py-16">
          <AcademicCapIcon className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">No courses yet</h2>
          <p className="text-muted-foreground mb-4">Enroll in a course to start learning.</p>
          <Link
            to="/courses"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
          >
            Browse Courses
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">My Courses</h1>
        <Link
          to="/courses"
          className="text-sm text-primary hover:underline"
        >
          Browse more courses
        </Link>
      </div>

      {pending.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-amber-700 mb-3">Payment Pending</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pending.map((enrollment: any) => (
              <Link
                key={enrollment.id}
                to={`/courses/${enrollment.course.slug}`}
                className="border border-amber-200 bg-amber-50/50 rounded-xl overflow-hidden hover:shadow-md transition-shadow group"
              >
                <div className="h-36 bg-muted relative">
                  {enrollment.course.thumbnail ? (
                    <img src={enrollment.course.thumbnail} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <AcademicCapIcon className="h-12 w-12 text-muted-foreground" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-amber-900/30 flex items-center justify-center">
                    <span className="bg-amber-600 text-white text-xs font-semibold px-3 py-1 rounded-full">
                      Awaiting Payment
                    </span>
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-sm group-hover:text-primary transition-colors line-clamp-2">
                    {enrollment.course.title}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    {enrollment.course.seller?.displayName || enrollment.course.seller?.user?.username}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {active.map((enrollment: any) => {
          const progress = enrollment.progressPercent || 0;
          const isComplete = progress === 100;
          return (
            <Link
              key={enrollment.id}
              to={`/courses/${enrollment.course.slug}/learn`}
              className="border rounded-xl overflow-hidden hover:shadow-md transition-shadow group"
            >
              <div className="h-36 bg-muted relative">
                {enrollment.course.thumbnail ? (
                  <img src={enrollment.course.thumbnail} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <AcademicCapIcon className="h-12 w-12 text-muted-foreground" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <div className="bg-white rounded-full p-3">
                    <PlayIcon className="h-6 w-6 text-primary" />
                  </div>
                </div>
                {isComplete && (
                  <div className="absolute top-2 right-2">
                    <span className="bg-green-500 text-white text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
                      <CheckCircleIcon className="h-3 w-3" /> Complete
                    </span>
                  </div>
                )}
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-sm group-hover:text-primary transition-colors line-clamp-2">
                  {enrollment.course.title}
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  {enrollment.course.seller?.displayName || enrollment.course.seller?.user?.username}
                </p>
                {enrollment.course.totalDuration > 0 && (
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                    <ClockIcon className="h-3 w-3" />
                    {formatDuration(enrollment.course.totalDuration)}
                  </p>
                )}
                {/* Progress bar */}
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-muted-foreground">{progress}% complete</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${isComplete ? 'bg-green-500' : 'bg-primary'}`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
