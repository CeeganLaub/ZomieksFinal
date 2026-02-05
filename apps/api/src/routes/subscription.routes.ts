import { Router } from 'express';
import { authenticate } from '@/middleware/auth.js';
import { prisma } from '@/lib/prisma.js';
import { calculateOrderFees } from '@zomieks/shared';

const router = Router();

// Get user's subscriptions (as buyer)
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { status, page = '1', limit = '20' } = req.query;

    const where: any = { buyerId: req.user!.id };
    if (status) where.status = status;

    const [subscriptions, total] = await Promise.all([
      prisma.subscription.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (parseInt(page as string) - 1) * parseInt(limit as string),
        take: parseInt(limit as string),
        include: {
          service: {
            select: { id: true, title: true, slug: true, images: true },
          },
          tier: true,
        },
      }),
      prisma.subscription.count({ where }),
    ]);

    res.json({
      success: true,
      data: { subscriptions },
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

// Get seller's subscribers
router.get('/subscribers', authenticate, async (req, res, next) => {
  try {
    if (!req.user!.isSeller) {
      return res.status(403).json({
        success: false,
        error: { code: 'NOT_A_SELLER', message: 'Seller account required' },
      });
    }

    const { status, page = '1', limit = '20' } = req.query;

    const where: any = { service: { sellerId: req.user!.id } };
    if (status) where.status = status;

    const [subscriptions, total] = await Promise.all([
      prisma.subscription.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (parseInt(page as string) - 1) * parseInt(limit as string),
        take: parseInt(limit as string),
        include: {
          buyer: {
            select: { id: true, username: true, firstName: true, avatar: true },
          },
          service: {
            select: { id: true, title: true },
          },
          tier: true,
          payments: {
            orderBy: { paidAt: 'desc' },
            take: 1,
          },
        },
      }),
      prisma.subscription.count({ where }),
    ]);

    res.json({
      success: true,
      data: { subscriptions },
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

// Subscribe to a service tier
router.post('/', authenticate, async (req, res, next) => {
  try {
    const { serviceId, tierId, paymentGateway } = req.body;

    // Get service and tier
    const tier = await prisma.subscriptionTier.findFirst({
      where: { id: tierId, serviceId, isActive: true },
      include: {
        service: {
          select: { id: true, sellerId: true, title: true, isActive: true },
        },
      },
    });

    if (!tier || !tier.service.isActive) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Subscription tier not found' },
      });
    }

    // Can't subscribe to own service
    if (tier.service.sellerId === req.user!.id) {
      return res.status(400).json({
        success: false,
        error: { code: 'SELF_SUBSCRIBE', message: 'You cannot subscribe to your own service' },
      });
    }

    // Check for existing active subscription
    const existing = await prisma.subscription.findFirst({
      where: {
        buyerId: req.user!.id,
        serviceId,
        status: { in: ['ACTIVE', 'PENDING'] },
      },
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        error: { code: 'ALREADY_SUBSCRIBED', message: 'You already have an active subscription to this service' },
      });
    }

    // Calculate billing period
    const now = new Date();
    const periodEnd = new Date(now);
    switch (tier.interval) {
      case 'MONTHLY':
        periodEnd.setMonth(periodEnd.getMonth() + 1);
        break;
      case 'QUARTERLY':
        periodEnd.setMonth(periodEnd.getMonth() + 3);
        break;
      case 'YEARLY':
        periodEnd.setFullYear(periodEnd.getFullYear() + 1);
        break;
    }

    // Create subscription
    const subscription = await prisma.subscription.create({
      data: {
        buyerId: req.user!.id,
        serviceId,
        tierId,
        status: 'PENDING',
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        nextBillingDate: periodEnd,
      },
    });

    // Redirect to payment
    res.status(201).json({
      success: true,
      data: {
        subscription,
        paymentUrl: `/api/v1/payments/initiate-subscription?subscriptionId=${subscription.id}&gateway=${paymentGateway}`,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Cancel subscription
router.post('/:id/cancel', authenticate, async (req, res, next) => {
  try {
    const { immediately = false, reason } = req.body;

    const subscription = await prisma.subscription.findFirst({
      where: {
        id: req.params.id,
        buyerId: req.user!.id,
        status: { in: ['ACTIVE', 'PAUSED'] },
      },
    });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Subscription not found' },
      });
    }

    if (immediately) {
      // Cancel immediately
      // TODO: Cancel with PayFast if token exists
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          status: 'CANCELLED',
          cancelledAt: new Date(),
          cancelReason: reason,
        },
      });
    } else {
      // Cancel at end of period
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          cancelAtPeriodEnd: true,
          cancelReason: reason,
        },
      });
    }

    res.json({ success: true, data: { message: 'Subscription cancellation initiated' } });
  } catch (error) {
    next(error);
  }
});

// Pause subscription
router.post('/:id/pause', authenticate, async (req, res, next) => {
  try {
    const subscription = await prisma.subscription.findFirst({
      where: {
        id: req.params.id,
        buyerId: req.user!.id,
        status: 'ACTIVE',
      },
    });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Subscription not found' },
      });
    }

    await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        status: 'PAUSED',
        pausedAt: new Date(),
        pauseReason: req.body.reason,
      },
    });

    res.json({ success: true, data: { message: 'Subscription paused' } });
  } catch (error) {
    next(error);
  }
});

// Resume subscription
router.post('/:id/resume', authenticate, async (req, res, next) => {
  try {
    const subscription = await prisma.subscription.findFirst({
      where: {
        id: req.params.id,
        buyerId: req.user!.id,
        status: 'PAUSED',
      },
    });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Subscription not found' },
      });
    }

    await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        status: 'ACTIVE',
        pausedAt: null,
        pauseReason: null,
      },
    });

    res.json({ success: true, data: { message: 'Subscription resumed' } });
  } catch (error) {
    next(error);
  }
});

export default router;
