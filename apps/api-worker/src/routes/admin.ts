import { Hono } from 'hono';
import { z } from 'zod';
import { eq, and, desc, sql, count, gte, lte, like, or, sum } from 'drizzle-orm';
import { 
  users, orders, services, sellerProfiles, transactions,
  disputes, refunds, sellerPayouts, subscriptions, categories, bankDetails,
  courses, userRoles, conversations, messages, courseEnrollments,
} from '@zomieks/db';
import { createId } from '@paralleldrive/cuid2';
import type { Env } from '../types';
import { authMiddleware, requireAuth, requireAdmin } from '../middleware/auth';
import { validate, getValidatedBody } from '../middleware/validation';
import { sendEmail } from '../services/email';
import {
  createPayoutBatch,
  confirmPayoutBatch,
  failPayoutBatch,
  getBatchStatus,
  generateBatchCSV,
} from '../services/payout-batch.service';
import { getPayoutMode, processOzowBatch } from '../services/ozow-payout.service';

const app = new Hono<{ Bindings: Env }>();

app.use('*', authMiddleware);
app.use('*', requireAuth);
app.use('*', requireAdmin);

// Schemas
const userActionSchema = z.object({
  action: z.enum(['suspend', 'unsuspend', 'verify', 'unverify', 'delete', 'make-admin', 'remove-admin']),
  reason: z.string().max(500).optional(),
});

const serviceActionSchema = z.object({
  action: z.enum(['approve', 'reject', 'suspend', 'feature', 'unfeature']),
  reason: z.string().max(500).optional(),
});

const disputeResolutionSchema = z.object({
  resolution: z.enum(['BUYER_FAVOR', 'SELLER_FAVOR', 'SPLIT', 'DISMISSED']),
  buyerRefundPercent: z.number().min(0).max(100).optional(),
  notes: z.string().max(2000).optional(),
});

const payoutActionSchema = z.object({
  action: z.enum(['process', 'reject']),
  reference: z.string().optional(),
  reason: z.string().optional(),
});

const batchConfirmSchema = z.object({
  confirmations: z.array(z.object({
    payoutId: z.string(),
    externalRef: z.string(),
  })).min(1),
});

const batchFailSchema = z.object({
  reason: z.string().min(1),
  payoutIds: z.array(z.string()).optional(),
});

// Dashboard Stats
app.get('/dashboard', async (c) => {
  const db = c.get('db');
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  
  // User stats
  const [userStats] = await db
    .select({
      total: count(),
      sellers: sql<number>`SUM(CASE WHEN ${users.isSeller} = true THEN 1 ELSE 0 END)`,
      newThisMonth: sql<number>`SUM(CASE WHEN ${users.createdAt} >= ${thirtyDaysAgo.toISOString()} THEN 1 ELSE 0 END)`,
    })
    .from(users);
  
  // Order stats
  const [orderStats] = await db
    .select({
      total: count(),
      completed: sql<number>`SUM(CASE WHEN ${orders.status} = 'COMPLETED' THEN 1 ELSE 0 END)`,
      inProgress: sql<number>`SUM(CASE WHEN ${orders.status} = 'IN_PROGRESS' THEN 1 ELSE 0 END)`,
      disputed: sql<number>`SUM(CASE WHEN ${orders.status} = 'DISPUTED' THEN 1 ELSE 0 END)`,
      revenue: sql<number>`COALESCE(SUM(CASE WHEN ${orders.status} = 'COMPLETED' THEN ${orders.platformRevenue} ELSE 0 END), 0)`,
    })
    .from(orders);
  
  // Monthly revenue
  const [monthlyRevenue] = await db
    .select({
      total: sql<number>`COALESCE(SUM(${orders.platformRevenue}), 0)`,
    })
    .from(orders)
    .where(and(
      eq(orders.status, 'COMPLETED'),
      gte(orders.completedAt, thirtyDaysAgo.toISOString())
    ));
  
  // Active disputes
  const [disputeStats] = await db
    .select({ count: count() })
    .from(disputes)
    .where(eq(disputes.status, 'OPEN'));
  
  // Pending payouts
  const [payoutStats] = await db
    .select({
      count: count(),
      total: sql<number>`COALESCE(SUM(${sellerPayouts.amount}), 0)`,
    })
    .from(sellerPayouts)
    .where(eq(sellerPayouts.status, 'PENDING'));
  
  // Pending service approvals
  const [pendingServices] = await db
    .select({ count: count() })
    .from(services)
    .where(eq(services.status, 'PENDING'));
  
  return c.json({
    success: true,
    data: {
      users: {
        total: Number(userStats.total),
        sellers: Number(userStats.sellers),
        newThisMonth: Number(userStats.newThisMonth),
      },
      orders: {
        total: Number(orderStats.total),
        completed: Number(orderStats.completed),
        inProgress: Number(orderStats.inProgress),
        disputed: Number(orderStats.disputed),
        totalRevenue: Number(orderStats.revenue) / 100,
        monthlyRevenue: Number(monthlyRevenue.total) / 100,
      },
      disputes: {
        open: Number(disputeStats.count),
      },
      payouts: {
        pending: Number(payoutStats.count),
        pendingAmount: Number(payoutStats.total) / 100,
      },
      services: {
        pendingApproval: Number(pendingServices.count),
      },
    },
  });
});

