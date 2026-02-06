import { Router } from 'express';
import { authenticate } from '@/middleware/auth.js';
import { prisma } from '@/lib/prisma.js';
import { env } from '@/config/env.js';
import { calculateOrderFees } from '@zomieks/shared';
import { createPayFastPayment, createOzowPayment } from '@/services/payment.service.js';

const router = Router();

// Initiate payment for order
router.get('/initiate', authenticate, async (req, res, next) => {
  try {
    const { orderId, gateway } = req.query;

    if (!orderId || !gateway) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_PARAMS', message: 'orderId and gateway are required' },
      });
    }

    const order = await prisma.order.findFirst({
      where: { id: orderId as string, buyerId: req.user!.id, status: 'PENDING_PAYMENT' },
      include: {
        service: { select: { title: true } },
        buyer: { select: { email: true, firstName: true, lastName: true } },
      },
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Order not found or already paid' },
      });
    }

    let paymentUrl: string;

    if (gateway === 'PAYFAST') {
      paymentUrl = await createPayFastPayment({
        paymentId: order.id,
        amount: Number(order.totalAmount),
        itemName: order.service.title,
        email: order.buyer.email,
        firstName: order.buyer.firstName || 'Customer',
        lastName: order.buyer.lastName || '',
        returnUrl: `${env.APP_URL}/orders/${order.id}?payment=success`,
        cancelUrl: `${env.APP_URL}/orders/${order.id}?payment=cancelled`,
        notifyUrl: `${env.API_URL}/webhooks/payfast`,
      });
    } else if (gateway === 'OZOW') {
      paymentUrl = await createOzowPayment({
        transactionReference: order.id,
        amount: Number(order.totalAmount),
        bankReference: `Order ${order.orderNumber}`,
        customerEmail: order.buyer.email,
        successUrl: `${env.APP_URL}/orders/${order.id}?payment=success`,
        cancelUrl: `${env.APP_URL}/orders/${order.id}?payment=cancelled`,
        errorUrl: `${env.APP_URL}/orders/${order.id}?payment=failed`,
        notifyUrl: `${env.API_URL}/webhooks/ozow`,
      });
    } else {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_GATEWAY', message: 'Invalid payment gateway' },
      });
    }

    res.json({ success: true, data: { paymentUrl } });
  } catch (error) {
    next(error);
  }
});

// Initiate subscription payment
router.get('/initiate-subscription', authenticate, async (req, res, next) => {
  try {
    const { subscriptionId, gateway } = req.query;

    if (!subscriptionId || gateway !== 'PAYFAST') {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_PARAMS', message: 'Only PayFast supports subscriptions' },
      });
    }

    const subscription = await prisma.subscription.findFirst({
      where: { id: subscriptionId as string, buyerId: req.user!.id, status: 'PENDING' },
      include: {
        tier: true,
        service: { select: { title: true } },
        buyer: { select: { email: true, firstName: true, lastName: true } },
      },
    });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Subscription not found' },
      });
    }

    const { createPayFastSubscription } = await import('@/services/payment.service.js');
    const paymentUrl = await createPayFastSubscription({
      paymentId: subscription.id,
      subscriptionId: subscription.id,
      amount: Number(subscription.tier.price),
      itemName: `${subscription.service.title} - ${subscription.tier.name}`,
      email: subscription.buyer.email,
      firstName: subscription.buyer.firstName || 'Customer',
      lastName: subscription.buyer.lastName || '',
      frequency: subscription.tier.payFastFrequency,
      billingDate: new Date().getDate(),
      returnUrl: `${env.APP_URL}/subscriptions/${subscription.id}?payment=success`,
      cancelUrl: `${env.APP_URL}/subscriptions/${subscription.id}?payment=cancelled`,
      notifyUrl: `${env.API_URL}/webhooks/payfast/subscription`,
    });

    res.json({ success: true, data: { paymentUrl } });
  } catch (error) {
    next(error);
  }
});

// Get seller earnings
router.get('/earnings', authenticate, async (req, res, next) => {
  try {
    if (!req.user!.isSeller) {
      return res.status(403).json({
        success: false,
        error: { code: 'NOT_A_SELLER', message: 'Seller account required' },
      });
    }

    // Get earnings summary
    const [pendingEscrow, releasedEscrow, pendingPayouts, completedPayouts] = await Promise.all([
      prisma.escrowHold.aggregate({
        where: {
          transaction: { order: { sellerId: req.user!.id } },
          status: 'HELD',
        },
        _sum: { sellerAmount: true },
      }),
      prisma.escrowHold.aggregate({
        where: {
          transaction: { order: { sellerId: req.user!.id } },
          status: 'RELEASED',
        },
        _sum: { sellerAmount: true },
      }),
      prisma.sellerPayout.aggregate({
        where: { sellerId: req.user!.id, status: 'PENDING' },
        _sum: { amount: true },
      }),
      prisma.sellerPayout.aggregate({
        where: { sellerId: req.user!.id, status: 'COMPLETED' },
        _sum: { amount: true },
      }),
    ]);

    res.json({
      success: true,
      data: {
        pendingEscrow: pendingEscrow._sum.sellerAmount || 0,
        availableToWithdraw: pendingPayouts._sum.amount || 0,
        totalWithdrawn: completedPayouts._sum.amount || 0,
        totalEarned: releasedEscrow._sum.sellerAmount || 0,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Get payout history
router.get('/payouts', authenticate, async (req, res, next) => {
  try {
    if (!req.user!.isSeller) {
      return res.status(403).json({
        success: false,
        error: { code: 'NOT_A_SELLER', message: 'Seller account required' },
      });
    }

    const payouts = await prisma.sellerPayout.findMany({
      where: { sellerId: req.user!.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    res.json({ success: true, data: { payouts } });
  } catch (error) {
    next(error);
  }
});

export default router;
