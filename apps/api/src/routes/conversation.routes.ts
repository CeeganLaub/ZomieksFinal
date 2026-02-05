import { Router } from 'express';
import { authenticate, requireSeller } from '@/middleware/auth.js';
import { prisma } from '@/lib/prisma.js';
import { validate } from '@/middleware/validate.js';
import { 
  sendMessageSchema, 
  createConversationSchema,
  updateConversationSchema,
  createPipelineStageSchema,
  createLabelSchema,
  createSavedReplySchema,
  createAutoTriggerSchema,
  createNoteSchema,
} from '@kiekz/shared';

const router = Router();

// Get conversations
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { status, pipelineStageId, labelId, page = '1', limit = '20' } = req.query;

    const isSeller = req.user!.isSeller;
    const where: any = isSeller
      ? { sellerId: req.user!.id }
      : { buyerId: req.user!.id };

    if (status) where.status = status;
    if (pipelineStageId) where.pipelineStageId = pipelineStageId;
    if (labelId) where.labels = { some: { labelId: labelId as string } };

    const [conversations, total] = await Promise.all([
      prisma.conversation.findMany({
        where,
        orderBy: { lastMessageAt: 'desc' },
        skip: (parseInt(page as string) - 1) * parseInt(limit as string),
        take: parseInt(limit as string),
        include: {
          buyer: {
            select: { id: true, username: true, firstName: true, lastName: true, avatar: true },
          },
          seller: {
            select: { id: true, username: true, firstName: true, lastName: true, avatar: true },
          },
          pipelineStage: { select: { id: true, name: true, color: true } },
          labels: {
            include: { label: { select: { id: true, name: true, color: true } } },
          },
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: { content: true, type: true, createdAt: true, senderId: true },
          },
          order: { select: { id: true, orderNumber: true, status: true } },
        },
      }),
      prisma.conversation.count({ where }),
    ]);

    res.json({
      success: true,
      data: { conversations },
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

// Get single conversation with messages
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: req.params.id,
        OR: [
          { buyerId: req.user!.id },
          { sellerId: req.user!.id },
        ],
      },
      include: {
        buyer: {
          select: { id: true, username: true, firstName: true, lastName: true, avatar: true, country: true },
        },
        seller: {
          select: { 
            id: true, 
            username: true, 
            firstName: true, 
            lastName: true, 
            avatar: true,
            sellerProfile: { select: { displayName: true, rating: true, responseTimeMinutes: true } },
          },
        },
        pipelineStage: true,
        labels: { include: { label: true } },
        notes: {
          orderBy: { createdAt: 'desc' },
          include: { user: { select: { firstName: true } } },
        },
        order: true,
        activities: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Conversation not found' },
      });
    }

    // Get messages separately with pagination
    const messages = await prisma.message.findMany({
      where: { conversationId: req.params.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        sender: {
          select: { id: true, username: true, firstName: true, avatar: true },
        },
      },
    });

    // Mark as read
    const unreadField = conversation.buyerId === req.user!.id ? 'unreadBuyerCount' : 'unreadSellerCount';
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { [unreadField]: 0 },
    });

    res.json({
      success: true,
      data: { conversation, messages: messages.reverse() },
    });
  } catch (error) {
    next(error);
  }
});

// Start new conversation
router.post(
  '/',
  authenticate,
  validate(createConversationSchema),
  async (req, res, next) => {
    try {
      const { recipientId, initialMessage, serviceId } = req.body;

      // Get recipient
      const recipient = await prisma.user.findUnique({
        where: { id: recipientId },
        select: { id: true, isSeller: true },
      });

      if (!recipient) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'User not found' },
        });
      }

      // Determine buyer/seller based on who is seller
      const buyerId = recipient.isSeller ? req.user!.id : recipientId;
      const sellerId = recipient.isSeller ? recipientId : req.user!.id;

      // Create or find existing conversation
      let conversation = await prisma.conversation.findUnique({
        where: { buyerId_sellerId: { buyerId, sellerId } },
      });

      if (!conversation) {
        // Get default pipeline stage for seller
        const defaultStage = await prisma.pipelineStage.findFirst({
          where: { userId: sellerId, isDefault: true },
        });

        conversation = await prisma.conversation.create({
          data: {
            buyerId,
            sellerId,
            pipelineStageId: defaultStage?.id,
            source: serviceId ? 'service' : 'direct',
          },
        });
      }

      // Create initial message
      const message = await prisma.message.create({
        data: {
          conversationId: conversation.id,
          senderId: req.user!.id,
          content: initialMessage,
          type: 'TEXT',
          deliveredAt: new Date(),
        },
        include: {
          sender: { select: { id: true, username: true, firstName: true, avatar: true } },
        },
      });

      // Update conversation
      const unreadField = buyerId === req.user!.id ? 'unreadSellerCount' : 'unreadBuyerCount';
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: {
          lastMessageAt: new Date(),
          [unreadField]: { increment: 1 },
        },
      });

      res.status(201).json({
        success: true,
        data: { conversation, message },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Update conversation (CRM fields - seller only)
router.patch(
  '/:id',
  authenticate,
  requireSeller,
  validate(updateConversationSchema),
  async (req, res, next) => {
    try {
      const conversation = await prisma.conversation.findFirst({
        where: { id: req.params.id, sellerId: req.user!.id },
      });

      if (!conversation) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Conversation not found' },
        });
      }

      const { labelIds, ...updateData } = req.body;

      // Update labels if provided
      if (labelIds) {
        await prisma.$transaction([
          prisma.conversationLabel.deleteMany({
            where: { conversationId: conversation.id },
          }),
          prisma.conversationLabel.createMany({
            data: labelIds.map((labelId: string) => ({
              conversationId: conversation.id,
              labelId,
            })),
          }),
        ]);
      }

      const updated = await prisma.conversation.update({
        where: { id: conversation.id },
        data: updateData,
        include: {
          pipelineStage: true,
          labels: { include: { label: true } },
        },
      });

      // Log activity
      await prisma.activity.create({
        data: {
          conversationId: conversation.id,
          action: 'conversation_updated',
          data: req.body,
          performedBy: req.user!.id,
        },
      });

      res.json({ success: true, data: { conversation: updated } });
    } catch (error) {
      next(error);
    }
  }
);

