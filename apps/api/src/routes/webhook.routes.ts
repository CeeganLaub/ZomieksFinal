import { Router } from 'express';
import { prisma } from '@/lib/prisma.js';
import { env } from '@/config/env.js';
import { validatePayFastSignature, PAYFAST_IPS, validateOzowHash } from '@/services/payment.service.js';
import { processEscrowHold } from '@/services/escrow.service.js';
import { sendNotification } from '@/services/notification.service.js';
import { calculateOrderFees } from '@zomieks/shared';
import { logger } from '@/lib/logger.js';

const router = Router();

// PayFast ITN (Instant Transaction Notification)
router.post('/payfast', async (req, res) => {
  try {
    // Verify source IP in production
    if (!env.PAYFAST_SANDBOX) {
      const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
      const ip = Array.isArray(clientIp) ? clientIp[0] : clientIp?.split(',')[0];
      
      if (!ip || !PAYFAST_IPS.includes(ip.trim())) {
        logger.error('PayFast webhook: Invalid source IP', ip);
        return res.status(403).send('Invalid source');
      }
    }

    const data = req.body;

    // Validate signature
    if (!validatePayFastSignature({ ...data }, env.PAYFAST_PASSPHRASE)) {
      logger.error('PayFast webhook: Invalid signature');
      return res.status(400).send('Invalid signature');
    }

    const paymentId = data.m_payment_id;
    const paymentStatus = data.payment_status;
    const grossAmount = parseFloat(data.amount_gross);
    const feeAmount = parseFloat(data.amount_fee);
    const netAmount = parseFloat(data.amount_net);
    const pfPaymentId = data.pf_payment_id;

    // Check if this is an order or subscription
    const order = await prisma.order.findUnique({ where: { id: paymentId } });
    
    if (order) {
      // Idempotency guard: skip if already processed
      if (order.status !== 'PENDING_PAYMENT') {
        logger.info(`PayFast webhook: Order ${order.id} already processed (status: ${order.status})`);
        return res.status(200).send('OK');
      }

      // Verify payment amount matches order total
      if (Math.abs(grossAmount - Number(order.totalAmount)) > 0.01) {
        logger.error(`PayFast webhook: Amount mismatch for order ${order.id}. Expected ${order.totalAmount}, received ${grossAmount}`);
        return res.status(400).send('Amount mismatch');
      }

      // Handle order payment
      if (paymentStatus === 'COMPLETE') {
        await prisma.$transaction(async (tx) => {
          // Update order status
          await tx.order.update({
            where: { id: order.id },
            data: { status: 'IN_PROGRESS', paidAt: new Date() },
          });

          // Create transaction record
          const transaction = await tx.transaction.create({
            data: {
              orderId: order.id,
              gateway: 'PAYFAST',
              gatewayTransactionId: pfPaymentId,
              gatewayReference: pfPaymentId,
              status: 'COMPLETED',
              amount: order.baseAmount,
              buyerFee: order.buyerFee,
              totalAmount: order.totalAmount,
              sellerFee: order.sellerFee,
              sellerPayout: order.sellerPayout,
              platformRevenue: order.platformRevenue,
              paidAt: new Date(),
              gatewayData: data,
            },
          });

          // Create escrow hold
          await processEscrowHold(tx, transaction.id, order);

          // Notify seller
          await sendNotification({
            userId: order.sellerId,
            type: 'ORDER_PLACED',
            title: 'New Order',
            message: `You have a new order #${order.orderNumber}`,
            data: { orderId: order.id },
          });
        });

        // Create conversation and system message now that payment is confirmed
        const conversation = await prisma.conversation.upsert({
          where: {
            buyerId_sellerId: {
              buyerId: order.buyerId,
              sellerId: order.sellerId,
            },
          },
          create: {
            buyerId: order.buyerId,
            sellerId: order.sellerId,
            orderId: order.id,
          },
          update: {
            orderId: order.id,
          },
        });

        await prisma.message.create({
          data: {
            conversationId: conversation.id,
            senderId: order.buyerId,
            content: `📦 Order #${order.orderNumber} has been placed and paid. Work can begin!`,
            type: 'ORDER_UPDATE',
            deliveredAt: new Date(),
          },
        });

        await prisma.conversation.update({
          where: { id: conversation.id },
          data: {
            lastMessageAt: new Date(),
            unreadSellerCount: { increment: 1 },
          },
        });
      } else if (paymentStatus === 'CANCELLED' || paymentStatus === 'FAILED') {
        await prisma.order.update({
          where: { id: order.id },
          data: { status: 'CANCELLED' },
        });
      }
    }

    res.status(200).send('OK');
  } catch (error) {
    logger.error('PayFast webhook error:', error);
    res.status(500).send('Error');
  }
});

