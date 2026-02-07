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
  createCustomOfferSchema,
  acceptOfferSchema,
  calculateOrderFees,
  generateOrderNumber,
  calculateDeliveryDueDate,
} from '@zomieks/shared';

const router = Router();

// Get conversations
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { status, pipelineStageId, labelId, page = '1', limit = '20' } = req.query;

    const isSeller = req.user!.isSeller;
    const where: any = isSeller
      ? { sellerId: req.user!.id }
      : { buyerId: req.user!.id };

    if (status) where.status = status as string;
    if (pipelineStageId) where.pipelineStageId = pipelineStageId as string;
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
        id: req.params.id as string,
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
      where: { conversationId: req.params.id as string },
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

// Start or find a conversation (lightweight – no initial message required)
router.post('/start', authenticate, async (req, res, next) => {
  try {
    const { participantId, content, orderId } = req.body;

    if (!participantId) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_FIELD', message: 'participantId is required' },
      });
    }

    // Get the other user
    const recipient = await prisma.user.findUnique({
      where: { id: participantId },
      select: { id: true, isSeller: true },
    });

    if (!recipient) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'User not found' },
      });
    }

    // Determine buyer/seller
    const buyerId = recipient.isSeller ? req.user!.id : participantId;
    const sellerId = recipient.isSeller ? participantId : req.user!.id;

    // Find existing conversation or create one
    let conversation = await prisma.conversation.findUnique({
      where: { buyerId_sellerId: { buyerId, sellerId } },
    });

    if (!conversation) {
      const defaultStage = await prisma.pipelineStage.findFirst({
        where: { userId: sellerId, isDefault: true },
      });

      conversation = await prisma.conversation.create({
        data: {
          buyerId,
          sellerId,
          pipelineStageId: defaultStage?.id,
          ...(orderId ? { orderId } : {}),
          source: 'direct',
        },
      });
    }

    // Optionally send an initial message
    if (content && content.trim()) {
      await prisma.message.create({
        data: {
          conversationId: conversation.id,
          senderId: req.user!.id,
          content: content.trim(),
          type: 'TEXT',
          deliveredAt: new Date(),
        },
      });

      const unreadField = buyerId === req.user!.id ? 'unreadSellerCount' : 'unreadBuyerCount';
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: {
          lastMessageAt: new Date(),
          [unreadField]: { increment: 1 },
        },
      });
    }

    res.status(201).json({
      success: true,
      data: { conversationId: conversation.id, conversation },
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

      // Process auto-triggers for new conversation (async, don't block response)
      import('@/services/crm.service.js').then(({ processAutoTriggers }) => {
        processAutoTriggers(sellerId, 'NEW_CONVERSATION', {
          conversationId: conversation!.id,
          messageContent: initialMessage,
        }).catch(console.error);
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
        where: { id: req.params.id as string, sellerId: req.user!.id },
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

      // Process stage change auto-triggers if stage was changed
      if (updateData.pipelineStageId && updateData.pipelineStageId !== conversation.pipelineStageId) {
        import('@/services/crm.service.js').then(({ processAutoTriggers }) => {
          processAutoTriggers(req.user!.id, 'STAGE_CHANGE', {
            conversationId: conversation.id,
            newStageId: updateData.pipelineStageId,
            oldStageId: conversation.pipelineStageId || undefined,
          }).catch(console.error);
        });
      }

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
        where: { id: req.params.id as string, sellerId: req.user!.id },
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

// === CUSTOM OFFER ENDPOINTS ===

// Send custom offer (seller only)
router.post(
  '/:id/offer',
  authenticate,
  requireSeller,
  validate(createCustomOfferSchema),
  async (req, res, next) => {
    try {
      const conversation = await prisma.conversation.findFirst({
        where: { id: req.params.id as string, sellerId: req.user!.id },
        include: {
          buyer: { select: { id: true, username: true, firstName: true } },
        },
      });

      if (!conversation) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Conversation not found' },
        });
      }

      const { description, price, deliveryDays, revisions } = req.body;
      const offerType = req.body.offerType || 'ONE_TIME';

      // Calculate fees so buyer can see the total
      const fees = calculateOrderFees(price);

      const quickOffer = {
        description,
        price,
        deliveryDays,
        revisions: revisions || 0,
        buyerFee: fees.buyerFee,
        totalAmount: fees.totalAmount,
        offerType,
        status: 'PENDING',
      };

      // Create message with QUICK_OFFER type
      const message = await prisma.message.create({
        data: {
          conversationId: conversation.id,
          senderId: req.user!.id,
          content: `Custom offer: ${description}`,
          type: 'QUICK_OFFER',
          quickOffer,
          deliveredAt: new Date(),
        },
        include: {
          sender: { select: { id: true, username: true, firstName: true, avatar: true } },
        },
      });

      // Update conversation
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: {
          lastMessageAt: new Date(),
          unreadBuyerCount: { increment: 1 },
        },
      });

      // Notify buyer
      const { notificationQueue } = await import('@/lib/queue.js');
      await notificationQueue.add('notification', {
        userId: conversation.buyerId,
        type: 'CUSTOM_OFFER',
        title: 'New Custom Offer',
        message: `You received a custom offer for R${price.toFixed(2)}`,
        data: { conversationId: conversation.id, messageId: message.id },
      });

      res.status(201).json({ success: true, data: { message } });
    } catch (error) {
      next(error);
    }
  }
);

