import { Router } from 'express';
import { authenticate, requireAdmin } from '@/middleware/auth.js';
import { prisma } from '@/lib/prisma.js';
import { redis } from '@/lib/redis.js';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { calculateServiceRefund, slugify, PLATFORM_FEES } from '@zomieks/shared';
import { processOrderRefund, releaseOrderEscrow } from '@/services/escrow.service.js';
import { sendNotification } from '@/services/notification.service.js';
import { validate } from '@/middleware/validate.js';

// Validation schemas for admin endpoints
const categorySchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
  description: z.string().max(500).optional(),
  icon: z.string().max(50).optional(),
  parentId: z.string().optional().nullable(),
  order: z.number().int().min(0).optional(),
});

// Admin-created subscriptions last 10 years (effectively permanent)
const ADMIN_SUBSCRIPTION_YEARS = 10;

function createAdminSubscriptionPeriod() {
  const now = new Date();
  const periodEnd = new Date(now);
  periodEnd.setFullYear(periodEnd.getFullYear() + ADMIN_SUBSCRIPTION_YEARS);
  return { now, periodEnd };
}

function generateOrderNumber() {
  return `ZK-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
}

const router = Router();

// All routes require admin
router.use(authenticate, requireAdmin);

// Dashboard stats
router.get('/stats', async (req, res, next) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfWeek = new Date(now.getTime() - now.getDay() * 86400000);
    startOfWeek.setHours(0, 0, 0, 0);
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [
      totalUsers,
      totalSellers,
      totalOrders,
      totalRevenue,
      monthlyOrders,
      monthlyRevenue,
      weeklyOrders,
      todayRevenue,
      pendingDisputes,
      pendingPayouts,
      totalServices,
      totalCourses,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isSeller: true } }),
      prisma.order.count({ where: { status: { not: 'PENDING_PAYMENT' } } }),
      prisma.order.aggregate({
        where: { status: 'COMPLETED' },
        _sum: { platformRevenue: true },
      }),
      prisma.order.count({
        where: {
          createdAt: { gte: startOfMonth },
          status: { not: 'PENDING_PAYMENT' },
        },
      }),
      prisma.order.aggregate({
        where: {
          createdAt: { gte: startOfMonth },
          status: 'COMPLETED',
        },
        _sum: { platformRevenue: true },
      }),
      prisma.order.count({
        where: {
          createdAt: { gte: startOfWeek },
          status: { not: 'PENDING_PAYMENT' },
        },
      }),
      prisma.order.aggregate({
        where: {
          createdAt: { gte: startOfToday },
          status: 'COMPLETED',
        },
        _sum: { platformRevenue: true },
      }),
      prisma.order.count({ where: { status: 'DISPUTED' } }),
      prisma.sellerPayout.count({ where: { status: 'PENDING' } }),
      prisma.service.count({ where: { isActive: true } }),
      prisma.course.count({ where: { status: 'PUBLISHED' } }),
    ]);

    res.json({
      success: true,
      data: {
        users: { total: totalUsers, sellers: totalSellers },
        orders: {
          total: totalOrders,
          monthly: monthlyOrders,
          weekly: weeklyOrders,
        },
        revenue: {
          total: totalRevenue._sum.platformRevenue || 0,
          monthly: monthlyRevenue._sum.platformRevenue || 0,
          today: todayRevenue._sum.platformRevenue || 0,
        },
        pending: {
          disputes: pendingDisputes,
          payouts: pendingPayouts,
        },
        services: totalServices,
        courses: totalCourses,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Users list
router.get('/users', async (req, res, next) => {
  try {
    const { 
      search, 
      role, 
      isSeller, 
      status,
      page = '1', 
      limit = '20',
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    const where: Prisma.UserWhereInput = {};
    
    if (search) {
      where.OR = [
        { email: { contains: search as string, mode: 'insensitive' } },
        { username: { contains: search as string, mode: 'insensitive' } },
        { firstName: { contains: search as string, mode: 'insensitive' } },
      ];
    }
    if (isSeller !== undefined) where.isSeller = isSeller === 'true';
    if (status === 'suspended') where.isSuspended = true;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { [sortBy as string]: sortOrder },
        skip: (parseInt(page as string) - 1) * parseInt(limit as string),
        take: parseInt(limit as string),
        select: {
          id: true,
          email: true,
          username: true,
          firstName: true,
          lastName: true,
          avatar: true,
          isSeller: true,
          isAdmin: true,
          isEmailVerified: true,
          isSuspended: true,
          createdAt: true,
          _count: {
            select: { buyerOrders: true, sellerOrders: true },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    res.json({
      success: true,
      data: { users },
      meta: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        totalPages: Math.ceil(total / parseInt(limit as string)),
      },
    });
  } catch (error) {
    next(error);
  }
});

// Suspend user
router.post('/users/:id/suspend', async (req, res, next) => {
  try {
    const { reason, duration } = req.body;

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: {
        isSuspended: true,
        suspendedReason: reason,
      },
    });

    // Invalidate cached auth data so suspension takes effect immediately
    await redis.del(`auth:user:${req.params.id}`);

    res.json({ success: true, data: { user } });
  } catch (error) {
    next(error);
  }
});

// Unsuspend user
router.post('/users/:id/unsuspend', async (req, res, next) => {
  try {
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: {
        isSuspended: false,
        suspendedReason: null,
      },
    });

    // Invalidate cached auth data so unsuspension takes effect immediately
    await redis.del(`auth:user:${req.params.id}`);

    res.json({ success: true, data: { user } });
  } catch (error) {
    next(error);
  }
});

// Orders list
router.get('/orders', async (req, res, next) => {
  try {
    const { status, startDate, endDate, page = '1', limit = '20' } = req.query;

    const where: Prisma.OrderWhereInput = {};
    if (status) where.status = status as Prisma.OrderWhereInput['status'];
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate as string);
      if (endDate) where.createdAt.lte = new Date(endDate as string);
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (parseInt(page as string) - 1) * parseInt(limit as string),
        take: parseInt(limit as string),
        include: {
          buyer: { select: { username: true, email: true } },
          seller: { select: { username: true, email: true } },
          service: { select: { title: true } },
        },
      }),
      prisma.order.count({ where }),
    ]);

    res.json({
      success: true,
      data: { orders },
      meta: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        totalPages: Math.ceil(total / parseInt(limit as string)),
      },
    });
  } catch (error) {
    next(error);
  }
});

// Get disputes
router.get('/disputes', async (req, res, next) => {
  try {
    const { status = 'open', page = '1', limit = '20' } = req.query;

    const orders = await prisma.order.findMany({
      where: { status: 'DISPUTED' },
      orderBy: { updatedAt: 'desc' },
      skip: (parseInt(page as string) - 1) * parseInt(limit as string),
      take: parseInt(limit as string),
      include: {
        buyer: { select: { id: true, username: true, email: true } },
        seller: { select: { id: true, username: true, email: true } },
        service: { select: { title: true } },
        conversation: {
          include: {
            messages: {
              orderBy: { createdAt: 'desc' },
              take: 10,
            },
          },
        },
      },
    });

    res.json({
      success: true,
      data: { disputes: orders },
    });
  } catch (error) {
    next(error);
  }
});

// Resolve dispute
router.post('/disputes/:orderId/resolve', async (req, res, next) => {
  try {
    const { resolution, refundBuyer, refundAmount, notes } = req.body;

    const order = await prisma.order.findUnique({
      where: { id: req.params.orderId },
    });

    if (!order || order.status !== 'DISPUTED') {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Dispute not found' },
      });
    }

    if (refundBuyer) {
      // Calculate fees on dispute refund
      const baseAmount = Number(order.baseAmount);
      const buyerFee = Number(order.buyerFee);
      const totalAmount = Number(order.totalAmount);
      const feeBreakdown = calculateServiceRefund(baseAmount, buyerFee, totalAmount);

      await processOrderRefund(order.id, notes || resolution, {
        refundAmount: feeBreakdown.refundAmount,
        processingFee: feeBreakdown.processingFee,
        buyerFeeKept: feeBreakdown.buyerFeeKept,
      });

      // Credit refund to buyer balance
      await prisma.user.update({
        where: { id: order.buyerId },
        data: { creditBalance: { increment: feeBreakdown.refundAmount } },
      });
    } else {
      await releaseOrderEscrow(order.id);
      
      await prisma.order.update({
        where: { id: order.id },
        data: { status: 'COMPLETED' },
      });
    }

    // Update the dispute record
    await prisma.dispute.updateMany({
      where: { orderId: order.id, status: 'OPEN' },
      data: {
        status: refundBuyer ? 'RESOLVED_BUYER' : 'RESOLVED_SELLER',
        resolution: resolution || (refundBuyer ? 'Refund issued to buyer' : 'Released to seller'),
        resolvedBy: req.user?.id || 'admin',
        resolvedAt: new Date(),
      },
    });

    // Notify both buyer and seller about the resolution
    const resolutionMessage = refundBuyer
      ? `Dispute resolved: A refund has been issued for order #${order.orderNumber}`
      : `Dispute resolved: Funds have been released to the seller for order #${order.orderNumber}`;

    await Promise.all([
      sendNotification({
        userId: order.buyerId,
        type: 'DISPUTE_RESOLVED',
        title: 'Dispute Resolved',
        message: resolutionMessage,
        data: { orderId: order.id, resolution: refundBuyer ? 'REFUND' : 'RELEASED' },
      }),
      sendNotification({
        userId: order.sellerId,
        type: 'DISPUTE_RESOLVED',
        title: 'Dispute Resolved',
        message: resolutionMessage,
        data: { orderId: order.id, resolution: refundBuyer ? 'REFUND' : 'RELEASED' },
      }),
    ]);

    res.json({ success: true, data: { message: 'Dispute resolved' } });
  } catch (error) {
    next(error);
  }
});