// User Management
app.get('/users', async (c) => {
  const db = c.get('db');
  const page = parseInt(c.req.query('page') || '1');
  const limit = parseInt(c.req.query('limit') || '20');
  const search = c.req.query('search');
  const role = c.req.query('role');
  const isSeller = c.req.query('isSeller');
  const status = c.req.query('status');
  const offset = (page - 1) * limit;
  
  let whereConditions: any[] = [];
  
  if (search) {
    whereConditions.push(or(
      like(users.email, `%${search}%`),
      like(users.username, `%${search}%`),
      like(users.firstName, `%${search}%`),
      like(users.lastName, `%${search}%`)
    ));
  }
  
  if (role === 'seller' || isSeller === 'true') {
    whereConditions.push(eq(users.isSeller, true));
  } else if (isSeller === 'false') {
    whereConditions.push(eq(users.isSeller, false));
  }
  
  if (status === 'suspended') {
    whereConditions.push(eq(users.isSuspended, true));
  } else if (status === 'active') {
    whereConditions.push(eq(users.isSuspended, false));
  }
  
  const userList = await db.query.users.findMany({
    where: whereConditions.length > 0 ? and(...whereConditions) : undefined,
    with: { sellerProfile: true },
    orderBy: desc(users.createdAt),
    limit,
    offset,
  });
  
  const [{ total }] = await db
    .select({ total: count() })
    .from(users)
    .where(whereConditions.length > 0 ? and(...whereConditions) : undefined);
  
  return c.json({
    success: true,
    data: userList.map(u => ({
      id: u.id,
      email: u.email,
      username: u.username,
      firstName: u.firstName,
      lastName: u.lastName,
      avatar: u.avatar,
      isSeller: u.isSeller,
      isAdmin: u.isAdmin,
      isEmailVerified: u.isEmailVerified,
      isSuspended: u.isSuspended,
      createdAt: u.createdAt,
      sellerProfile: u.sellerProfile ? {
        displayName: u.sellerProfile.displayName,
        level: u.sellerProfile.level,
        rating: u.sellerProfile.rating / 100,
        isVerified: u.sellerProfile.isVerified,
      } : null,
    })),
    meta: { page, limit, total: Number(total) },
  });
});

app.get('/users/:id', async (c) => {
  const { id } = c.req.param();
  const db = c.get('db');
  
  const user = await db.query.users.findFirst({
    where: eq(users.id, id),
    with: {
      sellerProfile: true,
      services: { limit: 10 },
      buyerOrders: { limit: 10, orderBy: desc(orders.createdAt) },
      sellerOrders: { limit: 10, orderBy: desc(orders.createdAt) },
    },
  });
  
  if (!user) {
    return c.json({
      success: false,
      error: { message: 'User not found' },
    }, 404);
  }
  
  return c.json({
    success: true,
    data: user,
  });
});

app.post('/users/:id/action', validate(userActionSchema), async (c) => {
  const { id } = c.req.param();
  const { action, reason } = getValidatedBody<z.infer<typeof userActionSchema>>(c);
  const db = c.get('db');
  
  const user = await db.query.users.findFirst({
    where: eq(users.id, id),
  });
  
  if (!user) {
    return c.json({
      success: false,
      error: { message: 'User not found' },
    }, 404);
  }
  
  const now = new Date().toISOString();
  
  switch (action) {
    case 'suspend':
      await db.update(users)
        .set({ isSuspended: true, suspendedReason: reason || 'Suspended by admin', updatedAt: now })
        .where(eq(users.id, id));
      break;
    
    case 'unsuspend':
      await db.update(users)
        .set({ isSuspended: false, suspendedReason: null, updatedAt: now })
        .where(eq(users.id, id));
      break;
    
    case 'verify':
      if (user.isSeller) {
        await db.update(sellerProfiles)
          .set({ isVerified: true })
          .where(eq(sellerProfiles.userId, id));
      }
      break;
    
    case 'unverify':
      if (user.isSeller) {
        await db.update(sellerProfiles)
          .set({ isVerified: false })
          .where(eq(sellerProfiles.userId, id));
      }
      break;
    
    case 'delete':
      // Soft delete - mark as suspended with deleted reason
      await db.update(users)
        .set({ 
          isSuspended: true, 
          suspendedReason: 'Account deleted by admin',
          updatedAt: now,
        })
        .where(eq(users.id, id));
      break;
    
    case 'make-admin':
      await db.update(users)
        .set({ isAdmin: true, updatedAt: now })
        .where(eq(users.id, id));
      break;
    
    case 'remove-admin': {
      // Prevent removing own admin access
      const currentUser = c.get('user')!;
      if (currentUser.id === id) {
        return c.json({
          success: false,
          error: { message: 'You cannot remove your own admin access' },
        }, 400);
      }
      await db.update(users)
        .set({ isAdmin: false, updatedAt: now })
        .where(eq(users.id, id));
      break;
    }
  }
  
  return c.json({
    success: true,
    message: `User ${action} successful`,
  });
});

// Create user from admin panel
const createUserSchema = z.object({
  email: z.string().email().max(255),
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/),
  password: z.string().min(8).max(128),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  role: z.enum(['BUYER', 'ADMIN', 'MODERATOR', 'SUPPORT', 'FINANCE']).default('BUYER'),
  country: z.string().max(100).optional(),
});

async function hashPasswordPBKDF2(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  const hash = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' }, keyMaterial, 256);
  const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');
  const hashHex = Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
  return `${saltHex}:${hashHex}`;
}

app.post('/users/create', validate(createUserSchema), async (c) => {
  const body = getValidatedBody<z.infer<typeof createUserSchema>>(c);
  const db = c.get('db');
  const now = new Date().toISOString();

  // Check if email or username already exists
  const existing = await db.query.users.findFirst({
    where: or(eq(users.email, body.email.toLowerCase()), eq(users.username, body.username.toLowerCase())),
  });
  if (existing) {
    return c.json({
      success: false,
      error: { message: existing.email === body.email.toLowerCase() ? 'Email already in use' : 'Username already taken' },
    }, 409);
  }

  const passwordHash = await hashPasswordPBKDF2(body.password);
  const userId = createId();

  await db.insert(users).values({
    id: userId,
    email: body.email.toLowerCase(),
    username: body.username.toLowerCase(),
    passwordHash,
    firstName: body.firstName,
    lastName: body.lastName,
    country: body.country || null,
    isEmailVerified: true,
    isAdmin: body.role === 'ADMIN',
    isAdminCreated: true,
    createdAt: now,
    updatedAt: now,
  });

  // Insert role into userRoles table
  await db.insert(userRoles).values({
    id: createId(),
    userId,
    role: body.role,
    createdAt: now,
  });

  return c.json({
    success: true,
    data: {
      user: { id: userId, email: body.email.toLowerCase(), username: body.username.toLowerCase(), role: body.role },
    },
    message: 'User created successfully',
  });
});

