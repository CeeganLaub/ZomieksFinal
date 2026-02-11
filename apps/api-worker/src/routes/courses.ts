import { Hono } from 'hono';
import { z } from 'zod';
import { eq, and, desc, asc, like, sql, count } from 'drizzle-orm';
import {
  courses, courseSections, courseLessons, courseEnrollments,
  lessonProgress, courseReviews, sellerProfiles, users, categories,
  escrowHolds, refunds,
} from '@zomieks/db';
import { createId } from '@paralleldrive/cuid2';
import {
  createCourseSchema, updateCourseSchema, courseSectionSchema,
  courseLessonSchema, courseReviewSchema,
  isCourseRefundEligible, calculateCourseFees, calculateCourseRefund,
} from '@zomieks/shared';
import type { Env } from '../types';
import { authMiddleware, requireAuth, requireSeller } from '../middleware/auth';
import { validate, getValidatedBody } from '../middleware/validation';

const app = new Hono<{ Bindings: Env }>();

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 80);
}

// ============ PUBLIC ROUTES ============

// List published courses
app.get('/', authMiddleware, async (c) => {
  const db = c.get('db');
  const { category, search, level, minPrice, maxPrice, sort, page = '1', limit = '12' } = c.req.query();
  const offset = (Number(page) - 1) * Number(limit);

  const conditions = [eq(courses.status, 'PUBLISHED')];
  if (category) conditions.push(eq(courses.categoryId, category));
  if (level) conditions.push(eq(courses.level, level as any));
  if (minPrice) conditions.push(sql`${courses.price} >= ${Number(minPrice) * 100}`);
  if (maxPrice) conditions.push(sql`${courses.price} <= ${Number(maxPrice) * 100}`);
  if (search) conditions.push(like(courses.title, `%${search}%`));

  let orderBy: any = desc(courses.createdAt);
  if (sort === 'popular') orderBy = desc(courses.enrollCount);
  if (sort === 'rating') orderBy = desc(courses.rating);
  if (sort === 'price_low') orderBy = asc(courses.price);
  if (sort === 'price_high') orderBy = desc(courses.price);
  if (sort === 'newest') orderBy = desc(courses.publishedAt);

  const where = and(...conditions);

  const [courseList, totalResult] = await Promise.all([
    db.query.courses.findMany({
      where,
      with: {
        seller: {
          columns: { id: true, displayName: true, userId: true },
          with: { user: { columns: { id: true, username: true, avatar: true } } },
        },
        category: { columns: { id: true, name: true, slug: true } },
        sections: { columns: { id: true }, with: { lessons: { columns: { id: true } } } },
      },
      orderBy: [orderBy],
      limit: Number(limit),
      offset,
    }),
    db.select({ count: count() }).from(courses).where(where),
  ]);

  const data = courseList.map(c => ({
    ...c,
    totalLessons: c.sections.reduce((acc, s) => acc + s.lessons.length, 0),
    sections: undefined,
  }));

  return c.json({
    success: true,
    data,
    meta: { page: Number(page), limit: Number(limit), total: totalResult[0]?.count ?? 0 },
  });
});

// Get my enrollments
app.get('/my/enrollments', authMiddleware, requireAuth, async (c) => {
  const db = c.get('db');
  const user = c.get('user')!;

  const enrollments = await db.query.courseEnrollments.findMany({
    where: eq(courseEnrollments.userId, user.id),
    with: {
      course: {
        columns: { id: true, title: true, slug: true, thumbnail: true, totalDuration: true },
        with: {
          seller: {
            columns: { displayName: true },
            with: { user: { columns: { username: true } } },
          },
        },
      },
    },
    orderBy: [desc(courseEnrollments.updatedAt)],
  });

  return c.json({ success: true, data: enrollments });
});