// Payouts list
router.get('/payouts', async (req, res, next) => {
  try {
    const { status, page = '1', limit = '20' } = req.query;

    const where: Prisma.SellerPayoutWhereInput = {};
    if (status) where.status = status as Prisma.SellerPayoutWhereInput['status'];

    const [payouts, total] = await Promise.all([
      prisma.sellerPayout.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (parseInt(page as string) - 1) * parseInt(limit as string),
        take: parseInt(limit as string),
        include: {
          seller: {
            select: {
              username: true,
              email: true,
              bankDetails: true,
            },
          },
        },
      }),
      prisma.sellerPayout.count({ where }),
    ]);

    res.json({
      success: true,
      data: { payouts },
      meta: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        totalPages: Math.ceil(total / parseInt(limit as string)),
      },
    });
  } catch (error) {
    next(error);
  }
});

// Process payout manually
router.post('/payouts/:id/process', async (req, res, next) => {
  try {
    const { bankReference } = req.body;

    if (!bankReference) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_REFERENCE', message: 'Bank transfer reference is required' },
      });
    }

    const payout = await prisma.sellerPayout.update({
      where: { id: req.params.id },
      data: {
        status: 'COMPLETED',
        processedAt: new Date(),
        bankReference,
      },
    });

    // Notify seller
    await sendNotification({
      userId: payout.sellerId,
      type: 'PAYOUT_COMPLETED',
      title: 'Payout Sent',
      message: `R${Number(payout.amount).toFixed(2)} has been sent to your bank account (Ref: ${bankReference})`,
      data: { payoutId: payout.id },
    });

    res.json({ success: true, data: { payout } });
  } catch (error) {
    next(error);
  }
});