// PayFast subscription ITN
router.post('/payfast/subscription', async (req, res) => {
  try {
    // Verify source IP in production
    if (!env.PAYFAST_SANDBOX) {
      const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
      const ip = Array.isArray(clientIp) ? clientIp[0] : clientIp?.split(',')[0];
      
      if (!ip || !PAYFAST_IPS.includes(ip.trim())) {
        return res.status(403).send('Invalid source');
      }
    }

    const data = req.body;

    if (!validatePayFastSignature({ ...data }, env.PAYFAST_PASSPHRASE)) {
      return res.status(400).send('Invalid signature');
    }

    const subscriptionId = data.m_payment_id;
    const token = data.token;
    const paymentStatus = data.payment_status;
    const grossAmount = parseFloat(data.amount_gross);
    const pfPaymentId = data.pf_payment_id;

    const subscription = await prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: { tier: true, service: { select: { sellerId: true, title: true } } },
    });

    if (!subscription) {
      return res.status(404).send('Subscription not found');
    }

    if (paymentStatus === 'COMPLETE') {
      // Store token for future cancellations
      if (token && !subscription.payFastToken) {
        await prisma.subscription.update({
          where: { id: subscription.id },
          data: { payFastToken: token },
        });
      }

      // Record payment
      const fees = calculateOrderFees(grossAmount);
      await prisma.subscriptionPayment.create({
        data: {
          subscriptionId: subscription.id,
          amount: fees.baseAmount,
          buyerFee: fees.buyerFee,
          totalAmount: fees.totalAmount,
          sellerFee: fees.sellerFee,
          sellerPayout: fees.sellerPayout,
          platformRevenue: fees.platformRevenue,
          gateway: 'PAYFAST',
          gatewayPaymentId: pfPaymentId,
          periodStart: subscription.currentPeriodStart,
          periodEnd: subscription.currentPeriodEnd,
          paidAt: new Date(),
        },
      });

      // Update subscription status if first payment
      if (subscription.status === 'PENDING') {
        await prisma.subscription.update({
          where: { id: subscription.id },
          data: { status: 'ACTIVE' },
        });

        // Create conversation between buyer and seller
        const conversation = await prisma.conversation.upsert({
          where: {
            buyerId_sellerId: {
              buyerId: subscription.buyerId,
              sellerId: subscription.service.sellerId,
            },
          },
          create: {
            buyerId: subscription.buyerId,
            sellerId: subscription.service.sellerId,
          },
          update: {},
        });

        await prisma.message.create({
          data: {
            conversationId: conversation.id,
            senderId: subscription.buyerId,
            content: `📦 Subscription started for "${subscription.service.title}" — ${subscription.tier.name} plan. Work can begin!`,
            type: 'ORDER_UPDATE',
            deliveredAt: new Date(),
          },
        });

        await prisma.conversation.update({
          where: { id: conversation.id },
          data: {
            lastMessageAt: new Date(),
            unreadSellerCount: { increment: 1 },
          },
        });

        await sendNotification({
          userId: subscription.buyerId,
          type: 'SUBSCRIPTION_STARTED',
          title: 'Subscription Started',
          message: 'Your subscription is now active',
          data: { subscriptionId: subscription.id },
        });
      } else {
        // Renewal payment - extend period
        const newPeriodEnd = new Date(subscription.currentPeriodEnd);
        switch (subscription.tier.interval) {
          case 'MONTHLY':
            newPeriodEnd.setMonth(newPeriodEnd.getMonth() + 1);
            break;
          case 'QUARTERLY':
            newPeriodEnd.setMonth(newPeriodEnd.getMonth() + 3);
            break;
          case 'YEARLY':
            newPeriodEnd.setFullYear(newPeriodEnd.getFullYear() + 1);
            break;
        }

        await prisma.subscription.update({
          where: { id: subscription.id },
          data: {
            currentPeriodEnd: newPeriodEnd,
            nextBillingDate: newPeriodEnd,
          },
        });
      }
    } else if (paymentStatus === 'CANCELLED') {
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: { status: 'CANCELLED', cancelledAt: new Date() },
      });
    }

    res.status(200).send('OK');
  } catch (error) {
    logger.error('PayFast subscription webhook error:', error);
    res.status(500).send('Error');
  }
});

