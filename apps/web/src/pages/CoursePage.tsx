import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { coursesApi, conversationsApi } from '../lib/api';
import { useAuthStore } from '../stores/auth.store';
import { Button } from '../components/ui/Button';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { REFUND_POLICY, calculateCourseRefund } from '@zomieks/shared';
import {
  AcademicCapIcon,
  ClockIcon,
  StarIcon,
  UsersIcon,
  PlayIcon,
  CheckCircleIcon,
  ChevronDownIcon,
  GlobeAltIcon,
  SignalIcon,
  DocumentTextIcon,
  ArrowPathIcon,
  ChatBubbleLeftRightIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';
import { useState } from 'react';

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export default function CoursePage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  const { data, isLoading } = useQuery({
    queryKey: ['course', slug],
    queryFn: () => coursesApi.get(slug!),
    enabled: !!slug,
  });

  const enrollMutation = useMutation({
    mutationFn: (params: { courseId: string; gateway?: string }) => coursesApi.enroll(params.courseId, params.gateway),
    onSuccess: (res: any) => {
      const paymentUrl = res.data?.paymentUrl;
      if (paymentUrl) {
        toast.info('Redirecting to payment...');
        window.location.href = paymentUrl;
      } else {
        toast.success('Successfully enrolled! Start learning now.');
        queryClient.invalidateQueries({ queryKey: ['course', slug] });
      }
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to enroll');
    },
  });

  const refundMutation = useMutation({
    mutationFn: (courseId: string) => coursesApi.refund(courseId),
    onSuccess: (data) => {
      toast.success(data.data?.message || 'Course refunded to your credit balance');
      queryClient.invalidateQueries({ queryKey: ['course', slug] });
      setShowRefundConfirm(false);
    },
    onError: (err: any) => {
      toast.error(err.message || 'Refund failed');
    },
  });

  const [showRefundConfirm, setShowRefundConfirm] = useState(false);
  const [showGatewaySelect, setShowGatewaySelect] = useState(false);

  const startConversation = useMutation({
    mutationFn: async () => {
      const sellerId = course?.seller?.userId || course?.seller?.user?.id;
      if (!sellerId) throw new Error('Seller not found');
      return conversationsApi.start({ participantId: sellerId });
    },
    onSuccess: (data: any) => {
      navigate(`/messages/${data.data?.conversationId || data.conversationId}`);
    },
    onError: (err: any) => {
      toast.error(err.message || 'Could not start conversation');
    },
  });

  const course = data?.data;

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-2/3" />
          <div className="h-4 bg-muted rounded w-1/3" />
          <div className="h-64 bg-muted rounded-xl" />
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <AcademicCapIcon className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-2xl font-bold mb-2">Course not found</h2>
        <Button onClick={() => navigate('/courses')}>Browse Courses</Button>
      </div>
    );
  }

  const isEnrolled = !!course.enrollment && (Number(course.price) === 0 || !!course.enrollment.paidAt);
  const isRefunded = !!course.enrollment?.refundedAt;
  const totalLessons = course.sections?.reduce((acc: number, s: any) => acc + (s.lessons?.length || 0), 0) || 0;

  // Refund eligibility check
  const enrolledAt = course.enrollment?.createdAt ? new Date(course.enrollment.createdAt) : null;
  const completedLessonsCount = course.enrollment?.lessonsCompleted?.length || 0;
  const progressPercent = totalLessons > 0 ? (completedLessonsCount / totalLessons) * 100 : 0;
  const hoursLeft = enrolledAt ? Math.max(0, REFUND_POLICY.COURSE_REFUND_WINDOW_HOURS - (Date.now() - enrolledAt.getTime()) / (1000 * 60 * 60)) : 0;
  const canRefund = isEnrolled && !isRefunded && Number(course.price) > 0
    && hoursLeft > 0 && progressPercent < REFUND_POLICY.COURSE_REFUND_MAX_PROGRESS;

  // Calculate refund breakdown for display
  const enrollmentGateway = course.enrollment?.gateway;
  const paymentMethod = (enrollmentGateway === 'CREDIT') ? 'CREDIT' : 'GATEWAY';
  const refundBreakdown = canRefund
    ? calculateCourseRefund(Number(course.price), paymentMethod as 'GATEWAY' | 'CREDIT')
    : null;

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(sectionId)) next.delete(sectionId);
      else next.add(sectionId);
      return next;
    });
  };

  const handleEnroll = () => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (Number(course.price) > 0) {
      setShowGatewaySelect(true);
    } else {
      enrollMutation.mutate({ courseId: course.id });
    }
  };

  const handleGatewaySelect = (gateway: 'PAYFAST' | 'OZOW') => {
    setShowGatewaySelect(false);
    enrollMutation.mutate({ courseId: course.id, gateway });
  };

  return (
    <div>
      {/* Hero section */}
      <div className="bg-gradient-to-r from-gray-950 via-gray-900 to-emerald-950/50 text-white">
        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                {course.category && (
                  <span className="text-sm text-primary bg-primary/10 px-2 py-1 rounded">{course.category.name}</span>
                )}
                <h1 className="text-3xl font-bold mt-3">{course.title}</h1>
                {course.subtitle && <p className="text-lg text-gray-300 mt-2">{course.subtitle}</p>}

                {/* Rating & meta */}
                <div className="flex items-center gap-4 mt-4 text-sm">
                  {Number(course.rating) > 0 && (
                    <div className="flex items-center gap-1">
                      <span className="font-bold text-yellow-400">{Number(course.rating).toFixed(1)}</span>
                      <div className="flex">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <StarIcon
                            key={star}
                            className={`h-4 w-4 ${star <= Math.round(Number(course.rating)) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-500'}`}
                          />
                        ))}
                      </div>
                      <span className="text-gray-400">({course.reviewCount} reviews)</span>
                    </div>
                  )}
                  <span className="flex items-center gap-1 text-gray-300">
                    <UsersIcon className="h-4 w-4" /> {course.enrollCount} students
                  </span>
                </div>

                <div className="flex items-center gap-2 mt-3 text-sm text-gray-300">
                  <span>By {course.seller?.displayName || course.seller?.user?.username}</span>
                </div>

                <div className="flex items-center gap-4 mt-3 text-sm text-gray-400">
                  <span className="flex items-center gap-1"><GlobeAltIcon className="h-4 w-4" /> {course.language || 'English'}</span>
                  <span className="flex items-center gap-1"><SignalIcon className="h-4 w-4" /> {course.level?.replace(/_/g, ' ')}</span>
                  <span className="flex items-center gap-1"><ClockIcon className="h-4 w-4" /> {formatDuration(course.totalDuration || 0)}</span>
                </div>

                {/* Tags */}
                {course.tags && course.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {course.tags.map((tag: string, i: number) => (
                      <span key={i} className="text-xs bg-white/10 text-gray-300 px-2 py-1 rounded-full">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </motion.div>
            </div>

            {/* Sticky card */}
            <div className="lg:col-span-1">
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-white text-gray-900 rounded-xl shadow-xl p-6"
              >
                {/* Preview */}
                {course.thumbnail && (
                  <div className="aspect-video rounded-lg overflow-hidden mb-4 bg-muted">
                    <img src={course.thumbnail} alt={course.title} className="w-full h-full object-cover" />
                  </div>
                )}

                <div className="text-3xl font-bold mb-4">
                  {Number(course.price) === 0 ? 'Free' : `R${Number(course.price).toFixed(0)}`}
                </div>

                {isEnrolled ? (
                  <div className="space-y-2">
                    <Button className="w-full" size="lg" onClick={() => navigate(`/courses/${slug}/learn`)}>
                      <PlayIcon className="h-5 w-5 mr-2" />
                      Continue Learning
                    </Button>
                    {canRefund && (
                      <Button
                        variant="outline"
                        className="w-full text-orange-600 border-orange-200 hover:bg-orange-50"
                        size="sm"
                        onClick={() => setShowRefundConfirm(true)}
                      >
                        <ArrowPathIcon className="h-4 w-4 mr-1" />
                        Request Refund ({Math.floor(hoursLeft)}h left)
                      </Button>
                    )}
                    {isRefunded && (
                      <p className="text-sm text-orange-600 text-center">
                        This course was refunded (R{Number(course.enrollment?.refundedAmount).toFixed(2)} credited)
                      </p>
                    )}
                  </div>
                ) : showGatewaySelect ? (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-center">Choose payment method:</p>
                    <Button className="w-full" size="lg" onClick={() => handleGatewaySelect('PAYFAST')} isLoading={enrollMutation.isPending}>
                      Pay with PayFast
                    </Button>
                    <Button className="w-full" variant="outline" size="lg" onClick={() => handleGatewaySelect('OZOW')} isLoading={enrollMutation.isPending}>
                      Pay with Ozow
                    </Button>
                    <button className="w-full text-sm text-muted-foreground hover:underline" onClick={() => setShowGatewaySelect(false)}>Cancel</button>
                  </div>
                ) : (
                  <Button
                    className="w-full"
                    size="lg"
                    onClick={handleEnroll}
                    isLoading={enrollMutation.isPending}
                  >
                    {Number(course.price) === 0 ? 'Enroll for Free' : `Enroll — R${Number(course.price).toFixed(0)}`}
                  </Button>
                )}

                <div className="mt-4 space-y-2 text-sm text-gray-600">
                  <div className="flex items-center gap-2"><ClockIcon className="h-4 w-4" /> {formatDuration(course.totalDuration || 0)} of content</div>
                  <div className="flex items-center gap-2"><DocumentTextIcon className="h-4 w-4" /> {totalLessons} lessons</div>
                  <div className="flex items-center gap-2"><CheckCircleIcon className="h-4 w-4" /> Lifetime access</div>
                </div>

                {/* Trust badge */}
                <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2">
                  <ShieldCheckIcon className="h-5 w-5 text-emerald-600 shrink-0" />
                  <span className="text-xs text-emerald-700 font-medium">24h Money-Back Guarantee</span>
                </div>

                {/* Message Instructor */}
                <Button
                  variant="outline"
                  className="w-full mt-3 gap-2"
                  onClick={() => {
                    if (!user) { navigate('/login'); return; }
                    startConversation.mutate();
                  }}
                  isLoading={startConversation.isPending}
                >
                  <ChatBubbleLeftRightIcon className="h-4 w-4" />
                  Message Instructor
                </Button>
              </motion.div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            {/* What you'll learn */}
            {course.learnings && course.learnings.length > 0 && (
              <div className="border rounded-xl p-6">
                <h2 className="text-xl font-bold mb-4">What you'll learn</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {course.learnings.map((item: string, i: number) => (
                    <div key={i} className="flex items-start gap-2">
                      <CheckCircleIcon className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                      <span className="text-sm">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Requirements */}
            {course.requirements && course.requirements.length > 0 && (
              <div>
                <h2 className="text-xl font-bold mb-3">Requirements</h2>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  {course.requirements.map((req: string, i: number) => (
                    <li key={i}>{req}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Course content / curriculum */}
            <div>
              <h2 className="text-xl font-bold mb-4">Course Content</h2>
              <div className="text-sm text-muted-foreground mb-3">
                {course.sections?.length || 0} sections • {totalLessons} lessons • {formatDuration(course.totalDuration || 0)} total
              </div>

              <div className="border rounded-xl overflow-hidden divide-y">
                {course.sections?.map((section: any) => (
                  <div key={section.id}>
                    <button
                      onClick={() => toggleSection(section.id)}
                      className="w-full flex items-center justify-between px-4 py-3 bg-muted/30 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-2 font-medium text-sm">
                        <ChevronDownIcon className={`h-4 w-4 transition-transform ${expandedSections.has(section.id) ? 'rotate-180' : ''}`} />
                        {section.title}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {section.lessons?.length || 0} lessons
                      </span>
                    </button>

                    {expandedSections.has(section.id) && (
                      <div className="divide-y">
                        {section.lessons?.map((lesson: any) => (
                          <div key={lesson.id} className="flex items-center justify-between px-4 py-2.5 pl-10 text-sm">
                            <div className="flex items-center gap-2">
                              <PlayIcon className="h-4 w-4 text-muted-foreground" />
                              <span>{lesson.title}</span>
                              {lesson.isFreePreview && (
                                <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">Preview</span>
                              )}
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {formatDuration(lesson.duration || 0)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Description */}
            <div>
              <h2 className="text-xl font-bold mb-3">Description</h2>
              <div className="prose prose-sm max-w-none text-muted-foreground whitespace-pre-line">
                {course.description}
              </div>
            </div>

            {/* Reviews */}
            {course.reviews && course.reviews.length > 0 && (
              <div>
                <h2 className="text-xl font-bold mb-4">Student Reviews</h2>
                <div className="space-y-4">
                  {course.reviews.map((review: any) => (
                    <div key={review.id} className="border rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <StarIcon
                              key={star}
                              className={`h-4 w-4 ${star <= review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
                            />
                          ))}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(review.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm">{review.comment}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Instructor sidebar (visible on desktop below the card) */}
          <div className="lg:col-span-1">
            <div className="sticky top-24">
              <div className="border rounded-xl p-6 mt-4">
                <h3 className="font-bold mb-3">Instructor</h3>
                <div className="flex items-center gap-3">
                  {course.seller?.user?.avatar ? (
                    <img src={course.seller.user.avatar} alt="" className="h-12 w-12 rounded-full" />
                  ) : (
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                      {(course.seller?.displayName || 'S')[0]}
                    </div>
                  )}
                  <div>
                    <p className="font-semibold">{course.seller?.displayName}</p>
                    <p className="text-xs text-muted-foreground">{course.seller?.professionalTitle}</p>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-3 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <StarIcon className="h-4 w-4" /> {Number(course.seller?.rating || 0).toFixed(1)}
                  </span>
                  <span>{course.seller?.reviewCount || 0} reviews</span>
                </div>
                <Button
                  variant="outline"
                  className="w-full mt-4 gap-2"
                  onClick={() => {
                    if (!user) { navigate('/login'); return; }
                    startConversation.mutate();
                  }}
                  isLoading={startConversation.isPending}
                >
                  <ChatBubbleLeftRightIcon className="h-4 w-4" />
                  Message
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Refund Confirmation Modal */}
      {showRefundConfirm && refundBreakdown && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h2 className="text-xl font-bold mb-2">Request Course Refund</h2>
            <p className="text-sm text-muted-foreground mb-4">
              A refund will be credited to your account balance after fee deductions. 
              Credits can be used to purchase any course or service on the platform but cannot be withdrawn.
            </p>

            {/* Fee breakdown */}
            <div className="bg-gray-50 border rounded-lg p-4 mb-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Course price</span>
                <span className="font-medium">R{refundBreakdown.coursePrice.toFixed(2)}</span>
              </div>
              {refundBreakdown.gatewayFeeEstimate > 0 && (
                <div className="flex justify-between text-orange-600">
                  <span>Payment gateway fee</span>
                  <span>-R{refundBreakdown.gatewayFeeEstimate.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-orange-600">
                <span>Processing fee ({REFUND_POLICY.PROCESSING_FEE_PERCENT}%)</span>
                <span>-R{refundBreakdown.processingFee.toFixed(2)}</span>
              </div>
              <div className="border-t pt-2 flex justify-between font-bold">
                <span>You receive</span>
                <span className="text-green-700">R{refundBreakdown.refundAmount.toFixed(2)}</span>
              </div>
            </div>

            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4 text-sm">
              <p className="font-medium text-orange-800">Refund Policy</p>
              <ul className="text-orange-700 mt-1 space-y-1">
                <li>• {Math.floor(hoursLeft)} hours remaining in refund window</li>
                <li>• {progressPercent.toFixed(0)}% of course completed ({REFUND_POLICY.COURSE_REFUND_MAX_PROGRESS}% max)</li>
                {paymentMethod === 'CREDIT' && (
                  <li>• Paid with credit — no gateway fee deducted</li>
                )}
              </ul>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowRefundConfirm(false)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 bg-orange-600 hover:bg-orange-700"
                onClick={() => refundMutation.mutate(course.id)}
                isLoading={refundMutation.isPending}
              >
                Confirm Refund
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
