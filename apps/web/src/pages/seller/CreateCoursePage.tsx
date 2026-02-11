import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { coursesApi, servicesApi } from '../../lib/api';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { ImageUploader } from '../../components/ui/ImageUploader';
import { toast } from 'sonner';
import {
  PlusIcon,
  TrashIcon,
  PlayIcon,
  AcademicCapIcon,
  CheckIcon,
  ChevronDownIcon,
  VideoCameraIcon,
  EyeIcon,
  PencilIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

interface CourseForm {
  title: string;
  subtitle: string;
  description: string;
  categoryId: string;
  level: string;
  language: string;
  price: number;
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

const fadeIn = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
  transition: { duration: 0.3 },
};

function StepIndicator({ current, steps }: { current: number; steps: string[] }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {steps.map((label, i) => {
        const stepNum = i + 1;
        const isActive = stepNum === current;
        const isComplete = stepNum < current;
        return (
          <div key={i} className="flex items-center gap-2">
            {i > 0 && (
              <div className={`w-12 h-0.5 transition-colors duration-300 ${isComplete ? 'bg-primary' : 'bg-border'}`} />
            )}
            <div className="flex items-center gap-2">
              <div className={`
                w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all duration-300
                ${isComplete ? 'bg-primary text-primary-foreground' : isActive ? 'bg-primary text-primary-foreground ring-4 ring-primary/20' : 'bg-muted text-muted-foreground border border-border'}
              `}>
                {isComplete ? <CheckIcon className="w-4 h-4" /> : stepNum}
              </div>
              <span className={`text-sm font-medium hidden sm:block ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>
                {label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function CreateCoursePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const [courseId, setCourseId] = useState<string | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [learnings, setLearnings] = useState<string[]>(['']);
  const [requirements, setRequirements] = useState<string[]>(['']);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [thumbnail, setThumbnail] = useState('');
  const [promoVideo, setPromoVideo] = useState('');
  const [newSectionTitle, setNewSectionTitle] = useState('');
  const [showNewSection, setShowNewSection] = useState(false);
  const [expandedSection, setExpandedSection] = useState<number | null>(null);
  const [editingLesson, setEditingLesson] = useState<{ sectionId: string; sectionIndex: number } | null>(null);
  const [lessonForm, setLessonForm] = useState({ title: '', description: '', videoUrl: '', duration: 0, isFreePreview: false });

  const { register, handleSubmit, formState: { errors } } = useForm<CourseForm>({
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
  const categories = (categoriesData as any)?.data?.categories || (categoriesData as any)?.data || [];

  const createMutation = useMutation({
    mutationFn: (data: CourseForm) => coursesApi.createCourse({
      ...data,
      price: Number(data.price),
      thumbnail,
      promoVideo,
      tags: tags.filter(Boolean),
      learnings: learnings.filter(Boolean),
      requirements: requirements.filter(Boolean),
    }),
    onSuccess: (res: any) => {
      setCourseId(res.data?.id);
      toast.success('Course created! Now add your content.');
      setStep(2);
    },
    onError: (err: any) => toast.error(err.message || 'Failed to create course'),
  });

  const addSectionMutation = useMutation({
    mutationFn: ({ courseId, data }: { courseId: string; data: { title: string; order: number } }) =>
      coursesApi.addSection(courseId, data),
    onSuccess: (res: any) => {
      setSections(prev => [...prev, { ...res.data, lessons: [] }]);
      setNewSectionTitle('');
      setShowNewSection(false);
      toast.success('Section added');
    },
    onError: (err: any) => toast.error(err.message),
  });

  const addLessonMutation = useMutation({
    mutationFn: ({ sectionId, data }: { sectionId: string; data: any }) =>
      coursesApi.addLesson(sectionId, data),
    onSuccess: (res: any, variables) => {
      setSections(prev => prev.map(s =>
        s.id === variables.sectionId
          ? { ...s, lessons: [...s.lessons, res.data] }
          : s
      ));
      setEditingLesson(null);
      setLessonForm({ title: '', description: '', videoUrl: '', duration: 0, isFreePreview: false });
      toast.success('Lesson added');
    },
    onError: (err: any) => toast.error(err.message),
  });

  const publishMutation = useMutation({
    mutationFn: (id: string) => coursesApi.publishCourse(id),
    onSuccess: () => {
      toast.success('Course published!');
      queryClient.invalidateQueries({ queryKey: ['seller-courses'] });
      navigate('/seller/courses');
    },
    onError: (err: any) => toast.error(err.message),
  });

  const onSubmitCourse = (data: CourseForm) => createMutation.mutate(data);

  const handleAddSection = () => {
    if (!courseId || !newSectionTitle.trim()) return;
    addSectionMutation.mutate({ courseId, data: { title: newSectionTitle.trim(), order: sections.length } });
  };

  const handleAddLesson = () => {
    if (!editingLesson?.sectionId || !lessonForm.title.trim()) return;
    const lessonCount = sections[editingLesson.sectionIndex].lessons.length;
    addLessonMutation.mutate({
      sectionId: editingLesson.sectionId,
      data: { ...lessonForm, order: lessonCount },
    });
  };

  const totalLessons = sections.reduce((acc, s) => acc + s.lessons.length, 0);

  return (
    <div className="max-w-3xl mx-auto pb-12">
      <StepIndicator current={step} steps={['Details', 'Content', 'Publish']} />

      <AnimatePresence mode="wait">
        {/* Step 1: Course Details */}
        {step === 1 && (
          <motion.div key="step1" {...fadeIn}>
            <div className="rounded-2xl border bg-card text-card-foreground shadow-sm overflow-hidden">
              <div className="p-6 pb-4 border-b border-border/50">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-primary/10">
                    <AcademicCapIcon className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h1 className="text-xl font-semibold">Create a New Course</h1>
                    <p className="text-sm text-muted-foreground">Fill in the details for your course</p>
                  </div>
                </div>
              </div>

              <div className="p-6">
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

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">Category</label>
                      <select
                        {...register('categoryId')}
                        className="w-full h-10 px-3 border border-input rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                      >
                        <option value="">Select category</option>
                        {categories.map((cat: any) => (
                          <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">Level</label>
                      <select
                        {...register('level')}
                        className="w-full h-10 px-3 border border-input rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                      >
                        <option value="ALL_LEVELS">All Levels</option>
                        <option value="BEGINNER">Beginner</option>
                        <option value="INTERMEDIATE">Intermediate</option>
                        <option value="ADVANCED">Advanced</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input id="price" label="Price (ZAR)" type="number" placeholder="0 for free" {...register('price', { valueAsNumber: true })} />
                    <Input id="language" label="Language" placeholder="English" {...register('language')} />
                  </div>

                  {/* Thumbnail Upload */}
                  <ImageUploader
                    value={thumbnail}
                    onChange={setThumbnail}
                    variant="thumbnail"
                    label="Course Thumbnail"
                  />

                  {/* Promo Video Upload */}
                  <ImageUploader
                    value={promoVideo}
                    onChange={setPromoVideo}
                    variant="video"
                    label="Promo Video (optional)"
                  />

                  {/* Tags */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Tags ({tags.length}/5)</label>
                    <div className="flex gap-2 mb-2 flex-wrap">
                      {tags.map((tag, i) => (
                        <span key={i} className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm flex items-center gap-1.5 font-medium">
                          {tag}
                          <button type="button" onClick={() => setTags(tags.filter((_, j) => j !== i))} className="hover:text-destructive transition-colors">
                            <XMarkIcon className="w-3.5 h-3.5" />
                          </button>
                        </span>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <input
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            if (tagInput.trim() && tags.length < 5 && !tags.includes(tagInput.trim())) {
                              setTags([...tags, tagInput.trim()]);
                              setTagInput('');
                            }
                          }
                        }}
                        placeholder="Add a tag and press Enter"
                        className="flex-1 h-10 px-3 border border-input rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          if (tagInput.trim() && tags.length < 5 && !tags.includes(tagInput.trim())) {
                            setTags([...tags, tagInput.trim()]);
                            setTagInput('');
                          }
                        }}
                      >
                        Add
                      </Button>
                    </div>
                  </div>

                  {/* Learning Outcomes */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">What students will learn</label>
                    {learnings.map((item, i) => (
                      <div key={i} className="flex gap-2 mb-2">
                        <div className="flex items-center justify-center w-6 h-10 shrink-0">
                          <CheckIcon className="w-4 h-4 text-primary" />
                        </div>
                        <input
                          value={item}
                          onChange={(e) => {
                            const next = [...learnings];
                            next[i] = e.target.value;
                            setLearnings(next);
                          }}
                          placeholder={`Learning outcome ${i + 1}`}
                          className="flex-1 h-10 px-3 border border-input rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                        />
                        {learnings.length > 1 && (
                          <button type="button" onClick={() => setLearnings(learnings.filter((_, j) => j !== i))} className="p-2 text-destructive/60 hover:text-destructive transition-colors">
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    ))}
                    <button type="button" onClick={() => setLearnings([...learnings, ''])} className="text-sm text-primary flex items-center gap-1 font-medium mt-1 hover:underline">
                      <PlusIcon className="h-4 w-4" /> Add outcome
                    </button>
                  </div>

                  {/* Requirements */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Requirements (optional)</label>
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
                          className="flex-1 h-10 px-3 border border-input rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                        />
                        {requirements.length > 1 && (
                          <button type="button" onClick={() => setRequirements(requirements.filter((_, j) => j !== i))} className="p-2 text-destructive/60 hover:text-destructive transition-colors">
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    ))}
                    <button type="button" onClick={() => setRequirements([...requirements, ''])} className="text-sm text-primary flex items-center gap-1 font-medium mt-1 hover:underline">
                      <PlusIcon className="h-4 w-4" /> Add requirement
                    </button>
                  </div>

                  <Button type="submit" className="w-full" size="lg" isLoading={createMutation.isPending}>
                    Create Course & Add Content
                  </Button>
                </form>
              </div>
            </div>
          </motion.div>
        )}

        {/* Step 2: Sections & Lessons */}
        {step === 2 && (
          <motion.div key="step2" {...fadeIn}>
            <div className="rounded-2xl border bg-card text-card-foreground shadow-sm overflow-hidden">
              <div className="p-6 pb-4 border-b border-border/50">
                <h1 className="text-xl font-semibold">Add Course Content</h1>
                <p className="text-sm text-muted-foreground mt-0.5">Create sections and add lessons with videos</p>
              </div>

              <div className="p-6 space-y-4">
                {sections.length === 0 && !showNewSection ? (
                  <div className="text-center py-12 border-2 border-dashed border-border rounded-xl">
                    <AcademicCapIcon className="h-12 w-12 mx-auto mb-3 text-muted-foreground/40" />
                    <p className="text-muted-foreground mb-4">No sections yet. Start building your curriculum.</p>
                    <Button variant="outline" onClick={() => setShowNewSection(true)}>
                      <PlusIcon className="h-4 w-4 mr-2" /> Add Your First Section
                    </Button>
                  </div>
                ) : (
                  <>
                    {sections.map((section, sIndex) => (
                      <motion.div
                        key={section.id || sIndex}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="border border-border rounded-xl overflow-hidden"
                      >
                        <button
                          type="button"
                          onClick={() => setExpandedSection(expandedSection === sIndex ? null : sIndex)}
                          className="w-full bg-muted/30 px-4 py-3.5 flex items-center justify-between hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                              {sIndex + 1}
                            </div>
                            <div className="text-left">
                              <div className="font-semibold text-sm">{section.title}</div>
                              <div className="text-xs text-muted-foreground">{section.lessons.length} lesson{section.lessons.length !== 1 ? 's' : ''}</div>
                            </div>
                          </div>
                          <ChevronDownIcon className={`h-4 w-4 text-muted-foreground transition-transform ${expandedSection === sIndex ? 'rotate-180' : ''}`} />
                        </button>

                        <AnimatePresence>
                          {expandedSection === sIndex && (
                            <motion.div
                              initial={{ height: 0 }}
                              animate={{ height: 'auto' }}
                              exit={{ height: 0 }}
                              className="overflow-hidden"
                            >
                              <div className="border-t border-border">
                                {section.lessons.length === 0 && !editingLesson?.sectionId ? (
                                  <div className="p-4 text-center text-sm text-muted-foreground">
                                    No lessons yet. Add your first lesson below.
                                  </div>
                                ) : (
                                  <div className="divide-y divide-border">
                                    {section.lessons.map((lesson, lIndex) => (
                                      <div key={lesson.id || lIndex} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/20 transition-colors">
                                        <div className="flex items-center justify-center w-6 h-6 rounded bg-muted text-xs font-medium text-muted-foreground">
                                          {lIndex + 1}
                                        </div>
                                        <PlayIcon className="h-4 w-4 text-primary shrink-0" />
                                        <span className="flex-1 text-sm font-medium">{lesson.title}</span>
                                        {lesson.videoUrl && (
                                          <VideoCameraIcon className="h-4 w-4 text-muted-foreground" />
                                        )}
                                        {lesson.isFreePreview && (
                                          <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                                            <EyeIcon className="w-3 h-3" /> Preview
                                          </span>
                                        )}
                                        {lesson.duration > 0 && (
                                          <span className="text-xs text-muted-foreground">{lesson.duration}min</span>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {/* Inline Add Lesson Form */}
                                {editingLesson?.sectionId === section.id ? (
                                  <div className="p-4 bg-muted/20 border-t border-border space-y-3">
                                    <div className="flex items-center gap-2 mb-2">
                                      <PencilIcon className="w-4 h-4 text-primary" />
                                      <span className="text-sm font-semibold">New Lesson</span>
                                    </div>
                                    <input
                                      value={lessonForm.title}
                                      onChange={(e) => setLessonForm({ ...lessonForm, title: e.target.value })}
                                      placeholder="Lesson title"
                                      className="w-full h-10 px-3 border border-input rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                                      autoFocus
                                    />
                                    <textarea
                                      value={lessonForm.description}
                                      onChange={(e) => setLessonForm({ ...lessonForm, description: e.target.value })}
                                      placeholder="Lesson description (optional)"
                                      rows={2}
                                      className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 resize-none"
                                    />
                                    <ImageUploader
                                      value={lessonForm.videoUrl}
                                      onChange={(url) => setLessonForm({ ...lessonForm, videoUrl: url })}
                                      variant="video"
                                      label="Lesson Video"
                                    />
                                    <div className="flex items-center gap-4">
                                      <div className="flex-1">
                                        <label className="block text-xs font-medium text-muted-foreground mb-1">Duration (min)</label>
                                        <input
                                          type="number"
                                          value={lessonForm.duration}
                                          onChange={(e) => setLessonForm({ ...lessonForm, duration: Number(e.target.value) })}
                                          className="w-full h-9 px-3 border border-input rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                                          min={0}
                                        />
                                      </div>
                                      <label className="flex items-center gap-2 cursor-pointer pt-5">
                                        <input
                                          type="checkbox"
                                          checked={lessonForm.isFreePreview}
                                          onChange={(e) => setLessonForm({ ...lessonForm, isFreePreview: e.target.checked })}
                                          className="rounded border-input"
                                        />
                                        <span className="text-sm">Free Preview</span>
                                      </label>
                                    </div>
                                    <div className="flex gap-2 pt-1">
                                      <Button size="sm" onClick={handleAddLesson} disabled={!lessonForm.title.trim()} isLoading={addLessonMutation.isPending}>
                                        Add Lesson
                                      </Button>
                                      <Button size="sm" variant="ghost" onClick={() => {
                                        setEditingLesson(null);
                                        setLessonForm({ title: '', description: '', videoUrl: '', duration: 0, isFreePreview: false });
                                      }}>
                                        Cancel
                                      </Button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="p-3 border-t border-border">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingLesson({ sectionId: section.id!, sectionIndex: sIndex });
                                        setExpandedSection(sIndex);
                                      }}
                                      className="w-full py-2 text-sm text-primary font-medium flex items-center justify-center gap-1.5 rounded-lg hover:bg-primary/5 transition-colors"
                                    >
                                      <PlusIcon className="h-4 w-4" /> Add Lesson
                                    </button>
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    ))}
                  </>
                )}

                {/* Inline Add Section */}
                {showNewSection ? (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="border border-dashed border-primary/40 rounded-xl p-4 bg-primary/5">
                    <label className="block text-sm font-medium mb-1.5">New Section Title</label>
                    <div className="flex gap-2">
                      <input
                        value={newSectionTitle}
                        onChange={(e) => setNewSectionTitle(e.target.value)}
                        placeholder="e.g., Introduction to the Course"
                        className="flex-1 h-10 px-3 border border-input rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                        autoFocus
                        onKeyDown={(e) => { if (e.key === 'Enter') handleAddSection(); }}
                      />
                      <Button onClick={handleAddSection} disabled={!newSectionTitle.trim()} isLoading={addSectionMutation.isPending} size="sm">
                        Add
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => { setShowNewSection(false); setNewSectionTitle(''); }}>
                        Cancel
                      </Button>
                    </div>
                  </motion.div>
                ) : (
                  sections.length > 0 && (
                    <Button variant="outline" className="w-full border-dashed" onClick={() => setShowNewSection(true)}>
                      <PlusIcon className="h-4 w-4 mr-2" /> Add Section
                    </Button>
                  )
                )}

                <div className="flex gap-3 pt-6 border-t border-border">
                  <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
                  <Button className="flex-1" onClick={() => setStep(3)} disabled={sections.length === 0 || totalLessons === 0}>
                    Continue to Review
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Step 3: Review & Publish */}
        {step === 3 && (
          <motion.div key="step3" {...fadeIn}>
            <div className="rounded-2xl border bg-card text-card-foreground shadow-sm overflow-hidden">
              <div className="p-6 pb-4 border-b border-border/50">
                <h1 className="text-xl font-semibold">Review & Publish</h1>
                <p className="text-sm text-muted-foreground mt-0.5">Review your course before publishing</p>
              </div>

              <div className="p-6 space-y-6">
                {/* Course Preview Card */}
                {thumbnail && (
                  <div className="rounded-xl overflow-hidden border border-border">
                    <img src={thumbnail} alt="Course thumbnail" className="w-full aspect-video object-cover" />
                  </div>
                )}

                <div className="bg-muted/50 rounded-xl p-5">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <AcademicCapIcon className="w-5 h-5 text-primary" /> Course Summary
                  </h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="bg-background rounded-lg p-3 border border-border">
                      <div className="text-2xl font-bold text-primary">{sections.length}</div>
                      <div className="text-muted-foreground">Sections</div>
                    </div>
                    <div className="bg-background rounded-lg p-3 border border-border">
                      <div className="text-2xl font-bold text-primary">{totalLessons}</div>
                      <div className="text-muted-foreground">Lessons</div>
                    </div>
                  </div>

                  {/* Section breakdown */}
                  <div className="mt-4 space-y-2">
                    {sections.map((s, i) => (
                      <div key={i} className="flex items-center justify-between text-sm py-1.5 border-b border-border/50 last:border-0">
                        <span className="font-medium">Section {i + 1}: {s.title}</span>
                        <span className="text-muted-foreground">{s.lessons.length} lesson{s.lessons.length !== 1 ? 's' : ''}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-amber-500/10 rounded-xl p-4 border border-amber-500/20">
                  <h4 className="font-medium text-amber-700 dark:text-amber-400 mb-1">Ready to publish?</h4>
                  <p className="text-sm text-amber-600 dark:text-amber-500">
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
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
