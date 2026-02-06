import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { coursesApi } from '../lib/api';
import { Button } from '../components/ui/Button';
import { toast } from 'sonner';
import {
  CheckCircleIcon,
  PlayIcon,
  ChevronLeftIcon,
  LockClosedIcon,
  DocumentArrowDownIcon,
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleSolid } from '@heroicons/react/24/solid';
import { useState, useEffect } from 'react';

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hours > 0) return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  return `${minutes}:${String(secs).padStart(2, '0')}`;
}

export default function CoursePlayerPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [activeLessonId, setActiveLessonId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const { data, isLoading, error } = useQuery({
    queryKey: ['course-learn', slug],
    queryFn: async () => {
      // First get the course by slug to get ID
      const courseData = await coursesApi.get(slug!);
      const courseId = courseData.data?.id;
      if (!courseId) throw new Error('Course not found');
      const learnData = await coursesApi.learn(courseId);
      return { ...learnData, courseId };
    },
    enabled: !!slug,
  });

  const completeMutation = useMutation({
    mutationFn: ({ courseId, lessonId }: { courseId: string; lessonId: string }) =>
      coursesApi.completeLesson(courseId, lessonId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['course-learn', slug] });
      toast.success('Lesson completed!');
    },
  });

  const course = data?.data?.course;
  const enrollment = data?.data?.enrollment;
  const courseId = data?.courseId;
  const completedLessons = new Set(enrollment?.completedLessons || []);

  // Set active lesson to first incomplete or first lesson
  useEffect(() => {
    if (course && !activeLessonId) {
      let firstIncomplete: string | null = null;
      let firstLesson: string | null = null;
      for (const section of course.sections || []) {
        for (const lesson of section.lessons || []) {
          if (!firstLesson) firstLesson = lesson.id;
          if (!completedLessons.has(lesson.id) && !firstIncomplete) {
            firstIncomplete = lesson.id;
          }
        }
      }
      setActiveLessonId(firstIncomplete || firstLesson);
    }
  }, [course, activeLessonId, completedLessons]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary" />
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
        <LockClosedIcon className="h-16 w-16 text-muted-foreground" />
        <h2 className="text-xl font-bold">Access Denied</h2>
        <p className="text-muted-foreground">You need to enroll in this course first.</p>
        <Button onClick={() => navigate(`/courses/${slug}`)}>Go to Course Page</Button>
      </div>
    );
  }

  // Find active lesson
  let activeLesson: any = null;
  let activeSectionTitle = '';
  for (const section of course.sections || []) {
    for (const lesson of section.lessons || []) {
      if (lesson.id === activeLessonId) {
        activeLesson = lesson;
        activeSectionTitle = section.title;
        break;
      }
    }
  }

  const allLessons = (course.sections || []).flatMap((s: any) => s.lessons || []);
  const currentIndex = allLessons.findIndex((l: any) => l.id === activeLessonId);
  const nextLesson = currentIndex < allLessons.length - 1 ? allLessons[currentIndex + 1] : null;
  const prevLesson = currentIndex > 0 ? allLessons[currentIndex - 1] : null;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Top bar */}
      <div className="h-14 bg-gray-900 text-white flex items-center px-4 gap-3 shrink-0">
        <button onClick={() => navigate(`/courses/${slug}`)} className="flex items-center gap-1 text-sm hover:text-primary transition-colors">
          <ChevronLeftIcon className="h-4 w-4" /> Back
        </button>
        <div className="flex-1 text-center">
          <h1 className="text-sm font-medium truncate">{course.title}</h1>
        </div>
        <div className="text-sm text-gray-400">
          {enrollment?.progressPercent || 0}% complete
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Main content */}
        <div className="flex-1 flex flex-col">
          {/* Video player */}
          <div className="aspect-video bg-black flex items-center justify-center relative">
            {activeLesson?.videoUrl ? (
              <video
                key={activeLesson.id}
                src={activeLesson.videoUrl}
                controls
                autoPlay
                className="w-full h-full"
              />
            ) : (
              <div className="text-white text-center">
                <PlayIcon className="h-16 w-16 mx-auto mb-2 opacity-50" />
                <p className="text-gray-400">No video for this lesson</p>
              </div>
            )}
          </div>

          {/* Lesson info bar */}
          <div className="border-b p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">{activeSectionTitle}</p>
                <h2 className="text-lg font-bold">{activeLesson?.title}</h2>
              </div>
              <div className="flex items-center gap-2">
                {completedLessons.has(activeLessonId!) ? (
                  <span className="flex items-center gap-1 text-sm text-green-600">
                    <CheckCircleSolid className="h-5 w-5" /> Completed
                  </span>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => courseId && activeLessonId && completeMutation.mutate({ courseId, lessonId: activeLessonId })}
                    isLoading={completeMutation.isPending}
                  >
                    <CheckCircleIcon className="h-4 w-4 mr-1" /> Mark Complete
                  </Button>
                )}
              </div>
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between mt-3">
              <Button
                variant="outline"
                size="sm"
                disabled={!prevLesson}
                onClick={() => prevLesson && setActiveLessonId(prevLesson.id)}
              >
                Previous
              </Button>
              <Button
                size="sm"
                disabled={!nextLesson}
                onClick={() => nextLesson && setActiveLessonId(nextLesson.id)}
              >
                Next Lesson
              </Button>
            </div>

            {/* Description & Resources */}
            {activeLesson?.description && (
              <div className="mt-4 text-sm text-muted-foreground">
                {activeLesson.description}
              </div>
            )}
            {activeLesson?.resources && Array.isArray(activeLesson.resources) && activeLesson.resources.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-medium mb-2">Resources</h4>
                <div className="space-y-1">
                  {(activeLesson.resources as any[]).map((res: any, i: number) => (
                    <a
                      key={i}
                      href={res.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2 text-sm text-primary hover:underline"
                    >
                      <DocumentArrowDownIcon className="h-4 w-4" />
                      {res.name}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar - course content */}
        {sidebarOpen && (
          <div className="w-80 border-l overflow-y-auto shrink-0 bg-card hidden lg:block">
            <div className="p-3 border-b">
              <h3 className="font-semibold text-sm">Course Content</h3>
              <div className="text-xs text-muted-foreground mt-1">
                {completedLessons.size} / {allLessons.length} lessons completed
              </div>
              {/* Progress bar */}
              <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: `${enrollment?.progressPercent || 0}%` }}
                />
              </div>
            </div>

            {(course.sections || []).map((section: any) => (
              <div key={section.id} className="border-b">
                <div className="px-3 py-2 bg-muted/30 text-xs font-semibold">
                  {section.title}
                </div>
                {(section.lessons || []).map((lesson: any) => {
                  const isActive = lesson.id === activeLessonId;
                  const isCompleted = completedLessons.has(lesson.id);
                  return (
                    <button
                      key={lesson.id}
                      onClick={() => setActiveLessonId(lesson.id)}
                      className={`w-full text-left px-3 py-2 flex items-center gap-2 text-sm hover:bg-muted/50 transition-colors ${
                        isActive ? 'bg-primary/5 border-l-2 border-primary' : ''
                      }`}
                    >
                      {isCompleted ? (
                        <CheckCircleSolid className="h-4 w-4 text-green-500 shrink-0" />
                      ) : (
                        <PlayIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                      )}
                      <span className={`flex-1 truncate ${isActive ? 'font-medium' : ''}`}>
                        {lesson.title}
                      </span>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {formatDuration(lesson.duration || 0)}
                      </span>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