// Reject / fail payout
router.post('/payouts/:id/reject', async (req, res, next) => {
  try {
    const { reason } = req.body;

    const payout = await prisma.sellerPayout.update({
      where: { id: req.params.id },
      data: {
        status: 'FAILED',
        failedAt: new Date(),
        failedReason: reason || 'Rejected by admin',
      },
    });

    await sendNotification({
      userId: payout.sellerId,
      type: 'PAYOUT_FAILED',
      title: 'Payout Failed',
      message: `Your withdrawal of R${Number(payout.amount).toFixed(2)} was not processed: ${reason || 'Contact support'}`,
      data: { payoutId: payout.id },
    });

    res.json({ success: true, data: { payout } });
  } catch (error) {
    next(error);
  }
});

// KYC: Verify seller
router.post('/sellers/:id/verify-kyc', async (req, res, next) => {
  try {
    const { status } = req.body; // 'VERIFIED' or 'REJECTED'

    if (!['VERIFIED', 'REJECTED'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_STATUS', message: 'Status must be VERIFIED or REJECTED' },
      });
    }

    const profile = await prisma.sellerProfile.update({
      where: { userId: req.params.id },
      data: {
        kycStatus: status,
        isVerified: status === 'VERIFIED',
        verifiedAt: status === 'VERIFIED' ? new Date() : undefined,
      },
    });

    await sendNotification({
      userId: req.params.id,
      type: 'KYC_UPDATE',
      title: status === 'VERIFIED' ? 'Identity Verified!' : 'Verification Failed',
      message: status === 'VERIFIED'
        ? 'Your identity has been verified. You can now receive payouts.'
        : 'Your identity verification was rejected. Please update your details.',
      data: { kycStatus: status },
    });

    res.json({ success: true, data: { profile } });
  } catch (error) {
    next(error);
  }
});

// Get sellers pending KYC
router.get('/sellers/pending-kyc', async (req, res, next) => {
  try {
    const sellers = await prisma.sellerProfile.findMany({
      where: { kycStatus: 'PENDING' },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            username: true,
            firstName: true,
            lastName: true,
            country: true,
            bankDetails: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    res.json({ success: true, data: { sellers } });
  } catch (error) {
    next(error);
  }
});

// Categories management
router.get('/categories', async (req, res, next) => {
  try {
    const categories = await prisma.category.findMany({
      include: {
        children: true,
        _count: { select: { services: true } },
      },
      where: { parentId: null },
      orderBy: { order: 'asc' },
    });

    res.json({ success: true, data: { categories } });
  } catch (error) {
    next(error);
  }
});

router.post('/categories', validate(categorySchema), async (req, res, next) => {
  try {
    const { name, slug, description, icon, parentId, order } = req.body;

    const category = await prisma.category.create({
      data: { name, slug, description, icon, parentId, order },
    });

    res.status(201).json({ success: true, data: { category } });
  } catch (error) {
    next(error);
  }
});

router.patch('/categories/:id', validate(categorySchema.partial()), async (req, res, next) => {
  try {
    const { name, slug, description, icon, parentId, order } = req.body;
    const category = await prisma.category.update({
      where: { id: req.params.id as string },
      data: { name, slug, description, icon, parentId, order },
    });

    res.json({ success: true, data: { category } });
  } catch (error) {
    next(error);
  }
});

router.delete('/categories/:id', async (req, res, next) => {
  try {
    await prisma.category.delete({ where: { id: req.params.id } });
    res.json({ success: true, data: { message: 'Category deleted' } });
  } catch (error) {
    next(error);
  }
});

// ============ SERVICES MANAGEMENT ============

router.get('/services', async (req, res, next) => {
  try {
    const { search, status, page = '1', limit = '20' } = req.query;

    const where: Prisma.ServiceWhereInput = {};
    if (search) {
      where.OR = [
        { title: { contains: search as string, mode: 'insensitive' } },
        { seller: { username: { contains: search as string, mode: 'insensitive' } } },
      ];
    }
    if (status === 'active') where.isActive = true;
    if (status === 'inactive') where.isActive = false;
    if (status === 'pending_review') where.status = 'PENDING_REVIEW';

    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string) || 20));

    const [services, total] = await Promise.all([
      prisma.service.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
        include: {
          seller: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
              sellerProfile: { select: { displayName: true } },
            },
          },
          category: { select: { name: true } },
          packages: { select: { tier: true, price: true } },
        },
      }),
      prisma.service.count({ where }),
    ]);

    res.json({
      success: true,
      data: { services },
      meta: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    next(error);
  }
});

router.patch('/services/:id', async (req, res, next) => {
  try {
    const { isActive, status } = req.body;
    const data: any = {};
    if (isActive !== undefined) data.isActive = isActive;
    if (status && ['ACTIVE', 'REJECTED', 'PAUSED', 'PENDING_REVIEW'].includes(status)) {
      data.status = status;
    }

    const service = await prisma.service.update({
      where: { id: req.params.id },
      data,
    });

    res.json({ success: true, data: { service } });
  } catch (error) {
    next(error);
  }
});