// Accept custom offer (buyer creates order from offer)
router.post(
  '/:id/offer/:messageId/accept',
  authenticate,
  validate(acceptOfferSchema),
  async (req, res, next) => {
    try {
      const conversation = await prisma.conversation.findFirst({
        where: {
          id: req.params.id as string,
          buyerId: req.user!.id,
        },
        include: {
          seller: { select: { id: true, username: true } },
        },
      });

      if (!conversation) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Conversation not found' },
        });
      }

      // Find the offer message
      const offerMessage = await prisma.message.findFirst({
        where: {
          id: req.params.messageId as string,
          conversationId: conversation.id,
          type: 'QUICK_OFFER',
        },
      });

      if (!offerMessage || !offerMessage.quickOffer) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Offer not found' },
        });
      }

      const offer = offerMessage.quickOffer as { description: string; price: number; deliveryDays: number; revisions?: number; status: string };

      if (offer.status !== 'PENDING') {
        return res.status(400).json({
          success: false,
          error: { code: 'OFFER_NOT_PENDING', message: `Offer has already been ${offer.status.toLowerCase()}` },
        });
      }

      // Calculate fees using shared utility
      const fees = calculateOrderFees(offer.price);

      // Find seller's active service for the order linkage
      const sellerService = await prisma.service.findFirst({ where: { sellerId: conversation.sellerId, isActive: true } });

      if (!sellerService) {
        return res.status(400).json({
          success: false,
          error: { code: 'NO_SERVICE', message: 'Seller has no active service to link this order to' },
        });
      }

      // Create order from the offer
      const order = await prisma.order.create({
        data: {
          orderNumber: generateOrderNumber(),
          buyerId: req.user!.id,
          sellerId: conversation.sellerId,
          serviceId: sellerService.id,
          baseAmount: fees.baseAmount,
          buyerFee: fees.buyerFee,
          totalAmount: fees.totalAmount,
          sellerFee: fees.sellerFee,
          sellerPayout: fees.sellerPayout,
          platformRevenue: fees.platformRevenue,
          deliveryDays: offer.deliveryDays,
          revisions: offer.revisions || 0,
          requirements: offer.description,
          deliveryDueAt: calculateDeliveryDueDate(offer.deliveryDays),
        },
      });

      // Update the offer status in the message
      await prisma.message.update({
        where: { id: offerMessage.id },
        data: {
          quickOffer: { ...offer, status: 'ACCEPTED', orderId: order.id },
        },
      });

      // Link conversation to order
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: { orderId: order.id },
      });

      // Send system message about acceptance
      await prisma.message.create({
        data: {
          conversationId: conversation.id,
          senderId: req.user!.id,
          content: `Offer accepted! Order #${order.orderNumber} has been created.`,
          type: 'ORDER_UPDATE',
          deliveredAt: new Date(),
        },
      });

      // Notify seller
      const { notificationQueue } = await import('@/lib/queue.js');
      await notificationQueue.add('notification', {
        userId: conversation.sellerId,
        type: 'OFFER_ACCEPTED',
        title: 'Offer Accepted!',
        message: `Your custom offer was accepted. Order #${order.orderNumber} created.`,
        data: { orderId: order.id, conversationId: conversation.id },
      });

      const { paymentGateway } = req.body;

      res.json({
        success: true,
        data: {
          order,
          paymentUrl: `/api/v1/payments/initiate?orderId=${order.id}&gateway=${paymentGateway}`,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Decline custom offer (buyer)
router.post(
  '/:id/offer/:messageId/decline',
  authenticate,
  async (req, res, next) => {
    try {
      const conversation = await prisma.conversation.findFirst({
        where: {
          id: req.params.id as string,
          buyerId: req.user!.id,
        },
      });

      if (!conversation) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Conversation not found' },
        });
      }

      const offerMessage = await prisma.message.findFirst({
        where: {
          id: req.params.messageId as string,
          conversationId: conversation.id,
          type: 'QUICK_OFFER',
        },
      });

      if (!offerMessage || !offerMessage.quickOffer) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Offer not found' },
        });
      }

      const offer = offerMessage.quickOffer as { status: string };

      if (offer.status !== 'PENDING') {
        return res.status(400).json({
          success: false,
          error: { code: 'OFFER_NOT_PENDING', message: `Offer has already been ${offer.status.toLowerCase()}` },
        });
      }

      // Update offer status
      await prisma.message.update({
        where: { id: offerMessage.id },
        data: {
          quickOffer: { ...offerMessage.quickOffer as object, status: 'DECLINED' },
        },
      });

      // Send system message
      await prisma.message.create({
        data: {
          conversationId: conversation.id,
          senderId: req.user!.id,
          content: 'The custom offer was declined.',
          type: 'SYSTEM',
          deliveredAt: new Date(),
        },
      });

      // Update conversation
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: { lastMessageAt: new Date() },
      });

      // Notify seller
      const { notificationQueue } = await import('@/lib/queue.js');
      await notificationQueue.add('notification', {
        userId: conversation.sellerId,
        type: 'OFFER_DECLINED',
        title: 'Offer Declined',
        message: 'Your custom offer was declined.',
        data: { conversationId: conversation.id },
      });

      res.json({ success: true, data: { message: 'Offer declined' } });
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