// Service Management
app.get('/services', async (c) => {
  const db = c.get('db');
  const page = parseInt(c.req.query('page') || '1');
  const limit = parseInt(c.req.query('limit') || '20');
  const status = c.req.query('status');
  const search = c.req.query('search');
  const offset = (page - 1) * limit;
  
  let whereConditions: any[] = [];
  
  if (status) {
    whereConditions.push(eq(services.status, status.toUpperCase()));
  }
  
  if (search) {
    whereConditions.push(like(services.title, `%${search}%`));
  }
  
  const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;
  
  const serviceList = await db.query.services.findMany({
    where: whereClause,
    with: {
      seller: {
        columns: { id: true, username: true, firstName: true, lastName: true, email: true },
        with: { sellerProfile: { columns: { displayName: true } } },
      },
      category: { columns: { name: true } },
      packages: { columns: { tier: true, price: true } },
    },
    orderBy: desc(services.createdAt),
    limit,
    offset,
  });
  
  const [{ total }] = await db
    .select({ total: count() })
    .from(services)
    .where(whereClause);
  
  return c.json({
    success: true,
    data: serviceList.map(s => ({
      id: s.id,
      title: s.title,
      slug: s.slug,
      status: s.status,
      isActive: s.isActive,
      isFeatured: s.isFeatured,
      rating: s.rating / 100,
      reviewCount: s.reviewCount,
      orderCount: s.orderCount,
      seller: s.seller,
      category: s.category,
      packages: s.packages,
      createdAt: s.createdAt,
    })),
    meta: { page, limit, total: Number(total) },
  });
});

app.post('/services/:id/action', validate(serviceActionSchema), async (c) => {
  const { id } = c.req.param();
  const { action, reason } = getValidatedBody<z.infer<typeof serviceActionSchema>>(c);
  const db = c.get('db');
  
  const service = await db.query.services.findFirst({
    where: eq(services.id, id),
  });
  
  if (!service) {
    return c.json({
      success: false,
      error: { message: 'Service not found' },
    }, 404);
  }
  
  const now = new Date().toISOString();
  
  switch (action) {
    case 'approve':
      await db.update(services)
        .set({ status: 'ACTIVE', isActive: true, updatedAt: now })
        .where(eq(services.id, id));
      break;
    
    case 'reject':
      await db.update(services)
        .set({ status: 'REJECTED', isActive: false, updatedAt: now })
        .where(eq(services.id, id));
      break;
    
    case 'suspend':
      await db.update(services)
        .set({ status: 'SUSPENDED', isActive: false, updatedAt: now })
        .where(eq(services.id, id));
      break;
    
    case 'feature':
      await db.update(services)
        .set({ isFeatured: true, updatedAt: now })
        .where(eq(services.id, id));
      break;
    
    case 'unfeature':
      await db.update(services)
        .set({ isFeatured: false, updatedAt: now })
        .where(eq(services.id, id));
      break;
  }
  
  return c.json({
    success: true,
    message: `Service ${action} successful`,
  });
});

// Dispute Management
app.get('/disputes', async (c) => {
  const db = c.get('db');
  const page = parseInt(c.req.query('page') || '1');
  const limit = parseInt(c.req.query('limit') || '20');
  const status = c.req.query('status') || 'OPEN';
  const offset = (page - 1) * limit;
  
  const disputeList = await db.query.disputes.findMany({
    where: eq(disputes.status, status),
    with: {
      order: {
        with: {
          buyer: { columns: { username: true, email: true } },
          seller: { columns: { username: true, email: true } },
        },
      },
    },
    orderBy: desc(disputes.createdAt),
    limit,
    offset,
  });
  
  const [{ total: disputeTotal }] = await db
    .select({ total: count() })
    .from(disputes)
    .where(eq(disputes.status, status));
  
  return c.json({
    success: true,
    data: disputeList,
    meta: { page, limit, total: Number(disputeTotal) },
  });
});

app.get('/disputes/:id', async (c) => {
  const { id } = c.req.param();
  const db = c.get('db');
  
  const dispute = await db.query.disputes.findFirst({
    where: eq(disputes.id, id),
    with: {
      order: {
        with: {
          buyer: true,
          seller: true,
          service: true,
          deliveries: true,
          revisions: true,
        },
      },
    },
  });
  
  if (!dispute) {
    return c.json({
      success: false,
      error: { message: 'Dispute not found' },
    }, 404);
  }
  
  return c.json({
    success: true,
    data: dispute,
  });
});

