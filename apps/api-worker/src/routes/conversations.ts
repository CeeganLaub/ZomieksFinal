import { Hono } from 'hono';
import { z } from 'zod';
import { eq, and, or, desc, isNull, count, sql } from 'drizzle-orm';
import { 
  conversations, messages, users, orders, services,
  conversationNotes, conversationLabels, labels,
  savedReplies, pipelineStages
} from '@zomieks/db';
import { createId } from '@paralleldrive/cuid2';
import type { Env } from '../types';
import { authMiddleware, requireAuth, requireSeller } from '../middleware/auth';
import { validate, getValidatedBody } from '../middleware/validation';
import { calculateFees, DEFAULT_FEE_POLICY } from '../services/fee-engine';
import type { Gateway, PaymentMethod } from '../services/fee-engine';

const app = new Hono<{ Bindings: Env }>();

app.use('*', authMiddleware);
app.use('*', requireAuth);

// Schemas
const sendMessageSchema = z.object({
  content: z.string().min(1).max(5000),
  attachments: z.array(z.string()).optional(),
});

const updateLabelSchema = z.object({
  labels: z.array(z.string()),
});

const noteSchema = z.object({
  content: z.string().min(1).max(2000),
});

const savedReplySchema = z.object({
  title: z.string().min(1).max(100),
  content: z.string().min(1).max(5000),
  shortcut: z.string().max(20).optional(),
});

const offerSchema = z.object({
  description: z.string().min(1).max(1000),
  price: z.number().positive(),
  deliveryDays: z.number().int().positive(),
  revisions: z.number().int().min(0).optional(),
  offerType: z.enum(['ONE_TIME', 'MONTHLY']).optional().default('ONE_TIME'),
});

const acceptOfferSchema = z.object({
  paymentGateway: z.string().optional().default('ozow'),
});

