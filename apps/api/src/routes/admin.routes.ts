import { Router } from 'express';
import { authenticate, requireAdmin } from '@/middleware/auth.js';
import { prisma } from '@/lib/prisma.js';

const router = Router();

// All routes require admin
router.use(authenticate, requireAdmin);

// Dashboard stats
router.get('/stats', async (req, res, next) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));

    const [
      totalUsers,
      totalSellers,
      totalOrders,
      totalRevenue,
      monthlyOrders,
      monthlyRevenue,
      weeklyOrders,
      pendingDisputes,
      pendingPayouts,
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
      prisma.order.count({ where: { status: 'DISPUTED' } }),
      prisma.sellerPayout.count({ where: { status: 'PENDING' } }),
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
        },
        pending: {
          disputes: pendingDisputes,
          payouts: pendingPayouts,
        },
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

    const where: any = {};
    
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

    res.json({ success: true, data: { user } });
  } catch (error) {
    next(error);
  }
});

// Orders list
router.get('/orders', async (req, res, next) => {
  try {
    const { status, startDate, endDate, page = '1', limit = '20' } = req.query;

    const where: any = {};
    if (status) where.status = status as string;
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
      const { calculateServiceRefund } = await import('@zomieks/shared');
      const baseAmount = Number(order.baseAmount);
      const buyerFee = Number(order.buyerFee);
      const totalAmount = Number(order.totalAmount);
      const feeBreakdown = calculateServiceRefund(baseAmount, buyerFee, totalAmount);

      const { processOrderRefund } = await import('@/services/escrow.service.js');
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
      const { releaseOrderEscrow } = await import('@/services/escrow.service.js');
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

    res.json({ success: true, data: { message: 'Dispute resolved' } });
  } catch (error) {
    next(error);
  }
});

// Payouts list
router.get('/payouts', async (req, res, next) => {
  try {
    const { status, page = '1', limit = '20' } = req.query;

    const where: any = {};
    if (status) where.status = status as string;

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
    const { sendNotification } = await import('@/services/notification.service.js');
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

    const { sendNotification } = await import('@/services/notification.service.js');
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

    const { sendNotification } = await import('@/services/notification.service.js');
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

router.post('/categories', async (req, res, next) => {
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

router.patch('/categories/:id', async (req, res, next) => {
  try {
    const category = await prisma.category.update({
      where: { id: req.params.id },
      data: req.body,
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

export default router;
