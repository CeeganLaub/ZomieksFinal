import { Queue, Worker, Job } from 'bullmq';
import { Redis } from 'ioredis';
import { env } from '@/config/env.js';
import { logger } from '@/lib/logger.js';
import { prisma } from '@/lib/prisma.js';

// BullMQ requires maxRetriesPerRequest: null
const bullmqConnection = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
});

const connection = { connection: bullmqConnection };

// Queue definitions
export const escrowReleaseQueue = new Queue('escrow-release', connection);
export const notificationQueue = new Queue('notifications', connection);
export const subscriptionQueue = new Queue('subscriptions', connection);
export const payoutQueue = new Queue('payouts', connection);
export const emailQueue = new Queue('emails', connection);

// Escrow release worker
export const escrowReleaseWorker = new Worker(
  'escrow-release',
  async (job: Job) => {
    // Course escrow release
    if (job.name === 'course-auto-release') {
      const { enrollmentId } = job.data;
      logger.info(`Processing course escrow release for enrollment: ${enrollmentId}`);
      const { releaseCourseEscrow } = await import('@/services/escrow.service.js');
      return releaseCourseEscrow(enrollmentId);
    }

    // Service order escrow release
    const { orderId } = job.data;
    logger.info(`Processing escrow release for order: ${orderId}`);
    
    // Import here to avoid circular dependencies
    const { releaseOrderEscrow } = await import('@/services/escrow.service.js');
    return releaseOrderEscrow(orderId);
  },
  connection
);

// Notification worker
export const notificationWorker = new Worker(
  'notifications',
  async (job: Job) => {
    // Handle CRM inactivity checks
    if (job.name === 'crm-inactivity-check') {
      logger.info('Running CRM inactivity check');
      const { checkInactiveConversations } = await import('@/services/crm.service.js');
      await checkInactiveConversations();
      return { checked: true };
    }
    
    // Handle auto-trigger execution
    if (job.name === 'auto-trigger') {
      const { triggerId, context } = job.data;
      logger.info(`Executing delayed auto-trigger: ${triggerId}`);
      const { executeAutoTrigger } = await import('@/services/crm.service.js');
      await executeAutoTrigger(triggerId, context);
      return { executed: true, triggerId };
    }
    
    // Standard notification
    const { userId, type, title, message, data } = job.data;
    logger.info(`Sending notification to ${userId}: ${type}`);
    
    const { sendNotification } = await import('@/services/notification.service.js');
    return sendNotification({ userId, type, title, message, data });
  },
  connection
);

// Payout worker
export const payoutWorker = new Worker(
  'payouts',
  async (job: Job) => {
    logger.info(`Processing payouts batch`);
    
    const { processWeeklyPayouts } = await import('@/services/payout.service.js');
    return processWeeklyPayouts();
  },
  connection
);

// Subscription worker - handles subscription lifecycle events
export const subscriptionWorker = new Worker(
  'subscriptions',
  async (job: Job) => {
    const { type, subscriptionId, userId } = job.data;
    logger.info(`Processing subscription job: ${type} for ${subscriptionId}`);
    
    switch (type) {
      case 'RENEWAL_REMINDER': {
        // Send reminder 3 days before renewal
        const subscription = await prisma.subscription.findUnique({
          where: { id: subscriptionId },
          include: { tier: { include: { service: true } }, buyer: true }
        });
        
        if (subscription && subscription.status === 'ACTIVE') {
          await notificationQueue.add('notification', {
            userId: subscription.buyerId,
            type: 'SUBSCRIPTION_RENEWAL',
            title: 'Subscription Renewal Reminder',
            message: `Your subscription to "${subscription.tier.service.title}" will renew in 3 days.`,
            data: { subscriptionId }
          });
        }
        break;
      }
      
      case 'CANCEL_AT_PERIOD_END': {
        // Cancel subscription when period ends
        const subscription = await prisma.subscription.findUnique({
          where: { id: subscriptionId }
        });
        
        if (subscription && subscription.cancelAtPeriodEnd) {
          await prisma.subscription.update({
            where: { id: subscriptionId },
            data: { 
              status: 'CANCELLED',
              cancelledAt: new Date()
            }
          });
          
          await notificationQueue.add('notification', {
            userId: subscription.buyerId,
            type: 'SUBSCRIPTION_CANCELLED',
            title: 'Subscription Cancelled',
            message: 'Your subscription has been cancelled as requested.',
            data: { subscriptionId }
          });
        }
        break;
      }
      
      case 'PAYMENT_FAILED_FOLLOWUP': {
        // Follow up on failed payment
        const subscription = await prisma.subscription.findUnique({
          where: { id: subscriptionId },
          include: { tier: { include: { service: true } } }
        });
        
        if (subscription && subscription.status === 'PAST_DUE') {
          await notificationQueue.add('notification', {
            userId: subscription.buyerId,
            type: 'PAYMENT_FAILED',
            title: 'Payment Failed - Action Required',
            message: `Your payment for "${subscription.tier.service.title}" subscription has failed. Please update your payment method.`,
            data: { subscriptionId }
          });
        }
        break;
      }
      
      default:
        logger.warn(`Unknown subscription job type: ${type}`);
    }
    
    return { processed: true, type, subscriptionId };
  },
  connection
);

// Error handling for all workers
[escrowReleaseWorker, notificationWorker, payoutWorker, subscriptionWorker].forEach((worker) => {
  worker.on('failed', (job, err) => {
    logger.error(`Job ${job?.id} failed:`, err);
  });

  worker.on('completed', (job) => {
    logger.info(`Job ${job.id} completed`);
  });
});

logger.info('BullMQ workers initialized');
