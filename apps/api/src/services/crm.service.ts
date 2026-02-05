import { prisma } from '@/lib/prisma.js';
import { logger } from '@/lib/logger.js';
import { notificationQueue } from '@/lib/queue.js';

/**
 * Calculate lead score for a conversation based on activity and order history
 * Score range: 0-100
 */
export async function calculateLeadScore(conversationId: string): Promise<number> {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: {
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 50,
      },
      orders: true,
      buyer: true,
    },
  });

  if (!conversation) return 0;

  let score = 0;

  // Base activity score (max 30 points)
  const messageCount = conversation.messages.length;
  score += Math.min(messageCount * 2, 30);

  // Recency score (max 20 points)
  if (conversation.lastMessageAt) {
    const daysSinceLastMessage = Math.floor(
      (Date.now() - conversation.lastMessageAt.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysSinceLastMessage === 0) score += 20;
    else if (daysSinceLastMessage === 1) score += 15;
    else if (daysSinceLastMessage <= 3) score += 10;
    else if (daysSinceLastMessage <= 7) score += 5;
  }

  // Order history score (max 30 points)
  const completedOrders = conversation.orders.filter(o => o.status === 'COMPLETED').length;
  const totalOrderValue = conversation.orders
    .filter(o => o.status === 'COMPLETED')
    .reduce((sum, o) => sum + Number(o.totalAmount), 0);
  
  score += Math.min(completedOrders * 5, 15);
  if (totalOrderValue > 10000) score += 15;
  else if (totalOrderValue > 5000) score += 10;
  else if (totalOrderValue > 1000) score += 5;

  // Deal value indicator (max 20 points)
  if (conversation.dealValue) {
    const dealValue = Number(conversation.dealValue);
    if (dealValue > 10000) score += 20;
    else if (dealValue > 5000) score += 15;
    else if (dealValue > 1000) score += 10;
    else if (dealValue > 0) score += 5;
  }

  // Engagement signals
  const buyerMessageCount = conversation.messages.filter(m => m.senderId === conversation.buyerId).length;
  const buyerEngagementRatio = messageCount > 0 ? buyerMessageCount / messageCount : 0;
  if (buyerEngagementRatio > 0.4) score += 10;

  return Math.min(score, 100);
}

/**
 * Update lead score for a conversation and persist to DB
 */
export async function updateLeadScore(conversationId: string): Promise<number> {
  const score = await calculateLeadScore(conversationId);
  
  await prisma.conversation.update({
    where: { id: conversationId },
    data: { leadScore: score },
  });

  return score;
}

/**
 * Process auto-triggers for a given event
 */
export async function processAutoTriggers(
  sellerId: string,
  triggerType: 'NEW_CONVERSATION' | 'KEYWORD' | 'INACTIVITY' | 'STAGE_CHANGE' | 'SCHEDULED',
  context: {
    conversationId?: string;
    messageContent?: string;
    newStageId?: string;
    oldStageId?: string;
  }
): Promise<void> {
  const triggers = await prisma.autoTrigger.findMany({
    where: {
      userId: sellerId,
      isActive: true,
      triggerType,
    },
  });

  for (const trigger of triggers) {
    try {
      const conditions = trigger.conditions as Record<string, unknown>;
      const shouldFire = evaluateTriggerConditions(triggerType, conditions, context);

      if (!shouldFire) continue;

      // Delay execution if configured
      if (trigger.delayMinutes > 0) {
        // Schedule for later via queue
        await notificationQueue.add(
          'auto-trigger',
          {
            triggerId: trigger.id,
            context,
          },
          { delay: trigger.delayMinutes * 60 * 1000 }
        );
        logger.info(`Scheduled auto-trigger ${trigger.id} for ${trigger.delayMinutes} minutes`);
      } else {
        await executeAutoTrigger(trigger.id, context);
      }
    } catch (error) {
      logger.error(`Error processing auto-trigger ${trigger.id}:`, error);
    }
  }
}

/**
 * Evaluate if trigger conditions are met
 */
