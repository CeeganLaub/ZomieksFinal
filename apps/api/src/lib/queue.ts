import { Queue, Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import { env } from '@/config/env.js';
import { logger } from '@/lib/logger.js';

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
    const { escrowId, transactionId, subscriptionPaymentId } = job.data;
    logger.info(`Processing escrow release: ${escrowId}`);
    
    // Import here to avoid circular dependencies
    const { processEscrowRelease } = await import('@/services/escrow.service.js');
    return processEscrowRelease(escrowId, transactionId, subscriptionPaymentId);
  },
  connection
);

// Notification worker
export const notificationWorker = new Worker(
  'notifications',
  async (job: Job) => {
    const { userId, type, title, message, data } = job.data;
    logger.info(`Sending notification to ${userId}: ${type}`);
    
    const { sendNotification } = await import('@/services/notification.service.js');
    return sendNotification(userId, type, title, message, data);
  },
  connection
);

// Payout worker
export const payoutWorker = new Worker(
  'payouts',
  async (job: Job) => {
    const { payoutId } = job.data;
    logger.info(`Processing payout: ${payoutId}`);
    
    const { processPayout } = await import('@/services/payout.service.js');
    return processPayout(payoutId);
  },
  connection
);

// Error handling for all workers
[escrowReleaseWorker, notificationWorker, payoutWorker].forEach((worker) => {
  worker.on('failed', (job, err) => {
    logger.error(`Job ${job?.id} failed:`, err);
  });

  worker.on('completed', (job) => {
    logger.info(`Job ${job.id} completed`);
  });
});

logger.info('BullMQ workers initialized');