app.post('/disputes/:id/resolve', validate(disputeResolutionSchema), async (c) => {
  const { id } = c.req.param();
  const body = getValidatedBody<z.infer<typeof disputeResolutionSchema>>(c);
  const admin = c.get('user')!;
  const db = c.get('db');
  
  const dispute = await db.query.disputes.findFirst({
    where: eq(disputes.id, id),
    with: { order: true },
  });
  
  if (!dispute) {
    return c.json({
      success: false,
      error: { message: 'Dispute not found' },
    }, 404);
  }
  
  if (dispute.status !== 'OPEN' && dispute.status !== 'UNDER_REVIEW') {
    return c.json({
      success: false,
      error: { message: 'Dispute already resolved' },
    }, 400);
  }
  
  const now = new Date().toISOString();
  
  // Map resolution to proper dispute status
  const statusMap: Record<string, string> = {
    BUYER_FAVOR: 'RESOLVED_BUYER',
    SELLER_FAVOR: 'RESOLVED_SELLER',
    SPLIT: 'RESOLVED_SPLIT',
    DISMISSED: 'CLOSED',
  };
  const newStatus = statusMap[body.resolution] || 'CLOSED';
  
  // Update dispute
  await db.update(disputes)
    .set({
      status: newStatus,
      resolution: body.resolution,
      resolvedBy: admin.id,
      resolvedAt: now,
      updatedAt: now,
    })
    .where(eq(disputes.id, id));
  
  // Process refund if applicable
  if (body.resolution === 'BUYER_FAVOR' || body.resolution === 'SPLIT') {
    const refundPercent = body.buyerRefundPercent ?? (body.resolution === 'BUYER_FAVOR' ? 100 : 50);
    const refundAmount = Math.round(dispute.order.totalAmount * (refundPercent / 100));
    
    if (refundAmount > 0) {
      await db.insert(refunds).values({
        id: createId(),
        orderId: dispute.order.id,
        buyerId: dispute.order.buyerId,
        amount: refundAmount,
        reason: `Dispute resolution: ${body.resolution}`,
        status: 'PENDING',
        createdAt: now,
        updatedAt: now,
      });
    }
  }
  
  // Update order status
  await db.update(orders)
    .set({
      status: body.resolution === 'SELLER_FAVOR' ? 'COMPLETED' : 'CANCELLED',
      updatedAt: now,
    })
    .where(eq(orders.id, dispute.orderId));
  
  return c.json({
    success: true,
    message: 'Dispute resolved',
  });
});

// Payout Management
app.get('/payouts', async (c) => {
  const db = c.get('db');
  const page = parseInt(c.req.query('page') || '1');
  const limit = parseInt(c.req.query('limit') || '20');
  const status = c.req.query('status') || 'PENDING';
  const offset = (page - 1) * limit;
  
  const payoutList = await db.query.sellerPayouts.findMany({
    where: eq(sellerPayouts.status, status),
    with: {
      seller: {
        columns: { username: true, email: true },
        with: { sellerProfile: true },
      },
    },
    orderBy: desc(sellerPayouts.createdAt),
    limit,
    offset,
  });
  
  return c.json({
    success: true,
    data: payoutList.map(p => ({
      id: p.id,
      seller: p.seller,
      amount: p.amount / 100,
      currency: p.currency,
      status: p.status,
      bankDetails: p.bankDetailsSnapshot,
      createdAt: p.createdAt,
    })),
    meta: { page, limit },
  });
});

app.post('/payouts/:id/action', validate(payoutActionSchema), async (c) => {
  const { id } = c.req.param();
  const { action, reference, reason } = getValidatedBody<z.infer<typeof payoutActionSchema>>(c);
  const db = c.get('db');
  
  const payout = await db.query.sellerPayouts.findFirst({
    where: eq(sellerPayouts.id, id),
  });
  
  if (!payout) {
    return c.json({
      success: false,
      error: { message: 'Payout not found' },
    }, 404);
  }
  
  if (payout.status !== 'PENDING') {
    return c.json({
      success: false,
      error: { message: 'Payout already processed' },
    }, 400);
  }
  
  const now = new Date().toISOString();
  
  if (action === 'process') {
    await db.update(sellerPayouts)
      .set({
        status: 'COMPLETED',
        reference: reference || null,
        processedAt: now,
        updatedAt: now,
      })
      .where(eq(sellerPayouts.id, id));
    
    // Update seller pending balance
    await db.update(sellerProfiles)
      .set({
        pendingBalance: sql`${sellerProfiles.pendingBalance} - ${payout.amount}`,
      })
      .where(eq(sellerProfiles.userId, payout.sellerId));
  } else {
    // Reject - return to available balance
    await db.update(sellerPayouts)
      .set({
        status: 'FAILED',
        failureReason: reason || 'Rejected by admin',
        updatedAt: now,
      })
      .where(eq(sellerPayouts.id, id));
    
    await db.update(sellerProfiles)
      .set({
        balance: sql`${sellerProfiles.balance} + ${payout.amount}`,
        pendingBalance: sql`${sellerProfiles.pendingBalance} - ${payout.amount}`,
      })
      .where(eq(sellerProfiles.userId, payout.sellerId));
  }
  
  return c.json({
    success: true,
    message: `Payout ${action === 'process' ? 'processed' : 'rejected'}`,
  });
});

// Get current payout mode (manual or ozow)
app.get('/payouts/mode', async (c) => {
  const db = c.get('db');
  const mode = await getPayoutMode(db);
  return c.json({ success: true, data: { mode } });
});

// Batch Payout Management

// Create a new payout batch from eligible payouts
app.post('/payouts/batches/create', async (c) => {
  const db = c.get('db');
  const env = c.env;
  
  const batch = await createPayoutBatch(db);
  
  if (!batch) {
    return c.json({
      success: false,
      error: { message: 'No eligible payouts found' },
    }, 404);
  }
  
  // Check payout mode — if Ozow enabled, auto-process the batch
  const mode = await getPayoutMode(db);
  let ozowResult = null;
  
  if (mode === 'ozow') {
    ozowResult = await processOzowBatch(db, env, batch.items.map(item => ({
      payoutId: item.payoutId,
      amount: item.amount,
      bankName: item.bankName,
      accountNumber: item.accountNumberFull,
      branchCode: item.branchCode,
      accountHolder: item.accountHolder,
      accountType: item.accountType,
    })));
  }
  
  return c.json({
    success: true,
    data: {
      batchId: batch.batchId,
      createdAt: batch.createdAt,
      totalAmount: batch.totalAmountRands,
      payoutCount: batch.payoutCount,
      mode,
      ozowResult: ozowResult ? {
        successCount: ozowResult.successCount,
        failCount: ozowResult.failCount,
      } : undefined,
      items: batch.items.map(item => ({
        payoutId: item.payoutId,
        sellerId: item.sellerId,
        sellerEmail: item.sellerEmail,
        sellerName: item.sellerName,
        amount: item.amountRands,
        bankName: item.bankName,
        accountNumber: item.accountNumber, // Masked
        accountHolder: item.accountHolder,
      })),
    },
  });
});