// === CRM ENDPOINTS (Seller) ===

// Pipeline stages
router.get('/crm/pipeline-stages', authenticate, requireSeller, async (req, res, next) => {
  try {
    const stages = await prisma.pipelineStage.findMany({
      where: { userId: req.user!.id },
      orderBy: { order: 'asc' },
      include: {
        _count: { select: { conversations: true } },
      },
    });

    res.json({ success: true, data: { stages } });
  } catch (error) {
    next(error);
  }
});

router.post(
  '/crm/pipeline-stages',
  authenticate,
  requireSeller,
  validate(createPipelineStageSchema),
  async (req, res, next) => {
    try {
      const stage = await prisma.pipelineStage.create({
        data: {
          userId: req.user!.id,
          ...req.body,
        },
      });

      res.status(201).json({ success: true, data: { stage } });
    } catch (error) {
      next(error);
    }
  }
);

// Labels
router.get('/crm/labels', authenticate, requireSeller, async (req, res, next) => {
  try {
    const labels = await prisma.label.findMany({
      where: { userId: req.user!.id },
      include: {
        _count: { select: { conversations: true } },
      },
    });

    res.json({ success: true, data: { labels } });
  } catch (error) {
    next(error);
  }
});

router.post(
  '/crm/labels',
  authenticate,
  requireSeller,
  validate(createLabelSchema),
  async (req, res, next) => {
    try {
      const label = await prisma.label.create({
        data: {
          userId: req.user!.id,
          ...req.body,
        },
      });

      res.status(201).json({ success: true, data: { label } });
    } catch (error) {
      next(error);
    }
  }
);

// Saved replies
router.get('/crm/saved-replies', authenticate, requireSeller, async (req, res, next) => {
  try {
    const replies = await prisma.savedReply.findMany({
      where: { userId: req.user!.id },
      orderBy: { usageCount: 'desc' },
    });

    res.json({ success: true, data: { replies } });
  } catch (error) {
    next(error);
  }
});

router.post(
  '/crm/saved-replies',
  authenticate,
  requireSeller,
  validate(createSavedReplySchema),
  async (req, res, next) => {
    try {
      const reply = await prisma.savedReply.create({
        data: {
          userId: req.user!.id,
          ...req.body,
        },
      });

      res.status(201).json({ success: true, data: { reply } });
    } catch (error) {
      next(error);
    }
  }
);

// Auto-triggers
router.get('/crm/auto-triggers', authenticate, requireSeller, async (req, res, next) => {
  try {
    const triggers = await prisma.autoTrigger.findMany({
      where: { userId: req.user!.id },
    });

    res.json({ success: true, data: { triggers } });
  } catch (error) {
    next(error);
  }
});

router.post(
  '/crm/auto-triggers',
  authenticate,
  requireSeller,
  validate(createAutoTriggerSchema),
  async (req, res, next) => {
    try {
      const trigger = await prisma.autoTrigger.create({
        data: {
          userId: req.user!.id,
          ...req.body,
        },
      });

      res.status(201).json({ success: true, data: { trigger } });
    } catch (error) {
      next(error);
    }
  }
);

// Notes
router.post(
  '/:id/notes',
  authenticate,
  requireSeller,
  validate(createNoteSchema),
  async (req, res, next) => {
    try {
      const conversation = await prisma.conversation.findFirst({
        where: { id: req.params.id, sellerId: req.user!.id },
      });

      if (!conversation) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Conversation not found' },
        });
      }

      const note = await prisma.conversationNote.create({
        data: {
          conversationId: conversation.id,
          userId: req.user!.id,
          content: req.body.content,
          isPinned: req.body.isPinned,
        },
        include: {
          user: { select: { firstName: true } },
        },
      });

      res.status(201).json({ success: true, data: { note } });
    } catch (error) {
      next(error);
    }
  }
);

// CRM Analytics
router.get('/crm/analytics', authenticate, requireSeller, async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate as string) : new Date();

    const metrics = await prisma.conversationMetrics.findMany({
      where: {
        userId: req.user!.id,
        date: { gte: start, lte: end },
      },
      orderBy: { date: 'asc' },
    });

    // Aggregate
    const totals = metrics.reduce(
      (acc, m) => ({
        newConversations: acc.newConversations + m.newConversations,
        messagesReceived: acc.messagesReceived + m.messagesReceived,
        messagesSent: acc.messagesSent + m.messagesSent,
        responsesWithin1Hr: acc.responsesWithin1Hr + m.responsesWithin1Hr,
        dealsWon: acc.dealsWon + m.dealsWon,
        dealsLost: acc.dealsLost + m.dealsLost,
        dealValueWon: acc.dealValueWon + Number(m.dealValueWon),
      }),
      {
        newConversations: 0,
        messagesReceived: 0,
        messagesSent: 0,
        responsesWithin1Hr: 0,
        dealsWon: 0,
        dealsLost: 0,
        dealValueWon: 0,
      }
    );

    res.json({
      success: true,
      data: {
        metrics,
        totals,
        conversionRate: totals.newConversations > 0 
          ? (totals.dealsWon / totals.newConversations * 100).toFixed(1) 
          : 0,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
