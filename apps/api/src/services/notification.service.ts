import { prisma } from '@/lib/prisma.js';
import { notificationQueue, emailQueue } from '@/lib/queue.js';
import { io } from '@/index.js';

interface NotificationParams {
  userId: string;
  type: string;
  title: string;
  message: string;
  data?: Record<string, any>;
  sendEmail?: boolean;
}

// Send notification
export async function sendNotification(params: NotificationParams): Promise<void> {
  const { userId, type, title, message, data, sendEmail = true } = params;

  // Create in database
  const notification = await prisma.notification.create({
    data: {
      userId,
      type,
      title,
      message,
      data: data || {},
    },
  });

  // Send real-time via Socket.io
  io?.to(`user:${userId}`).emit('notification', {
    id: notification.id,
    type,
    title,
    message,
    data,
    createdAt: notification.createdAt,
  });

  // Queue email notification
  if (sendEmail) {
    await emailQueue.add(
      'send-notification-email',
      { notificationId: notification.id },
      { delay: 60000 } // 1 minute delay to batch
    );
  }
}

// Send to multiple users (capped at 5000 per call to prevent queue overload)
export async function sendBulkNotifications(
  userIds: string[],
  notification: Omit<NotificationParams, 'userId'>
): Promise<void> {
  const MAX_BATCH_SIZE = 5000;
  if (userIds.length > MAX_BATCH_SIZE) {
    const { logger } = await import('@/lib/logger.js');
    logger.warn(`sendBulkNotifications: truncated ${userIds.length} userIds to ${MAX_BATCH_SIZE}`);
  }
  const batch = userIds.slice(0, MAX_BATCH_SIZE);

  await notificationQueue.add('bulk-notify', {
    userIds: batch,
    notification,
  });
}

// Mark as read
export async function markNotificationsRead(userId: string, notificationIds?: string[]): Promise<void> {
  const where: any = { userId, readAt: null };
  if (notificationIds?.length) {
    where.id = { in: notificationIds };
  }

  await prisma.notification.updateMany({
    where,
    data: { readAt: new Date() },
  });
}

// Get unread count
export async function getUnreadCount(userId: string): Promise<number> {
  return prisma.notification.count({
    where: { userId, readAt: null },
  });
}