// Create service for admin-managed seller
const adminCreateServiceSchema = z.object({
  title: z.string().min(10).max(80),
  categoryId: z.string().min(1),
  description: z.string().min(50),
  pricingType: z.enum(['ONE_TIME', 'SUBSCRIPTION', 'BOTH']).default('ONE_TIME'),
  tags: z.array(z.string()).min(1).max(5),
  images: z.array(z.string()).min(1).max(5),
  video: z.string().optional(),
  faqs: z.array(z.object({ question: z.string(), answer: z.string() })).optional(),
  packages: z.array(z.object({
    tier: z.enum(['BASIC', 'STANDARD', 'PREMIUM']),
    name: z.string().min(2),
    description: z.string().min(10),
    price: z.number().min(50),
    deliveryDays: z.number().min(1).max(90),
    revisions: z.number().min(0).default(1),
    features: z.array(z.string()).min(1),
  })).min(1),
});

router.post('/sellers/managed/:id/services', validate(adminCreateServiceSchema), async (req, res, next) => {
  try {
    const sellerId = req.params.id as string;
    const { title, categoryId, description, pricingType, tags, images, video, faqs, packages } = req.body;

    const seller = await prisma.user.findUnique({ where: { id: sellerId, isSeller: true } });
    if (!seller) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Seller not found' } });
    }

    let slug = slugify(title);
    const existing = await prisma.service.findFirst({ where: { sellerId, slug } });
    if (existing) slug = `${slug}-${Date.now()}`;

    const service = await prisma.service.create({
      data: {
        sellerId,
        categoryId,
        title,
        slug,
        description,
        pricingType,
        tags: tags.map((t: string) => t.toLowerCase()),
        images,
        video: video || null,
        faqs: faqs || null,
        status: 'ACTIVE',
        isActive: true,
        packages: {
          create: packages.map((pkg: any) => ({
            tier: pkg.tier,
            name: pkg.name,
            description: pkg.description,
            price: pkg.price,
            deliveryDays: pkg.deliveryDays,
            revisions: pkg.revisions || 1,
            features: pkg.features,
          })),
        },
      },
      include: {
        category: { select: { name: true } },
        packages: true,
      },
    });

    res.status(201).json({ success: true, data: { service } });
  } catch (error) {
    next(error);
  }
});

// ============ COURSES MANAGEMENT ============

router.get('/courses', async (req, res, next) => {
  try {
    const { search, status, page = '1', limit = '20' } = req.query;

    const where: Prisma.CourseWhereInput = {};
    if (search) {
      where.OR = [
        { title: { contains: search as string, mode: 'insensitive' } },
        { seller: { displayName: { contains: search as string, mode: 'insensitive' } } },
      ];
    }
    if (status) where.status = status as Prisma.CourseWhereInput['status'];

    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string) || 20));

    const [courses, total] = await Promise.all([
      prisma.course.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
        include: {
          seller: {
            select: {
              displayName: true,
              user: { select: { username: true } },
            },
          },
          category: { select: { name: true } },
        },
      }),
      prisma.course.count({ where }),
    ]);

    res.json({
      success: true,
      data: { courses },
      meta: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    next(error);
  }
});

router.patch('/courses/:id', async (req, res, next) => {
  try {
    const { status, isFeatured } = req.body;
    const data: any = {};

    if (status) {
      if (!['PUBLISHED', 'DRAFT', 'ARCHIVED'].includes(status)) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_STATUS', message: 'Status must be PUBLISHED, DRAFT, or ARCHIVED' },
        });
      }
      data.status = status;
    }

    if (isFeatured !== undefined) data.isFeatured = isFeatured;

    const course = await prisma.course.update({
      where: { id: req.params.id },
      data,
    });

    res.json({ success: true, data: { course } });
  } catch (error) {
    next(error);
  }
});

// ============ PLATFORM ANALYTICS ============