// Get course detail (public)
app.get('/:slug', authMiddleware, async (c) => {
  const db = c.get('db');
  const slug = c.req.param('slug');
  const currentUser = c.get('user');

  const course = await db.query.courses.findFirst({
    where: and(eq(courses.slug, slug), eq(courses.status, 'PUBLISHED')),
    with: {
      seller: {
        columns: { id: true, userId: true, displayName: true, professionalTitle: true, rating: true, reviewCount: true },
        with: { user: { columns: { id: true, username: true, avatar: true, firstName: true, lastName: true } } },
      },
      category: { columns: { id: true, name: true, slug: true } },
      sections: {
        orderBy: [asc(courseSections.order)],
        with: {
          lessons: {
            orderBy: [asc(courseLessons.order)],
            columns: { id: true, title: true, duration: true, isFreePreview: true, order: true },
          },
        },
      },
      reviews: {
        orderBy: [desc(courseReviews.createdAt)],
        limit: 10,
        columns: { id: true, rating: true, comment: true, userId: true, createdAt: true },
      },
    },
  });

  if (!course) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Course not found' } }, 404);
  }

  let enrollment = null;
  if (currentUser) {
    enrollment = await db.query.courseEnrollments.findFirst({
      where: and(eq(courseEnrollments.userId, currentUser.id), eq(courseEnrollments.courseId, course.id)),
      columns: { id: true, progressPercent: true, completedAt: true, createdAt: true, refundedAt: true, refundedAmount: true, amountPaid: true, gateway: true, paidAt: true },
      with: { lessonsCompleted: { columns: { id: true } } },
    });
  }

  return c.json({ success: true, data: { ...course, enrollment } });
});

// ============ BUYER ROUTES ============

// Enroll in a course
app.post('/:courseId/enroll', authMiddleware, requireAuth, async (c) => {
  const db = c.get('db');
  const user = c.get('user')!;
  const courseId = c.req.param('courseId');
  const body = await c.req.json<{ gateway?: string }>().catch(() => ({} as { gateway?: string }));

  const course = await db.query.courses.findFirst({
    where: and(eq(courses.id, courseId), eq(courses.status, 'PUBLISHED')),
    with: { seller: true },
  });
  if (!course) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Course not found' } }, 404);
  }

  // Check existing enrollment
  const existing = await db.query.courseEnrollments.findFirst({
    where: and(eq(courseEnrollments.userId, user.id), eq(courseEnrollments.courseId, courseId)),
  });
  if (existing) {
    const isPending = course.price > 0 && !existing.paidAt;
    const isRefunded = !!existing.refundedAt;
    if (!isPending && !isRefunded) {
      return c.json({ success: false, error: { code: 'ALREADY_ENROLLED', message: 'Already enrolled in this course' } }, 400);
    }
    await db.delete(courseEnrollments).where(eq(courseEnrollments.id, existing.id));
  }

  const coursePrice = course.price; // already in cents
  const fees = calculateCourseFees(coursePrice / 100); // shared util expects rands
  const requestedGateway = body.gateway?.toUpperCase();
  let gateway = 'CREDIT';

  if (coursePrice > 0) {
    const currentUserData = await db.query.users.findFirst({
      where: eq(users.id, user.id),
      columns: { creditBalance: true, email: true, firstName: true, lastName: true },
    });
    const creditBalance = currentUserData?.creditBalance ?? 0;

    if (creditBalance >= coursePrice) {
      gateway = 'CREDIT';
    } else {
      gateway = requestedGateway === 'OZOW' ? 'OZOW' : 'PAYFAST';

      const enrollmentId = createId();
      await db.insert(courseEnrollments).values({
        id: enrollmentId,
        userId: user.id,
        courseId,
        amountPaid: coursePrice,
        gateway,
      });

      // TODO: Generate actual payment URL via gateway
      const paymentUrl = `${c.env.FRONTEND_URL}/courses/${course.slug}?payment=pending&enrollmentId=${enrollmentId}`;

      return c.json({
        success: true,
        data: { enrollmentId, gateway, paymentUrl },
      }, 201);
    }
  }

  // Free course or credit payment — complete immediately
  const enrollmentId = createId();
  const now = new Date().toISOString();

  await db.insert(courseEnrollments).values({
    id: enrollmentId,
    userId: user.id,
    courseId,
    amountPaid: coursePrice,
    gateway: coursePrice > 0 ? gateway : 'CREDIT',
    paidAt: now,
  });

  if (coursePrice > 0 && gateway === 'CREDIT') {
    await db.update(users)
      .set({ creditBalance: sql`${users.creditBalance} - ${coursePrice}` })
      .where(eq(users.id, user.id));
  }

  let escrowHoldId: string | null = null;
  if (coursePrice > 0) {
    escrowHoldId = createId();
    await db.insert(escrowHolds).values({
      id: escrowHoldId,
      enrollmentId,
      grossAmount: coursePrice,
      sellerPayoutAmount: Math.round(fees.sellerPayout * 100),
      platformRevenue: Math.round(fees.platformCut * 100),
      status: 'HELD',
      heldAt: now,
    });
  }

  await db.update(courses)
    .set({ enrollCount: sql`${courses.enrollCount} + 1` })
    .where(eq(courses.id, courseId));

  return c.json({
    success: true,
    data: {
      enrollmentId,
      gateway,
      escrowHoldId,
      feeSplit: coursePrice > 0 ? {
        coursePrice: coursePrice / 100,
        platformCut: fees.platformCut,
        sellerPayout: fees.sellerPayout,
      } : null,
    },
  }, 201);
});

