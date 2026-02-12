import { Hono } from 'hono';
import { z } from 'zod';
import { eq, and, or, desc, isNull, count, sql } from 'drizzle-orm';
import { 
  conversations, messages, users, orders, 
  conversationNotes, conversationLabels, labels,
  savedReplies, pipelineStages
} from '@zomieks/db';
import { createId } from '@paralleldrive/cuid2';
import type { Env } from '../types';
import { authMiddleware, requireAuth, requireSeller } from '../middleware/auth';
import { validate, getValidatedBody } from '../middleware/validation';

const app = new Hono<{ Bindings: Env }>();

app.use('*', authMiddleware);
app.use('*', requireAuth);

// Schemas
const sendMessageSchema = z.object({
  content: z.string().min(1).max(5000),
  attachments: z.array(z.string()).optional(),
  offerDetails: z.object({
    description: z.string(),
    price: z.number().positive(),
    deliveryDays: z.number().int().positive(),
    revisions: z.number().int().min(0),
  }).optional(),
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

// Helper: Format conversation for list
function formatConversation(conv: any, userId: string) {
  const otherParticipant = conv.participantOne?.id === userId 
    ? conv.participantTwo 
    : conv.participantOne;
  
  return {
    id: conv.id,
    participant: otherParticipant ? {
      id: otherParticipant.id,
      username: otherParticipant.username,
      firstName: otherParticipant.firstName,
      avatar: otherParticipant.avatar,
      isOnline: otherParticipant.isOnline,
    } : null,
    order: conv.order ? {
      id: conv.order.id,
      orderNumber: conv.order.orderNumber,
      status: conv.order.status,
    } : null,
    lastMessage: conv.lastMessage,
    lastMessageAt: conv.lastMessageAt,
    unreadCount: conv.participantOneId === userId 
      ? conv.unreadCountOne 
      : conv.unreadCountTwo,
    isStarred: conv.participantOneId === userId 
      ? conv.isStarredByOne 
      : conv.isStarredByTwo,
    status: conv.status,
    pipelineStage: conv.pipelineStage,
    labels: conv.conversationLabels?.map((cl: any) => ({
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
  const labelId = c.req.query('label');
  const starred = c.req.query('starred') === 'true';
  const page = parseInt(c.req.query('page') || '1');
  const limit = parseInt(c.req.query('limit') || '20');
  const offset = (page - 1) * limit;
  
  // Build where conditions
  const baseCondition = or(
    eq(conversations.participantOneId, user.id),
    eq(conversations.participantTwoId, user.id)
  );
  
  let whereConditions: any[] = [baseCondition];
  
  if (status) {
    whereConditions.push(eq(conversations.status, status));
  }
  
  if (starred) {
    whereConditions.push(
      or(
        and(
          eq(conversations.participantOneId, user.id),
          eq(conversations.isStarredByOne, true)
        ),
        and(
          eq(conversations.participantTwoId, user.id),
          eq(conversations.isStarredByTwo, true)
        )
      )
    );
  }
  
  const convList = await db.query.conversations.findMany({
    where: and(...whereConditions),
    with: {
      participantOne: true,
      participantTwo: true,
      order: true,
      conversationLabels: { with: { label: true } },
    },
    orderBy: desc(conversations.lastMessageAt),
    limit,
    offset,
  });
  
  // Get unread count
  const [{ total }] = await db
    .select({ total: count() })
    .from(conversations)
    .where(and(
      baseCondition,
      or(
        and(
          eq(conversations.participantOneId, user.id),
          sql`${conversations.unreadCountOne} > 0`
        ),
        and(
          eq(conversations.participantTwoId, user.id),
          sql`${conversations.unreadCountTwo} > 0`
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
        eq(conversations.participantOneId, user.id),
        eq(conversations.participantTwoId, user.id)
      )
    ),
    with: {
      participantOne: { with: { sellerProfile: true } },
      participantTwo: { with: { sellerProfile: true } },
      order: true,
      conversationLabels: { with: { label: true } },
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
  
  // Get messages
  const messageList = await db.query.messages.findMany({
    where: eq(messages.conversationId, id),
    with: { sender: true },
    orderBy: desc(messages.createdAt),
    limit,
    offset,
  });
  
  // Mark as read
  if (conversation.participantOneId === user.id && conversation.unreadCountOne > 0) {
    await db.update(conversations)
      .set({ unreadCountOne: 0 })
      .where(eq(conversations.id, id));
  } else if (conversation.participantTwoId === user.id && conversation.unreadCountTwo > 0) {
    await db.update(conversations)
      .set({ unreadCountTwo: 0 })
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
        senderId: msg.senderId,
        sender: {
          username: msg.sender?.username,
          avatar: msg.sender?.avatar,
        },
        content: msg.content,
        attachments: msg.attachments,
        offerDetails: msg.offerDetails,
        isOffer: msg.isOffer,
        isSystemMessage: msg.isSystemMessage,
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
        eq(conversations.participantOneId, user.id),
        eq(conversations.participantTwoId, user.id)
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
  
  // Create message
  await db.insert(messages).values({
    id: messageId,
    conversationId: id,
    senderId: user.id,
    content: body.content,
    attachments: body.attachments || [],
    isOffer: !!body.offerDetails,
    offerDetails: body.offerDetails || null,
    createdAt: now,
    updatedAt: now,
  });
  
  // Update conversation
  const recipientIsOne = conversation.participantOneId !== user.id;
  await db.update(conversations)
    .set({
      lastMessage: body.content.substring(0, 100),
      lastMessageAt: now,
      messageCount: conversation.messageCount + 1,
      ...(recipientIsOne 
        ? { unreadCountOne: conversation.unreadCountOne + 1 }
        : { unreadCountTwo: conversation.unreadCountTwo + 1 }
      ),
      updatedAt: now,
    })
    .where(eq(conversations.id, id));
  
  // Queue notification
  await c.env.NOTIFICATION_QUEUE?.send({
    type: 'new_message',
    recipientId: recipientIsOne 
      ? conversation.participantOneId 
      : conversation.participantTwoId,
    senderId: user.id,
    conversationId: id,
    preview: body.content.substring(0, 100),
  });
  
  return c.json({
    success: true,
    data: {
      messageId,
      createdAt: now,
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
  
  // Can't message self
  if (participantId === user.id) {
    return c.json({
      success: false,
      error: { message: 'Cannot message yourself' },
    }, 400);
  }
  
  // Check participant exists
  const participant = await db.query.users.findFirst({
    where: eq(users.id, participantId),
  });
  
  if (!participant) {
    return c.json({
      success: false,
      error: { message: 'User not found' },
    }, 404);
  }
  
  // Check for existing conversation
  const existing = await db.query.conversations.findFirst({
    where: and(
      or(
        and(
          eq(conversations.participantOneId, user.id),
          eq(conversations.participantTwoId, participantId)
        ),
        and(
          eq(conversations.participantOneId, participantId),
          eq(conversations.participantTwoId, user.id)
        )
      ),
      orderId ? eq(conversations.orderId, orderId) : isNull(conversations.orderId)
    ),
  });
  
  if (existing) {
    return c.json({
      success: true,
      data: { conversationId: existing.id },
    });
  }
  
  // Create new conversation
  const conversationId = createId();
  const now = new Date().toISOString();
  
  await db.insert(conversations).values({
    id: conversationId,
    participantOneId: user.id,
    participantTwoId: participantId,
    orderId: orderId || null,
    lastMessage: content?.substring(0, 100) || null,
    lastMessageAt: content ? now : null,
    createdAt: now,
    updatedAt: now,
  });
  
  // Send initial message if provided
  if (content) {
    await db.insert(messages).values({
      id: createId(),
      conversationId,
      senderId: user.id,
      content,
      createdAt: now,
      updatedAt: now,
    });
    
    await db.update(conversations)
      .set({
        messageCount: 1,
        unreadCountTwo: 1,
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
        eq(conversations.participantOneId, user.id),
        eq(conversations.participantTwoId, user.id)
      )
    ),
  });
  
  if (!conversation) {
    return c.json({
      success: false,
      error: { message: 'Conversation not found' },
    }, 404);
  }
  
  const isParticipantOne = conversation.participantOneId === user.id;
  const currentStar = isParticipantOne 
    ? conversation.isStarredByOne 
    : conversation.isStarredByTwo;
  
  await db.update(conversations)
    .set(isParticipantOne 
      ? { isStarredByOne: !currentStar }
      : { isStarredByTwo: !currentStar }
    )
    .where(eq(conversations.id, id));
  
  return c.json({
    success: true,
    data: { isStarred: !currentStar },
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
        eq(conversations.participantOneId, user.id),
        eq(conversations.participantTwoId, user.id)
      )
    ),
  });
  
  if (!conversation) {
    return c.json({
      success: false,
      error: { message: 'Conversation not found' },
    }, 404);
  }
  
  // Remove existing labels
  await db.delete(conversationLabels)
    .where(eq(conversationLabels.conversationId, id));
  
  // Add new labels
  if (labelIds.length > 0) {
    await db.insert(conversationLabels).values(
      labelIds.map(labelId => ({
        conversationId: id,
        labelId,
      }))
    );
  }
  
  return c.json({
    success: true,
    message: 'Labels updated',
  });
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
        eq(conversations.participantOneId, user.id),
        eq(conversations.participantTwoId, user.id)
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
    sellerId: user.id,
    content,
    createdAt: now,
    updatedAt: now,
  });
  
  return c.json({
    success: true,
    data: {
      id: noteId,
      content,
      createdAt: now,
    },
  });
});

// CRM: Saved Replies
app.get('/crm/saved-replies', requireSeller, async (c) => {
  const user = c.get('user')!;
  const db = c.get('db');
  
  const replies = await db.query.savedReplies.findMany({
    where: eq(savedReplies.sellerId, user.id),
    orderBy: desc(savedReplies.useCount),
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
    sellerId: user.id,
    title: body.title,
    content: body.content,
    shortcut: body.shortcut || null,
    createdAt: now,
    updatedAt: now,
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
    where: eq(labels.sellerId, user.id),
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
    sellerId: user.id,
    name,
    color,
    createdAt: now,
    updatedAt: now,
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
    where: eq(pipelineStages.sellerId, user.id),
    orderBy: [pipelineStages.order],
  });
  
  return c.json({
    success: true,
    data: stages,
  });
});

export default app;