// Download batch as CSV for bank EFT processing
app.get('/payouts/batches/:batchId/csv', async (c) => {
  const { batchId } = c.req.param();
  const db = c.get('db');
  
  // Reconstruct the batch from DB
  const payouts = await db.query.sellerPayouts.findMany({
    where: eq(sellerPayouts.batchId, batchId),
  });
  
  if (payouts.length === 0) {
    return c.json({
      success: false,
      error: { message: 'Batch not found' },
    }, 404);
  }
  
  // Build batch items from existing payouts
  const items = [];
  for (const payout of payouts) {
    const seller = await db.query.users.findFirst({
      where: eq(users.id, payout.sellerId),
    });
    
    // Parse stored bank details from snapshot if available
    let bankData = payout.bankDetailsSnapshot as Record<string, string> | null;
    
    if (!bankData) {
      // Fall back to fetching from bankDetails
      const bank = await db.query.bankDetails.findFirst({
        where: and(
          eq(bankDetails.userId, payout.sellerId),
          eq(bankDetails.isDefault, true)
        ),
      });
      if (bank) {
        bankData = {
          bankName: bank.bankName,
          accountNumber: bank.accountNumber,
          branchCode: bank.branchCode,
          accountHolder: bank.accountHolder,
          accountType: bank.accountType,
        };
      }
    }
    
    items.push({
      payoutId: payout.id,
      sellerId: payout.sellerId,
      sellerEmail: seller?.email || '',
      sellerName: seller ? `${seller.firstName} ${seller.lastName}` : '',
      amount: payout.amount,
      amountRands: (payout.amount || 0) / 100,
      currency: payout.currency || 'ZAR',
      orderId: payout.orderId,
      bankName: bankData?.bankName || '',
      accountNumber: `****${(bankData?.accountNumber || '').slice(-4)}`,
      accountNumberFull: bankData?.accountNumber || '',
      branchCode: bankData?.branchCode || '',
      accountHolder: bankData?.accountHolder || '',
      accountType: bankData?.accountType || '',
    });
  }
  
  const batch = {
    batchId,
    createdAt: payouts[0].createdAt || new Date().toISOString(),
    totalAmount: items.reduce((sum, i) => sum + i.amount, 0),
    totalAmountRands: items.reduce((sum, i) => sum + i.amountRands, 0),
    payoutCount: items.length,
    items,
  };
  
  const csv = generateBatchCSV(batch);
  
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="payout-batch-${batchId}.csv"`,
    },
  });
});

// Get batch status
app.get('/payouts/batches/:batchId', async (c) => {
  const { batchId } = c.req.param();
  const db = c.get('db');
  
  const status = await getBatchStatus(db, batchId);
  
  if (!status) {
    return c.json({
      success: false,
      error: { message: 'Batch not found' },
    }, 404);
  }
  
  return c.json({
    success: true,
    data: status,
  });
});

// Confirm batch payouts after bank processing
app.post('/payouts/batches/:batchId/confirm', validate(batchConfirmSchema), async (c) => {
  const { batchId } = c.req.param();
  const { confirmations } = getValidatedBody<z.infer<typeof batchConfirmSchema>>(c);
  const db = c.get('db');
  
  const result = await confirmPayoutBatch(db, batchId, confirmations);
  
  return c.json({
    success: result.success,
    data: {
      confirmedCount: result.confirmedCount,
      failedCount: result.failedCount,
      errors: result.errors,
    },
  });
});

// Mark batch payouts as failed
app.post('/payouts/batches/:batchId/fail', validate(batchFailSchema), async (c) => {
  const { batchId } = c.req.param();
  const { reason, payoutIds } = getValidatedBody<z.infer<typeof batchFailSchema>>(c);
  const db = c.get('db');
  
  const result = await failPayoutBatch(db, batchId, reason, payoutIds);
  
  return c.json({
    success: true,
    data: {
      failedCount: result.failedCount,
    },
  });
});

// Category Management
app.get('/categories', async (c) => {
  const db = c.get('db');
  
  const categoryList = await db.query.categories.findMany({
    orderBy: [categories.order, categories.name],
  });
  
  return c.json({
    success: true,
    data: categoryList,
  });
});

app.post('/categories', async (c) => {
  const db = c.get('db');
  const { name, slug, description, icon, parentId, order } = await c.req.json();
  
  if (!name || !slug) {
    return c.json({
      success: false,
      error: { message: 'Name and slug required' },
    }, 400);
  }
  
  const id = createId();
  const now = new Date().toISOString();
  
  await db.insert(categories).values({
    id,
    name,
    slug,
    description: description || null,
    icon: icon || null,
    parentId: parentId || null,
    order: order || 0,
    createdAt: now,
    updatedAt: now,
  });
  
  return c.json({
    success: true,
    data: { id },
  });
});

app.patch('/categories/:id', async (c) => {
  const { id } = c.req.param();
  const db = c.get('db');
  const updates = await c.req.json();
  
  await db.update(categories)
    .set({
      ...updates,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(categories.id, id));
  
  return c.json({
    success: true,
    message: 'Category updated',
  });
});

app.delete('/categories/:id', async (c) => {
  const { id } = c.req.param();
  const db = c.get('db');
  
  await db.delete(categories).where(eq(categories.id, id));
  
  return c.json({
    success: true,
    message: 'Category deleted',
  });
});

// Order Management
app.get('/orders', async (c) => {
  const db = c.get('db');
  const page = parseInt(c.req.query('page') || '1');
  const limit = parseInt(c.req.query('limit') || '20');
  const status = c.req.query('status');
  const search = c.req.query('search');
  const offset = (page - 1) * limit;
  
  let whereConditions: any[] = [];
  
  if (status) {
    whereConditions.push(eq(orders.status, status));
  }
  
  if (search) {
    whereConditions.push(like(orders.orderNumber, `%${search}%`));
  }
  
  const orderList = await db.query.orders.findMany({
    where: whereConditions.length > 0 ? and(...whereConditions) : undefined,
    with: {
      buyer: { columns: { username: true, email: true, firstName: true, lastName: true } },
      seller: { columns: { username: true, email: true, firstName: true, lastName: true } },
      service: { columns: { title: true, slug: true } },
    },
    orderBy: desc(orders.createdAt),
    limit,
    offset,
  });
  
  const [{ total }] = await db
    .select({ total: count() })
    .from(orders)
    .where(whereConditions.length > 0 ? and(...whereConditions) : undefined);
  
  return c.json({
    success: true,
    data: orderList.map(o => ({
      id: o.id,
      orderNumber: o.orderNumber,
      status: o.status,
      baseAmount: o.baseAmount / 100,
      grossAmount: (o.grossAmount || 0) / 100,
      platformRevenue: (o.platformRevenue || 0) / 100,
      buyer: o.buyer,
      seller: o.seller,
      service: o.service,
      createdAt: o.createdAt,
      completedAt: o.completedAt,
    })),
    meta: { page, limit, total: Number(total) },
  });
});

// Course Management (Admin)
app.get('/courses', async (c) => {
  const db = c.get('db');
  const page = parseInt(c.req.query('page') || '1');
  const limit = parseInt(c.req.query('limit') || '20');
  const status = c.req.query('status');
  const search = c.req.query('search');
  const offset = (page - 1) * limit;
  
  let whereConditions: any[] = [];
  
  if (status) {
    whereConditions.push(eq(courses.status, status));
  }
  
  if (search) {
    whereConditions.push(like(courses.title, `%${search}%`));
  }
  
  const courseList = await db.query.courses.findMany({
    where: whereConditions.length > 0 ? and(...whereConditions) : undefined,
    with: {
      seller: {
        columns: { id: true, displayName: true },
        with: { user: { columns: { username: true } } },
      },
      category: { columns: { name: true } },
    },
    orderBy: desc(courses.createdAt),
    limit,
    offset,
  });
  
  const [{ total }] = await db
    .select({ total: count() })
    .from(courses)
    .where(whereConditions.length > 0 ? and(...whereConditions) : undefined);
  
  return c.json({
    success: true,
    data: courseList,
    meta: { page, limit, total: Number(total) },
  });
});

app.patch('/courses/:id', async (c) => {
  const { id } = c.req.param();
  const db = c.get('db');
  const updates = await c.req.json();
  const now = new Date().toISOString();
  
  const allowedFields: Record<string, any> = {};
  if ('status' in updates) allowedFields.status = updates.status;
  if ('isFeatured' in updates) allowedFields.isFeatured = updates.isFeatured;
  
  await db.update(courses)
    .set({ ...allowedFields, updatedAt: now })
    .where(eq(courses.id, id));
  
  return c.json({ success: true, message: 'Course updated' });
});

// Pending KYC
app.get('/sellers/pending-kyc', async (c) => {
  const db = c.get('db');
  
  const sellers = await db.query.sellerProfiles.findMany({
    where: eq(sellerProfiles.kycStatus, 'SUBMITTED'),
    with: {
      user: {
        columns: { id: true, username: true, email: true, firstName: true, lastName: true, country: true },
        with: { bankDetails: true },
      },
    },
  });
  
  return c.json({
    success: true,
    data: { sellers },
  });
});

// Verify KYC
app.post('/sellers/:id/verify-kyc', async (c) => {
  const { id } = c.req.param();
  const db = c.get('db');
  const { status } = await c.req.json<{ status: 'VERIFIED' | 'REJECTED' }>();
  
  if (!status || !['VERIFIED', 'REJECTED'].includes(status)) {
    return c.json({
      success: false,
      error: { message: 'Status must be VERIFIED or REJECTED' },
    }, 400);
  }
  
  const profile = await db.query.sellerProfiles.findFirst({
    where: eq(sellerProfiles.userId, id),
  });
  
  if (!profile) {
    return c.json({
      success: false,
      error: { message: 'Seller profile not found' },
    }, 404);
  }

  // South Africa check: only SA sellers can be verified for payouts
  if (status === 'VERIFIED') {
    const user = await db.query.users.findFirst({
      where: eq(users.id, id),
      columns: { country: true },
    });
    const country = (user?.country || '').trim().toLowerCase();
    const validCountries = ['za', 'south africa', 'sa', 'rsa'];
    if (!validCountries.includes(country)) {
      return c.json({
        success: false,
        error: { message: `Only South African sellers can be verified for payouts. This seller's country is listed as "${user?.country || 'Not set'}".` },
      }, 400);
    }
  }
  
  const now = new Date().toISOString();
  await db.update(sellerProfiles)
    .set({
      kycStatus: status,
      isVerified: status === 'VERIFIED',
      updatedAt: now,
    })
    .where(eq(sellerProfiles.userId, id));
  
  return c.json({
    success: true,
    data: { profile: { ...profile, kycStatus: status, isVerified: status === 'VERIFIED' } },
    message: `Seller KYC ${status.toLowerCase()}`,
  });
});

