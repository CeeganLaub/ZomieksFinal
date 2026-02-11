import { Hono } from 'hono';
import { z } from 'zod';
import { eq, and, desc, or } from 'drizzle-orm';
import { orders, services, servicePackages, users, transactions, escrowHolds, orderDeliveries, orderRevisions, conversations, reviews, sellerPayouts } from '@zomieks/db';
import { createId } from '@paralleldrive/cuid2';
import type { Env } from '../types';
import { authMiddleware, requireAuth } from '../middleware/auth';
import { validate, getValidatedBody } from '../middleware/validation';
import { calculateFees, DEFAULT_FEE_POLICY, formatAmount, getPayoutAvailableAt, type Gateway, type PaymentMethod, type FeeCalcOutput } from '../services/fee-engine';

const app = new Hono<{ Bindings: Env }>();

app.use('*', authMiddleware);

// Schemas
const quoteSchema = z.object({
  baseAmount: z.number().min(5000, 'Minimum order is R50'),
  gateway: z.enum(['PAYFAST', 'OZOW']),
  method: z.enum(['CARD', 'EFT', 'UNKNOWN']).default('UNKNOWN'),
});

const createOrderSchema = z.object({
  serviceId: z.string(),
  packageId: z.string(),
  requirements: z.string().optional(),
  gateway: z.enum(['PAYFAST', 'OZOW']).default('PAYFAST'),
  method: z.enum(['CARD', 'EFT', 'UNKNOWN']).default('UNKNOWN'),
});

const deliverySchema = z.object({
  message: z.string().min(10),
  attachments: z.array(z.object({
    url: z.string(),
    name: z.string(),
    size: z.number(),
    type: z.string(),
  })).optional(),
});

const revisionSchema = z.object({
  message: z.string().min(10),
});

const reviewSchema = z.object({
  rating: z.number().min(1).max(5),
  comment: z.string().min(10).max(1000),
  communicationRating: z.number().min(1).max(5).optional(),
  qualityRating: z.number().min(1).max(5).optional(),
  valueRating: z.number().min(1).max(5).optional(),
});