// Refund a course
app.post('/:courseId/refund', authMiddleware, requireAuth, async (c) => {
  const db = c.get('db');
  const user = c.get('user')!;
  const courseId = c.req.param('courseId');
  const body = await c.req.json<{ reason?: string }>().catch(() => ({} as { reason?: string }));

  const enrollment = await db.query.courseEnrollments.findFirst({
    where: and(eq(courseEnrollments.userId, user.id), eq(courseEnrollments.courseId, courseId)),
    with: {
      lessonsCompleted: true,
      escrowHold: true,
      course: {
        with: { sections: { with: { lessons: { columns: { id: true } } } } },
      },
    },
  });

  if (!enrollment) {
    return c.json({ success: false, error: { code: 'NOT_ENROLLED', message: 'You are not enrolled in this course' } }, 404);
  }
  if (enrollment.refundedAt) {
    return c.json({ success: false, error: { code: 'ALREADY_REFUNDED', message: 'This enrollment has already been refunded' } }, 400);
  }

  const totalLessons = enrollment.course.sections.reduce((acc, s) => acc + s.lessons.length, 0);
  const completedLessons = enrollment.lessonsCompleted.length;
  const progressPercent = totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;

  const eligibility = isCourseRefundEligible(new Date(enrollment.createdAt), progressPercent);
  if (!eligibility.eligible) {
    return c.json({ success: false, error: { code: 'REFUND_INELIGIBLE', message: eligibility.reason } }, 400);
  }

  const amountPaidCents = enrollment.amountPaid;
  const amountPaidRands = amountPaidCents / 100;
  const paymentMethod = enrollment.gateway === 'CREDIT' ? 'CREDIT' : 'GATEWAY';
  const refundCalc = calculateCourseRefund(amountPaidRands, paymentMethod as 'GATEWAY' | 'CREDIT');
  const refundAmountCents = Math.round(refundCalc.refundAmount * 100);
  const totalDeductedCents = Math.round(refundCalc.totalDeducted * 100);
  const now = new Date().toISOString();

  // Credit to user balance
  await db.update(users)
    .set({ creditBalance: sql`${users.creditBalance} + ${refundAmountCents}` })
    .where(eq(users.id, user.id));

  // Mark enrollment as refunded
  await db.update(courseEnrollments)
    .set({
      refundedAt: now,
      refundedAmount: refundAmountCents,
      refundReason: body.reason || 'User requested refund',
      updatedAt: now,
    })
    .where(eq(courseEnrollments.id, enrollment.id));

  // Cancel escrow if held
  if (enrollment.escrowHold && enrollment.escrowHold.status === 'HELD') {
    await db.update(escrowHolds)
      .set({ status: 'REFUNDED', refundedAt: now, updatedAt: now })
      .where(eq(escrowHolds.id, enrollment.escrowHold.id));
  }

  // Decrement enroll count
  await db.update(courses)
    .set({ enrollCount: sql`${courses.enrollCount} - 1` })
    .where(eq(courses.id, courseId));

  // Create refund record
  const refundId = createId();
  await db.insert(refunds).values({
    id: refundId,
    enrollmentId: enrollment.id,
    amount: refundAmountCents,
    processingFee: totalDeductedCents,
    reason: body.reason || 'Course refund - credited to balance (fees deducted)',
    status: 'COMPLETED',
    refundType: 'CREDIT',
    processedAt: now,
  });

  const updatedUser = await db.query.users.findFirst({
    where: eq(users.id, user.id),
    columns: { creditBalance: true },
  });

  return c.json({
    success: true,
    data: {
      refundId,
      coursePrice: amountPaidRands,
      gatewayFeeDeducted: refundCalc.gatewayFeeEstimate,
      processingFeeDeducted: refundCalc.processingFee,
      totalDeducted: refundCalc.totalDeducted,
      refundAmount: refundCalc.refundAmount,
      newCreditBalance: (updatedUser?.creditBalance ?? 0) / 100,
      message: `R${refundCalc.refundAmount.toFixed(2)} has been credited to your account balance (R${refundCalc.totalDeducted.toFixed(2)} in fees deducted)`,
    },
  });
});