// ============ ANALYTICS ============
app.get('/analytics', async (c) => {
  const db = c.get('db');
  const now = new Date();

  // Overview aggregates
  const [userStats] = await db
    .select({
      total: count(),
      sellers: sql<number>`SUM(CASE WHEN ${users.isSeller} = 1 THEN 1 ELSE 0 END)`,
    })
    .from(users);

  const [orderStats] = await db
    .select({
      total: count(),
      gmv: sql<number>`COALESCE(SUM(${orders.grossAmount}), 0)`,
      platformRevenue: sql<number>`COALESCE(SUM(CASE WHEN ${orders.status} = 'COMPLETED' THEN ${orders.platformRevenue} ELSE 0 END), 0)`,
    })
    .from(orders);

  const [payoutStats] = await db
    .select({
      total: sql<number>`COALESCE(SUM(${sellerPayouts.amount}), 0)`,
    })
    .from(sellerPayouts)
    .where(eq(sellerPayouts.status, 'COMPLETED'));

  const [serviceStats] = await db.select({ total: count() }).from(services);
  const [courseStats] = await db.select({ total: count() }).from(courses);
  const [enrollmentStats] = await db.select({ total: count() }).from(courseEnrollments);
  const [conversationStats] = await db.select({ total: count() }).from(conversations);

  const totalOrders = Number(orderStats.total);
  const totalConversations = Number(conversationStats.total);
  const platformConversionRate = totalConversations > 0
    ? Math.round((totalOrders / totalConversations) * 100)
    : 0;

  // Monthly data (last 6 months)
  const monthlyData = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthStart = d.toISOString().slice(0, 10);
    const nextMonth = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    const monthEnd = nextMonth.toISOString().slice(0, 10);
    const monthLabel = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

    const [mOrders] = await db
      .select({
        revenue: sql<number>`COALESCE(SUM(CASE WHEN ${orders.status} = 'COMPLETED' THEN ${orders.platformRevenue} ELSE 0 END), 0)`,
        orderCount: count(),
      })
      .from(orders)
      .where(and(gte(orders.createdAt, monthStart), lte(orders.createdAt, monthEnd)));

    const [mUsers] = await db
      .select({ userCount: count() })
      .from(users)
      .where(and(gte(users.createdAt, monthStart), lte(users.createdAt, monthEnd)));

    monthlyData.push({
      month: monthLabel,
      revenue: Number(mOrders.revenue) / 100,
      orders: Number(mOrders.orderCount),
      users: Number(mUsers.userCount),
      isPartial: i === 0,
    });
  }

  // Orders by status
  const statusRows = await db
    .select({
      status: orders.status,
      cnt: count(),
      totalAmount: sql<number>`COALESCE(SUM(${orders.grossAmount}), 0)`,
    })
    .from(orders)
    .groupBy(orders.status);

  const ordersByStatus = statusRows.map((r) => ({
    status: r.status,
    count: Number(r.cnt),
    totalAmount: Number(r.totalAmount) / 100,
  }));

  // Top services (by order count)
  const topServiceRows = await db.query.services.findMany({
    orderBy: desc(services.orderCount),
    limit: 10,
    with: {
      seller: {
        columns: { username: true },
        with: { sellerProfile: { columns: { displayName: true } } },
      },
      packages: { columns: { price: true } },
    },
  });

  const topServices = topServiceRows.map((s) => ({
    id: s.id,
    title: s.title,
    seller: s.seller?.sellerProfile?.displayName || s.seller?.username || 'Unknown',
    orderCount: s.orderCount,
    viewCount: s.viewCount,
    rating: s.rating / 100,
    reviewCount: s.reviewCount,
    startingPrice: s.packages?.length
      ? Math.min(...s.packages.map((p) => p.price)) / 100
      : 0,
  }));

  // Top courses (by enroll count)
  const topCourseRows = await db.query.courses.findMany({
    orderBy: desc(courses.enrollCount),
    limit: 10,
    with: {
      seller: {
        columns: { displayName: true },
      },
    },
  });

  const topCourses = topCourseRows.map((cr) => ({
    id: cr.id,
    title: cr.title,
    instructor: cr.seller?.displayName || 'Unknown',
    enrollCount: cr.enrollCount,
    rating: cr.rating / 100,
    reviewCount: cr.reviewCount,
    price: cr.price / 100,
  }));

  return c.json({
    success: true,
    data: {
      overview: {
        totalUsers: Number(userStats.total),
        totalSellers: Number(userStats.sellers),
        totalOrders,
        totalGMV: Number(orderStats.gmv) / 100,
        totalPlatformRevenue: Number(orderStats.platformRevenue) / 100,
        totalSellerPayouts: Number(payoutStats.total) / 100,
        totalServices: Number(serviceStats.total),
        totalCourses: Number(courseStats.total),
        totalEnrollments: Number(enrollmentStats.total),
        totalConversations,
        platformConversionRate,
      },
      monthlyData,
      ordersByStatus,
      topServices,
      topCourses,
    },
  });
});

