import { Router } from 'express';
import { authenticate, optionalAuth, requireSeller } from '@/middleware/auth.js';
import { prisma } from '@/lib/prisma.js';
import { validate } from '@/middleware/validate.js';
import { createCourseSchema, updateCourseSchema, courseSectionSchema, courseLessonSchema, courseReviewSchema, isCourseRefundEligible, calculateCourseFees, calculateCourseRefund, COURSE_FEES, REFUND_POLICY } from '@zomieks/shared';
import { processCourseEscrowHold } from '@/services/escrow.service.js';

const router = Router();

// Helper to generate slug
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 80);
}

// ============ PUBLIC ROUTES ============

// List published courses (public)
router.get('/', optionalAuth, async (req, res, next) => {
  try {
    const { category, search, level, minPrice, maxPrice, sort, page = '1', limit = '12' } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = { status: 'PUBLISHED' };

    if (category) where.categoryId = category;
    if (level) where.level = level;
    if (search) {
      where.OR = [
        { title: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } },
        { tags: { hasSome: [(search as string).toLowerCase()] } },
      ];
    }
    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) where.price.gte = Number(minPrice);
      if (maxPrice) where.price.lte = Number(maxPrice);
    }

    let orderBy: any = { createdAt: 'desc' };
    if (sort === 'popular') orderBy = { enrollCount: 'desc' };
    if (sort === 'rating') orderBy = { rating: 'desc' };
    if (sort === 'price_low') orderBy = { price: 'asc' };
    if (sort === 'price_high') orderBy = { price: 'desc' };
    if (sort === 'newest') orderBy = { publishedAt: 'desc' };

    const [courses, total] = await Promise.all([
      prisma.course.findMany({
        where,
        select: {
          id: true,
          title: true,
          slug: true,
          subtitle: true,
          thumbnail: true,
          price: true,
          rating: true,
          reviewCount: true,
          enrollCount: true,
          totalDuration: true,
          level: true,
          seller: {
            select: {
              id: true,
              displayName: true,
              user: { select: { username: true, avatar: true } },
            },
          },
          category: { select: { id: true, name: true, slug: true } },
          sections: {
            select: { _count: { select: { lessons: true } } },
          },
        },
        orderBy,
        skip,
        take: Number(limit),
      }),
      prisma.course.count({ where }),
    ]);

    // Calculate total lessons per course
    const coursesWithLessons = courses.map(c => ({
      ...c,
      totalLessons: c.sections.reduce((acc, s) => acc + s._count.lessons, 0),
      sections: undefined,
    }));

    res.json({
      success: true,
      data: coursesWithLessons,
      meta: { page: Number(page), limit: Number(limit), total },
    });
  } catch (error) {
    next(error);
  }
});

// Get course detail (public)
router.get('/:slug', optionalAuth, async (req, res, next) => {
  try {
    const course = await prisma.course.findUnique({
      where: { slug: req.params.slug as string, status: 'PUBLISHED' },
      include: {
        seller: {
          select: {
            id: true,
            displayName: true,
            professionalTitle: true,
            rating: true,
            reviewCount: true,
            user: { select: { username: true, avatar: true, firstName: true, lastName: true } },
          },
        },
        category: { select: { id: true, name: true, slug: true } },
        sections: {
          orderBy: { order: 'asc' },
          include: {
            lessons: {
              orderBy: { order: 'asc' },
              select: {
                id: true,
                title: true,
                duration: true,
                isFreePreview: true,
                order: true,
              },
            },
          },
        },
        reviews: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: {
            id: true,
            rating: true,
            comment: true,
            userId: true,
            createdAt: true,
          },
        },
      },
    });

    if (!course) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Course not found' },
      });
    }

    // Check if current user is enrolled
    let enrollment = null;
    if (req.user) {
      enrollment = await prisma.courseEnrollment.findUnique({
        where: { userId_courseId: { userId: req.user.id, courseId: course.id } },
        select: {
          id: true,
          progressPercent: true,
          completedAt: true,
          createdAt: true,
          refundedAt: true,
          refundedAmount: true,
          amountPaid: true,
          gateway: true,
          lessonsCompleted: { select: { id: true } },
        },
      });
    }

    res.json({
      success: true,
      data: { ...course, enrollment },
    });
  } catch (error) {
    next(error);
  }
});

// ============ BUYER / ENROLLED ROUTES ============