// Get enrolled course content
app.get('/:courseId/learn', authMiddleware, requireAuth, async (c) => {
  const db = c.get('db');
  const user = c.get('user')!;
  const courseId = c.req.param('courseId');

  const enrollment = await db.query.courseEnrollments.findFirst({
    where: and(eq(courseEnrollments.userId, user.id), eq(courseEnrollments.courseId, courseId)),
    with: { lessonsCompleted: true },
  });

  if (!enrollment) {
    return c.json({ success: false, error: { code: 'NOT_ENROLLED', message: 'You must enroll in this course first' } }, 403);
  }
  if (enrollment.amountPaid > 0 && !enrollment.paidAt) {
    return c.json({ success: false, error: { code: 'PAYMENT_PENDING', message: 'Payment has not been confirmed yet' } }, 402);
  }

  const course = await db.query.courses.findFirst({
    where: eq(courses.id, courseId),
    with: {
      sections: {
        orderBy: [asc(courseSections.order)],
        with: {
          lessons: {
            orderBy: [asc(courseLessons.order)],
            columns: { id: true, title: true, description: true, videoUrl: true, duration: true, order: true, isFreePreview: true, resources: true },
          },
        },
      },
      seller: {
        columns: { displayName: true },
        with: { user: { columns: { username: true, avatar: true } } },
      },
    },
  });

  return c.json({
    success: true,
    data: {
      course,
      enrollment: {
        id: enrollment.id,
        progressPercent: enrollment.progressPercent,
        completedAt: enrollment.completedAt,
        completedLessons: enrollment.lessonsCompleted.map(lp => lp.lessonId),
      },
    },
  });
});

// Mark lesson complete
app.post('/:courseId/lessons/:lessonId/complete', authMiddleware, requireAuth, async (c) => {
  const db = c.get('db');
  const user = c.get('user')!;
  const courseId = c.req.param('courseId');
  const lessonId = c.req.param('lessonId');

  const enrollment = await db.query.courseEnrollments.findFirst({
    where: and(eq(courseEnrollments.userId, user.id), eq(courseEnrollments.courseId, courseId)),
  });
  if (!enrollment) {
    return c.json({ success: false, error: { code: 'NOT_ENROLLED', message: 'Not enrolled' } }, 403);
  }

  const now = new Date().toISOString();

  // Upsert lesson progress
  const existing = await db.query.lessonProgress.findFirst({
    where: and(eq(lessonProgress.enrollmentId, enrollment.id), eq(lessonProgress.lessonId, lessonId)),
  });

  if (existing) {
    await db.update(lessonProgress)
      .set({ completed: true, completedAt: now, updatedAt: now })
      .where(eq(lessonProgress.id, existing.id));
  } else {
    await db.insert(lessonProgress).values({
      enrollmentId: enrollment.id,
      lessonId,
      completed: true,
      completedAt: now,
    });
  }

  // Recalculate progress
  const totalResult = await db.select({ count: count() })
    .from(courseLessons)
    .innerJoin(courseSections, eq(courseLessons.sectionId, courseSections.id))
    .where(eq(courseSections.courseId, courseId));

  const completedResult = await db.select({ count: count() })
    .from(lessonProgress)
    .where(and(eq(lessonProgress.enrollmentId, enrollment.id), eq(lessonProgress.completed, true)));

  const totalLessons = totalResult[0]?.count ?? 0;
  const completedLessons = completedResult[0]?.count ?? 0;
  const progressPercent = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

  await db.update(courseEnrollments)
    .set({
      progressPercent,
      completedAt: progressPercent === 100 ? now : null,
      updatedAt: now,
    })
    .where(eq(courseEnrollments.id, enrollment.id));

  return c.json({
    success: true,
    data: { progressPercent, completedLessons, totalLessons },
  });
});