// ============ ADMIN INBOX / CONVERSATIONS ============

// List conversations
app.get('/conversations', async (c) => {
  const db = c.get('db');
  const page = parseInt(c.req.query('page') || '1');
  const limit = parseInt(c.req.query('limit') || '20');
  const search = c.req.query('search');
  const flagged = c.req.query('flagged');
  const offset = (page - 1) * limit;

  let whereConditions: any[] = [];

  if (flagged === 'true') {
    whereConditions.push(eq(conversations.adminFlagged, true));
  }

  const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;

  // Get conversations
  const convList = await db.query.conversations.findMany({
    where: whereClause,
    with: {
      buyer: { columns: { id: true, username: true, email: true, firstName: true, avatar: true } },
      seller: { columns: { id: true, username: true, email: true, firstName: true, avatar: true } },
      order: { columns: { id: true, orderNumber: true, status: true, totalAmount: true } },
      messages: {
        orderBy: desc(messages.createdAt),
        limit: 1,
        columns: { id: true, content: true, type: true, senderId: true, createdAt: true },
      },
    },
    orderBy: desc(conversations.lastMessageAt),
    limit,
    offset,
  });

  // Apply search filter in-memory (searches buyer/seller username/email)
  let filtered = convList;
  if (search) {
    const s = search.toLowerCase();
    filtered = convList.filter((conv) =>
      conv.buyer?.username?.toLowerCase().includes(s) ||
      conv.buyer?.email?.toLowerCase().includes(s) ||
      conv.seller?.username?.toLowerCase().includes(s) ||
      conv.seller?.email?.toLowerCase().includes(s)
    );
  }

  const [{ total }] = await db
    .select({ total: count() })
    .from(conversations)
    .where(whereClause);

  return c.json({
    success: true,
    data: {
      conversations: filtered.map((conv) => ({
        id: conv.id,
        buyerId: conv.buyerId,
        sellerId: conv.sellerId,
        status: conv.status,
        adminFlagged: conv.adminFlagged,
        adminNotes: conv.adminNotes,
        lastMessageAt: conv.lastMessageAt,
        createdAt: conv.createdAt,
        buyer: conv.buyer,
        seller: conv.seller,
        order: conv.order ? {
          id: conv.order.id,
          orderNumber: conv.order.orderNumber,
          status: conv.order.status,
          totalAmount: (conv.order.totalAmount || 0) / 100,
        } : null,
        messages: conv.messages || [],
        _count: { messages: conv.messageCount },
      })),
    },
    meta: { page, limit, total: Number(total) },
  });
});