// PayFast seller subscription ITN (Zomieks Pro R399/month)
router.post('/payfast/seller-subscription', async (req, res) => {
  try {
    // Verify source IP in production
    if (!env.PAYFAST_SANDBOX) {
      const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
      const ip = Array.isArray(clientIp) ? clientIp[0] : clientIp?.split(',')[0];
      
      if (!ip || !PAYFAST_IPS.includes(ip.trim())) {
        logger.error('PayFast seller-sub webhook: Invalid source IP', ip);
        return res.status(403).send('Invalid source');
      }
    }

    const data = req.body;

    if (!validatePayFastSignature({ ...data }, env.PAYFAST_PASSPHRASE)) {
      logger.error('PayFast seller-sub webhook: Invalid signature');
      return res.status(400).send('Invalid signature');
    }

    const subscriptionId = data.m_payment_id;
    const token = data.token;
    const paymentStatus = data.payment_status;
    const grossAmount = parseFloat(data.amount_gross);
    const pfPaymentId = data.pf_payment_id;

    const subscription = await prisma.sellerSubscription.findUnique({
      where: { id: subscriptionId },
      include: { sellerProfile: true },
    });

    if (!subscription) {
      logger.error('PayFast seller-sub webhook: Subscription not found', subscriptionId);
      return res.status(404).send('Subscription not found');
    }

    if (paymentStatus === 'COMPLETE') {
      // Store PayFast token on first payment
      if (token && !subscription.payFastToken) {
        await prisma.sellerSubscription.update({
          where: { id: subscription.id },
          data: {
            payFastToken: token,
            payFastSubscriptionId: token,
          },
        });
      }

      // Record payment
      await prisma.sellerSubscriptionPayment.create({
        data: {
          sellerSubscriptionId: subscription.id,
          amount: grossAmount,
          gateway: 'PAYFAST',
          gatewayPaymentId: pfPaymentId,
          periodStart: subscription.currentPeriodStart,
          periodEnd: subscription.currentPeriodEnd,
          paidAt: new Date(),
        },
      });

      if (subscription.status === 'PENDING' || subscription.status === 'EXPIRED' || subscription.status === 'PAST_DUE') {
        // First payment or reactivation — activate
        await prisma.sellerSubscription.update({
          where: { id: subscription.id },
          data: { status: 'ACTIVE' },
        });

        // Also mark legacy field for backward compatibility
        await prisma.sellerProfile.update({
          where: { id: subscription.sellerProfileId },
          data: { sellerFeePaid: true, sellerFeePaidAt: new Date() },
        });

        await sendNotification({
          userId: subscription.sellerProfile.userId,
          type: 'SUBSCRIPTION_STARTED',
          title: 'Zomieks Pro Activated',
          message: 'Your Zomieks Pro subscription is now active. You can sell services, courses, and customise your BioLink!',
          data: { subscriptionId: subscription.id },
        });
      } else if (subscription.status === 'ACTIVE') {
        // Renewal — extend period by 1 month
        const newPeriodStart = new Date(subscription.currentPeriodEnd);
        const newPeriodEnd = new Date(subscription.currentPeriodEnd);
        newPeriodEnd.setMonth(newPeriodEnd.getMonth() + 1);

        await prisma.sellerSubscription.update({
          where: { id: subscription.id },
          data: {
            currentPeriodStart: newPeriodStart,
            currentPeriodEnd: newPeriodEnd,
            nextBillingDate: newPeriodEnd,
            // If was set to cancel, check and enforce
            ...(subscription.cancelAtPeriodEnd
              ? { status: 'CANCELLED', cancelledAt: new Date() }
              : {}),
          },
        });
      }
    } else if (paymentStatus === 'CANCELLED') {
      await prisma.sellerSubscription.update({
        where: { id: subscription.id },
        data: { status: 'CANCELLED', cancelledAt: new Date() },
      });

      await sendNotification({
        userId: subscription.sellerProfile.userId,
        type: 'SUBSCRIPTION_CANCELLED',
        title: 'Subscription Cancelled',
        message: 'Your Zomieks Pro subscription has been cancelled.',
        data: { subscriptionId: subscription.id },
      });
    } else if (paymentStatus === 'FAILED') {
      await prisma.sellerSubscription.update({
        where: { id: subscription.id },
        data: { status: 'PAST_DUE' },
      });
    }

    res.status(200).send('OK');
  } catch (error) {
    logger.error('PayFast seller subscription webhook error:', error);
    res.status(500).send('Error');
  }
});