// Helpers
function generateOrderNumber(): string {
  const prefix = 'ZOM';
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${random}-${timestamp}`;
}

function formatConversation(conv: any, userId: string) {
  const isBuyer = conv.buyerId === userId;
  const otherParticipant = isBuyer ? conv.seller : conv.buyer;
  
  return {
    id: conv.id,
    buyerId: conv.buyerId,
    sellerId: conv.sellerId,
    participant: otherParticipant ? {
      id: otherParticipant.id,
      username: otherParticipant.username,
      firstName: otherParticipant.firstName,
      avatar: otherParticipant.avatar,
    } : null,
    buyer: conv.buyer ? {
      id: conv.buyer.id,
      username: conv.buyer.username,
      firstName: conv.buyer.firstName,
      avatar: conv.buyer.avatar,
    } : null,
    seller: conv.seller ? {
      id: conv.seller.id,
      username: conv.seller.username,
      firstName: conv.seller.firstName,
      avatar: conv.seller.avatar,
    } : null,
    order: conv.order ? {
      id: conv.order.id,
      orderNumber: conv.order.orderNumber,
      status: conv.order.status,
    } : null,
    lastMessage: conv.lastMessagePreview,
    lastMessageAt: conv.lastMessageAt,
    unreadCount: isBuyer ? conv.unreadBuyerCount : conv.unreadSellerCount,
    isStarred: conv.isStarred,
    status: conv.status,
    pipelineStage: conv.pipelineStage,
    labels: conv.labels?.map((cl: any) => ({
      id: cl.label?.id,
      name: cl.label?.name,
      color: cl.label?.color,
    })) || [],
  };
}

// GET / - List conversations
app.get('/', async (c) => {
  const user = c.get('user')!;
  const db = c.get('db');
  const status = c.req.query('status');
  const starred = c.req.query('starred') === 'true';
  const page = parseInt(c.req.query('page') || '1');
  const limit = parseInt(c.req.query('limit') || '20');
  const offset = (page - 1) * limit;
  
  const baseCondition = or(
    eq(conversations.buyerId, user.id),
    eq(conversations.sellerId, user.id)
  );
  
  let whereConditions: any[] = [baseCondition];
  
  if (status) {
    whereConditions.push(eq(conversations.status, status));
  }
  
  if (starred) {
    whereConditions.push(eq(conversations.isStarred, true));
  }
  
  const convList = await db.query.conversations.findMany({
    where: and(...whereConditions),
    with: {
      buyer: true,
      seller: true,
      order: true,
      labels: { with: { label: true } },
    },
    orderBy: desc(conversations.lastMessageAt),
    limit,
    offset,
  });
  
  const [{ total }] = await db
    .select({ total: count() })
    .from(conversations)
    .where(and(
      baseCondition,
      or(
        and(
          eq(conversations.buyerId, user.id),
          sql`${conversations.unreadBuyerCount} > 0`
        ),
        and(
          eq(conversations.sellerId, user.id),
          sql`${conversations.unreadSellerCount} > 0`
        )
      )
    ));
  
  return c.json({
    success: true,
    data: {
      conversations: convList.map(conv => formatConversation(conv, user.id)),
      unreadTotal: total,
    },
    meta: { page, limit },
  });
});

// GET /:id - Get conversation with messages
app.get('/:id', async (c) => {
  const { id } = c.req.param();
  const user = c.get('user')!;
  const db = c.get('db');
  const page = parseInt(c.req.query('page') || '1');
  const limit = parseInt(c.req.query('limit') || '50');
  const offset = (page - 1) * limit;
  
  const conversation = await db.query.conversations.findFirst({
    where: and(
      eq(conversations.id, id),
      or(
        eq(conversations.buyerId, user.id),
        eq(conversations.sellerId, user.id)
      )
    ),
    with: {
      buyer: { with: { sellerProfile: true } },
      seller: { with: { sellerProfile: true } },
      order: true,
      labels: { with: { label: true } },
      notes: {
        orderBy: desc(conversationNotes.createdAt),
      },
    },
  });
  
  if (!conversation) {
    return c.json({
      success: false,
      error: { message: 'Conversation not found' },
    }, 404);
  }
  
  const messageList = await db.query.messages.findMany({
    where: eq(messages.conversationId, id),
    with: { sender: true },
    orderBy: desc(messages.createdAt),
    limit,
    offset,
  });
  
  // Mark as read
  const isBuyer = conversation.buyerId === user.id;
  const unreadCount = isBuyer ? conversation.unreadBuyerCount : conversation.unreadSellerCount;
  
  if (unreadCount > 0) {
    await db.update(conversations)
      .set(isBuyer ? { unreadBuyerCount: 0 } : { unreadSellerCount: 0 })
      .where(eq(conversations.id, id));
  }
  
  // Mark messages as read
  await db.update(messages)
    .set({ isRead: true, readAt: new Date().toISOString() })
    .where(and(
      eq(messages.conversationId, id),
      sql`${messages.senderId} != ${user.id}`,
      eq(messages.isRead, false)
    ));
  
  return c.json({
    success: true,
    data: {
      conversation: formatConversation(conversation, user.id),
      messages: messageList.reverse().map(msg => ({
        id: msg.id,
        conversationId: msg.conversationId,
        senderId: msg.senderId,
        sender: {
          id: msg.sender?.id,
          username: msg.sender?.username,
          firstName: msg.sender?.firstName,
          avatar: msg.sender?.avatar,
        },
        content: msg.content,
        type: msg.type,
        attachments: msg.attachments,
        quickOffer: msg.quickOffer,
        isRead: msg.isRead,
        createdAt: msg.createdAt,
      })),
      notes: conversation.notes?.map((note: any) => ({
        id: note.id,
        content: note.content,
        createdAt: note.createdAt,
      })),
    },
    meta: { page, limit },
  });
});

// POST /:id/messages - Send message
app.post('/:id/messages', validate(sendMessageSchema), async (c) => {
  const { id } = c.req.param();
  const body = getValidatedBody<z.infer<typeof sendMessageSchema>>(c);
  const user = c.get('user')!;
  const db = c.get('db');
  
  const conversation = await db.query.conversations.findFirst({
    where: and(
      eq(conversations.id, id),
      or(
        eq(conversations.buyerId, user.id),
        eq(conversations.sellerId, user.id)
      )
    ),
  });
  
  if (!conversation) {
    return c.json({
      success: false,
      error: { message: 'Conversation not found' },
    }, 404);
  }
  
  const messageId = createId();
  const now = new Date().toISOString();
  
  await db.insert(messages).values({
    id: messageId,
    conversationId: id,
    senderId: user.id,
    content: body.content,
    attachments: body.attachments ? body.attachments.map(url => ({ url, name: url.split('/').pop() || 'file', size: 0, type: '' })) : null,
    type: 'TEXT',
    createdAt: now,
    deliveredAt: now,
  });
  
  // Update conversation
  const isBuyer = conversation.buyerId === user.id;
  await db.update(conversations)
    .set({
      lastMessagePreview: body.content.substring(0, 100),
      lastMessageAt: now,
      messageCount: (conversation.messageCount || 0) + 1,
      ...(isBuyer
        ? { unreadSellerCount: (conversation.unreadSellerCount || 0) + 1 }
        : { unreadBuyerCount: (conversation.unreadBuyerCount || 0) + 1 }
      ),
      updatedAt: now,
    })
    .where(eq(conversations.id, id));
  
  // Get sender info for response
  const sender = await db.query.users.findFirst({
    where: eq(users.id, user.id),
    columns: { id: true, username: true, firstName: true, avatar: true },
  });
  
  // Queue notification
  const recipientId = isBuyer ? conversation.sellerId : conversation.buyerId;
  try {
    await c.env.NOTIFICATION_QUEUE.send({
      type: 'new_message',
      recipientId,
      senderId: user.id,
      conversationId: id,
      preview: body.content.substring(0, 100),
    });
  } catch (e) {
    console.error('Failed to queue notification:', e);
  }
  
  return c.json({
    success: true,
    data: {
      message: {
        id: messageId,
        conversationId: id,
        senderId: user.id,
        sender: sender || { id: user.id, username: user.username },
        content: body.content,
        type: 'TEXT',
        attachments: body.attachments || [],
        createdAt: now,
      },
    },
  });
});

// POST /start - Start conversation with user
app.post('/start', async (c) => {
  const user = c.get('user')!;
  const db = c.get('db');
  const { participantId, orderId, content } = await c.req.json();
  
  if (!participantId) {
    return c.json({
      success: false,
      error: { message: 'Participant ID required' },
    }, 400);
  }
  
  if (participantId === user.id) {
    return c.json({
      success: false,
      error: { message: 'Cannot message yourself' },
    }, 400);
  }
  
  const participant = await db.query.users.findFirst({
    where: eq(users.id, participantId),
    with: { sellerProfile: true },
  });
  
  if (!participant) {
    return c.json({
      success: false,
      error: { message: 'User not found' },
    }, 404);
  }
  
  // Determine buyer/seller roles
  const participantIsSeller = participant.isSeller;
  const buyerId = participantIsSeller ? user.id : participantId;
  const sellerId = participantIsSeller ? participantId : user.id;
  
  // Check for existing conversation
  const existing = await db.query.conversations.findFirst({
    where: or(
      and(eq(conversations.buyerId, buyerId), eq(conversations.sellerId, sellerId)),
      and(eq(conversations.buyerId, sellerId), eq(conversations.sellerId, buyerId))
    ),
  });
  
  if (existing) {
    return c.json({
      success: true,
      data: { conversationId: existing.id },
    });
  }
  
  const conversationId = createId();
  const now = new Date().toISOString();
  
  await db.insert(conversations).values({
    id: conversationId,
    buyerId,
    sellerId,
    orderId: orderId || null,
    lastMessagePreview: content?.substring(0, 100) || null,
    lastMessageAt: content ? now : null,
    createdAt: now,
    updatedAt: now,
  });
  
  if (content) {
    await db.insert(messages).values({
      id: createId(),
      conversationId,
      senderId: user.id,
      content,
      type: 'TEXT',
      createdAt: now,
      deliveredAt: now,
    });
    
    const recipientIsBuyer = buyerId !== user.id;
    await db.update(conversations)
      .set({
        messageCount: 1,
        ...(recipientIsBuyer ? { unreadBuyerCount: 1 } : { unreadSellerCount: 1 }),
      })
      .where(eq(conversations.id, conversationId));
  }
  
  return c.json({
    success: true,
    data: { conversationId },
  });
});

// PATCH /:id/star - Toggle star
app.patch('/:id/star', async (c) => {
  const { id } = c.req.param();
  const user = c.get('user')!;
  const db = c.get('db');
  
  const conversation = await db.query.conversations.findFirst({
    where: and(
      eq(conversations.id, id),
      or(
        eq(conversations.buyerId, user.id),
        eq(conversations.sellerId, user.id)
      )
    ),
  });
  
  if (!conversation) {
    return c.json({
      success: false,
      error: { message: 'Conversation not found' },
    }, 404);
  }
  
  await db.update(conversations)
    .set({ isStarred: !conversation.isStarred })
    .where(eq(conversations.id, id));
  
  return c.json({
    success: true,
    data: { isStarred: !conversation.isStarred },
  });
});

// PATCH /:id/labels - Update labels (seller CRM)
app.patch('/:id/labels', requireSeller, validate(updateLabelSchema), async (c) => {
  const { id } = c.req.param();
  const { labels: labelIds } = getValidatedBody<z.infer<typeof updateLabelSchema>>(c);
  const user = c.get('user')!;
  const db = c.get('db');
  
  const conversation = await db.query.conversations.findFirst({
    where: and(
      eq(conversations.id, id),
      or(
        eq(conversations.buyerId, user.id),
        eq(conversations.sellerId, user.id)
      )
    ),
  });
  
  if (!conversation) {
    return c.json({
      success: false,
      error: { message: 'Conversation not found' },
    }, 404);
  }
  
  await db.delete(conversationLabels)
    .where(eq(conversationLabels.conversationId, id));
  
  if (labelIds.length > 0) {
    await db.insert(conversationLabels).values(
      labelIds.map(labelId => ({
        conversationId: id,
        labelId,
      }))
    );
  }
  
  return c.json({ success: true, message: 'Labels updated' });
});

// POST /:id/notes - Add note (seller CRM)
app.post('/:id/notes', requireSeller, validate(noteSchema), async (c) => {
  const { id } = c.req.param();
  const { content } = getValidatedBody<z.infer<typeof noteSchema>>(c);
  const user = c.get('user')!;
  const db = c.get('db');
  
  const conversation = await db.query.conversations.findFirst({
    where: and(
      eq(conversations.id, id),
      or(
        eq(conversations.buyerId, user.id),
        eq(conversations.sellerId, user.id)
      )
    ),
  });
  
  if (!conversation) {
    return c.json({
      success: false,
      error: { message: 'Conversation not found' },
    }, 404);
  }
  
  const noteId = createId();
  const now = new Date().toISOString();
  
  await db.insert(conversationNotes).values({
    id: noteId,
    conversationId: id,
    userId: user.id,
    content,
    createdAt: now,
    updatedAt: now,
  });
  
  return c.json({
    success: true,
    data: { id: noteId, content, createdAt: now },
  });
});

// ═══ CUSTOM OFFER ENDPOINTS ═══════════════════════════════════

// POST /:id/offer - Seller sends custom offer
app.post('/:id/offer', requireSeller, validate(offerSchema), async (c) => {
  const { id } = c.req.param();
  const body = getValidatedBody<z.infer<typeof offerSchema>>(c);
  const user = c.get('user')!;
  const db = c.get('db');
  
  const conversation = await db.query.conversations.findFirst({
    where: and(
      eq(conversations.id, id),
      eq(conversations.sellerId, user.id)
    ),
    with: { buyer: true },
  });
  
  if (!conversation) {
    return c.json({
      success: false,
      error: { message: 'Conversation not found or you are not the seller' },
    }, 404);
  }
  
  // Calculate fees so buyer can see the total
  const priceInCents = Math.round(body.price * 100);
  let buyerFee = 0;
  let totalAmount = body.price;
  try {
    const fees = calculateFees({
      baseAmount: priceInCents,
      gateway: 'OZOW' as Gateway,
      method: 'EFT' as PaymentMethod,
      policy: DEFAULT_FEE_POLICY,
    });
    buyerFee = fees.buyerPlatformFee / 100;
    totalAmount = fees.grossAmount / 100;
  } catch {
    buyerFee = 0;
    totalAmount = body.price;
  }
  
  const quickOffer = {
    description: body.description,
    price: body.price,
    deliveryDays: body.deliveryDays,
    revisions: body.revisions || 0,
    offerType: body.offerType,
    buyerFee,
    totalAmount,
    status: 'PENDING',
  };
  
  const offerMsgId = createId();
  const now = new Date().toISOString();
  
  await db.insert(messages).values({
    id: offerMsgId,
    conversationId: id,
    senderId: user.id,
    content: `Custom offer: ${body.description}`,
    type: 'QUICK_OFFER',
    quickOffer,
    createdAt: now,
    deliveredAt: now,
  });
  
  await db.update(conversations)
    .set({
      lastMessagePreview: `Offer: R${body.price}`,
      lastMessageAt: now,
      messageCount: (conversation.messageCount || 0) + 1,
      unreadBuyerCount: (conversation.unreadBuyerCount || 0) + 1,
      updatedAt: now,
    })
    .where(eq(conversations.id, id));
  
  const sender = await db.query.users.findFirst({
    where: eq(users.id, user.id),
    columns: { id: true, username: true, firstName: true, avatar: true },
  });
  
  try {
    await c.env.NOTIFICATION_QUEUE.send({
      type: 'custom_offer',
      recipientId: conversation.buyerId,
      senderId: user.id,
      conversationId: id,
      preview: `Custom offer for R${body.price}`,
    });
  } catch (e) {
    console.error('Failed to queue notification:', e);
  }
  
  return c.json({
    success: true,
    data: {
      message: {
        id: offerMsgId,
        conversationId: id,
        senderId: user.id,
        sender: sender || { id: user.id, username: user.username },
        content: `Custom offer: ${body.description}`,
        type: 'QUICK_OFFER',
        quickOffer,
        createdAt: now,
      },
    },
  });
});

// POST /:id/offer/:messageId/accept - Buyer accepts offer
app.post('/:id/offer/:messageId/accept', validate(acceptOfferSchema), async (c) => {
  const { id, messageId } = c.req.param();
  const body = getValidatedBody<z.infer<typeof acceptOfferSchema>>(c);
  const user = c.get('user')!;
  const db = c.get('db');
  
  const conversation = await db.query.conversations.findFirst({
    where: and(
      eq(conversations.id, id),
      eq(conversations.buyerId, user.id)
    ),
  });
  
  if (!conversation) {
    return c.json({
      success: false,
      error: { message: 'Conversation not found' },
    }, 404);
  }
  
  const offerMessage = await db.query.messages.findFirst({
    where: and(
      eq(messages.id, messageId),
      eq(messages.conversationId, id),
      eq(messages.type, 'QUICK_OFFER')
    ),
  });
  
  if (!offerMessage || !offerMessage.quickOffer) {
    return c.json({
      success: false,
      error: { message: 'Offer not found' },
    }, 404);
  }
  
  const offer = offerMessage.quickOffer as any;
  
  if (offer.status !== 'PENDING') {
    return c.json({
      success: false,
      error: { message: `Offer has already been ${offer.status.toLowerCase()}` },
    }, 400);
  }
  
  // Find seller's active service
  const sellerService = await db.query.services.findFirst({
    where: and(
      eq(services.sellerId, conversation.sellerId),
      eq(services.isActive, true)
    ),
  });
  
  if (!sellerService) {
    return c.json({
      success: false,
      error: { message: 'Seller has no active service' },
    }, 400);
  }
  
  const priceInCents = Math.round(offer.price * 100);
  const fees = calculateFees({
    baseAmount: priceInCents,
    gateway: 'OZOW' as Gateway,
    method: 'EFT' as PaymentMethod,
    policy: DEFAULT_FEE_POLICY,
  });
  
  const orderId = createId();
  const orderNumber = generateOrderNumber();
  const now = new Date().toISOString();
  const deliveryDueAt = new Date(Date.now() + offer.deliveryDays * 24 * 60 * 60 * 1000).toISOString();
  
  await db.insert(orders).values({
    id: orderId,
    orderNumber,
    buyerId: user.id,
    sellerId: conversation.sellerId,
    serviceId: sellerService.id,
    baseAmount: fees.baseAmount,
    buyerPlatformFee: fees.buyerPlatformFee,
    buyerProcessingFee: fees.buyerProcessingFee,
    sellerPlatformFee: fees.sellerPlatformFee,
    grossAmount: fees.grossAmount,
    sellerPayoutAmount: fees.sellerPayoutAmount,
    platformRevenue: fees.platformRevenue,
    gateway: 'OZOW',
    gatewayMethod: 'EFT',
    deliveryDays: offer.deliveryDays,
    revisions: offer.revisions || 0,
    requirements: offer.description,
    deliveryDueAt,
    status: 'PENDING_PAYMENT',
    createdAt: now,
    updatedAt: now,
  });
  
  // Update offer status
  await db.update(messages)
    .set({ quickOffer: { ...offer, status: 'ACCEPTED', orderId } })
    .where(eq(messages.id, messageId));
  
  // Link conversation to order
  await db.update(conversations)
    .set({ orderId, updatedAt: now })
    .where(eq(conversations.id, id));
  
  // System message
  await db.insert(messages).values({
    id: createId(),
    conversationId: id,
    senderId: user.id,
    content: `Offer accepted! Order #${orderNumber} has been created.`,
    type: 'SYSTEM',
    createdAt: now,
    deliveredAt: now,
  });
  
  try {
    await c.env.NOTIFICATION_QUEUE.send({
      type: 'offer_accepted',
      recipientId: conversation.sellerId,
      senderId: user.id,
      conversationId: id,
      preview: `Offer accepted — Order #${orderNumber}`,
    });
  } catch (e) {
    console.error('Failed to queue notification:', e);
  }
  
  return c.json({
    success: true,
    data: {
      order: {
        id: orderId,
        orderNumber,
        status: 'PENDING_PAYMENT',
        grossAmount: fees.grossAmount / 100,
      },
      paymentUrl: `/api/v1/payments/initiate?orderId=${orderId}&gateway=${body.paymentGateway}`,
    },
  });
});