// Get conversation detail
app.get('/conversations/:id', async (c) => {
  const { id } = c.req.param();
  const db = c.get('db');

  const conv = await db.query.conversations.findFirst({
    where: eq(conversations.id, id),
    with: {
      buyer: { columns: { id: true, username: true, email: true, firstName: true, avatar: true } },
      seller: { columns: { id: true, username: true, email: true, firstName: true, avatar: true } },
      order: { columns: { id: true, orderNumber: true, status: true, totalAmount: true } },
      messages: {
        orderBy: messages.createdAt,
        with: {
          sender: { columns: { id: true, username: true, firstName: true, avatar: true } },
        },
      },
    },
  });

  if (!conv) {
    return c.json({ success: false, error: { message: 'Conversation not found' } }, 404);
  }

  return c.json({
    success: true,
    data: {
      conversation: {
        id: conv.id,
        buyerId: conv.buyerId,
        sellerId: conv.sellerId,
        adminFlagged: conv.adminFlagged,
        adminNotes: conv.adminNotes,
        buyer: conv.buyer,
        seller: conv.seller,
        order: conv.order ? {
          id: conv.order.id,
          orderNumber: conv.order.orderNumber,
          status: conv.order.status,
          totalAmount: (conv.order.totalAmount || 0) / 100,
        } : null,
        messages: conv.messages.map((m) => ({
          id: m.id,
          content: m.content,
          type: m.type,
          senderId: m.senderId,
          createdAt: m.createdAt,
          sender: m.sender,
        })),
      },
    },
  });
});

// Flag conversation
app.post('/conversations/:id/flag', async (c) => {
  const { id } = c.req.param();
  const db = c.get('db');
  const { reason } = await c.req.json<{ reason?: string }>();

  const conv = await db.query.conversations.findFirst({
    where: eq(conversations.id, id),
    columns: { id: true },
  });

  if (!conv) {
    return c.json({ success: false, error: { message: 'Conversation not found' } }, 404);
  }

  const now = new Date().toISOString();
  await db.update(conversations)
    .set({ adminFlagged: true, adminNotes: reason || 'Flagged by admin', updatedAt: now })
    .where(eq(conversations.id, id));

  return c.json({ success: true, message: 'Conversation flagged' });
});

// Unflag conversation
app.post('/conversations/:id/unflag', async (c) => {
  const { id } = c.req.param();
  const db = c.get('db');

  const conv = await db.query.conversations.findFirst({
    where: eq(conversations.id, id),
    columns: { id: true },
  });

  if (!conv) {
    return c.json({ success: false, error: { message: 'Conversation not found' } }, 404);
  }

  const now = new Date().toISOString();
  await db.update(conversations)
    .set({ adminFlagged: false, adminNotes: null, updatedAt: now })
    .where(eq(conversations.id, id));

  return c.json({ success: true, message: 'Conversation unflagged' });
});

// Send test email (admin only)
app.post('/email/test', async (c) => {
  const body = await c.req.json<{ to: string }>();
  const to = body?.to;
  if (!to || typeof to !== 'string' || !to.includes('@')) {
    return c.json({ success: false, error: { message: 'Valid "to" email required' } }, 400);
  }

  try {
    const result = await sendEmail(
      {
        to,
        subject: 'Zomieks Test Email',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #00b22d;">Email Setup Working!</h1>
            <p>This is a test email from your Zomieks platform.</p>
            <p>If you're reading this, your Resend email integration is configured correctly.</p>
            <p style="color: #666;">— Zomieks Platform</p>
          </div>
        `,
      },
      'noreply@zomieks.com',
      'Zomieks',
      c.env
    );

    return c.json({
      success: result.success,
      data: { sent: result.success, hasApiKey: !!c.env.RESEND_API_KEY, error: result.error },
    });
  } catch (error: any) {
    return c.json({
      success: false,
      error: { message: error?.message || 'Unknown error' },
      data: { hasApiKey: !!c.env.RESEND_API_KEY },
    });
  }
});

export default app;