// Helper: Generate order number
function generateOrderNumber(): string {
  const prefix = 'ZOM';
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${random}-${timestamp}`;
}

// Helper: Format order (uses new gateway-aware fee model)
function formatOrder(order: any) {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    // Amounts in Rands (divide cents by 100)
    baseAmount: order.baseAmount / 100,
    buyerPlatformFee: (order.buyerPlatformFee ?? 0) / 100,
    buyerProcessingFee: (order.buyerProcessingFee ?? 0) / 100,
    sellerPlatformFee: (order.sellerPlatformFee ?? 0) / 100,
    grossAmount: (order.grossAmount ?? order.totalAmount ?? 0) / 100,
    sellerPayoutAmount: (order.sellerPayoutAmount ?? order.sellerPayout ?? 0) / 100,
    platformRevenue: (order.platformRevenue ?? 0) / 100,
    // Legacy fields for backward compatibility
    buyerFee: (order.buyerFee ?? order.buyerPlatformFee ?? 0) / 100,
    totalAmount: (order.totalAmount ?? order.grossAmount ?? 0) / 100,
    sellerPayout: (order.sellerPayout ?? order.sellerPayoutAmount ?? 0) / 100,
    currency: order.currency,
    gateway: order.gateway,
    gatewayMethod: order.gatewayMethod,
    requirements: order.requirements,
    deliveryDays: order.deliveryDays,
    revisions: order.revisions,
    revisionsUsed: order.revisionsUsed,
    paidAt: order.paidAt,
    startedAt: order.startedAt,
    deliveryDueAt: order.deliveryDueAt,
    deliveredAt: order.deliveredAt,
    completedAt: order.completedAt,
    createdAt: order.createdAt,
    service: order.service ? {
      id: order.service.id,
      title: order.service.title,
      slug: order.service.slug,
      images: order.service.images,
    } : null,
    package: order.package ? {
      id: order.package.id,
      tier: order.package.tier,
      name: order.package.name,
    } : null,
    buyer: order.buyer ? {
      id: order.buyer.id,
      username: order.buyer.username,
      firstName: order.buyer.firstName,
      lastName: order.buyer.lastName,
      avatar: order.buyer.avatar,
    } : null,
    seller: order.seller ? {
      id: order.seller.id,
      username: order.seller.username,
      firstName: order.seller.firstName,
      lastName: order.seller.lastName,
      avatar: order.seller.avatar,
    } : null,
  };
}

// POST /quote - Get fee breakdown before order creation
app.post('/quote', requireAuth, validate(quoteSchema), async (c) => {
  const { baseAmount, gateway, method } = getValidatedBody<{ baseAmount: number; gateway: Gateway; method: PaymentMethod }>(c);
  
  try {
    const fees = calculateFees({
      baseAmount,
      gateway,
      method,
      policy: DEFAULT_FEE_POLICY,
    });
    
    return c.json({
      success: true,
      data: fees,
    });
  } catch (err) {
    return c.json({
      success: false,
      error: { message: err instanceof Error ? err.message : 'Fee calculation failed' },
    }, 400);
  }
});

// GET /buying - Get orders as buyer
app.get('/buying', requireAuth, async (c) => {
  const user = c.get('user')!;
  const db = c.get('db');
  
  const page = parseInt(c.req.query('page') || '1');
  const limit = Math.min(parseInt(c.req.query('limit') || '20'), 50);
  const status = c.req.query('status');
  
  const conditions = [eq(orders.buyerId, user.id)];
  if (status) {
    conditions.push(eq(orders.status, status as any));
  }
  
  const allOrders = await db.query.orders.findMany({
    where: and(...conditions),
    with: {
      service: true,
      package: true,
      seller: true,
    },
    orderBy: desc(orders.createdAt),
    limit,
    offset: (page - 1) * limit,
  });
  
  return c.json({
    success: true,
    data: allOrders.map(formatOrder),
  });
});

// GET /selling - Get orders as seller
app.get('/selling', requireAuth, async (c) => {
  const user = c.get('user')!;
  const db = c.get('db');
  
  if (!user.isSeller) {
    return c.json({
      success: false,
      error: { message: 'Seller account required' },
    }, 403);
  }
  
  const page = parseInt(c.req.query('page') || '1');
  const limit = Math.min(parseInt(c.req.query('limit') || '20'), 50);
  const status = c.req.query('status');
  
  const conditions = [eq(orders.sellerId, user.id)];
  if (status) {
    conditions.push(eq(orders.status, status as any));
  }
  
  const allOrders = await db.query.orders.findMany({
    where: and(...conditions),
    with: {
      service: true,
      package: true,
      buyer: true,
    },
    orderBy: desc(orders.createdAt),
    limit,
    offset: (page - 1) * limit,
  });
  
  return c.json({
    success: true,
    data: allOrders.map(formatOrder),
  });
});

// GET /:id - Get single order
app.get('/:id', requireAuth, async (c) => {
  const { id } = c.req.param();
  const user = c.get('user')!;
  const db = c.get('db');
  
  const order = await db.query.orders.findFirst({
    where: and(
      eq(orders.id, id),
      or(
        eq(orders.buyerId, user.id),
        eq(orders.sellerId, user.id)
      )
    ),
    with: {
      service: true,
      package: true,
      buyer: true,
      seller: true,
      deliveries: {
        orderBy: desc(orderDeliveries.createdAt),
      },
      revisionRequests: {
        orderBy: desc(orderRevisions.requestedAt),
      },
      review: true,
    },
  });
  
  if (!order) {
    return c.json({
      success: false,
      error: { message: 'Order not found' },
    }, 404);
  }
  
  return c.json({
    success: true,
    data: {
      ...formatOrder(order),
      deliveries: order.deliveries,
      revisionRequests: order.revisionRequests,
      review: order.review,
    },
  });
});

// POST / - Create order
app.post('/', requireAuth, validate(createOrderSchema), async (c) => {
  const body = getValidatedBody<z.infer<typeof createOrderSchema>>(c);
  const user = c.get('user')!;
  const db = c.get('db');
  
  // Get service and package
  const service = await db.query.services.findFirst({
    where: and(
      eq(services.id, body.serviceId),
      eq(services.status, 'ACTIVE')
    ),
  });
  
  if (!service) {
    return c.json({
      success: false,
      error: { message: 'Service not found' },
    }, 404);
  }
  
  // Can't buy own service
  if (service.sellerId === user.id) {
    return c.json({
      success: false,
      error: { message: 'Cannot purchase your own service' },
    }, 400);
  }
  
  const pkg = await db.query.servicePackages.findFirst({
    where: and(
      eq(servicePackages.id, body.packageId),
      eq(servicePackages.serviceId, body.serviceId),
      eq(servicePackages.isActive, true)
    ),
  });
  
  if (!pkg) {
    return c.json({
      success: false,
      error: { message: 'Package not found' },
    }, 404);
  }
  
  // Calculate fees using gateway-aware fee engine
  const fees = calculateFees({
    baseAmount: pkg.price,
    gateway: body.gateway as Gateway,
    method: body.method as PaymentMethod,
    policy: DEFAULT_FEE_POLICY,
  });
  
  // Create order
  const orderId = createId();
  const orderNumber = generateOrderNumber();
  
  await db.insert(orders).values({
    id: orderId,
    orderNumber,
    buyerId: user.id,
    sellerId: service.sellerId,
    serviceId: service.id,
    packageId: pkg.id,
    // New gateway-aware fee model
    baseAmount: fees.baseAmount,
    buyerPlatformFee: fees.buyerPlatformFee,
    buyerProcessingFee: fees.buyerProcessingFee,
    sellerPlatformFee: fees.sellerPlatformFee,
    grossAmount: fees.grossAmount,
    sellerPayoutAmount: fees.sellerPayoutAmount,
    platformRevenue: fees.platformRevenue,
    gateway: body.gateway,
    gatewayMethod: body.method,
    // Legacy fields for backward compatibility
    buyerFee: fees.buyerPlatformFee,
    totalAmount: fees.grossAmount,
    sellerFee: fees.sellerPlatformFee,
    sellerPayout: fees.sellerPayoutAmount,
    requirements: body.requirements,
    deliveryDays: pkg.deliveryDays,
    revisions: pkg.revisions,
    status: 'PENDING_PAYMENT',
  });
  
  const order = await db.query.orders.findFirst({
    where: eq(orders.id, orderId),
    with: {
      service: true,
      package: true,
      seller: true,
    },
  });
  
  return c.json({
    success: true,
    data: formatOrder(order),
  }, 201);
});

// POST /:id/deliver - Deliver order (seller)
app.post('/:id/deliver', requireAuth, validate(deliverySchema), async (c) => {
  const { id } = c.req.param();
  const body = getValidatedBody<z.infer<typeof deliverySchema>>(c);
  const user = c.get('user')!;
  const db = c.get('db');
  
  const order = await db.query.orders.findFirst({
    where: and(
      eq(orders.id, id),
      eq(orders.sellerId, user.id)
    ),
  });
  
  if (!order) {
    return c.json({
      success: false,
      error: { message: 'Order not found' },
    }, 404);
  }
  
  if (!['IN_PROGRESS', 'REVISION_REQUESTED'].includes(order.status)) {
    return c.json({
      success: false,
      error: { message: 'Cannot deliver in current status' },
    }, 400);
  }
  
  // Create delivery
  await db.insert(orderDeliveries).values({
    orderId: id,
    message: body.message,
    attachments: body.attachments,
    status: 'PENDING',
  });
  
  // Update order status
  await db.update(orders)
    .set({
      status: 'DELIVERED',
      deliveredAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    .where(eq(orders.id, id));
  
  return c.json({
    success: true,
    message: 'Order delivered successfully',
  });
});

// POST /:id/revision - Request revision (buyer)
app.post('/:id/revision', requireAuth, validate(revisionSchema), async (c) => {
  const { id } = c.req.param();
  const body = getValidatedBody<z.infer<typeof revisionSchema>>(c);
  const user = c.get('user')!;
  const db = c.get('db');
  
  const order = await db.query.orders.findFirst({
    where: and(
      eq(orders.id, id),
      eq(orders.buyerId, user.id)
    ),
  });
  
  if (!order) {
    return c.json({
      success: false,
      error: { message: 'Order not found' },
    }, 404);
  }
  
  if (order.status !== 'DELIVERED') {
    return c.json({
      success: false,
      error: { message: 'Can only request revision on delivered orders' },
    }, 400);
  }
  
  if (order.revisionsUsed >= order.revisions) {
    return c.json({
      success: false,
      error: { message: 'No revisions remaining' },
    }, 400);
  }
  
  // Create revision request
  await db.insert(orderRevisions).values({
    orderId: id,
    message: body.message,
  });
  
  // Update order
  await db.update(orders)
    .set({
      status: 'REVISION_REQUESTED',
      revisionsUsed: order.revisionsUsed + 1,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(orders.id, id));
  
  return c.json({
    success: true,
    message: 'Revision requested',
  });
});

// POST /:id/accept - Accept delivery (buyer)
app.post('/:id/accept', requireAuth, async (c) => {
  const { id } = c.req.param();
  const user = c.get('user')!;
  const db = c.get('db');
  
  const order = await db.query.orders.findFirst({
    where: and(
      eq(orders.id, id),
      eq(orders.buyerId, user.id)
    ),
  });
  
  if (!order) {
    return c.json({
      success: false,
      error: { message: 'Order not found' },
    }, 404);
  }
  
  if (order.status !== 'DELIVERED') {
    return c.json({
      success: false,
      error: { message: 'Can only accept delivered orders' },
    }, 400);
  }
  
  // Update order to completed
  await db.update(orders)
    .set({
      status: 'COMPLETED',
      completedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    .where(eq(orders.id, id));
  
  // Queue escrow release
  await c.env.ESCROW_QUEUE.send({
    type: 'RELEASE_ESCROW',
    orderId: id,
    timestamp: new Date().toISOString(),
  });
  
  return c.json({
    success: true,
    message: 'Order completed',
  });
});

// POST /:id/review - Submit review (buyer)
app.post('/:id/review', requireAuth, validate(reviewSchema), async (c) => {
  const { id } = c.req.param();
  const body = getValidatedBody<z.infer<typeof reviewSchema>>(c);
  const user = c.get('user')!;
  const db = c.get('db');
  
  const order = await db.query.orders.findFirst({
    where: and(
      eq(orders.id, id),
      eq(orders.buyerId, user.id)
    ),
    with: {
      review: true,
    },
  });
  
  if (!order) {
    return c.json({
      success: false,
      error: { message: 'Order not found' },
    }, 404);
  }
  
  if (order.status !== 'COMPLETED') {
    return c.json({
      success: false,
      error: { message: 'Can only review completed orders' },
    }, 400);
  }
  
  if (order.review) {
    return c.json({
      success: false,
      error: { message: 'Review already submitted' },
    }, 400);
  }
  
  // Create review
  await db.insert(reviews).values({
    orderId: id,
    serviceId: order.serviceId,
    authorId: user.id,
    recipientId: order.sellerId,
    rating: body.rating,
    comment: body.comment,
    communicationRating: body.communicationRating,
    qualityRating: body.qualityRating,
    valueRating: body.valueRating,
  });
  
  // Update service rating
  const serviceReviews = await db.query.reviews.findMany({
    where: eq(reviews.serviceId, order.serviceId),
  });
  
  const avgRating = serviceReviews.reduce((sum, r) => sum + r.rating, 0) / serviceReviews.length;
  
  await db.update(services)
    .set({
      rating: Math.round(avgRating * 100),
      reviewCount: serviceReviews.length,
    })
    .where(eq(services.id, order.serviceId));
  
  return c.json({
    success: true,
    message: 'Review submitted',
  });
});

// POST /:id/cancel - Cancel order
app.post('/:id/cancel', requireAuth, async (c) => {
  const { id } = c.req.param();
  const { reason } = await c.req.json<{ reason?: string }>();
  const user = c.get('user')!;
  const db = c.get('db');
  
  const order = await db.query.orders.findFirst({
    where: and(
      eq(orders.id, id),
      or(
        eq(orders.buyerId, user.id),
        eq(orders.sellerId, user.id)
      )
    ),
  });
  
  if (!order) {
    return c.json({
      success: false,
      error: { message: 'Order not found' },
    }, 404);
  }
  
  // Can only cancel pending or in-progress orders
  if (!['PENDING_PAYMENT', 'PAID', 'IN_PROGRESS'].includes(order.status)) {
    return c.json({
      success: false,
      error: { message: 'Cannot cancel order in current status' },
    }, 400);
  }
  
  await db.update(orders)
    .set({
      status: 'CANCELLED',
      cancelledAt: new Date().toISOString(),
      cancelReason: reason,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(orders.id, id));
  
  // Queue refund if already paid
  if (['PAID', 'IN_PROGRESS'].includes(order.status)) {
    await c.env.ESCROW_QUEUE.send({
      type: 'PROCESS_REFUND',
      orderId: id,
      timestamp: new Date().toISOString(),
    });
  }
  
  return c.json({
    success: true,
    message: 'Order cancelled',
  });
});

export default app;