// Leave a review
app.post('/:courseId/reviews', authMiddleware, requireAuth, validate(courseReviewSchema), async (c) => {
  const db = c.get('db');
  const user = c.get('user')!;
  const courseId = c.req.param('courseId');
  const body = getValidatedBody<{ rating: number; comment: string }>(c);

  const enrollment = await db.query.courseEnrollments.findFirst({
    where: and(eq(courseEnrollments.userId, user.id), eq(courseEnrollments.courseId, courseId)),
  });
  if (!enrollment) {
    return c.json({ success: false, error: { code: 'NOT_ENROLLED', message: 'Must be enrolled to review' } }, 403);
  }

  const now = new Date().toISOString();

  // Upsert review
  const existingReview = await db.query.courseReviews.findFirst({
    where: and(eq(courseReviews.courseId, courseId), eq(courseReviews.userId, user.id)),
  });

  let review;
  if (existingReview) {
    await db.update(courseReviews)
      .set({ rating: body.rating, comment: body.comment, updatedAt: now })
      .where(eq(courseReviews.id, existingReview.id));
    review = { ...existingReview, ...body, updatedAt: now };
  } else {
    const reviewId = createId();
    await db.insert(courseReviews).values({
      id: reviewId,
      courseId,
      userId: user.id,
      rating: body.rating,
      comment: body.comment,
    });
    review = { id: reviewId, courseId, userId: user.id, ...body, createdAt: now };
  }

  // Recalculate rating
  const allReviews = await db.select({
    avgRating: sql<number>`avg(${courseReviews.rating})`,
    count: count(),
  }).from(courseReviews).where(eq(courseReviews.courseId, courseId));

  const avgRating = Math.round((allReviews[0]?.avgRating ?? 0) * 100);
  await db.update(courses)
    .set({ rating: avgRating, reviewCount: allReviews[0]?.count ?? 0, updatedAt: now })
    .where(eq(courses.id, courseId));

  return c.json({ success: true, data: review });
});

// ============ SELLER ROUTES ============

// List seller's courses
app.get('/seller/my', authMiddleware, requireSeller, async (c) => {
  const db = c.get('db');
  const user = c.get('user')!;

  const profile = await db.query.sellerProfiles.findFirst({
    where: eq(sellerProfiles.userId, user.id),
  });
  if (!profile) {
    return c.json({ success: false, error: { code: 'NO_PROFILE', message: 'Seller profile not found' } }, 403);
  }
  if (!profile.sellerFeePaid) {
    return c.json({ success: false, error: { code: 'SELLER_FEE_REQUIRED', message: 'You must pay the R399 seller fee to access courses.' } }, 403);
  }

  const courseList = await db.query.courses.findMany({
    where: eq(courses.sellerId, profile.id),
    with: {
      category: { columns: { name: true } },
      sections: { columns: { id: true } },
      enrollments: { columns: { id: true } },
      reviews: { columns: { id: true } },
    },
    orderBy: [desc(courses.updatedAt)],
  });

  const data = courseList.map(c => ({
    ...c,
    _count: {
      enrollments: c.enrollments.length,
      reviews: c.reviews.length,
      sections: c.sections.length,
    },
    sections: undefined,
    enrollments: undefined,
    reviews: undefined,
  }));

  return c.json({ success: true, data });
});

// Create course
app.post('/seller/create', authMiddleware, requireSeller, validate(createCourseSchema), async (c) => {
  const db = c.get('db');
  const user = c.get('user')!;
  const body = getValidatedBody<any>(c);

  const profile = await db.query.sellerProfiles.findFirst({
    where: eq(sellerProfiles.userId, user.id),
  });
  if (!profile || !profile.sellerFeePaid) {
    return c.json({ success: false, error: { code: 'SELLER_FEE_REQUIRED', message: 'R399 seller fee required to create courses' } }, 403);
  }

  let baseSlug = slugify(body.title);
  let slug = baseSlug;
  let counter = 0;
  while (await db.query.courses.findFirst({ where: eq(courses.slug, slug) })) {
    counter++;
    slug = `${baseSlug}-${counter}`;
  }

  const courseId = createId();
  await db.insert(courses).values({
    id: courseId,
    sellerId: profile.id,
    title: body.title,
    slug,
    subtitle: body.subtitle,
    description: body.description,
    categoryId: body.categoryId,
    tags: body.tags || [],
    level: body.level,
    language: body.language,
    price: Math.round((body.price || 0) * 100), // Convert rands to cents
    thumbnail: body.thumbnail,
    promoVideo: body.promoVideo,
    requirements: body.requirements || [],
    learnings: body.learnings || [],
  });

  const course = await db.query.courses.findFirst({ where: eq(courses.id, courseId) });
  return c.json({ success: true, data: course }, 201);
});