function evaluateTriggerConditions(
  triggerType: string,
  conditions: Record<string, unknown>,
  context: {
    conversationId?: string;
    messageContent?: string;
    newStageId?: string;
    oldStageId?: string;
  }
): boolean {
  switch (triggerType) {
    case 'NEW_CONVERSATION':
      return true; // Always fire on new conversation

    case 'KEYWORD': {
      const keywords = (conditions.keywords as string[]) || [];
      const content = (context.messageContent || '').toLowerCase();
      return keywords.some(kw => content.includes(kw.toLowerCase()));
    }

    case 'STAGE_CHANGE': {
      const targetStageId = conditions.stageId as string;
      return context.newStageId === targetStageId;
    }

    case 'INACTIVITY': {
      // This would be called by a scheduled job checking for inactive conversations
      return true;
    }

    case 'SCHEDULED':
      return true; // Scheduled triggers always fire when their time comes

    default:
      return false;
  }
}

/**
 * Execute an auto-trigger action
 */
export async function executeAutoTrigger(
  triggerId: string,
  context: { conversationId?: string; messageContent?: string; newStageId?: string; oldStageId?: string; }
): Promise<void> {
  const trigger = await prisma.autoTrigger.findUnique({
    where: { id: triggerId },
  });

  if (!trigger || !trigger.isActive) return;

  const actionPayload = trigger.actionPayload as Record<string, unknown>;

  switch (trigger.actionType) {
    case 'SEND_MESSAGE': {
      if (!context.conversationId) break;
      
      const messageContent = actionPayload.message as string;
      if (!messageContent) break;

      await prisma.message.create({
        data: {
          conversationId: context.conversationId,
          senderId: trigger.userId,
          content: messageContent,
          type: 'TEXT',
          isAutoResponse: true,
          triggeredBy: trigger.id,
        },
      });

      await prisma.conversation.update({
        where: { id: context.conversationId },
        data: { lastMessageAt: new Date() },
      });

      logger.info(`Auto-trigger ${triggerId} sent message to conversation ${context.conversationId}`);
      break;
    }

    case 'CHANGE_STAGE': {
      if (!context.conversationId) break;
      
      const newStageId = actionPayload.stageId as string;
      if (!newStageId) break;

      await prisma.conversation.update({
        where: { id: context.conversationId },
        data: { pipelineStageId: newStageId },
      });

      await prisma.activity.create({
        data: {
          conversationId: context.conversationId,
          userId: trigger.userId,
          action: 'STAGE_CHANGED',
          data: { stageId: newStageId, automated: true },
        },
      });

      logger.info(`Auto-trigger ${triggerId} changed stage for conversation ${context.conversationId}`);
      break;
    }

    case 'ADD_LABEL': {
      if (!context.conversationId) break;
      
      const labelId = actionPayload.labelId as string;
      if (!labelId) break;

      await prisma.conversationLabel.upsert({
        where: {
          conversationId_labelId: {
            conversationId: context.conversationId,
            labelId,
          },
        },
        create: {
          conversationId: context.conversationId,
          labelId,
        },
        update: {},
      });

      logger.info(`Auto-trigger ${triggerId} added label to conversation ${context.conversationId}`);
      break;
    }

    case 'NOTIFY': {
      const notifyUserId = actionPayload.userId as string || trigger.userId;
      const notifyMessage = actionPayload.message as string || 'Auto-trigger notification';

      await notificationQueue.add('notification', {
        userId: notifyUserId,
        type: 'AUTO_TRIGGER',
        title: 'CRM Alert',
        message: notifyMessage,
        data: { conversationId: context.conversationId, triggerId },
      });

      logger.info(`Auto-trigger ${triggerId} sent notification`);
      break;
    }
  }
}

/**
 * Check for inactive conversations and fire inactivity triggers
 * Should be called by a cron job
 */
export async function checkInactiveConversations(): Promise<void> {
  // Get all sellers with active inactivity triggers
  const triggers = await prisma.autoTrigger.findMany({
    where: {
      triggerType: 'INACTIVITY',
      isActive: true,
    },
  });

  for (const trigger of triggers) {
    const conditions = trigger.conditions as Record<string, unknown>;
    const inactiveHours = (conditions.inactiveHours as number) || 24;
    const cutoffTime = new Date(Date.now() - inactiveHours * 60 * 60 * 1000);

    const inactiveConversations = await prisma.conversation.findMany({
      where: {
        sellerId: trigger.userId,
        status: 'OPEN',
        lastMessageAt: { lt: cutoffTime },
        // Don't fire trigger multiple times - check for recent auto-responses
        messages: {
          none: {
            isAutoResponse: true,
            triggeredBy: trigger.id,
            createdAt: { gt: cutoffTime },
          },
        },
      },
    });

    for (const conversation of inactiveConversations) {
      await executeAutoTrigger(trigger.id, { conversationId: conversation.id });
    }
  }
}
