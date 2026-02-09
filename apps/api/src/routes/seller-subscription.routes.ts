import { Router } from 'express';
import { prisma } from '@/lib/prisma.js';
import { env } from '@/config/env.js';
import { authenticate, requireSeller } from '@/middleware/auth.js';
import { createPayFastSubscription } from '@/services/payment.service.js';
import { SELLER_PLAN } from '@zomieks/shared';

const router = Router();

// Get seller subscription status
router.get('/status', authenticate, requireSeller, async (req, res, next) => {
  try {
    const sellerProfile = await prisma.sellerProfile.findUnique({
      where: { userId: req.user!.id },
      include: {
        subscription: {
          include: {
            payments: {
              orderBy: { paidAt: 'desc' },
              take: 5,
            },
          },
        },
      },
    });

    if (!sellerProfile) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Seller profile not found' },
      });
    }

    const subscription = sellerProfile.subscription;

    res.json({
      success: true,
      data: {
        hasSubscription: !!subscription,
        subscription: subscription
          ? {
              id: subscription.id,
              status: subscription.status,
              currentPeriodStart: subscription.currentPeriodStart,
              currentPeriodEnd: subscription.currentPeriodEnd,
              nextBillingDate: subscription.nextBillingDate,
              cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
              cancelledAt: subscription.cancelledAt,
              cancelReason: subscription.cancelReason,
              payments: subscription.payments,
            }
          : null,
        plan: SELLER_PLAN,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Subscribe to Zomieks Pro (R399/month)
router.post('/subscribe', authenticate, requireSeller, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: {
        sellerProfile: {
          include: { subscription: true },
        },
      },
    });

    if (!user?.sellerProfile) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Seller profile not found' },
      });
    }

    // Don't allow double-subscribe
    if (
      user.sellerProfile.subscription &&
      user.sellerProfile.subscription.status === 'ACTIVE'
    ) {
      return res.status(400).json({
        success: false,
        error: { code: 'ALREADY_SUBSCRIBED', message: 'You already have an active subscription' },
      });
    }

    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    // Create or update subscription record
    let subscription;
    if (user.sellerProfile.subscription) {
      subscription = await prisma.sellerSubscription.update({
        where: { id: user.sellerProfile.subscription.id },
        data: {
          status: 'PENDING',
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          nextBillingDate: periodEnd,
          cancelAtPeriodEnd: false,
          cancelledAt: null,
          cancelReason: null,
        },
      });
    } else {
      subscription = await prisma.sellerSubscription.create({
        data: {
          sellerProfileId: user.sellerProfile.id,
          status: 'PENDING',
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          nextBillingDate: periodEnd,
        },
      });
    }

    const appUrl = env.APP_URL || 'http://localhost:5173';

    // Generate PayFast subscription payment URL
    const paymentUrl = await createPayFastSubscription({
      paymentId: subscription.id,
      subscriptionId: subscription.id,
      amount: SELLER_PLAN.AMOUNT,
      itemName: `${SELLER_PLAN.NAME} - Monthly Subscription`,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      returnUrl: `${appUrl}/seller?subscription=success`,
      cancelUrl: `${appUrl}/seller?subscription=cancelled`,
      notifyUrl: `${env.API_URL || 'http://localhost:3001'}/webhooks/payfast/seller-subscription`,
      frequency: SELLER_PLAN.FREQUENCY,
      billingDate: now.toISOString().split('T')[0],
    });

    res.json({
      success: true,
      data: {
        subscriptionId: subscription.id,
        paymentUrl,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Cancel subscription (at end of period)
router.post('/cancel', authenticate, requireSeller, async (req, res, next) => {
  try {
    const { reason } = req.body as { reason?: string };

    const sellerProfile = await prisma.sellerProfile.findUnique({
      where: { userId: req.user!.id },
      include: { subscription: true },
    });

    if (!sellerProfile?.subscription) {
      return res.status(404).json({
        success: false,
        error: { code: 'NO_SUBSCRIPTION', message: 'No subscription found' },
      });
    }

    if (sellerProfile.subscription.status !== 'ACTIVE') {
      return res.status(400).json({
        success: false,
        error: { code: 'NOT_ACTIVE', message: 'Subscription is not active' },
      });
    }

    await prisma.sellerSubscription.update({
      where: { id: sellerProfile.subscription.id },
      data: {
        cancelAtPeriodEnd: true,
        cancelledAt: new Date(),
        cancelReason: reason || 'User cancelled',
      },
    });

    res.json({
      success: true,
      data: {
        message: 'Subscription will be cancelled at end of billing period',
        accessUntil: sellerProfile.subscription.currentPeriodEnd,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Reactivate subscription (undo cancellation before period ends)
router.post('/reactivate', authenticate, requireSeller, async (req, res, next) => {
  try {
    const sellerProfile = await prisma.sellerProfile.findUnique({
      where: { userId: req.user!.id },
      include: { subscription: true },
    });

    if (!sellerProfile?.subscription) {
      return res.status(404).json({
        success: false,
        error: { code: 'NO_SUBSCRIPTION', message: 'No subscription found' },
      });
    }

    if (
      sellerProfile.subscription.status !== 'ACTIVE' ||
      !sellerProfile.subscription.cancelAtPeriodEnd
    ) {
      return res.status(400).json({
        success: false,
        error: { code: 'NOT_CANCELLING', message: 'Subscription is not pending cancellation' },
      });
    }

    await prisma.sellerSubscription.update({
      where: { id: sellerProfile.subscription.id },
      data: {
        cancelAtPeriodEnd: false,
        cancelledAt: null,
        cancelReason: null,
      },
    });

    res.json({
      success: true,
      data: { message: 'Subscription reactivated' },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