router.get('/analytics', async (req, res, next) => {
  try {
    const now = new Date();

    // Monthly revenue and orders for last 6 months
    const monthlyPromises = Array.from({ length: 6 }, (_, idx) => {
      const i = 5 - idx;
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const isPartial = i === 0;

      return Promise.all([
        prisma.order.aggregate({
          where: { status: 'COMPLETED', completedAt: { gte: start, lt: end } },
          _sum: { platformRevenue: true, totalAmount: true },
        }),
        prisma.order.count({
          where: { createdAt: { gte: start, lt: end }, status: { not: 'PENDING_PAYMENT' } },
        }),
        prisma.user.count({
          where: { createdAt: { gte: start, lt: end } },
        }),
      ]).then(([revenue, orderCount, newUsers]) => ({
        month: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}`,
        revenue: Number(revenue._sum.platformRevenue || 0),
        orders: orderCount,
        users: newUsers,
        isPartial,
      }));
    });

    const monthlyData = await Promise.all(monthlyPromises);

    // Run remaining analytics queries in parallel
    const [ordersByStatus, topServices, topCourses, platformTotals, totalViews] = await Promise.all([
      // Order status breakdown
      prisma.order.groupBy({
        by: ['status'],
        _count: { id: true },
        _sum: { totalAmount: true },
      }),

      // Top services by orders
      prisma.service.findMany({
        where: { isActive: true },
        orderBy: { orderCount: 'desc' },
        take: 10,
        select: {
          id: true,
          title: true,
          orderCount: true,
          viewCount: true,
          rating: true,
          reviewCount: true,
          seller: { select: { username: true } },
          packages: { where: { tier: 'BASIC' }, select: { price: true } },
        },
      }),

      // Top courses by enrollments
      prisma.course.findMany({
        where: { status: 'PUBLISHED' },
        orderBy: { enrollCount: 'desc' },
        take: 10,
        select: {
          id: true,
          title: true,
          enrollCount: true,
          rating: true,
          reviewCount: true,
          price: true,
          seller: {
            select: { displayName: true, user: { select: { username: true } } },
          },
        },
      }),

      // Platform totals
      Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { isSeller: true } }),
        prisma.order.count({ where: { status: { not: 'PENDING_PAYMENT' } } }),
        prisma.order.aggregate({
          where: { status: 'COMPLETED' },
          _sum: { platformRevenue: true, totalAmount: true, sellerPayout: true },
        }),
        prisma.service.count({ where: { isActive: true } }),
        prisma.course.count({ where: { status: 'PUBLISHED' } }),
        prisma.courseEnrollment.count(),
        prisma.conversation.count(),
      ]),

      // Conversion rate data
      prisma.service.aggregate({ _sum: { viewCount: true } }),
    ]);

    const [totalUsers, totalSellers, totalOrders, totalRevenue, totalServices, totalCourses, totalEnrollments, totalConversations] = platformTotals;
    const platformConversionRate = (totalViews._sum.viewCount || 0) > 0
      ? ((totalOrders / (totalViews._sum.viewCount || 1)) * 100)
      : 0;

    res.json({
      success: true,
      data: {
        overview: {
          totalUsers,
          totalSellers,
          totalOrders,
          totalGMV: Number(totalRevenue._sum.totalAmount || 0),
          totalPlatformRevenue: Number(totalRevenue._sum.platformRevenue || 0),
          totalSellerPayouts: Number(totalRevenue._sum.sellerPayout || 0),
          totalServices,
          totalCourses,
          totalEnrollments,
          totalConversations,
          platformConversionRate: Number(platformConversionRate.toFixed(2)),
        },
        monthlyData,
        ordersByStatus: ordersByStatus.map((s) => ({
          status: s.status,
          count: s._count.id,
          totalAmount: Number(s._sum.totalAmount || 0),
        })),
        topServices: topServices.map((s) => ({
          id: s.id,
          title: s.title,
          seller: s.seller?.username || 'Unknown',
          orderCount: s.orderCount,
          viewCount: s.viewCount,
          rating: Number(s.rating),
          reviewCount: s.reviewCount,
          startingPrice: s.packages[0] ? Number(s.packages[0].price) : 0,
        })),
        topCourses: topCourses.map((c) => ({
          id: c.id,
          title: c.title,
          instructor: c.seller?.displayName || c.seller?.user?.username || 'Unknown',
          enrollCount: c.enrollCount,
          rating: Number(c.rating),
          reviewCount: c.reviewCount,
          price: Number(c.price),
        })),
      },
    });
  } catch (error) {
    next(error);
  }
});

// ============ ADMIN INBOX / CONVERSATION MANAGEMENT ============

// List all conversations for admin review
router.get('/conversations', async (req, res, next) => {
  try {
    const { search, flagged, page = '1', limit = '20' } = req.query;

    const where: Prisma.ConversationWhereInput = {};
    if (flagged === 'true') {
      where.adminFlagged = true;
    }
    if (search) {
      where.OR = [
        { buyer: { username: { contains: search as string, mode: 'insensitive' } } },
        { seller: { username: { contains: search as string, mode: 'insensitive' } } },
        { buyer: { email: { contains: search as string, mode: 'insensitive' } } },
        { seller: { email: { contains: search as string, mode: 'insensitive' } } },
      ];
    }

    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string) || 20));

    const [conversations, total] = await Promise.all([
      prisma.conversation.findMany({
        where,
        orderBy: { lastMessageAt: 'desc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
        include: {
          buyer: { select: { id: true, username: true, email: true, firstName: true, avatar: true } },
          seller: { select: { id: true, username: true, email: true, firstName: true, avatar: true } },
          order: { select: { id: true, orderNumber: true, status: true, totalAmount: true } },
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: {
              id: true,
              content: true,
              type: true,
              senderId: true,
              createdAt: true,
            },
          },
          _count: { select: { messages: true } },
        },
      }),
      prisma.conversation.count({ where }),
    ]);

    res.json({
      success: true,
      data: { conversations },
      meta: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    next(error);
  }
});

// Get full conversation messages for admin review
router.get('/conversations/:id', async (req, res, next) => {
  try {
    const conversation = await prisma.conversation.findUnique({
      where: { id: req.params.id },
      include: {
        buyer: { select: { id: true, username: true, email: true, firstName: true, avatar: true } },
        seller: { select: { id: true, username: true, email: true, firstName: true, avatar: true } },
        order: { select: { id: true, orderNumber: true, status: true, totalAmount: true } },
        messages: {
          orderBy: { createdAt: 'asc' },
          include: {
            sender: { select: { id: true, username: true, firstName: true, avatar: true } },
          },
        },
      },
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Conversation not found' },
      });
    }

    res.json({ success: true, data: { conversation } });
  } catch (error) {
    next(error);
  }
});

// Flag a conversation for admin review
router.post('/conversations/:id/flag', async (req, res, next) => {
  try {
    const { reason } = req.body;

    const conversation = await prisma.conversation.update({
      where: { id: req.params.id },
      data: {
        adminFlagged: true,
        adminNotes: reason || 'Flagged by admin for review',
      },
    });

    res.json({ success: true, data: { conversation } });
  } catch (error) {
    next(error);
  }
});

// Unflag a conversation
router.post('/conversations/:id/unflag', async (req, res, next) => {
  try {
    const conversation = await prisma.conversation.update({
      where: { id: req.params.id },
      data: {
        adminFlagged: false,
        adminNotes: null,
      },
    });

    res.json({ success: true, data: { conversation } });
  } catch (error) {
    next(error);
  }
});

// ============ ADMIN SELLER MANAGEMENT ============

const createSellerSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(30).regex(/^[a-z0-9_-]+$/),
  password: z.string().min(6),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  displayName: z.string().min(1),
  professionalTitle: z.string().min(1),
  description: z.string().min(1),
  skills: z.array(z.string()).default([]),
  plan: z.enum(['free', 'pro']),
  country: z.string().default('South Africa'),
});

// Create seller account
router.post('/sellers/create', validate(createSellerSchema), async (req, res, next) => {
  try {
    const { email, username, password, firstName, lastName, displayName, professionalTitle, description, skills, plan, country } = req.body;

    const existing = await prisma.user.findFirst({
      where: { OR: [{ email: email.toLowerCase() }, { username: username.toLowerCase() }] },
    });
    if (existing) {
      return res.status(409).json({ success: false, error: { code: 'EXISTS', message: 'Email or username already taken' } });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        username: username.toLowerCase(),
        passwordHash,
        firstName,
        lastName,
        country,
        isSeller: true,
        isEmailVerified: true,
        isAdminCreated: true,
        roles: { create: [{ role: 'BUYER' }, { role: 'SELLER' }] },
        sellerProfile: {
          create: {
            displayName,
            professionalTitle,
            description,
            skills,
            languages: [{ language: 'English', proficiency: 'Native' }],
            kycStatus: 'VERIFIED',
            isVerified: true,
            verifiedAt: new Date(),
            sellerFeePaid: true,
            sellerFeePaidAt: new Date(),
          },
        },
      },
      include: { sellerProfile: true, roles: true },
    });

    // Create subscription if pro plan
    if (plan === 'pro' && user.sellerProfile) {
      const { now, periodEnd } = createAdminSubscriptionPeriod();

      await prisma.sellerSubscription.create({
        data: {
          sellerProfileId: user.sellerProfile.id,
          status: 'ACTIVE',
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          nextBillingDate: periodEnd,
        },
      });
    }

    // Create default pipeline stages
    const defaultStages = [
      { name: 'New Lead', order: 0, color: '#3B82F6' },
      { name: 'Contacted', order: 1, color: '#F59E0B' },
      { name: 'Proposal Sent', order: 2, color: '#8B5CF6' },
      { name: 'Won', order: 3, color: '#10B981' },
      { name: 'Lost', order: 4, color: '#EF4444' },
    ];
    await prisma.pipelineStage.createMany({
      data: defaultStages.map((s) => ({ ...s, userId: user.id })),
    });

    const fullUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        sellerProfile: { include: { subscription: true } },
        roles: true,
        _count: { select: { sellerOrders: true, services: true } },
      },
    });

    res.status(201).json({ success: true, data: { seller: fullUser } });
  } catch (error) {
    next(error);
  }
});

// List admin-created sellers
router.get('/sellers/managed', async (req, res, next) => {
  try {
    const { search, page = '1', limit = '20' } = req.query;

    const where: Prisma.UserWhereInput = {
      isAdminCreated: true,
      isSeller: true,
    };

    if (search) {
      where.OR = [
        { email: { contains: search as string, mode: 'insensitive' } },
        { username: { contains: search as string, mode: 'insensitive' } },
        { firstName: { contains: search as string, mode: 'insensitive' } },
        { sellerProfile: { displayName: { contains: search as string, mode: 'insensitive' } } },
      ];
    }

    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string) || 20));

    const [sellers, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
        include: {
          sellerProfile: { include: { subscription: true } },
          _count: { select: { sellerOrders: true, services: true, receivedReviews: true } },
        },
      }),
      prisma.user.count({ where }),
    ]);

    res.json({
      success: true,
      data: { sellers },
      meta: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
    });
  } catch (error) {
    next(error);
  }
});

// Get admin-created seller details (full dashboard data)
router.get('/sellers/managed/:id', async (req, res, next) => {
  try {
    const seller = await prisma.user.findUnique({
      where: { id: req.params.id },
      include: {
        sellerProfile: { include: { subscription: true, courses: true } },
        services: {
          include: {
            category: { select: { name: true } },
            packages: true,
            _count: { select: { reviews: true, orders: true } },
          },
        },
        sellerOrders: {
          orderBy: { createdAt: 'desc' },
          take: 20,
          include: {
            buyer: { select: { username: true, firstName: true, lastName: true } },
            service: { select: { title: true } },
          },
        },
        sellerConversations: {
          orderBy: { lastMessageAt: 'desc' },
          take: 20,
          include: {
            buyer: { select: { id: true, username: true, firstName: true, avatar: true } },
            messages: { orderBy: { createdAt: 'desc' }, take: 1 },
            _count: { select: { messages: true } },
          },
        },
        receivedReviews: {
          orderBy: { createdAt: 'desc' },
          include: {
            author: { select: { username: true, firstName: true, lastName: true, avatar: true } },
            service: { select: { title: true } },
          },
        },
        roles: true,
        bankDetails: true,
      },
    });

    if (!seller) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Seller not found' } });
    }

    // Get seller metrics
    const metrics = await prisma.sellerMetrics.findMany({
      where: { userId: seller.id },
      orderBy: { date: 'desc' },
      take: 30,
    });

    res.json({ success: true, data: { seller, metrics } });
  } catch (error) {
    next(error);
  }
});

// Update seller plan (switch between free/pro)
router.patch('/sellers/managed/:id/plan', async (req, res, next) => {
  try {
    const { plan } = req.body; // 'free' or 'pro'

    const seller = await prisma.user.findUnique({
      where: { id: req.params.id },
      include: { sellerProfile: { include: { subscription: true } } },
    });

    if (!seller?.sellerProfile) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Seller not found' } });
    }

    if (plan === 'pro') {
      if (!seller.sellerProfile.subscription) {
        const { now, periodEnd } = createAdminSubscriptionPeriod();
        await prisma.sellerSubscription.create({
          data: {
            sellerProfileId: seller.sellerProfile.id,
            status: 'ACTIVE',
            currentPeriodStart: now,
            currentPeriodEnd: periodEnd,
            nextBillingDate: periodEnd,
          },
        });
      } else {
        await prisma.sellerSubscription.update({
          where: { id: seller.sellerProfile.subscription.id },
          data: { status: 'ACTIVE' },
        });
      }
    } else if (plan === 'free' && seller.sellerProfile.subscription) {
      await prisma.sellerSubscription.update({
        where: { id: seller.sellerProfile.subscription.id },
        data: { status: 'CANCELLED', cancelledAt: new Date() },
      });
    }

    const updated = await prisma.user.findUnique({
      where: { id: req.params.id },
      include: { sellerProfile: { include: { subscription: true } } },
    });

    res.json({ success: true, data: { seller: updated } });
  } catch (error) {
    next(error);
  }
});

// Update seller profile (admin override)
router.patch('/sellers/managed/:id/profile', async (req, res, next) => {
  try {
    const {
      displayName, professionalTitle, description, skills,
      rating, reviewCount, completedOrders, responseTimeMinutes,
      onTimeDeliveryRate, level, isAvailable,
    } = req.body;

    const seller = await prisma.user.findUnique({
      where: { id: req.params.id },
      include: { sellerProfile: true },
    });

    if (!seller?.sellerProfile) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Seller not found' } });
    }

    const data: any = {};
    if (displayName !== undefined) data.displayName = displayName;
    if (professionalTitle !== undefined) data.professionalTitle = professionalTitle;
    if (description !== undefined) data.description = description;
    if (skills !== undefined) data.skills = skills;
    if (rating !== undefined) data.rating = rating;
    if (reviewCount !== undefined) data.reviewCount = reviewCount;
    if (completedOrders !== undefined) data.completedOrders = completedOrders;
    if (responseTimeMinutes !== undefined) data.responseTimeMinutes = responseTimeMinutes;
    if (onTimeDeliveryRate !== undefined) data.onTimeDeliveryRate = onTimeDeliveryRate;
    if (level !== undefined) data.level = level;
    if (isAvailable !== undefined) data.isAvailable = isAvailable;

    const profile = await prisma.sellerProfile.update({
      where: { userId: req.params.id },
      data,
    });

    res.json({ success: true, data: { profile } });
  } catch (error) {
    next(error);
  }
});

// ============ ADMIN USER CREATION (for reviews) ============

const createUserSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(30).regex(/^[a-z0-9_-]+$/),
  password: z.string().min(6),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  country: z.string().default('South Africa'),
  avatar: z.string().optional(),
});

// Create user account (buyer) for admin
router.post('/users/create', validate(createUserSchema), async (req, res, next) => {
  try {
    const { email, username, password, firstName, lastName, country, avatar } = req.body;

    const existing = await prisma.user.findFirst({
      where: { OR: [{ email: email.toLowerCase() }, { username: username.toLowerCase() }] },
    });
    if (existing) {
      return res.status(409).json({ success: false, error: { code: 'EXISTS', message: 'Email or username already taken' } });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        username: username.toLowerCase(),
        passwordHash,
        firstName,
        lastName,
        country,
        avatar: avatar || null,
        isEmailVerified: true,
        isAdminCreated: true,
        roles: { create: [{ role: 'BUYER' }] },
      },
      include: { roles: true },
    });

    res.status(201).json({ success: true, data: { user } });
  } catch (error) {
    next(error);
  }
});

// List admin-created users (buyers)
router.get('/users/managed', async (req, res, next) => {
  try {
    const { search, page = '1', limit = '50' } = req.query;

    const where: Prisma.UserWhereInput = {
      isAdminCreated: true,
      isSeller: false,
    };

    if (search) {
      where.OR = [
        { email: { contains: search as string, mode: 'insensitive' } },
        { username: { contains: search as string, mode: 'insensitive' } },
        { firstName: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string) || 50));

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
        select: {
          id: true,
          email: true,
          username: true,
          firstName: true,
          lastName: true,
          avatar: true,
          createdAt: true,
          _count: { select: { reviews: true } },
        },
      }),
      prisma.user.count({ where }),
    ]);

    res.json({
      success: true,
      data: { users },
      meta: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
    });
  } catch (error) {
    next(error);
  }
});

// ============ ADMIN REVIEW CREATION ============

const createReviewSchema = z.object({
  authorId: z.string().min(1),
  serviceId: z.string().min(1),
  sellerId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  comment: z.string().min(1),
  communicationRating: z.number().int().min(1).max(5).optional(),
  qualityRating: z.number().int().min(1).max(5).optional(),
  valueRating: z.number().int().min(1).max(5).optional(),
});

// Create review (simulated order + review for marketing)
router.post('/reviews/create', validate(createReviewSchema), async (req, res, next) => {
  try {
    const { authorId, serviceId, sellerId, rating, comment, communicationRating, qualityRating, valueRating } = req.body;

    // Verify author and seller exist
    const [author, seller, service] = await Promise.all([
      prisma.user.findUnique({ where: { id: authorId } }),
      prisma.user.findUnique({ where: { id: sellerId } }),
      prisma.service.findUnique({ where: { id: serviceId }, include: { packages: { where: { tier: 'BASIC' }, take: 1 } } }),
    ]);

    if (!author || !seller || !service) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Author, seller, or service not found' } });
    }

    const baseAmount = service.packages[0]?.price ? Number(service.packages[0].price) : 100;
    const buyerFee = Math.round(baseAmount * 0.03 * 100) / 100;
    const sellerFee = Math.round(baseAmount * 0.08 * 100) / 100;

    // Create a simulated completed order
    const orderNumber = generateOrderNumber();
    const order = await prisma.order.create({
      data: {
        orderNumber,
        buyerId: authorId,
        sellerId,
        serviceId,
        packageId: service.packages[0]?.id || null,
        baseAmount,
        buyerFee,
        totalAmount: baseAmount + buyerFee,
        sellerFee,
        sellerPayout: baseAmount - sellerFee,
        platformRevenue: buyerFee + sellerFee,
        status: 'COMPLETED',
        deliveryDays: 3,
        paidAt: new Date(),
        startedAt: new Date(),
        completedAt: new Date(),
      },
    });

    // Create the review
    const review = await prisma.review.create({
      data: {
        orderId: order.id,
        serviceId,
        authorId,
        recipientId: sellerId,
        rating,
        comment,
        communicationRating,
        qualityRating,
        valueRating,
        isPublic: true,
      },
      include: {
        author: { select: { username: true, firstName: true, lastName: true, avatar: true } },
        service: { select: { title: true } },
      },
    });

    // Update service and seller profile review stats
    const serviceReviews = await prisma.review.findMany({
      where: { serviceId },
      select: { rating: true },
    });
    const avgServiceRating = serviceReviews.reduce((sum, r) => sum + r.rating, 0) / serviceReviews.length;

    await prisma.service.update({
      where: { id: serviceId },
      data: {
        rating: Math.round(avgServiceRating * 100) / 100,
        reviewCount: serviceReviews.length,
        orderCount: { increment: 1 },
      },
    });

    const sellerReviews = await prisma.review.findMany({
      where: { recipientId: sellerId },
      select: { rating: true },
    });
    const avgSellerRating = sellerReviews.reduce((sum, r) => sum + r.rating, 0) / sellerReviews.length;

    await prisma.sellerProfile.update({
      where: { userId: sellerId },
      data: {
        rating: Math.round(avgSellerRating * 100) / 100,
        reviewCount: sellerReviews.length,
        completedOrders: { increment: 1 },
      },
    });

    res.status(201).json({ success: true, data: { review, order } });
  } catch (error) {
    next(error);
  }
});

// ============ ADMIN ANALYTICS OVERRIDE ============

const overrideAnalyticsSchema = z.object({
  date: z.string().optional(), // ISO date string
  ordersReceived: z.number().int().optional(),
  ordersCompleted: z.number().int().optional(),
  ordersCancelled: z.number().int().optional(),
  grossRevenue: z.number().optional(),
  platformFees: z.number().optional(),
  netRevenue: z.number().optional(),
  avgDeliveryTimeHrs: z.number().int().optional(),
  onTimeDeliveries: z.number().int().optional(),
  lateDeliveries: z.number().int().optional(),
  reviewsReceived: z.number().int().optional(),
  avgRating: z.number().optional(),
});

// Override/set seller metrics
router.post('/sellers/managed/:id/metrics', validate(overrideAnalyticsSchema), async (req, res, next) => {
  try {
    const userId = req.params.id as string;
    const dateStr = req.body.date || new Date().toISOString().split('T')[0];
    const date = new Date(dateStr);

    const seller = await prisma.user.findUnique({ where: { id: userId, isSeller: true } });
    if (!seller) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Seller not found' } });
    }

    const data: any = {
      userId,
      date,
    };
    const fields = [
      'ordersReceived', 'ordersCompleted', 'ordersCancelled',
      'grossRevenue', 'platformFees', 'netRevenue',
      'avgDeliveryTimeHrs', 'onTimeDeliveries', 'lateDeliveries',
      'reviewsReceived', 'avgRating',
    ];
    for (const field of fields) {
      if (req.body[field] !== undefined) data[field] = req.body[field];
    }

    const metric = await prisma.sellerMetrics.upsert({
      where: { userId_date: { userId, date } },
      update: data,
      create: data,
    });

    res.json({ success: true, data: { metric } });
  } catch (error) {
    next(error);
  }
});

// Get seller metrics history
router.get('/sellers/managed/:id/metrics', async (req, res, next) => {
  try {
    const { days = '30' } = req.query;
    const since = new Date();
    since.setDate(since.getDate() - parseInt(days as string));

    const metrics = await prisma.sellerMetrics.findMany({
      where: { userId: req.params.id, date: { gte: since } },
      orderBy: { date: 'desc' },
    });

    res.json({ success: true, data: { metrics } });
  } catch (error) {
    next(error);
  }
});

// Bulk update seller profile stats for demo
router.patch('/sellers/managed/:id/stats', async (req, res, next) => {
  try {
    const {
      rating, reviewCount, completedOrders, responseTimeMinutes,
      onTimeDeliveryRate, level,
    } = req.body;

    const seller = await prisma.user.findUnique({
      where: { id: req.params.id },
      include: { sellerProfile: true },
    });

    if (!seller?.sellerProfile) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Seller not found' } });
    }

    const data: any = {};
    if (rating !== undefined) data.rating = rating;
    if (reviewCount !== undefined) data.reviewCount = reviewCount;
    if (completedOrders !== undefined) data.completedOrders = completedOrders;
    if (responseTimeMinutes !== undefined) data.responseTimeMinutes = responseTimeMinutes;
    if (onTimeDeliveryRate !== undefined) data.onTimeDeliveryRate = onTimeDeliveryRate;
    if (level !== undefined) data.level = level;

    const profile = await prisma.sellerProfile.update({
      where: { userId: req.params.id },
      data,
    });

    res.json({ success: true, data: { profile } });
  } catch (error) {
    next(error);
  }
});

export default router;