// Enroll in a course (one-time purchase)
router.post('/:courseId/enroll', authenticate, async (req, res, next) => {
  try {
    const courseId = req.params.courseId as string;

    const course = await prisma.course.findUnique({
      where: { id: courseId, status: 'PUBLISHED' },
      include: { seller: true },
    });
    if (!course) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Course not found' },
      });
    }

    // Check already enrolled (allow re-enrollment if previously refunded)
    const existing = await prisma.courseEnrollment.findUnique({
      where: { userId_courseId: { userId: req.user!.id, courseId } },
    });
    if (existing && !existing.refundedAt) {
      return res.status(400).json({
        success: false,
        error: { code: 'ALREADY_ENROLLED', message: 'Already enrolled in this course' },
      });
    }

    // If re-enrolling after refund, delete the old enrollment first
    if (existing && existing.refundedAt) {
      await prisma.courseEnrollment.delete({
        where: { id: existing.id },
      });
    }

    const coursePrice = Number(course.price);
    const fees = calculateCourseFees(coursePrice);
    let gateway: 'CREDIT' | 'PAYFAST' | 'OZOW' = 'CREDIT';

    if (coursePrice > 0) {
      const user = await prisma.user.findUnique({
        where: { id: req.user!.id },
        select: { creditBalance: true },
      });
      const creditBalance = Number(user?.creditBalance || 0);

      if (creditBalance >= coursePrice) {
        gateway = 'CREDIT';
      } else if (creditBalance > 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_CREDIT',
            message: `Insufficient credit balance. Course costs R${coursePrice.toFixed(2)}, you have R${creditBalance.toFixed(2)}. Full payment via credit required.`,
          },
        });
      } else {
        // No credit — direct enrollment (gateway payment not yet integrated for courses)
        // Mark as PAYFAST placeholder for now — actual gateway integration TBD
        gateway = 'PAYFAST';
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      // Create enrollment with gateway tracking
      const enrollment = await tx.courseEnrollment.create({
        data: {
          userId: req.user!.id,
          courseId,
          amountPaid: course.price,
          gateway: coursePrice > 0 ? gateway : 'CREDIT',
        },
      });

      // Deduct credit balance if paying with credit
      if (coursePrice > 0 && gateway === 'CREDIT') {
        await tx.user.update({
          where: { id: req.user!.id },
          data: { creditBalance: { decrement: coursePrice } },
        });
      }

      // Create escrow hold for paid courses (24h hold before seller payout)
      let escrowHoldId: string | null = null;
      if (coursePrice > 0) {
        escrowHoldId = await processCourseEscrowHold(
          tx,
          enrollment.id,
          coursePrice,
          fees.sellerPayout
        );
      }

      // Increment enrollment count
      await tx.course.update({
        where: { id: courseId },
        data: { enrollCount: { increment: 1 } },
      });

      return { enrollment, escrowHoldId };
    });

    res.status(201).json({
      success: true,
      data: {
        enrollmentId: result.enrollment.id,
        gateway,
        escrowHoldId: result.escrowHoldId,
        feeSplit: coursePrice > 0 ? {
          coursePrice,
          platformCut: fees.platformCut,
          sellerPayout: fees.sellerPayout,
        } : null,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Refund a course (credit to balance with fee deductions)
router.post('/:courseId/refund', authenticate, async (req, res, next) => {
  try {
    const courseId = req.params.courseId as string;
    const { reason } = req.body;

    const enrollment = await prisma.courseEnrollment.findUnique({
      where: { userId_courseId: { userId: req.user!.id, courseId: courseId as string } },
      include: {
        lessonsCompleted: true,
        escrowHold: true,
        course: { include: { sections: { include: { lessons: true } } } },
      },
    });

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_ENROLLED', message: 'You are not enrolled in this course' },
      });
    }

    if (enrollment.refundedAt) {
      return res.status(400).json({
        success: false,
        error: { code: 'ALREADY_REFUNDED', message: 'This enrollment has already been refunded' },
      });
    }

    // Calculate progress
    const totalLessons = enrollment.course.sections.reduce((acc, s) => acc + s.lessons.length, 0);
    const completedLessons = enrollment.lessonsCompleted.length;
    const progressPercent = totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;

    const eligibility = isCourseRefundEligible(enrollment.createdAt, progressPercent);
    if (!eligibility.eligible) {
      return res.status(400).json({
        success: false,
        error: { code: 'REFUND_INELIGIBLE', message: eligibility.reason },
      });
    }

    const amountPaid = Number(enrollment.amountPaid);
    const paymentMethod = enrollment.gateway === 'CREDIT' ? 'CREDIT' : 'GATEWAY';
    const refundCalc = calculateCourseRefund(amountPaid, paymentMethod);

    // Process refund in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Credit reduced refund amount to user balance
      const user = await tx.user.update({
        where: { id: req.user!.id },
        data: { creditBalance: { increment: refundCalc.refundAmount } },
      });

      // Mark enrollment as refunded
      await tx.courseEnrollment.update({
        where: { id: enrollment.id },
        data: {
          refundedAt: new Date(),
          refundedAmount: refundCalc.refundAmount,
          refundReason: reason || 'User requested refund',
        },
      });

      // Cancel escrow hold if it exists and is still held
      if (enrollment.escrowHold && enrollment.escrowHold.status === 'HELD') {
        await tx.escrowHold.update({
          where: { id: enrollment.escrowHold.id },
          data: {
            status: 'REFUNDED',
            refundedAt: new Date(),
          },
        });
      }

      // Decrement enroll count
      await tx.course.update({
        where: { id: courseId },
        data: { enrollCount: { decrement: 1 } },
      });

      // Create refund record with fee details
      const refund = await tx.refund.create({
        data: {
          enrollmentId: enrollment.id,
          amount: refundCalc.refundAmount,
          processingFee: refundCalc.totalDeducted,
          reason: reason || 'Course refund - credited to balance (fees deducted)',
          status: 'COMPLETED',
          refundType: 'CREDIT',
          processedAt: new Date(),
        },
      });

      return { refund, newBalance: Number(user.creditBalance) };
    });

    res.json({
      success: true,
      data: {
        refundId: result.refund.id,
        coursePrice: amountPaid,
        gatewayFeeDeducted: refundCalc.gatewayFeeEstimate,
        processingFeeDeducted: refundCalc.processingFee,
        totalDeducted: refundCalc.totalDeducted,
        refundAmount: refundCalc.refundAmount,
        newCreditBalance: result.newBalance,
        message: `R${refundCalc.refundAmount.toFixed(2)} has been credited to your account balance (R${refundCalc.totalDeducted.toFixed(2)} in fees deducted)`,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Get enrolled course content (full lessons with video URLs)
router.get('/:courseId/learn', authenticate, async (req, res, next) => {
  try {
    const courseId = req.params.courseId as string;

    // Verify enrollment
    const enrollment = await prisma.courseEnrollment.findUnique({
      where: { userId_courseId: { userId: req.user!.id, courseId } },
      include: { lessonsCompleted: true },
    });

    if (!enrollment) {
      return res.status(403).json({
        success: false,
        error: { code: 'NOT_ENROLLED', message: 'You must enroll in this course first' },
      });
    }

    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: {
        sections: {
          orderBy: { order: 'asc' },
          include: {
            lessons: {
              orderBy: { order: 'asc' },
              select: {
                id: true,
                title: true,
                description: true,
                videoUrl: true,
                duration: true,
                order: true,
                isFreePreview: true,
                resources: true,
              },
            },
          },
        },
        seller: {
          select: {
            displayName: true,
            user: { select: { username: true, avatar: true } },
          },
        },
      },
    });

    res.json({
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
  } catch (error) {
    next(error);
  }
});

// Mark lesson as completed
router.post('/:courseId/lessons/:lessonId/complete', authenticate, async (req, res, next) => {
  try {
    const courseId = req.params.courseId as string;
    const lessonId = req.params.lessonId as string;

    const enrollment = await prisma.courseEnrollment.findUnique({
      where: { userId_courseId: { userId: req.user!.id, courseId } },
    });
    if (!enrollment) {
      return res.status(403).json({
        success: false,
        error: { code: 'NOT_ENROLLED', message: 'Not enrolled' },
      });
    }

    // Upsert lesson progress
    await prisma.lessonProgress.upsert({
      where: { enrollmentId_lessonId: { enrollmentId: enrollment.id, lessonId } },
      create: {
        enrollmentId: enrollment.id,
        lessonId,
        completed: true,
        completedAt: new Date(),
      },
      update: {
        completed: true,
        completedAt: new Date(),
      },
    });

    // Recalculate progress
    const totalLessons = await prisma.courseLesson.count({
      where: { section: { courseId } },
    });
    const completedLessons = await prisma.lessonProgress.count({
      where: { enrollmentId: enrollment.id, completed: true },
    });

    const progressPercent = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

    await prisma.courseEnrollment.update({
      where: { id: enrollment.id },
      data: {
        progressPercent,
        completedAt: progressPercent === 100 ? new Date() : null,
      },
    });

    res.json({
      success: true,
      data: { progressPercent, completedLessons, totalLessons },
    });
  } catch (error) {
    next(error);
  }
});

// Leave a review
router.post('/:courseId/reviews', authenticate, validate(courseReviewSchema), async (req, res, next) => {
  try {
    const courseId = req.params.courseId as string;

    // Check enrolled
    const enrollment = await prisma.courseEnrollment.findUnique({
      where: { userId_courseId: { userId: req.user!.id, courseId } },
    });
    if (!enrollment) {
      return res.status(403).json({
        success: false,
        error: { code: 'NOT_ENROLLED', message: 'Must be enrolled to review' },
      });
    }

    const review = await prisma.courseReview.upsert({
      where: { courseId_userId: { courseId, userId: req.user!.id } },
      create: {
        courseId,
        userId: req.user!.id,
        rating: req.body.rating,
        comment: req.body.comment,
      },
      update: {
        rating: req.body.rating,
        comment: req.body.comment,
      },
    });

    // Recalculate rating
    const agg = await prisma.courseReview.aggregate({
      where: { courseId },
      _avg: { rating: true },
      _count: true,
    });
    await prisma.course.update({
      where: { id: courseId },
      data: {
        rating: agg._avg?.rating ?? 0,
        reviewCount: agg._count,
      },
    });

    res.json({ success: true, data: review });
  } catch (error) {
    next(error);
  }
});

// Get my enrollments
router.get('/my/enrollments', authenticate, async (req, res, next) => {
  try {
    const enrollments = await prisma.courseEnrollment.findMany({
      where: { userId: req.user!.id },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            slug: true,
            thumbnail: true,
            totalDuration: true,
            seller: {
              select: {
                displayName: true,
                user: { select: { username: true } },
              },
            },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    res.json({ success: true, data: enrollments });
  } catch (error) {
    next(error);
  }
});

// ============ SELLER ROUTES ============

// List my courses (seller)
router.get('/seller/my', authenticate, requireSeller, async (req, res, next) => {
  try {
    const profile = await prisma.sellerProfile.findUnique({
      where: { userId: req.user!.id },
    });
    if (!profile) {
      return res.status(403).json({
        success: false,
        error: { code: 'NO_PROFILE', message: 'Seller profile not found' },
      });
    }

    // Check seller fee
    if (!profile.sellerFeePaid) {
      return res.status(403).json({
        success: false,
        error: { code: 'SELLER_FEE_REQUIRED', message: 'You must pay the R399 seller fee to access courses. Go to your seller dashboard to pay.' },
      });
    }

    const courses = await prisma.course.findMany({
      where: { sellerId: profile.id },
      include: {
        category: { select: { name: true } },
        _count: {
          select: {
            enrollments: true,
            reviews: true,
            sections: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    res.json({ success: true, data: courses });
  } catch (error) {
    next(error);
  }
});

// Create course (seller)
router.post('/seller/create', authenticate, requireSeller, validate(createCourseSchema), async (req, res, next) => {
  try {
    const profile = await prisma.sellerProfile.findUnique({
      where: { userId: req.user!.id },
    });
    if (!profile || !profile.sellerFeePaid) {
      return res.status(403).json({
        success: false,
        error: { code: 'SELLER_FEE_REQUIRED', message: 'R399 seller fee required to create courses' },
      });
    }

    const { title, subtitle, description, categoryId, tags, level, language, price, thumbnail, promoVideo, requirements, learnings } = req.body;

    // Generate unique slug
    let baseSlug = slugify(title);
    let slug = baseSlug;
    let counter = 0;
    while (await prisma.course.findUnique({ where: { slug } })) {
      counter++;
      slug = `${baseSlug}-${counter}`;
    }

    const course = await prisma.course.create({
      data: {
        sellerId: profile.id,
        title,
        slug,
        subtitle,
        description,
        categoryId,
        tags: tags || [],
        level,
        language,
        price,
        thumbnail,
        promoVideo,
        requirements: requirements || [],
        learnings: learnings || [],
      },
    });

    res.status(201).json({ success: true, data: course });
  } catch (error) {
    next(error);
  }
});

// Update course (seller)
router.patch('/seller/:courseId', authenticate, requireSeller, validate(updateCourseSchema), async (req, res, next) => {
  try {
    const profile = await prisma.sellerProfile.findUnique({
      where: { userId: req.user!.id },
    });
    if (!profile) {
      return res.status(403).json({ success: false, error: { code: 'NO_PROFILE', message: 'Seller profile not found' } });
    }

    const course = await prisma.course.findFirst({
      where: { id: req.params.courseId as string, sellerId: profile.id },
    });
    if (!course) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Course not found' } });
    }

    const updated = await prisma.course.update({
      where: { id: course.id },
      data: req.body,
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
});

// Publish / unpublish course
router.post('/seller/:courseId/publish', authenticate, requireSeller, async (req, res, next) => {
  try {
    const profile = await prisma.sellerProfile.findUnique({ where: { userId: req.user!.id } });
    if (!profile) return res.status(403).json({ success: false, error: { code: 'NO_PROFILE', message: 'Not a seller' } });

    const course = await prisma.course.findFirst({
      where: { id: req.params.courseId as string, sellerId: profile.id },
      include: { sections: { include: { lessons: true } } },
    });
    if (!course) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Course not found' } });

    // Check minimal content
    const totalLessons = course.sections.reduce((acc: number, s: { lessons: unknown[] }) => acc + s.lessons.length, 0);
    if (totalLessons === 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'NO_CONTENT', message: 'Course must have at least one lesson to publish' },
      });
    }

    const newStatus = course.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED';
    const updated = await prisma.course.update({
      where: { id: course.id },
      data: {
        status: newStatus,
        publishedAt: newStatus === 'PUBLISHED' ? new Date() : course.publishedAt,
      },
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
});

// Delete course (seller)
router.delete('/seller/:courseId', authenticate, requireSeller, async (req, res, next) => {
  try {
    const profile = await prisma.sellerProfile.findUnique({ where: { userId: req.user!.id } });
    if (!profile) return res.status(403).json({ success: false, error: { code: 'NO_PROFILE', message: 'Not a seller' } });

    const course = await prisma.course.findFirst({
      where: { id: req.params.courseId as string, sellerId: profile.id },
    });
    if (!course) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Course not found' } });

    if (course.enrollCount > 0) {
      // Archive rather than delete if has enrollments
      await prisma.course.update({ where: { id: course.id }, data: { status: 'ARCHIVED' } });
    } else {
      await prisma.course.delete({ where: { id: course.id } });
    }

    res.json({ success: true, data: null });
  } catch (error) {
    next(error);
  }
});

// ============ SECTION & LESSON CRUD ============

// Add section to course
router.post('/seller/:courseId/sections', authenticate, requireSeller, validate(courseSectionSchema), async (req, res, next) => {
  try {
    const profile = await prisma.sellerProfile.findUnique({ where: { userId: req.user!.id } });
    if (!profile) return res.status(403).json({ success: false, error: { code: 'NO_PROFILE', message: 'Not a seller' } });

    const course = await prisma.course.findFirst({ where: { id: req.params.courseId as string, sellerId: profile.id } });
    if (!course) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Course not found' } });

    const section = await prisma.courseSection.create({
      data: {
        courseId: course.id,
        title: req.body.title,
        order: req.body.order,
      },
    });

    res.status(201).json({ success: true, data: section });
  } catch (error) {
    next(error);
  }
});

// Update section
router.patch('/seller/sections/:sectionId', authenticate, requireSeller, async (req, res, next) => {
  try {
    const profile = await prisma.sellerProfile.findUnique({ where: { userId: req.user!.id } });
    if (!profile) return res.status(403).json({ success: false, error: { code: 'NO_PROFILE', message: 'Not a seller' } });

    const section = await prisma.courseSection.findFirst({
      where: { id: req.params.sectionId as string, course: { sellerId: profile.id } },
    });
    if (!section) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Section not found' } });

    const updated = await prisma.courseSection.update({
      where: { id: section.id },
      data: { title: req.body.title, order: req.body.order },
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
});

// Delete section
router.delete('/seller/sections/:sectionId', authenticate, requireSeller, async (req, res, next) => {
  try {
    const profile = await prisma.sellerProfile.findUnique({ where: { userId: req.user!.id } });
    if (!profile) return res.status(403).json({ success: false, error: { code: 'NO_PROFILE', message: 'Not a seller' } });

    const section = await prisma.courseSection.findFirst({
      where: { id: req.params.sectionId as string, course: { sellerId: profile.id } },
    });
    if (!section) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Section not found' } });

    await prisma.courseSection.delete({ where: { id: section.id } });
    res.json({ success: true, data: null });
  } catch (error) {
    next(error);
  }
});

// Add lesson to section
router.post('/seller/sections/:sectionId/lessons', authenticate, requireSeller, validate(courseLessonSchema), async (req, res, next) => {
  try {
    const profile = await prisma.sellerProfile.findUnique({ where: { userId: req.user!.id } });
    if (!profile) return res.status(403).json({ success: false, error: { code: 'NO_PROFILE', message: 'Not a seller' } });

    const section = await prisma.courseSection.findFirst({
      where: { id: req.params.sectionId as string, course: { sellerId: profile.id } },
      include: { course: true },
    });
    if (!section) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Section not found' } });

    const lesson = await prisma.courseLesson.create({
      data: {
        sectionId: section.id,
        title: req.body.title,
        description: req.body.description,
        order: req.body.order,
        videoUrl: req.body.videoUrl,
        duration: req.body.duration || 0,
        isFreePreview: req.body.isFreePreview || false,
        resources: req.body.resources,
      },
    });

    // Update total duration
    if (req.body.duration) {
      await prisma.course.update({
        where: { id: section.courseId },
        data: { totalDuration: { increment: req.body.duration } },
      });
    }

    res.status(201).json({ success: true, data: lesson });
  } catch (error) {
    next(error);
  }
});

// Update lesson
router.patch('/seller/lessons/:lessonId', authenticate, requireSeller, async (req, res, next) => {
  try {
    const profile = await prisma.sellerProfile.findUnique({ where: { userId: req.user!.id } });
    if (!profile) return res.status(403).json({ success: false, error: { code: 'NO_PROFILE', message: 'Not a seller' } });

    const lesson = await prisma.courseLesson.findFirst({
      where: { id: req.params.lessonId as string, section: { course: { sellerId: profile.id } } },
    });
    if (!lesson) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Lesson not found' } });

    const updated = await prisma.courseLesson.update({
      where: { id: lesson.id },
      data: req.body,
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
});

// Delete lesson
router.delete('/seller/lessons/:lessonId', authenticate, requireSeller, async (req, res, next) => {
  try {
    const profile = await prisma.sellerProfile.findUnique({ where: { userId: req.user!.id } });
    if (!profile) return res.status(403).json({ success: false, error: { code: 'NO_PROFILE', message: 'Not a seller' } });

    const lesson = await prisma.courseLesson.findFirst({
      where: { id: req.params.lessonId as string, section: { course: { sellerId: profile.id } } },
      include: { section: true },
    });
    if (!lesson) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Lesson not found' } });

    await prisma.courseLesson.delete({ where: { id: lesson.id } });

    // Update total duration
    if (lesson.duration > 0) {
      await prisma.course.update({
        where: { id: lesson.section.courseId },
        data: { totalDuration: { decrement: lesson.duration } },
      });
    }

    res.json({ success: true, data: null });
  } catch (error) {
    next(error);
  }
});

// Get full course details for seller editing
router.get('/seller/:courseId/edit', authenticate, requireSeller, async (req, res, next) => {
  try {
    const profile = await prisma.sellerProfile.findUnique({ where: { userId: req.user!.id } });
    if (!profile) return res.status(403).json({ success: false, error: { code: 'NO_PROFILE', message: 'Not a seller' } });

    const course = await prisma.course.findFirst({
      where: { id: req.params.courseId as string, sellerId: profile.id },
      include: {
        category: { select: { id: true, name: true } },
        sections: {
          orderBy: { order: 'asc' },
          include: {
            lessons: {
              orderBy: { order: 'asc' },
            },
          },
        },
        _count: { select: { enrollments: true, reviews: true } },
      },
    });
    if (!course) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Course not found' } });

    res.json({ success: true, data: course });
  } catch (error) {
    next(error);
  }
});

export default router;