// Update course
app.patch('/seller/:courseId', authMiddleware, requireSeller, validate(updateCourseSchema), async (c) => {
  const db = c.get('db');
  const user = c.get('user')!;
  const courseId = c.req.param('courseId');
  const body = getValidatedBody<any>(c);

  const profile = await db.query.sellerProfiles.findFirst({ where: eq(sellerProfiles.userId, user.id) });
  if (!profile) return c.json({ success: false, error: { code: 'NO_PROFILE', message: 'Seller profile not found' } }, 403);

  const course = await db.query.courses.findFirst({
    where: and(eq(courses.id, courseId), eq(courses.sellerId, profile.id)),
  });
  if (!course) return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Course not found' } }, 404);

  const updateData: Record<string, any> = { updatedAt: new Date().toISOString() };
  if (body.title !== undefined) updateData.title = body.title;
  if (body.subtitle !== undefined) updateData.subtitle = body.subtitle;
  if (body.description !== undefined) updateData.description = body.description;
  if (body.categoryId !== undefined) updateData.categoryId = body.categoryId;
  if (body.tags !== undefined) updateData.tags = body.tags;
  if (body.level !== undefined) updateData.level = body.level;
  if (body.language !== undefined) updateData.language = body.language;
  if (body.price !== undefined) updateData.price = Math.round(body.price * 100);
  if (body.thumbnail !== undefined) updateData.thumbnail = body.thumbnail;
  if (body.promoVideo !== undefined) updateData.promoVideo = body.promoVideo;
  if (body.requirements !== undefined) updateData.requirements = body.requirements;
  if (body.learnings !== undefined) updateData.learnings = body.learnings;

  await db.update(courses).set(updateData).where(eq(courses.id, courseId));
  const updated = await db.query.courses.findFirst({ where: eq(courses.id, courseId) });

  return c.json({ success: true, data: updated });
});

// Publish / unpublish
app.post('/seller/:courseId/publish', authMiddleware, requireSeller, async (c) => {
  const db = c.get('db');
  const user = c.get('user')!;
  const courseId = c.req.param('courseId');

  const profile = await db.query.sellerProfiles.findFirst({ where: eq(sellerProfiles.userId, user.id) });
  if (!profile) return c.json({ success: false, error: { code: 'NO_PROFILE', message: 'Not a seller' } }, 403);

  const course = await db.query.courses.findFirst({
    where: and(eq(courses.id, courseId), eq(courses.sellerId, profile.id)),
    with: { sections: { with: { lessons: { columns: { id: true } } } } },
  });
  if (!course) return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Course not found' } }, 404);

  const totalLessons = course.sections.reduce((acc, s) => acc + s.lessons.length, 0);
  if (totalLessons === 0) {
    return c.json({ success: false, error: { code: 'NO_CONTENT', message: 'Course must have at least one lesson to publish' } }, 400);
  }

  const newStatus = course.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED';
  const now = new Date().toISOString();

  await db.update(courses).set({
    status: newStatus,
    publishedAt: newStatus === 'PUBLISHED' ? now : course.publishedAt,
    updatedAt: now,
  }).where(eq(courses.id, courseId));

  const updated = await db.query.courses.findFirst({ where: eq(courses.id, courseId) });
  return c.json({ success: true, data: updated });
});

// Delete course
app.delete('/seller/:courseId', authMiddleware, requireSeller, async (c) => {
  const db = c.get('db');
  const user = c.get('user')!;
  const courseId = c.req.param('courseId');

  const profile = await db.query.sellerProfiles.findFirst({ where: eq(sellerProfiles.userId, user.id) });
  if (!profile) return c.json({ success: false, error: { code: 'NO_PROFILE', message: 'Not a seller' } }, 403);

  const course = await db.query.courses.findFirst({
    where: and(eq(courses.id, courseId), eq(courses.sellerId, profile.id)),
  });
  if (!course) return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Course not found' } }, 404);

  if (course.enrollCount > 0) {
    await db.update(courses).set({ status: 'ARCHIVED', updatedAt: new Date().toISOString() }).where(eq(courses.id, courseId));
  } else {
    await db.delete(courses).where(eq(courses.id, courseId));
  }

  return c.json({ success: true, data: null });
});