// OZOW webhook
router.post('/ozow', async (req, res) => {
  try {
    const data = req.body;

    // Validate hash
    if (!validateOzowHash(data)) {
      logger.error('OZOW webhook: Invalid hash');
      return res.status(400).json({ error: 'Invalid hash' });
    }

    const transactionReference = data.TransactionReference;
    const status = data.Status;
    const amount = parseFloat(data.Amount);
    const transactionId = data.TransactionId;

    const order = await prisma.order.findUnique({ where: { id: transactionReference } });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Idempotency guard: skip if already processed
    if (order.status !== 'PENDING_PAYMENT') {
      logger.info(`OZOW webhook: Order ${order.id} already processed (status: ${order.status})`);
      return res.status(200).json({ success: true });
    }

    // Verify payment amount matches order total
    if (Math.abs(amount - Number(order.totalAmount)) > 0.01) {
      logger.error(`OZOW webhook: Amount mismatch for order ${order.id}. Expected ${order.totalAmount}, received ${amount}`);
      return res.status(400).json({ error: 'Amount mismatch' });
    }

    if (status === 'Complete') {
      await prisma.$transaction(async (tx) => {
        await tx.order.update({
          where: { id: order.id },
          data: { status: 'IN_PROGRESS', paidAt: new Date() },
        });

        const transaction = await tx.transaction.create({
          data: {
            orderId: order.id,
            gateway: 'OZOW',
            gatewayTransactionId: transactionId,
            gatewayReference: transactionId,
            status: 'COMPLETED',
            amount: order.baseAmount,
            buyerFee: order.buyerFee,
            totalAmount: order.totalAmount,
            sellerFee: order.sellerFee,
            sellerPayout: order.sellerPayout,
            platformRevenue: order.platformRevenue,
            paidAt: new Date(),
            gatewayData: data,
          },
        });

        await processEscrowHold(tx, transaction.id, order);

        await sendNotification({
          userId: order.sellerId,
          type: 'ORDER_PLACED',
          title: 'New Order',
          message: `You have a new order #${order.orderNumber}`,
          data: { orderId: order.id },
        });
      });

      // Create conversation and system message now that payment is confirmed
      const conversation = await prisma.conversation.upsert({
        where: {
          buyerId_sellerId: {
            buyerId: order.buyerId,
            sellerId: order.sellerId,
          },
        },
        create: {
          buyerId: order.buyerId,
          sellerId: order.sellerId,
          orderId: order.id,
        },
        update: {
          orderId: order.id,
        },
      });

      await prisma.message.create({
        data: {
          conversationId: conversation.id,
          senderId: order.buyerId,
          content: `📦 Order #${order.orderNumber} has been placed and paid. Work can begin!`,
          type: 'ORDER_UPDATE',
          deliveredAt: new Date(),
        },
      });

      await prisma.conversation.update({
        where: { id: conversation.id },
        data: {
          lastMessageAt: new Date(),
          unreadSellerCount: { increment: 1 },
        },
      });
    } else if (status === 'Cancelled' || status === 'Error' || status === 'Abandoned') {
      await prisma.order.update({
        where: { id: order.id },
        data: { status: 'CANCELLED' },
      });
    }

    res.status(200).json({ success: true });
  } catch (error) {
    logger.error('OZOW webhook error:', error);
    res.status(500).json({ error: 'Error' });
  }
});

export default router;