// POST /:id/offer/:messageId/decline - Buyer declines offer
app.post('/:id/offer/:messageId/decline', async (c) => {
  const { id, messageId } = c.req.param();
  const user = c.get('user')!;
  const db = c.get('db');
  
  const conversation = await db.query.conversations.findFirst({
    where: and(
      eq(conversations.id, id),
      eq(conversations.buyerId, user.id)
    ),
  });
  
  if (!conversation) {
    return c.json({
      success: false,
      error: { message: 'Conversation not found' },
    }, 404);
  }
  
  const offerMessage = await db.query.messages.findFirst({
    where: and(
      eq(messages.id, messageId),
      eq(messages.conversationId, id),
      eq(messages.type, 'QUICK_OFFER')
    ),
  });
  
  if (!offerMessage || !offerMessage.quickOffer) {
    return c.json({
      success: false,
      error: { message: 'Offer not found' },
    }, 404);
  }
  
  const offer = offerMessage.quickOffer as any;
  
  if (offer.status !== 'PENDING') {
    return c.json({
      success: false,
      error: { message: `Offer has already been ${offer.status.toLowerCase()}` },
    }, 400);
  }
  
  const now = new Date().toISOString();
  
  await db.update(messages)
    .set({ quickOffer: { ...offer, status: 'DECLINED' } })
    .where(eq(messages.id, messageId));
  
  await db.insert(messages).values({
    id: createId(),
    conversationId: id,
    senderId: user.id,
    content: 'The custom offer was declined.',
    type: 'SYSTEM',
    createdAt: now,
    deliveredAt: now,
  });
  
  await db.update(conversations)
    .set({ lastMessagePreview: 'Offer declined', lastMessageAt: now, updatedAt: now })
    .where(eq(conversations.id, id));
  
  try {
    await c.env.NOTIFICATION_QUEUE.send({
      type: 'offer_declined',
      recipientId: conversation.sellerId,
      senderId: user.id,
      conversationId: id,
      preview: 'Your custom offer was declined',
    });
  } catch (e) {
    console.error('Failed to queue notification:', e);
  }
  
  return c.json({ success: true, data: { message: 'Offer declined' } });
});