// ============ SECTION & LESSON CRUD ============

// Add section
app.post('/seller/:courseId/sections', authMiddleware, requireSeller, validate(courseSectionSchema), async (c) => {
  const db = c.get('db');
  const user = c.get('user')!;
  const courseId = c.req.param('courseId');
  const body = getValidatedBody<{ title: string; order: number }>(c);

  const profile = await db.query.sellerProfiles.findFirst({ where: eq(sellerProfiles.userId, user.id) });
  if (!profile) return c.json({ success: false, error: { code: 'NO_PROFILE', message: 'Not a seller' } }, 403);

  const course = await db.query.courses.findFirst({
    where: and(eq(courses.id, courseId), eq(courses.sellerId, profile.id)),
  });
  if (!course) return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Course not found' } }, 404);

  const sectionId = createId();
  await db.insert(courseSections).values({
    id: sectionId,
    courseId,
    title: body.title,
    order: body.order,
  });

  const section = await db.query.courseSections.findFirst({ where: eq(courseSections.id, sectionId) });
  return c.json({ success: true, data: section }, 201);
});

// Update section
app.patch('/seller/sections/:sectionId', authMiddleware, requireSeller, async (c) => {
  const db = c.get('db');
  const user = c.get('user')!;
  const sectionId = c.req.param('sectionId');
  const body = await c.req.json<{ title?: string; order?: number }>();

  const profile = await db.query.sellerProfiles.findFirst({ where: eq(sellerProfiles.userId, user.id) });
  if (!profile) return c.json({ success: false, error: { code: 'NO_PROFILE', message: 'Not a seller' } }, 403);

  const section = await db.query.courseSections.findFirst({
    where: eq(courseSections.id, sectionId),
    with: { course: true },
  });
  if (!section || section.course.sellerId !== profile.id) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Section not found' } }, 404);
  }

  const updateData: Record<string, any> = { updatedAt: new Date().toISOString() };
  if (body.title !== undefined) updateData.title = body.title;
  if (body.order !== undefined) updateData.order = body.order;

  await db.update(courseSections).set(updateData).where(eq(courseSections.id, sectionId));
  const updated = await db.query.courseSections.findFirst({ where: eq(courseSections.id, sectionId) });
  return c.json({ success: true, data: updated });
});

// Delete section
app.delete('/seller/sections/:sectionId', authMiddleware, requireSeller, async (c) => {
  const db = c.get('db');
  const user = c.get('user')!;
  const sectionId = c.req.param('sectionId');

  const profile = await db.query.sellerProfiles.findFirst({ where: eq(sellerProfiles.userId, user.id) });
  if (!profile) return c.json({ success: false, error: { code: 'NO_PROFILE', message: 'Not a seller' } }, 403);

  const section = await db.query.courseSections.findFirst({
    where: eq(courseSections.id, sectionId),
    with: { course: true },
  });
  if (!section || section.course.sellerId !== profile.id) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Section not found' } }, 404);
  }

  await db.delete(courseSections).where(eq(courseSections.id, sectionId));
  return c.json({ success: true, data: null });
});

// Add lesson
app.post('/seller/sections/:sectionId/lessons', authMiddleware, requireSeller, validate(courseLessonSchema), async (c) => {
  const db = c.get('db');
  const user = c.get('user')!;
  const sectionId = c.req.param('sectionId');
  const body = getValidatedBody<any>(c);

  const profile = await db.query.sellerProfiles.findFirst({ where: eq(sellerProfiles.userId, user.id) });
  if (!profile) return c.json({ success: false, error: { code: 'NO_PROFILE', message: 'Not a seller' } }, 403);

  const section = await db.query.courseSections.findFirst({
    where: eq(courseSections.id, sectionId),
    with: { course: true },
  });
  if (!section || section.course.sellerId !== profile.id) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Section not found' } }, 404);
  }

  const lessonId = createId();
  await db.insert(courseLessons).values({
    id: lessonId,
    sectionId,
    title: body.title,
    description: body.description,
    order: body.order,
    videoUrl: body.videoUrl,
    duration: body.duration || 0,
    isFreePreview: body.isFreePreview || false,
    resources: body.resources,
  });

  if (body.duration) {
    await db.update(courses)
      .set({ totalDuration: sql`${courses.totalDuration} + ${body.duration}`, updatedAt: new Date().toISOString() })
      .where(eq(courses.id, section.courseId));
  }

  const lesson = await db.query.courseLessons.findFirst({ where: eq(courseLessons.id, lessonId) });
  return c.json({ success: true, data: lesson }, 201);
});

