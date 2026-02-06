import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { coursesApi, servicesApi } from '../../lib/api';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card';
import { toast } from 'sonner';
import {
  PlusIcon,
  TrashIcon,
  PlayIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  AcademicCapIcon,
} from '@heroicons/react/24/outline';

interface CourseForm {
  title: string;
  subtitle: string;
  description: string;
  categoryId: string;
  level: string;
  language: string;
  price: number;
  thumbnail: string;
  promoVideo: string;
}

interface Section {
  id?: string;
  title: string;
  order: number;
  lessons: Lesson[];
}

interface Lesson {
  id?: string;
  title: string;
  description: string;
  order: number;
  videoUrl: string;
  duration: number;
  isFreePreview: boolean;
}

export default function CreateCoursePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const [courseId, setCourseId] = useState<string | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [learnings, setLearnings] = useState<string[]>(['']);
  const [requirements, setRequirements] = useState<string[]>(['']);

  const { register, handleSubmit, formState: { errors }, watch } = useForm<CourseForm>({
    defaultValues: {
      level: 'ALL_LEVELS',
      language: 'English',
      price: 0,
    },
  });

  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => servicesApi.categories(),
  });
  const categories = categoriesData?.data || [];

  // Step 1: Create course
  const createMutation = useMutation({
    mutationFn: (data: CourseForm) => coursesApi.createCourse({
      ...data,
      price: Number(data.price),
      learnings: learnings.filter(Boolean),
      requirements: requirements.filter(Boolean),
    }),
    onSuccess: (res: any) => {
      const id = res.data?.id;
      setCourseId(id);
      toast.success('Course created! Now add your content.');
      setStep(2);
    },
    onError: (err: any) => toast.error(err.message || 'Failed to create course'),
  });

  // Section mutations
  const addSectionMutation = useMutation({
    mutationFn: ({ courseId, data }: { courseId: string; data: { title: string; order: number } }) =>
      coursesApi.addSection(courseId, data),
    onSuccess: (res: any) => {
      const newSection = res.data;
      setSections(prev => [...prev, { ...newSection, lessons: [] }]);
      toast.success('Section added');
    },
    onError: (err: any) => toast.error(err.message),
  });

  // Lesson mutations
  const addLessonMutation = useMutation({
    mutationFn: ({ sectionId, data }: { sectionId: string; data: any }) =>
      coursesApi.addLesson(sectionId, data),
    onSuccess: (res: any, variables) => {
      const newLesson = res.data;
      setSections(prev => prev.map(s =>
        s.id === variables.sectionId
          ? { ...s, lessons: [...s.lessons, newLesson] }
          : s
      ));
      toast.success('Lesson added');
    },
    onError: (err: any) => toast.error(err.message),
  });

  // Publish
  const publishMutation = useMutation({
    mutationFn: (id: string) => coursesApi.publishCourse(id),
    onSuccess: () => {
      toast.success('Course published!');
      queryClient.invalidateQueries({ queryKey: ['seller-courses'] });
      navigate('/seller/courses');
    },
    onError: (err: any) => toast.error(err.message),
  });

  const onSubmitCourse = (data: CourseForm) => {
    createMutation.mutate(data);
  };

  const addSection = () => {
    if (!courseId) return;
    const title = prompt('Section title:');
    if (!title) return;
    addSectionMutation.mutate({
      courseId,
      data: { title, order: sections.length },
    });
  };

  const addLesson = (sectionId: string, sectionIndex: number) => {
    const title = prompt('Lesson title:');
    if (!title) return;
    const lessonCount = sections[sectionIndex].lessons.length;
    addLessonMutation.mutate({
      sectionId,
      data: {
        title,
        order: lessonCount,
        description: '',
        videoUrl: '',
        duration: 0,
        isFreePreview: false,
      },
    });
  };

  // Step 1: Course Details
  if (step === 1) {
    return (
      <div className="max-w-3xl mx-auto">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/10">
                <AcademicCapIcon className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-2xl">Create a New Course</CardTitle>
                <CardDescription>Step 1 of 3: Course details and pricing</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmitCourse)} className="space-y-6">
              <Input
                id="title"
                label="Course Title"
                placeholder="e.g., Complete Guide to Freelance Logo Design"
                error={errors.title?.message}
                {...register('title', { required: 'Title is required', minLength: { value: 5, message: 'Min 5 characters' } })}
              />

              <Input
                id="subtitle"
                label="Subtitle (optional)"
                placeholder="A brief tagline for your course"
                {...register('subtitle')}
              />

              <Textarea
                id="description"
                label="Description"
                placeholder="Describe what students will learn, who this course is for..."
                rows={5}
                error={errors.description?.message}
                {...register('description', { required: 'Description is required', minLength: { value: 50, message: 'Min 50 characters' } })}
              />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Category</label>
                  <select {...register('categoryId')} className="w-full h-10 px-3 border rounded-md bg-background">
                    <option value="">Select category</option>
                    {categories.map((cat: any) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Level</label>
                  <select {...register('level')} className="w-full h-10 px-3 border rounded-md bg-background">
                    <option value="ALL_LEVELS">All Levels</option>
                    <option value="BEGINNER">Beginner</option>
                    <option value="INTERMEDIATE">Intermediate</option>
                    <option value="ADVANCED">Advanced</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input
                  id="price"
                  label="Price (ZAR)"
                  type="number"
                  placeholder="0 for free"
                  {...register('price', { valueAsNumber: true })}
                />
                <Input
                  id="language"
                  label="Language"
                  placeholder="English"
                  {...register('language')}
                />
              </div>

              <Input
                id="thumbnail"
                label="Thumbnail URL (optional)"
                placeholder="https://..."
                {...register('thumbnail')}
              />

              <Input
                id="promoVideo"
                label="Promo Video URL (optional)"
                placeholder="https://..."
                {...register('promoVideo')}
              />

              {/* What you'll learn */}
              <div>
                <label className="block text-sm font-medium mb-2">What students will learn</label>
                {learnings.map((item, i) => (
                  <div key={i} className="flex gap-2 mb-2">
                    <input
                      value={item}
                      onChange={(e) => {
                        const next = [...learnings];
                        next[i] = e.target.value;
                        setLearnings(next);
                      }}
                      placeholder={`Learning outcome ${i + 1}`}
                      className="flex-1 h-10 px-3 border rounded-md bg-background text-sm"
                    />
                    {learnings.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setLearnings(learnings.filter((_, j) => j !== i))}
                        className="text-destructive hover:text-destructive/80"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setLearnings([...learnings, ''])}
                  className="text-sm text-primary flex items-center gap-1"
                >
                  <PlusIcon className="h-4 w-4" /> Add outcome
                </button>
              </div>

              {/* Requirements */}
              <div>
                <label className="block text-sm font-medium mb-2">Requirements (optional)</label>
                {requirements.map((item, i) => (
                  <div key={i} className="flex gap-2 mb-2">
                    <input
                      value={item}
                      onChange={(e) => {
                        const next = [...requirements];
                        next[i] = e.target.value;
                        setRequirements(next);
                      }}
                      placeholder={`Requirement ${i + 1}`}
                      className="flex-1 h-10 px-3 border rounded-md bg-background text-sm"
                    />
                    {requirements.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setRequirements(requirements.filter((_, j) => j !== i))}
                        className="text-destructive hover:text-destructive/80"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setRequirements([...requirements, ''])}
                  className="text-sm text-primary flex items-center gap-1"
                >
                  <PlusIcon className="h-4 w-4" /> Add requirement
                </button>
              </div>

              <Button type="submit" className="w-full" size="lg" isLoading={createMutation.isPending}>
                Create Course & Add Content
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Step 2: Add Sections & Lessons
  if (step === 2) {
    return (
      <div className="max-w-3xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Add Course Content</CardTitle>
            <CardDescription>Step 2 of 3: Create sections and add lessons with videos</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {sections.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <AcademicCapIcon className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                  <p>No sections yet. Start by adding your first section.</p>
                </div>
              ) : (
                sections.map((section, sIndex) => (
                  <div key={section.id || sIndex} className="border rounded-lg overflow-hidden">
                    <div className="bg-muted/30 px-4 py-3 flex items-center justify-between">
                      <div className="font-semibold text-sm">
                        Section {sIndex + 1}: {section.title}
                      </div>
                      <button
                        onClick={() => section.id && addLesson(section.id, sIndex)}
                        className="text-sm text-primary flex items-center gap-1 hover:underline"
                      >
                        <PlusIcon className="h-4 w-4" /> Add Lesson
                      </button>
                    </div>

                    {section.lessons.length === 0 ? (
                      <div className="p-4 text-sm text-muted-foreground text-center">
                        No lessons yet
                      </div>
                    ) : (
                      <div className="divide-y">
                        {section.lessons.map((lesson, lIndex) => (
                          <div key={lesson.id || lIndex} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                            <PlayIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                            <span className="flex-1">{lesson.title}</span>
                            {lesson.isFreePreview && (
                              <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">Preview</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}

              <Button variant="outline" className="w-full" onClick={addSection}>
                <PlusIcon className="h-4 w-4 mr-2" /> Add Section
              </Button>

              <div className="flex gap-3 pt-4">
                <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
                <Button
                  className="flex-1"
                  onClick={() => setStep(3)}
                  disabled={sections.length === 0}
                >
                  Continue to Review
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Step 3: Review & Publish
  return (
    <div className="max-w-3xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Review & Publish</CardTitle>
          <CardDescription>Step 3 of 3: Review your course and publish</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="bg-muted/50 rounded-lg p-4">
              <h3 className="font-semibold mb-2">Course Summary</h3>
              <div className="text-sm space-y-1 text-muted-foreground">
                <p><strong>Sections:</strong> {sections.length}</p>
                <p><strong>Lessons:</strong> {sections.reduce((acc, s) => acc + s.lessons.length, 0)}</p>
              </div>
            </div>

            <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
              <h4 className="font-medium text-yellow-900 mb-1">Ready to publish?</h4>
              <p className="text-sm text-yellow-700">
                Once published, your course will be visible to all users. You can unpublish at any time.
              </p>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
              <Button variant="outline" onClick={() => navigate('/seller/courses')}>
                Save as Draft
              </Button>
              <Button
                className="flex-1"
                onClick={() => courseId && publishMutation.mutate(courseId)}
                isLoading={publishMutation.isPending}
              >
                Publish Course
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