// CRM: Saved Replies
app.get('/crm/saved-replies', requireSeller, async (c) => {
  const user = c.get('user')!;
  const db = c.get('db');
  
  const replies = await db.query.savedReplies.findMany({
    where: eq(savedReplies.userId, user.id),
    orderBy: desc(savedReplies.usageCount),
  });
  
  return c.json({
    success: true,
    data: replies,
  });
});

app.post('/crm/saved-replies', requireSeller, validate(savedReplySchema), async (c) => {
  const body = getValidatedBody<z.infer<typeof savedReplySchema>>(c);
  const user = c.get('user')!;
  const db = c.get('db');
  
  const id = createId();
  const now = new Date().toISOString();
  
  await db.insert(savedReplies).values({
    id,
    userId: user.id,
    title: body.title,
    content: body.content,
    shortcut: body.shortcut || body.title.toLowerCase().replace(/\s+/g, '-'),
  });
  
  return c.json({
    success: true,
    data: { id },
  });
});

// CRM: Labels
app.get('/crm/labels', requireSeller, async (c) => {
  const user = c.get('user')!;
  const db = c.get('db');
  
  const labelList = await db.query.labels.findMany({
    where: eq(labels.userId, user.id),
    orderBy: [labels.name],
  });
  
  return c.json({
    success: true,
    data: labelList,
  });
});

app.post('/crm/labels', requireSeller, async (c) => {
  const { name, color } = await c.req.json();
  const user = c.get('user')!;
  const db = c.get('db');
  
  if (!name || !color) {
    return c.json({
      success: false,
      error: { message: 'Name and color required' },
    }, 400);
  }
  
  const id = createId();
  const now = new Date().toISOString();
  
  await db.insert(labels).values({
    id,
    userId: user.id,
    name,
    color,
  });
  
  return c.json({
    success: true,
    data: { id, name, color },
  });
});

// CRM: Pipeline stages
app.get('/crm/pipeline', requireSeller, async (c) => {
  const user = c.get('user')!;
  const db = c.get('db');
  
  const stages = await db.query.pipelineStages.findMany({
    where: eq(pipelineStages.userId, user.id),
    orderBy: [pipelineStages.order],
  });
  
  return c.json({
    success: true,
    data: stages,
  });
});

export default app;