// Update lesson
app.patch('/seller/lessons/:lessonId', authMiddleware, requireSeller, async (c) => {
  const db = c.get('db');
  const user = c.get('user')!;
  const lessonId = c.req.param('lessonId');
  const body = await c.req.json<any>();

  const profile = await db.query.sellerProfiles.findFirst({ where: eq(sellerProfiles.userId, user.id) });
  if (!profile) return c.json({ success: false, error: { code: 'NO_PROFILE', message: 'Not a seller' } }, 403);

  const lesson = await db.query.courseLessons.findFirst({
    where: eq(courseLessons.id, lessonId),
    with: { section: { with: { course: true } } },
  });
  if (!lesson || lesson.section.course.sellerId !== profile.id) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Lesson not found' } }, 404);
  }

  const updateData: Record<string, any> = { updatedAt: new Date().toISOString() };
  if (body.title !== undefined) updateData.title = body.title;
  if (body.description !== undefined) updateData.description = body.description;
  if (body.order !== undefined) updateData.order = body.order;
  if (body.videoUrl !== undefined) updateData.videoUrl = body.videoUrl;
  if (body.duration !== undefined) updateData.duration = body.duration;
  if (body.isFreePreview !== undefined) updateData.isFreePreview = body.isFreePreview;
  if (body.resources !== undefined) updateData.resources = body.resources;

  await db.update(courseLessons).set(updateData).where(eq(courseLessons.id, lessonId));
  const updated = await db.query.courseLessons.findFirst({ where: eq(courseLessons.id, lessonId) });
  return c.json({ success: true, data: updated });
});

// Delete lesson
app.delete('/seller/lessons/:lessonId', authMiddleware, requireSeller, async (c) => {
  const db = c.get('db');
  const user = c.get('user')!;
  const lessonId = c.req.param('lessonId');

  const profile = await db.query.sellerProfiles.findFirst({ where: eq(sellerProfiles.userId, user.id) });
  if (!profile) return c.json({ success: false, error: { code: 'NO_PROFILE', message: 'Not a seller' } }, 403);

  const lesson = await db.query.courseLessons.findFirst({
    where: eq(courseLessons.id, lessonId),
    with: { section: { with: { course: true } } },
  });
  if (!lesson || lesson.section.course.sellerId !== profile.id) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Lesson not found' } }, 404);
  }

  await db.delete(courseLessons).where(eq(courseLessons.id, lessonId));

  if (lesson.duration > 0) {
    await db.update(courses)
      .set({ totalDuration: sql`${courses.totalDuration} - ${lesson.duration}`, updatedAt: new Date().toISOString() })
      .where(eq(courses.id, lesson.section.courseId));
  }

  return c.json({ success: true, data: null });
});

// Get course for editing
app.get('/seller/:courseId/edit', authMiddleware, requireSeller, async (c) => {
  const db = c.get('db');
  const user = c.get('user')!;
  const courseId = c.req.param('courseId');

  const profile = await db.query.sellerProfiles.findFirst({ where: eq(sellerProfiles.userId, user.id) });
  if (!profile) return c.json({ success: false, error: { code: 'NO_PROFILE', message: 'Not a seller' } }, 403);

  const course = await db.query.courses.findFirst({
    where: and(eq(courses.id, courseId), eq(courses.sellerId, profile.id)),
    with: {
      category: { columns: { id: true, name: true } },
      sections: {
        orderBy: [asc(courseSections.order)],
        with: {
          lessons: { orderBy: [asc(courseLessons.order)] },
        },
      },
      enrollments: { columns: { id: true } },
      reviews: { columns: { id: true } },
    },
  });
  if (!course) return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Course not found' } }, 404);

  const data = {
    ...course,
    _count: {
      enrollments: course.enrollments.length,
      reviews: course.reviews.length,
    },
    enrollments: undefined,
    reviews: undefined,
  };

  return c.json({ success: true, data });
});

export default app;
