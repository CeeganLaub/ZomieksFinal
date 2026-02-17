import { Hono } from 'hono';
import { z } from 'zod';
import { eq, and, desc, sql, count, gte, lte, like, or, sum } from 'drizzle-orm';
import { SignJWT } from 'jose';
import { 
  users, orders, services, sellerProfiles, transactions,
  disputes, refunds, sellerPayouts, subscriptions, categories, bankDetails,
  courses, userRoles, conversations, messages, courseEnrollments,
  subscriptionPayments, escrowHolds,
  sellerMetrics, sellerSubscriptions, reviews, servicePackages, pipelineStages,
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
  
  // User stats (exclude admin-created)
  const [userStats] = await db
    .select({
      total: count(),
      sellers: sql<number>`SUM(CASE WHEN ${users.isSeller} = true THEN 1 ELSE 0 END)`,
      newThisMonth: sql<number>`SUM(CASE WHEN ${users.createdAt} >= ${thirtyDaysAgo.toISOString()} THEN 1 ELSE 0 END)`,
    })
    .from(users)
    .where(eq(users.isAdminCreated, false));
  
  // Order stats (exclude admin-created)
  const [orderStats] = await db
    .select({
      total: count(),
      completed: sql<number>`SUM(CASE WHEN ${orders.status} = 'COMPLETED' THEN 1 ELSE 0 END)`,
      inProgress: sql<number>`SUM(CASE WHEN ${orders.status} = 'IN_PROGRESS' THEN 1 ELSE 0 END)`,
      disputed: sql<number>`SUM(CASE WHEN ${orders.status} = 'DISPUTED' THEN 1 ELSE 0 END)`,
      revenue: sql<number>`COALESCE(SUM(CASE WHEN ${orders.status} = 'COMPLETED' THEN ${orders.platformRevenue} ELSE 0 END), 0)`,
    })
    .from(orders)
    .where(sql`is_admin_created = 0 OR is_admin_created IS NULL`);
  
  // Monthly revenue (exclude admin-created)
  const [monthlyRevenue] = await db
    .select({
      total: sql<number>`COALESCE(SUM(${orders.platformRevenue}), 0)`,
    })
    .from(orders)
    .where(and(
      eq(orders.status, 'COMPLETED'),
      gte(orders.completedAt, thirtyDaysAgo.toISOString()),
      sql`is_admin_created = 0 OR is_admin_created IS NULL`
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
  const status = c.req.query('status');
  const offset = (page - 1) * limit;
  
  const whereClause = status && status !== 'ALL'
    ? eq(sellerPayouts.status, status)
    : undefined;
  
  const payoutList = await db.query.sellerPayouts.findMany({
    where: whereClause,
    with: {
      seller: {
        columns: { id: true, username: true, email: true, country: true },
        with: {
          sellerProfile: {
            columns: { kycStatus: true, isVerified: true },
          },
          bankDetails: {
            columns: {
              id: true, bankName: true, accountNumber: true, branchCode: true,
              accountType: true, accountHolder: true, isVerified: true,
            },
          },
        },
      },
    },
    orderBy: desc(sellerPayouts.createdAt),
    limit,
    offset,
  });

  // Get total count for pagination
  const [totalResult] = await db
    .select({ total: count() })
    .from(sellerPayouts)
    .where(whereClause ? whereClause : sql`1=1`);
  const total = Number(totalResult.total);
  
  return c.json({
    success: true,
    data: payoutList.map(p => {
      const bank = p.seller?.bankDetails;
      const snapshot = p.bankDetailsSnapshot as any;
      return {
        id: p.id,
        sellerId: p.seller?.id,
        seller: {
          username: p.seller?.username,
          email: p.seller?.email,
          country: p.seller?.country,
          kycStatus: p.seller?.sellerProfile?.kycStatus || 'PENDING',
          isKycVerified: p.seller?.sellerProfile?.isVerified || false,
          bankDetails: bank ? {
            bankName: bank.bankName,
            accountNumber: `****${bank.accountNumber.slice(-4)}`,
            branchCode: bank.branchCode,
            accountType: bank.accountType,
            accountHolder: bank.accountHolder,
            isVerified: bank.isVerified,
          } : snapshot ? {
            bankName: snapshot.bankName || '',
            accountNumber: snapshot.accountNumber ? `****${snapshot.accountNumber.slice(-4)}` : '',
            branchCode: snapshot.branchCode || '',
            accountType: snapshot.accountType || '',
            accountHolder: snapshot.accountHolder || '',
            isVerified: false,
          } : null,
        },
        amount: p.amount / 100,
        fee: (p.fee || 0) / 100,
        netAmount: (p.netAmount || p.amount) / 100,
        currency: p.currency,
        status: p.status,
        batchId: p.batchId,
        bankReference: p.bankReference || p.externalRef,
        failedReason: p.failedReason,
        processedAt: p.processedAt,
        failedAt: p.failedAt,
        createdAt: p.createdAt,
      };
    }),
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
});

// Payout summary stats
app.get('/payouts/summary', async (c) => {
  const db = c.get('db');

  const [stats] = await db
    .select({
      totalPending: sql<number>`COALESCE(SUM(CASE WHEN ${sellerPayouts.status} = 'PENDING' THEN ${sellerPayouts.amount} ELSE 0 END), 0)`,
      pendingCount: sql<number>`SUM(CASE WHEN ${sellerPayouts.status} = 'PENDING' THEN 1 ELSE 0 END)`,
      totalProcessing: sql<number>`COALESCE(SUM(CASE WHEN ${sellerPayouts.status} = 'PROCESSING' THEN ${sellerPayouts.amount} ELSE 0 END), 0)`,
      processingCount: sql<number>`SUM(CASE WHEN ${sellerPayouts.status} = 'PROCESSING' THEN 1 ELSE 0 END)`,
      totalCompleted: sql<number>`COALESCE(SUM(CASE WHEN ${sellerPayouts.status} IN ('COMPLETED', 'PAID') THEN ${sellerPayouts.amount} ELSE 0 END), 0)`,
      completedCount: sql<number>`SUM(CASE WHEN ${sellerPayouts.status} IN ('COMPLETED', 'PAID') THEN 1 ELSE 0 END)`,
      totalFailed: sql<number>`COALESCE(SUM(CASE WHEN ${sellerPayouts.status} = 'FAILED' THEN ${sellerPayouts.amount} ELSE 0 END), 0)`,
      failedCount: sql<number>`SUM(CASE WHEN ${sellerPayouts.status} = 'FAILED' THEN 1 ELSE 0 END)`,
    })
    .from(sellerPayouts);

  // Count sellers with verified KYC and bank details
  const verifiedSellers = await db.query.sellerProfiles.findMany({
    where: eq(sellerProfiles.kycStatus, 'VERIFIED'),
    columns: { userId: true },
  });
  const verifiedSellerIds = verifiedSellers.map(s => s.userId);

  let sellersWithBank = 0;
  if (verifiedSellerIds.length > 0) {
    for (const uid of verifiedSellerIds) {
      const bank = await db.query.bankDetails.findFirst({
        where: eq(bankDetails.userId, uid),
        columns: { id: true },
      });
      if (bank) sellersWithBank++;
    }
  }

  return c.json({
    success: true,
    data: {
      pending: { amount: Number(stats.totalPending) / 100, count: Number(stats.pendingCount) || 0 },
      processing: { amount: Number(stats.totalProcessing) / 100, count: Number(stats.processingCount) || 0 },
      completed: { amount: Number(stats.totalCompleted) / 100, count: Number(stats.completedCount) || 0 },
      failed: { amount: Number(stats.totalFailed) / 100, count: Number(stats.failedCount) || 0 },
      eligibleSellers: {
        kycVerified: verifiedSellerIds.length,
        withBankDetails: sellersWithBank,
      },
    },
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

// ============ FINANCE / INCOME & EXPENSES ============
app.get('/finance', async (c) => {
  const db = c.get('db');
  const now = new Date();

  // --- INCOME: Orders ---
  const [orderIncome] = await db
    .select({
      totalGMV: sql<number>`COALESCE(SUM(${orders.grossAmount}), 0)`,
      totalBaseAmount: sql<number>`COALESCE(SUM(${orders.baseAmount}), 0)`,
      totalBuyerPlatformFees: sql<number>`COALESCE(SUM(${orders.buyerPlatformFee}), 0)`,
      totalBuyerProcessingFees: sql<number>`COALESCE(SUM(${orders.buyerProcessingFee}), 0)`,
      totalSellerFees: sql<number>`COALESCE(SUM(${orders.sellerPlatformFee}), 0)`,
      totalPlatformRevenue: sql<number>`COALESCE(SUM(${orders.platformRevenue}), 0)`,
      totalSellerPayoutAmount: sql<number>`COALESCE(SUM(${orders.sellerPayoutAmount}), 0)`,
      orderCount: count(),
    })
    .from(orders)
    .where(sql`${orders.status} IN ('COMPLETED', 'IN_PROGRESS', 'DELIVERED') AND (is_admin_created = 0 OR is_admin_created IS NULL)`);

  // --- INCOME: Course Sales ---
  const [courseIncome] = await db
    .select({
      totalCourseSales: sql<number>`COALESCE(SUM(${courseEnrollments.amountPaid}), 0)`,
      courseRefunds: sql<number>`COALESCE(SUM(${courseEnrollments.refundedAmount}), 0)`,
      enrollmentCount: count(),
    })
    .from(courseEnrollments);

  // --- INCOME: Subscription Payments ---
  const [subIncome] = await db
    .select({
      totalSubscriptionIncome: sql<number>`COALESCE(SUM(${subscriptionPayments.platformRevenue}), 0)`,
      totalSubscriptionGross: sql<number>`COALESCE(SUM(${subscriptionPayments.totalAmount}), 0)`,
      subPaymentCount: count(),
    })
    .from(subscriptionPayments);

  // --- EXPENSES: Seller Payouts ---
  const [payoutExpenses] = await db
    .select({
      completedPayouts: sql<number>`COALESCE(SUM(CASE WHEN ${sellerPayouts.status} = 'COMPLETED' THEN ${sellerPayouts.amount} ELSE 0 END), 0)`,
      pendingPayouts: sql<number>`COALESCE(SUM(CASE WHEN ${sellerPayouts.status} = 'PENDING' THEN ${sellerPayouts.amount} ELSE 0 END), 0)`,
      failedPayouts: sql<number>`COALESCE(SUM(CASE WHEN ${sellerPayouts.status} = 'FAILED' THEN ${sellerPayouts.amount} ELSE 0 END), 0)`,
      completedCount: sql<number>`SUM(CASE WHEN ${sellerPayouts.status} = 'COMPLETED' THEN 1 ELSE 0 END)`,
      pendingCount: sql<number>`SUM(CASE WHEN ${sellerPayouts.status} = 'PENDING' THEN 1 ELSE 0 END)`,
    })
    .from(sellerPayouts);

  // --- EXPENSES: Refunds ---
  const [refundExpenses] = await db
    .select({
      totalRefunds: sql<number>`COALESCE(SUM(CASE WHEN ${refunds.status} IN ('COMPLETED', 'PENDING') THEN ${refunds.amount} ELSE 0 END), 0)`,
      refundCount: sql<number>`SUM(CASE WHEN ${refunds.status} IN ('COMPLETED', 'PENDING') THEN 1 ELSE 0 END)`,
      processingFees: sql<number>`COALESCE(SUM(${refunds.processingFee}), 0)`,
    })
    .from(refunds);

  // --- EXPENSES: Gateway Fees ---
  const [gatewayExpenses] = await db
    .select({
      totalGatewayFees: sql<number>`COALESCE(SUM(${transactions.gatewayFee}), 0)`,
      txCount: count(),
    })
    .from(transactions)
    .where(eq(transactions.status, 'COMPLETED'));

  // --- Escrow Status ---
  const [escrowStats] = await db
    .select({
      heldAmount: sql<number>`COALESCE(SUM(CASE WHEN ${escrowHolds.status} = 'HELD' THEN ${escrowHolds.grossAmount} ELSE 0 END), 0)`,
      releasedAmount: sql<number>`COALESCE(SUM(CASE WHEN ${escrowHolds.status} = 'RELEASED' THEN ${escrowHolds.grossAmount} ELSE 0 END), 0)`,
      refundedAmount: sql<number>`COALESCE(SUM(CASE WHEN ${escrowHolds.status} = 'REFUNDED' THEN ${escrowHolds.grossAmount} ELSE 0 END), 0)`,
      heldCount: sql<number>`SUM(CASE WHEN ${escrowHolds.status} = 'HELD' THEN 1 ELSE 0 END)`,
    })
    .from(escrowHolds);

  // --- Monthly Breakdown (12 months) ---
  const monthlyData = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthStart = d.toISOString().slice(0, 10);
    const nextMonth = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    const monthEnd = nextMonth.toISOString().slice(0, 10);
    const monthLabel = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

    const [mOrders] = await db
      .select({
        income: sql<number>`COALESCE(SUM(${orders.platformRevenue}), 0)`,
        gmv: sql<number>`COALESCE(SUM(${orders.grossAmount}), 0)`,
        buyerFees: sql<number>`COALESCE(SUM(${orders.buyerPlatformFee} + ${orders.buyerProcessingFee}), 0)`,
        sellerFees: sql<number>`COALESCE(SUM(${orders.sellerPlatformFee}), 0)`,
        orderCount: count(),
      })
      .from(orders)
      .where(and(
        gte(orders.createdAt, monthStart),
        lte(orders.createdAt, monthEnd),
        sql`${orders.status} IN ('COMPLETED', 'IN_PROGRESS', 'DELIVERED') AND (is_admin_created = 0 OR is_admin_created IS NULL)`,
      ));

    const [mPayouts] = await db
      .select({
        payouts: sql<number>`COALESCE(SUM(${sellerPayouts.amount}), 0)`,
      })
      .from(sellerPayouts)
      .where(and(
        eq(sellerPayouts.status, 'COMPLETED'),
        gte(sellerPayouts.processedAt, monthStart),
        lte(sellerPayouts.processedAt, monthEnd),
      ));

    const [mRefunds] = await db
      .select({
        refunds: sql<number>`COALESCE(SUM(${refunds.amount}), 0)`,
      })
      .from(refunds)
      .where(and(
        sql`${refunds.status} IN ('COMPLETED', 'PENDING')`,
        gte(refunds.createdAt, monthStart),
        lte(refunds.createdAt, monthEnd),
      ));

    const [mCourses] = await db
      .select({
        courseSales: sql<number>`COALESCE(SUM(${courseEnrollments.amountPaid}), 0)`,
      })
      .from(courseEnrollments)
      .where(and(
        gte(courseEnrollments.createdAt, monthStart),
        lte(courseEnrollments.createdAt, monthEnd),
      ));

    const income = Number(mOrders.income) + Number(mCourses.courseSales);
    const expenses = Number(mPayouts.payouts) + Number(mRefunds.refunds);

    monthlyData.push({
      month: monthLabel,
      income: income / 100,
      gmv: Number(mOrders.gmv) / 100,
      buyerFees: Number(mOrders.buyerFees) / 100,
      sellerFees: Number(mOrders.sellerFees) / 100,
      courseSales: Number(mCourses.courseSales) / 100,
      payouts: Number(mPayouts.payouts) / 100,
      refunds: Number(mRefunds.refunds) / 100,
      expenses: expenses / 100,
      netProfit: (income - expenses) / 100,
      orders: Number(mOrders.orderCount),
      isPartial: i === 0,
    });
  }

  // --- Recent Transactions (latest 25) ---
  const recentTx = await db.query.transactions.findMany({
    orderBy: desc(transactions.createdAt),
    limit: 25,
    columns: {
      id: true, type: true, status: true, grossAmount: true, gatewayFee: true,
      netAmount: true, platformRevenue: true, gateway: true, gatewayMethod: true,
      createdAt: true, paidAt: true,
    },
    with: {
      order: { columns: { orderNumber: true, buyerId: true, sellerId: true } },
    },
  });

  // --- Recent Payouts (latest 10) ---
  const recentPayouts = await db.query.sellerPayouts.findMany({
    orderBy: desc(sellerPayouts.createdAt),
    limit: 10,
    columns: {
      id: true, amount: true, fee: true, netAmount: true, status: true,
      currency: true, processedAt: true, createdAt: true,
    },
    with: {
      seller: { columns: { username: true, email: true } },
    },
  });

  // --- Recent Refunds (latest 10) ---
  const recentRefunds = await db.query.refunds.findMany({
    orderBy: desc(refunds.createdAt),
    limit: 10,
    columns: {
      id: true, amount: true, processingFee: true, reason: true, status: true,
      refundType: true, createdAt: true,
    },
  });

  // VAT estimate (15% of platform revenue)
  const vatPct = 15;
  const totalPlatformRev = Number(orderIncome.totalPlatformRevenue) / 100;
  const estimatedVAT = totalPlatformRev * (vatPct / (100 + vatPct)); // VAT inclusive extraction

  return c.json({
    success: true,
    data: {
      summary: {
        // Income
        totalGMV: Number(orderIncome.totalGMV) / 100,
        totalPlatformRevenue: Number(orderIncome.totalPlatformRevenue) / 100,
        totalBuyerPlatformFees: Number(orderIncome.totalBuyerPlatformFees) / 100,
        totalBuyerProcessingFees: Number(orderIncome.totalBuyerProcessingFees) / 100,
        totalSellerFees: Number(orderIncome.totalSellerFees) / 100,
        totalCourseSales: Number(courseIncome.totalCourseSales) / 100,
        totalCourseRefunds: Number(courseIncome.courseRefunds) / 100,
        totalSubscriptionIncome: Number(subIncome.totalSubscriptionIncome) / 100,
        totalSubscriptionGross: Number(subIncome.totalSubscriptionGross) / 100,
        orderCount: Number(orderIncome.orderCount),
        enrollmentCount: Number(courseIncome.enrollmentCount),
        subPaymentCount: Number(subIncome.subPaymentCount),
        // Expenses
        completedPayouts: Number(payoutExpenses.completedPayouts) / 100,
        pendingPayouts: Number(payoutExpenses.pendingPayouts) / 100,
        failedPayouts: Number(payoutExpenses.failedPayouts) / 100,
        completedPayoutCount: Number(payoutExpenses.completedCount),
        pendingPayoutCount: Number(payoutExpenses.pendingCount),
        totalRefunds: Number(refundExpenses.totalRefunds) / 100,
        refundCount: Number(refundExpenses.refundCount),
        refundProcessingFees: Number(refundExpenses.processingFees) / 100,
        totalGatewayFees: Number(gatewayExpenses.totalGatewayFees) / 100,
        gatewayTxCount: Number(gatewayExpenses.txCount),
        // VAT
        estimatedVAT: Math.round(estimatedVAT * 100) / 100,
        vatPct,
        // Escrow
        escrowHeld: Number(escrowStats.heldAmount) / 100,
        escrowReleased: Number(escrowStats.releasedAmount) / 100,
        escrowRefunded: Number(escrowStats.refundedAmount) / 100,
        escrowHeldCount: Number(escrowStats.heldCount),
        // Net
        netPlatformIncome: (
          Number(orderIncome.totalPlatformRevenue) +
          Number(courseIncome.totalCourseSales) +
          Number(subIncome.totalSubscriptionIncome) -
          Number(courseIncome.courseRefunds) -
          Number(payoutExpenses.completedPayouts) -
          Number(refundExpenses.totalRefunds) -
          Number(gatewayExpenses.totalGatewayFees)
        ) / 100,
      },
      monthlyData,
      recentTransactions: recentTx.map((tx) => ({
        id: tx.id,
        type: tx.type,
        status: tx.status,
        grossAmount: (tx.grossAmount || 0) / 100,
        gatewayFee: (tx.gatewayFee || 0) / 100,
        netAmount: (tx.netAmount || 0) / 100,
        platformRevenue: (tx.platformRevenue || 0) / 100,
        gateway: tx.gateway,
        method: tx.gatewayMethod,
        orderNumber: tx.order?.orderNumber || null,
        createdAt: tx.createdAt,
        paidAt: tx.paidAt,
      })),
      recentPayouts: recentPayouts.map((p) => ({
        id: p.id,
        seller: p.seller?.username || 'Unknown',
        sellerEmail: p.seller?.email || '',
        amount: (p.amount || 0) / 100,
        fee: (p.fee || 0) / 100,
        netAmount: (p.netAmount || 0) / 100,
        status: p.status,
        currency: p.currency,
        processedAt: p.processedAt,
        createdAt: p.createdAt,
      })),
      recentRefunds: recentRefunds.map((r) => ({
        id: r.id,
        amount: (r.amount || 0) / 100,
        processingFee: (r.processingFee || 0) / 100,
        reason: r.reason,
        status: r.status,
        type: r.refundType,
        createdAt: r.createdAt,
      })),
    },
  });
});

// ============ ANALYTICS ============
app.get('/analytics', async (c) => {
  const db = c.get('db');
  const now = new Date();

  // Overview aggregates (exclude admin-created)
  const [userStats] = await db
    .select({
      total: count(),
      sellers: sql<number>`SUM(CASE WHEN ${users.isSeller} = 1 THEN 1 ELSE 0 END)`,
    })
    .from(users)
    .where(eq(users.isAdminCreated, false));

  const [orderStats] = await db
    .select({
      total: count(),
      gmv: sql<number>`COALESCE(SUM(${orders.grossAmount}), 0)`,
      platformRevenue: sql<number>`COALESCE(SUM(CASE WHEN ${orders.status} = 'COMPLETED' THEN ${orders.platformRevenue} ELSE 0 END), 0)`,
    })
    .from(orders)
    .where(sql`is_admin_created = 0 OR is_admin_created IS NULL`);

  const [payoutStats] = await db
    .select({
      total: sql<number>`COALESCE(SUM(${sellerPayouts.amount}), 0)`,
    })
    .from(sellerPayouts)
    .where(eq(sellerPayouts.status, 'COMPLETED'));

  const [serviceStats] = await db.select({ total: count() }).from(services).where(sql`is_admin_created = 0 OR is_admin_created IS NULL`);
  const [courseStats] = await db.select({ total: count() }).from(courses);
  const [enrollmentStats] = await db.select({ total: count() }).from(courseEnrollments);
  const [conversationStats] = await db.select({ total: count() }).from(conversations).where(sql`is_admin_created = 0 OR is_admin_created IS NULL`);

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
      .where(and(gte(orders.createdAt, monthStart), lte(orders.createdAt, monthEnd), sql`is_admin_created = 0 OR is_admin_created IS NULL`));

    const [mUsers] = await db
      .select({ userCount: count() })
      .from(users)
      .where(and(gte(users.createdAt, monthStart), lte(users.createdAt, monthEnd), eq(users.isAdminCreated, false)));

    monthlyData.push({
      month: monthLabel,
      revenue: Number(mOrders.revenue) / 100,
      orders: Number(mOrders.orderCount),
      users: Number(mUsers.userCount),
      isPartial: i === 0,
    });
  }

  // Orders by status (exclude admin-created)
  const statusRows = await db
    .select({
      status: orders.status,
      cnt: count(),
      totalAmount: sql<number>`COALESCE(SUM(${orders.grossAmount}), 0)`,
    })
    .from(orders)
    .where(sql`is_admin_created = 0 OR is_admin_created IS NULL`)
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

// ============ SELLER MANAGEMENT ============

const createSellerSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(30).regex(/^[a-z0-9_-]+$/),
  password: z.string().min(6),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  displayName: z.string().min(1),
  professionalTitle: z.string().min(1),
  description: z.string().min(1),
  skills: z.array(z.string()).default([]),
  plan: z.enum(['free', 'pro']),
  country: z.string().default('South Africa'),
});

app.post('/sellers/create', validate(createSellerSchema), async (c) => {
  const body = getValidatedBody<z.infer<typeof createSellerSchema>>(c);
  const db = c.get('db');
  const now = new Date().toISOString();

  const existing = await db.query.users.findFirst({
    where: or(
      eq(users.email, body.email.toLowerCase()),
      eq(users.username, body.username.toLowerCase())
    ),
  });
  if (existing) {
    return c.json({ success: false, error: { code: 'EXISTS', message: 'Email or username already taken' } }, 409);
  }

  const passwordHash = await hashPasswordPBKDF2(body.password);
  const userId = createId();
  const profileId = createId();

  await db.insert(users).values({
    id: userId,
    email: body.email.toLowerCase(),
    username: body.username.toLowerCase(),
    passwordHash,
    firstName: body.firstName,
    lastName: body.lastName,
    country: body.country,
    isSeller: true,
    isEmailVerified: true,
    isAdminCreated: true,
    createdAt: now,
    updatedAt: now,
  });

  await db.insert(userRoles).values([
    { id: createId(), userId, role: 'BUYER', createdAt: now },
    { id: createId(), userId, role: 'SELLER', createdAt: now },
  ]);

  await db.insert(sellerProfiles).values({
    id: profileId,
    userId,
    displayName: body.displayName,
    professionalTitle: body.professionalTitle,
    description: body.description,
    skills: body.skills,
    languages: [{ language: 'English', proficiency: 'Native' }],
    kycStatus: 'VERIFIED',
    isVerified: true,
    verifiedAt: now,
    sellerFeePaid: true,
    sellerFeePaidAt: now,
    createdAt: now,
    updatedAt: now,
  });

  if (body.plan === 'pro') {
    const periodEnd = new Date();
    periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    await db.insert(sellerSubscriptions).values({
      id: createId(),
      sellerProfileId: profileId,
      status: 'ACTIVE',
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd.toISOString(),
      nextBillingDate: periodEnd.toISOString(),
      createdAt: now,
      updatedAt: now,
    });
  }

  const defaultStages = [
    { name: 'New Lead', order: 0, color: '#3B82F6' },
    { name: 'Contacted', order: 1, color: '#F59E0B' },
    { name: 'Proposal Sent', order: 2, color: '#8B5CF6' },
    { name: 'Won', order: 3, color: '#10B981' },
    { name: 'Lost', order: 4, color: '#EF4444' },
  ];
  for (const stage of defaultStages) {
    const slug = stage.name.toLowerCase().replace(/\s+/g, '-');
    const stageId = createId();
    await db.run(sql`INSERT INTO pipeline_stages (id, user_id, seller_id, name, slug, "order", color, is_default, created_at, updated_at) VALUES (${stageId}, ${userId}, ${userId}, ${stage.name}, ${slug}, ${stage.order}, ${stage.color}, ${stage.order === 0 ? 1 : 0}, ${now}, ${now})`);
  }

  const seller = await db.query.users.findFirst({
    where: eq(users.id, userId),
    with: {
      sellerProfile: { with: { subscription: true } },
    },
  });

  return c.json({ success: true, data: { seller } }, 201);
});

// List admin-created sellers
app.get('/sellers/managed', async (c) => {
  const db = c.get('db');
  const search = c.req.query('search');
  const page = Math.max(1, parseInt(c.req.query('page') || '1'));
  const limit = Math.min(100, Math.max(1, parseInt(c.req.query('limit') || '20')));
  const offset = (page - 1) * limit;

  let whereClause = and(eq(users.isAdminCreated, true), eq(users.isSeller, true));
  if (search) {
    const searchLower = `%${search.toLowerCase()}%`;
    whereClause = and(
      whereClause,
      or(
        like(sql`LOWER(${users.username})`, searchLower),
        like(sql`LOWER(${users.email})`, searchLower),
        like(sql`LOWER(${users.firstName})`, searchLower),
      )
    ) as any;
  }

  const sellerList = await db.query.users.findMany({
    where: whereClause,
    orderBy: desc(users.createdAt),
    limit,
    offset,
    with: {
      sellerProfile: { with: { subscription: true } },
    },
  });

  const [totalResult] = await db.select({ total: count() }).from(users).where(whereClause!);
  const total = Number(totalResult.total);

  // Get counts for each seller
  const sellers = await Promise.all(sellerList.map(async (s) => {
    const [svcCount] = await db.select({ c: count() }).from(services).where(eq(services.sellerId, s.id));
    const [ordCount] = await db.select({ c: count() }).from(orders).where(eq(orders.sellerId, s.id));
    const [revCount] = await db.select({ c: count() }).from(reviews).where(eq(reviews.recipientId, s.id));
    return {
      ...s,
      _count: {
        services: Number(svcCount.c),
        sellerOrders: Number(ordCount.c),
        receivedReviews: Number(revCount.c),
      },
    };
  }));

  return c.json({
    success: true,
    data: { sellers },
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
});

// Get admin-created seller details (full dashboard)
app.get('/sellers/managed/:id', async (c) => {
  const { id } = c.req.param();
  const db = c.get('db');

  const seller = await db.query.users.findFirst({
    where: eq(users.id, id),
    with: {
      sellerProfile: { with: { subscription: true } },
      bankDetails: true,
    },
  });

  if (!seller) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Seller not found' } }, 404);
  }

  // Services with packages and counts
  const sellerServices = await db.query.services.findMany({
    where: eq(services.sellerId, id),
    with: {
      category: true,
      packages: true,
    },
  });
  const servicesWithCounts = await Promise.all(sellerServices.map(async (svc) => {
    const [revCount] = await db.select({ c: count() }).from(reviews).where(eq(reviews.serviceId, svc.id));
    const [ordCount] = await db.select({ c: count() }).from(orders).where(eq(orders.serviceId, svc.id));
    return { ...svc, _count: { reviews: Number(revCount.c), orders: Number(ordCount.c) } };
  }));

  // Last 20 orders
  const sellerOrders = await db.query.orders.findMany({
    where: eq(orders.sellerId, id),
    orderBy: desc(orders.createdAt),
    limit: 20,
    with: {
      buyer: { columns: { username: true, firstName: true, lastName: true } },
      service: { columns: { title: true } },
    },
  });

  // Last 20 conversations
  const sellerConversations = await db.query.conversations.findMany({
    where: eq(conversations.sellerId, id),
    orderBy: desc(conversations.lastMessageAt),
    limit: 20,
    with: {
      buyer: { columns: { id: true, username: true, firstName: true, avatar: true } },
    },
  });
  // Get last message and message count for each conversation
  const convsWithMessages = await Promise.all(sellerConversations.map(async (conv) => {
    const lastMsg = await db.query.messages.findFirst({
      where: eq(messages.conversationId, conv.id),
      orderBy: desc(messages.createdAt),
    });
    const [msgCount] = await db.select({ c: count() }).from(messages).where(eq(messages.conversationId, conv.id));
    return { ...conv, messages: lastMsg ? [lastMsg] : [], _count: { messages: Number(msgCount.c) } };
  }));

  // Reviews
  const sellerReviews = await db.query.reviews.findMany({
    where: eq(reviews.recipientId, id),
    orderBy: desc(reviews.createdAt),
    with: {
      author: { columns: { username: true, firstName: true, lastName: true, avatar: true } },
      service: { columns: { title: true } },
    },
  });

  // Metrics (last 30 days)
  const metrics = await db.query.sellerMetrics.findMany({
    where: eq(sellerMetrics.userId, id),
    orderBy: desc(sellerMetrics.date),
    limit: 30,
  });

  const fullSeller = {
    ...seller,
    services: servicesWithCounts,
    sellerOrders,
    sellerConversations: convsWithMessages,
    receivedReviews: sellerReviews,
  };

  return c.json({ success: true, data: { seller: fullSeller, metrics } });
});

// Update seller plan
app.patch('/sellers/managed/:id/plan', async (c) => {
  const { id } = c.req.param();
  const { plan } = await c.req.json();
  const db = c.get('db');
  const now = new Date().toISOString();

  const profile = await db.query.sellerProfiles.findFirst({
    where: eq(sellerProfiles.userId, id),
    with: { subscription: true },
  });

  if (!profile) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Seller not found' } }, 404);
  }

  if (plan === 'pro') {
    if (profile.subscription) {
      await db.update(sellerSubscriptions)
        .set({ status: 'ACTIVE', updatedAt: now })
        .where(eq(sellerSubscriptions.id, profile.subscription.id));
    } else {
      const periodEnd = new Date();
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
      await db.insert(sellerSubscriptions).values({
        id: createId(),
        sellerProfileId: profile.id,
        status: 'ACTIVE',
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd.toISOString(),
        nextBillingDate: periodEnd.toISOString(),
        createdAt: now,
        updatedAt: now,
      });
    }
  } else if (plan === 'free' && profile.subscription) {
    await db.update(sellerSubscriptions)
      .set({ status: 'CANCELLED', cancelledAt: now, updatedAt: now })
      .where(eq(sellerSubscriptions.id, profile.subscription.id));
  }

  const updatedSeller = await db.query.users.findFirst({
    where: eq(users.id, id),
    with: { sellerProfile: { with: { subscription: true } } },
  });

  return c.json({ success: true, data: { seller: updatedSeller } });
});

// Update seller profile
const updateProfileSchema = z.object({
  displayName: z.string().optional(),
  professionalTitle: z.string().optional(),
  description: z.string().optional(),
  skills: z.array(z.string()).optional(),
  rating: z.number().optional(),
  reviewCount: z.number().int().optional(),
  completedOrders: z.number().int().optional(),
  responseTimeMinutes: z.number().int().optional(),
  onTimeDeliveryRate: z.number().optional(),
  level: z.number().int().optional(),
  isAvailable: z.boolean().optional(),
});

app.patch('/sellers/managed/:id/profile', validate(updateProfileSchema), async (c) => {
  const { id } = c.req.param();
  const body = getValidatedBody<z.infer<typeof updateProfileSchema>>(c);
  const db = c.get('db');
  const now = new Date().toISOString();

  const profile = await db.query.sellerProfiles.findFirst({
    where: eq(sellerProfiles.userId, id),
  });
  if (!profile) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Seller not found' } }, 404);
  }

  const data: Record<string, any> = { updatedAt: now };
  if (body.displayName !== undefined) data.displayName = body.displayName;
  if (body.professionalTitle !== undefined) data.professionalTitle = body.professionalTitle;
  if (body.description !== undefined) data.description = body.description;
  if (body.skills !== undefined) data.skills = body.skills;
  if (body.rating !== undefined) data.rating = body.rating;
  if (body.reviewCount !== undefined) data.reviewCount = body.reviewCount;
  if (body.completedOrders !== undefined) data.completedOrders = body.completedOrders;
  if (body.responseTimeMinutes !== undefined) data.responseTimeMinutes = body.responseTimeMinutes;
  if (body.onTimeDeliveryRate !== undefined) data.onTimeDeliveryRate = body.onTimeDeliveryRate;
  if (body.level !== undefined) data.level = body.level;
  if (body.isAvailable !== undefined) data.isAvailable = body.isAvailable;

  await db.update(sellerProfiles).set(data).where(eq(sellerProfiles.userId, id));

  const updated = await db.query.sellerProfiles.findFirst({
    where: eq(sellerProfiles.userId, id),
  });

  return c.json({ success: true, data: { profile: updated } });
});

// Override seller stats
const updateStatsSchema = z.object({
  rating: z.number().optional(),
  reviewCount: z.number().int().optional(),
  completedOrders: z.number().int().optional(),
  responseTimeMinutes: z.number().int().optional(),
  onTimeDeliveryRate: z.number().optional(),
  level: z.number().int().optional(),
});

app.patch('/sellers/managed/:id/stats', validate(updateStatsSchema), async (c) => {
  const { id } = c.req.param();
  const body = getValidatedBody<z.infer<typeof updateStatsSchema>>(c);
  const db = c.get('db');
  const now = new Date().toISOString();

  const profile = await db.query.sellerProfiles.findFirst({
    where: eq(sellerProfiles.userId, id),
  });
  if (!profile) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Seller not found' } }, 404);
  }

  const data: Record<string, any> = { updatedAt: now };
  if (body.rating !== undefined) data.rating = body.rating;
  if (body.reviewCount !== undefined) data.reviewCount = body.reviewCount;
  if (body.completedOrders !== undefined) data.completedOrders = body.completedOrders;
  if (body.responseTimeMinutes !== undefined) data.responseTimeMinutes = body.responseTimeMinutes;
  if (body.onTimeDeliveryRate !== undefined) data.onTimeDeliveryRate = body.onTimeDeliveryRate;
  if (body.level !== undefined) data.level = body.level;

  await db.update(sellerProfiles).set(data).where(eq(sellerProfiles.userId, id));

  const updated = await db.query.sellerProfiles.findFirst({
    where: eq(sellerProfiles.userId, id),
  });

  return c.json({ success: true, data: { profile: updated } });
});

// ============ SELLER METRICS ============

const metricsSchema = z.object({
  date: z.string().optional(),
  ordersReceived: z.number().int().optional(),
  ordersCompleted: z.number().int().optional(),
  ordersCancelled: z.number().int().optional(),
  grossRevenue: z.number().optional(),
  platformFees: z.number().optional(),
  netRevenue: z.number().optional(),
  avgDeliveryTimeHrs: z.number().int().optional(),
  onTimeDeliveries: z.number().int().optional(),
  lateDeliveries: z.number().int().optional(),
  reviewsReceived: z.number().int().optional(),
  avgRating: z.number().optional(),
});

app.post('/sellers/managed/:id/metrics', validate(metricsSchema), async (c) => {
  const { id } = c.req.param();
  const body = getValidatedBody<z.infer<typeof metricsSchema>>(c);
  const db = c.get('db');

  const seller = await db.query.users.findFirst({
    where: and(eq(users.id, id), eq(users.isSeller, true)),
  });
  if (!seller) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Seller not found' } }, 404);
  }

  const dateStr = body.date || new Date().toISOString().split('T')[0];
  const metricId = createId();

  const values: Record<string, any> = {
    id: metricId,
    userId: id,
    date: dateStr,
  };
  const updateSet: Record<string, any> = {};

  if (body.ordersReceived !== undefined) { values.ordersReceived = body.ordersReceived; updateSet.ordersReceived = body.ordersReceived; }
  if (body.ordersCompleted !== undefined) { values.ordersCompleted = body.ordersCompleted; updateSet.ordersCompleted = body.ordersCompleted; }
  if (body.ordersCancelled !== undefined) { values.ordersCancelled = body.ordersCancelled; updateSet.ordersCancelled = body.ordersCancelled; }
  if (body.grossRevenue !== undefined) { const v = Math.round(body.grossRevenue * 100); values.grossRevenue = v; updateSet.grossRevenue = v; }
  if (body.platformFees !== undefined) { const v = Math.round(body.platformFees * 100); values.platformFees = v; updateSet.platformFees = v; }
  if (body.netRevenue !== undefined) { const v = Math.round(body.netRevenue * 100); values.netRevenue = v; updateSet.netRevenue = v; }
  if (body.avgDeliveryTimeHrs !== undefined) { values.avgDeliveryTimeHrs = body.avgDeliveryTimeHrs; updateSet.avgDeliveryTimeHrs = body.avgDeliveryTimeHrs; }
  if (body.onTimeDeliveries !== undefined) { values.onTimeDeliveries = body.onTimeDeliveries; updateSet.onTimeDeliveries = body.onTimeDeliveries; }
  if (body.lateDeliveries !== undefined) { values.lateDeliveries = body.lateDeliveries; updateSet.lateDeliveries = body.lateDeliveries; }
  if (body.reviewsReceived !== undefined) { values.reviewsReceived = body.reviewsReceived; updateSet.reviewsReceived = body.reviewsReceived; }
  if (body.avgRating !== undefined) { const v = Math.round(body.avgRating * 100); values.avgRating = v; updateSet.avgRating = v; }

  await db.insert(sellerMetrics).values(values).onConflictDoUpdate({
    target: [sellerMetrics.userId, sellerMetrics.date],
    set: updateSet,
  });

  const metric = await db.query.sellerMetrics.findFirst({
    where: and(eq(sellerMetrics.userId, id), eq(sellerMetrics.date, dateStr)),
  });

  return c.json({ success: true, data: { metric } });
});

app.get('/sellers/managed/:id/metrics', async (c) => {
  const { id } = c.req.param();
  const db = c.get('db');
  const days = parseInt(c.req.query('days') || '30');

  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceStr = since.toISOString().split('T')[0];

  const metrics = await db.query.sellerMetrics.findMany({
    where: and(eq(sellerMetrics.userId, id), gte(sellerMetrics.date, sinceStr)),
    orderBy: desc(sellerMetrics.date),
  });

  return c.json({ success: true, data: { metrics } });
});

// ============ SELLER SERVICE CREATION ============

const createServiceSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  categoryId: z.string().min(1),
  images: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  packages: z.array(z.object({
    tier: z.enum(['BASIC', 'STANDARD', 'PREMIUM']),
    name: z.string().min(1),
    description: z.string().min(1),
    price: z.number().int().min(1),
    deliveryDays: z.number().int().min(1),
    revisions: z.number().int().default(0),
    features: z.array(z.string()).default([]),
  })).min(1),
});

app.post('/sellers/managed/:id/services', validate(createServiceSchema), async (c) => {
  const { id } = c.req.param();
  const body = getValidatedBody<z.infer<typeof createServiceSchema>>(c);
  const db = c.get('db');
  const now = new Date().toISOString();

  // Generate unique slug
  let slug = body.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  let suffix = 0;
  while (true) {
    const candidate = suffix === 0 ? slug : `${slug}-${suffix}`;
    const existing = await db.query.services.findFirst({
      where: and(eq(services.sellerId, id), eq(services.slug, candidate)),
    });
    if (!existing) { slug = candidate; break; }
    suffix++;
  }

  const serviceId = createId();
  await db.insert(services).values({
    id: serviceId,
    sellerId: id,
    categoryId: body.categoryId,
    title: body.title,
    slug,
    description: body.description,
    pricingType: 'ONE_TIME',
    images: body.images,
    tags: body.tags,
    status: 'ACTIVE',
    isActive: true,
    createdAt: now,
    updatedAt: now,
  });
  await db.run(sql`UPDATE services SET is_admin_created = 1 WHERE id = ${serviceId}`);

  for (const pkg of body.packages) {
    await db.insert(servicePackages).values({
      id: createId(),
      serviceId,
      tier: pkg.tier,
      name: pkg.name,
      description: pkg.description,
      price: pkg.price,
      deliveryDays: pkg.deliveryDays,
      revisions: pkg.revisions,
      features: pkg.features,
      createdAt: now,
      updatedAt: now,
    });
  }

  const service = await db.query.services.findFirst({
    where: eq(services.id, serviceId),
    with: { packages: true, category: true },
  });

  return c.json({ success: true, data: { service } }, 201);
});

// ============ REVIEW CREATION ============

const createReviewSchema = z.object({
  authorId: z.string().min(1),
  serviceId: z.string().min(1),
  sellerId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  comment: z.string().min(1),
  communicationRating: z.number().int().min(1).max(5).optional(),
  qualityRating: z.number().int().min(1).max(5).optional(),
  valueRating: z.number().int().min(1).max(5).optional(),
});

app.post('/reviews/create', validate(createReviewSchema), async (c) => {
  const body = getValidatedBody<z.infer<typeof createReviewSchema>>(c);
  const db = c.get('db');
  const now = new Date().toISOString();

  const [author, seller, service] = await Promise.all([
    db.query.users.findFirst({ where: eq(users.id, body.authorId) }),
    db.query.users.findFirst({ where: eq(users.id, body.sellerId) }),
    db.query.services.findFirst({ where: eq(services.id, body.serviceId) }),
  ]);

  if (!author || !seller || !service) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Author, seller, or service not found' } }, 404);
  }

  // Get BASIC package price
  const basicPkg = await db.query.servicePackages.findFirst({
    where: and(eq(servicePackages.serviceId, body.serviceId), eq(servicePackages.tier, 'BASIC')),
  });
  const baseAmount = basicPkg?.price || 10000;
  const buyerPlatformFee = Math.round(baseAmount * 0.03);
  const sellerPlatformFee = Math.round(baseAmount * 0.08);
  const grossAmount = baseAmount + buyerPlatformFee;
  const sellerPayoutAmount = baseAmount - sellerPlatformFee;
  const platformRevenue = buyerPlatformFee + sellerPlatformFee;

  const orderId = createId();
  const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

  await db.insert(orders).values({
    id: orderId,
    orderNumber,
    buyerId: body.authorId,
    sellerId: body.sellerId,
    serviceId: body.serviceId,
    packageId: basicPkg?.id || null,
    baseAmount,
    buyerPlatformFee,
    buyerProcessingFee: 0,
    sellerPlatformFee,
    grossAmount,
    platformRevenue,
    sellerPayoutAmount,
    currency: 'ZAR',
    status: 'COMPLETED',
    deliveryDays: 3,
    paidAt: now,
    startedAt: now,
    completedAt: now,
    createdAt: now,
    updatedAt: now,
  });
  await db.run(sql`UPDATE orders SET is_admin_created = 1 WHERE id = ${orderId}`);

  const reviewId = createId();
  await db.insert(reviews).values({
    id: reviewId,
    orderId,
    serviceId: body.serviceId,
    authorId: body.authorId,
    recipientId: body.sellerId,
    rating: body.rating,
    comment: body.comment,
    communicationRating: body.communicationRating || null,
    qualityRating: body.qualityRating || null,
    valueRating: body.valueRating || null,
    isPublic: true,
    createdAt: now,
    updatedAt: now,
  });
  await db.run(sql`UPDATE reviews SET is_admin_created = 1 WHERE id = ${reviewId}`);

  // Recalculate service stats
  const serviceReviews = await db.select({ rating: reviews.rating }).from(reviews).where(eq(reviews.serviceId, body.serviceId));
  const avgServiceRating = Math.round(serviceReviews.reduce((sum, r) => sum + r.rating, 0) / serviceReviews.length * 100);
  const [svcOrderCount] = await db.select({ c: count() }).from(orders).where(eq(orders.serviceId, body.serviceId));
  await db.update(services).set({
    rating: avgServiceRating,
    reviewCount: serviceReviews.length,
    orderCount: Number(svcOrderCount.c),
    updatedAt: now,
  }).where(eq(services.id, body.serviceId));

  // Recalculate seller stats
  const sellerReviews = await db.select({ rating: reviews.rating }).from(reviews).where(eq(reviews.recipientId, body.sellerId));
  const avgSellerRating = Math.round(sellerReviews.reduce((sum, r) => sum + r.rating, 0) / sellerReviews.length * 100);
  const [sellerOrderCount] = await db.select({ c: count() }).from(orders).where(and(eq(orders.sellerId, body.sellerId), eq(orders.status, 'COMPLETED')));
  await db.update(sellerProfiles).set({
    rating: avgSellerRating,
    reviewCount: sellerReviews.length,
    completedOrders: Number(sellerOrderCount.c),
    updatedAt: now,
  }).where(eq(sellerProfiles.userId, body.sellerId));

  const review = await db.query.reviews.findFirst({
    where: eq(reviews.id, reviewId),
    with: {
      author: { columns: { username: true, firstName: true, lastName: true, avatar: true } },
      service: { columns: { title: true } },
    },
  });

  return c.json({ success: true, data: { review, order: { id: orderId, orderNumber } } }, 201);
});

// ============ MANAGED USERS (buyers for reviews/chat) ============

app.get('/users/managed', async (c) => {
  const db = c.get('db');
  const search = c.req.query('search');
  const page = Math.max(1, parseInt(c.req.query('page') || '1'));
  const limit = Math.min(100, Math.max(1, parseInt(c.req.query('limit') || '50')));
  const offset = (page - 1) * limit;

  let whereClause = and(eq(users.isAdminCreated, true), eq(users.isSeller, false));
  if (search) {
    const searchLower = `%${search.toLowerCase()}%`;
    whereClause = and(
      whereClause,
      or(
        like(sql`LOWER(${users.username})`, searchLower),
        like(sql`LOWER(${users.email})`, searchLower),
        like(sql`LOWER(${users.firstName})`, searchLower),
      )
    ) as any;
  }

  const userList = await db.select({
    id: users.id,
    email: users.email,
    username: users.username,
    firstName: users.firstName,
    lastName: users.lastName,
    avatar: users.avatar,
    createdAt: users.createdAt,
  }).from(users).where(whereClause!).orderBy(desc(users.createdAt)).limit(limit).offset(offset);

  const [totalResult] = await db.select({ total: count() }).from(users).where(whereClause!);
  const total = Number(totalResult.total);

  const usersWithCounts = await Promise.all(userList.map(async (u) => {
    const [revCount] = await db.select({ c: count() }).from(reviews).where(eq(reviews.authorId, u.id));
    return { ...u, _count: { reviews: Number(revCount.c) } };
  }));

  return c.json({
    success: true,
    data: { users: usersWithCounts },
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
});

// ============ ADMIN CHAT SIMULATION ============

const startConversationSchema = z.object({
  buyerId: z.string().min(1),
  sellerId: z.string().min(1),
  message: z.string().optional(),
});

app.post('/conversations/start', validate(startConversationSchema), async (c) => {
  const body = getValidatedBody<z.infer<typeof startConversationSchema>>(c);
  const db = c.get('db');
  const now = new Date().toISOString();

  // Check existing conversation
  let conversation = await db.query.conversations.findFirst({
    where: and(eq(conversations.buyerId, body.buyerId), eq(conversations.sellerId, body.sellerId)),
  });

  if (!conversation) {
    const convId = createId();
    await db.insert(conversations).values({
      id: convId,
      buyerId: body.buyerId,
      sellerId: body.sellerId,
      status: 'OPEN',
      lastMessageAt: now,
      createdAt: now,
      updatedAt: now,
    });
    await db.run(sql`UPDATE conversations SET is_admin_created = 1 WHERE id = ${convId}`);
    conversation = await db.query.conversations.findFirst({
      where: eq(conversations.id, convId),
    });
  }

  let message = null;
  if (body.message && conversation) {
    const msgId = createId();
    await db.insert(messages).values({
      id: msgId,
      conversationId: conversation.id,
      senderId: body.buyerId,
      content: body.message,
      type: 'TEXT',
      createdAt: now,
    });
    await db.run(sql`UPDATE messages SET is_admin_created = 1 WHERE id = ${msgId}`);
    await db.update(conversations).set({
      lastMessageAt: now,
      lastMessagePreview: body.message.slice(0, 100),
      messageCount: sql`${conversations.messageCount} + 1`,
      unreadSellerCount: sql`${conversations.unreadSellerCount} + 1`,
      updatedAt: now,
    }).where(eq(conversations.id, conversation.id));

    message = await db.query.messages.findFirst({ where: eq(messages.id, msgId) });
  }

  return c.json({ success: true, data: { conversation, message } });
});

const sendMessageSchema = z.object({
  senderId: z.string().min(1),
  content: z.string().min(1),
  type: z.enum(['TEXT', 'IMAGE', 'FILE', 'SYSTEM']).default('TEXT'),
});

app.post('/conversations/:id/send', validate(sendMessageSchema), async (c) => {
  const { id } = c.req.param();
  const body = getValidatedBody<z.infer<typeof sendMessageSchema>>(c);
  const db = c.get('db');
  const now = new Date().toISOString();

  const conversation = await db.query.conversations.findFirst({
    where: eq(conversations.id, id),
  });
  if (!conversation) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Conversation not found' } }, 404);
  }

  const msgId = createId();
  await db.insert(messages).values({
    id: msgId,
    conversationId: id,
    senderId: body.senderId,
    content: body.content,
    type: body.type,
    createdAt: now,
  });
  await db.run(sql`UPDATE messages SET is_admin_created = 1 WHERE id = ${msgId}`);

  // Update unread counts based on who sent
  const isBuyer = body.senderId === conversation.buyerId;
  await db.update(conversations).set({
    lastMessageAt: now,
    lastMessagePreview: body.content.slice(0, 100),
    messageCount: sql`${conversations.messageCount} + 1`,
    ...(isBuyer
      ? { unreadSellerCount: sql`${conversations.unreadSellerCount} + 1` }
      : { unreadBuyerCount: sql`${conversations.unreadBuyerCount} + 1` }),
    updatedAt: now,
  }).where(eq(conversations.id, id));

  const message = await db.query.messages.findFirst({ where: eq(messages.id, msgId) });

  return c.json({ success: true, data: { message } });
});

// ============ LOGIN AS SELLER ============
app.post('/sellers/managed/:id/login-as', async (c) => {
  const { id } = c.req.param();
  const db = c.get('db');

  const seller = await db.query.users.findFirst({
    where: and(eq(users.id, id), eq(users.isAdminCreated, true)),
  });
  if (!seller) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Admin-created seller not found' } }, 404);
  }

  const secret = new TextEncoder().encode(c.env.JWT_SECRET);
  const refreshSecret = new TextEncoder().encode(c.env.JWT_REFRESH_SECRET);

  const accessToken = await new SignJWT({ sub: id })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('15m')
    .sign(secret);

  const refreshToken = await new SignJWT({ sub: id })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(refreshSecret);

  return c.json({
    success: true,
    data: {
      accessToken,
      refreshToken,
      user: { id: seller.id, email: seller.email, username: seller.username, role: seller.role },
    },
  });
});

// ============ BULK DATA GENERATION ============
const generateDataSchema = z.object({
  reviews: z.object({ count: z.number().min(0).max(50).default(0), minRating: z.number().min(1).max(5).default(4), maxRating: z.number().min(1).max(5).default(5) }).optional(),
  orders: z.object({ count: z.number().min(0).max(50).default(0), minAmount: z.number().min(50).max(5000).default(200), maxAmount: z.number().min(50).max(10000).default(2000) }).optional(),
  conversations: z.object({ count: z.number().min(0).max(30).default(0), messagesPerConversation: z.number().min(1).max(10).default(3) }).optional(),
  metrics: z.object({ days: z.number().min(7).max(90).default(30) }).optional(),
});

app.post('/sellers/managed/:id/generate', validate(generateDataSchema), async (c) => {
  const { id } = c.req.param();
  const body = getValidatedBody<z.infer<typeof generateDataSchema>>(c);
  const db = c.get('db');
  const now = new Date().toISOString();

  // Verify seller exists and is admin-created
  const seller = await db.query.users.findFirst({
    where: and(eq(users.id, id), eq(users.isAdminCreated, true)),
    with: { sellerProfile: true },
  });
  if (!seller) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Admin-created seller not found' } }, 404);
  }

  // Get seller's services
  const sellerServices = await db.query.services.findMany({
    where: eq(services.sellerId, id),
    with: { packages: true },
  });

  // Get managed users as buyers
  const managedUsers = await db.query.users.findMany({
    where: and(eq(users.isAdminCreated, true), sql`${users.id} != ${id}`),
    limit: 20,
  });

  if (managedUsers.length === 0) {
    return c.json({ success: false, error: { code: 'NO_BUYERS', message: 'Create at least one managed user first to act as buyer' } }, 400);
  }

  const generated = { orders: 0, reviews: 0, conversations: 0, messages: 0, metrics: 0 };

  const reviewComments = [
    'Absolutely brilliant work! Delivered exactly what I needed.',
    'Super professional and fast delivery. Highly recommend!',
    'Great communication throughout the project. Will use again.',
    'Quality work at a fair price. Very happy with the result.',
    'Exceeded my expectations. Top-notch service!',
    'Fantastic experience from start to finish.',
    'Really impressed with the attention to detail.',
    'Quick turnaround and excellent quality. 5 stars!',
    'Very talented freelancer. The work speaks for itself.',
    'Could not be happier with the outcome. Thank you!',
    'Professional, reliable, and creative. What more could you ask for?',
    'Amazing value for money. Will definitely be back.',
    'Smooth process, great results. Recommended to my friends already.',
    'One of the best freelancers I have worked with on this platform.',
    'Delivered ahead of schedule with outstanding quality.',
  ];

  const msgTemplates = [
    ['Hi, I am interested in your service. Can you help me?', 'Of course! I would love to help. What do you need?', 'Great, let me share the details with you.'],
    ['Hello! I saw your profile and your work looks amazing.', 'Thank you so much! How can I assist you today?', 'I have a project I think would be perfect for you.'],
    ['Hey, quick question about your turnaround time?', 'Usually 2-3 days depending on the scope. What do you have in mind?', 'That works perfectly. Let me place an order.'],
    ['Hi there! Do you offer revisions?', 'Yes, I include 2 rounds of revisions with every order.', 'Perfect, that gives me confidence. Placing my order now.'],
    ['Good day! I need help with a project urgently.', 'I can prioritise your project. Tell me more about what you need.', 'Brilliant, sending you all the info now.'],
  ];

  const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
  const rand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

  // Generate orders
  if (body.orders && body.orders.count > 0 && sellerServices.length > 0) {
    for (let i = 0; i < body.orders.count; i++) {
      const service = pick(sellerServices);
      const buyer = pick(managedUsers);
      const baseAmount = rand(body.orders.minAmount, body.orders.maxAmount) * 100;
      const buyerPlatformFee = Math.round(baseAmount * 0.05);
      const sellerPlatformFee = Math.round(baseAmount * 0.10);
      const grossAmount = baseAmount + buyerPlatformFee;
      const platformRevenue = buyerPlatformFee + sellerPlatformFee;
      const sellerPayoutAmount = baseAmount - sellerPlatformFee;
      const daysAgo = rand(1, 60);
      const createdAt = new Date(Date.now() - daysAgo * 86400000).toISOString();
      const orderId = createId();
      const orderNumber = `ORD-${Date.now()}-${rand(100, 999)}`;

      await db.insert(orders).values({
        id: orderId,
        orderNumber,
        buyerId: buyer.id,
        sellerId: id,
        serviceId: service.id,
        packageId: service.packages?.[0]?.id || null,
        baseAmount,
        buyerPlatformFee,
        buyerProcessingFee: 0,
        sellerPlatformFee,
        grossAmount,
        platformRevenue,
        sellerPayoutAmount,
        currency: 'ZAR',
        status: 'COMPLETED',
        deliveryDays: rand(1, 7),
        paidAt: createdAt,
        startedAt: createdAt,
        completedAt: createdAt,
        createdAt,
        updatedAt: createdAt,
      });
      await db.run(sql`UPDATE orders SET is_admin_created = 1 WHERE id = ${orderId}`);
      generated.orders++;
    }
  }

  // Generate reviews
  if (body.reviews && body.reviews.count > 0 && sellerServices.length > 0) {
    for (let i = 0; i < body.reviews.count; i++) {
      const service = pick(sellerServices);
      const buyer = pick(managedUsers);
      const rating = rand(body.reviews.minRating, body.reviews.maxRating);
      const daysAgo = rand(1, 45);
      const createdAt = new Date(Date.now() - daysAgo * 86400000).toISOString();

      // Create a backing order for the review
      const orderId = createId();
      const baseAmount = rand(200, 1500) * 100;
      const buyerPlatformFee = Math.round(baseAmount * 0.05);
      const sellerPlatformFee = Math.round(baseAmount * 0.10);

      await db.insert(orders).values({
        id: orderId,
        orderNumber: `ORD-${Date.now()}-${rand(100, 999)}`,
        buyerId: buyer.id,
        sellerId: id,
        serviceId: service.id,
        packageId: service.packages?.[0]?.id || null,
        baseAmount,
        buyerPlatformFee,
        buyerProcessingFee: 0,
        sellerPlatformFee,
        grossAmount: baseAmount + buyerPlatformFee,
        platformRevenue: buyerPlatformFee + sellerPlatformFee,
        sellerPayoutAmount: baseAmount - sellerPlatformFee,
        currency: 'ZAR',
        status: 'COMPLETED',
        deliveryDays: 3,
        paidAt: createdAt,
        startedAt: createdAt,
        completedAt: createdAt,
        createdAt,
        updatedAt: createdAt,
      });
      await db.run(sql`UPDATE orders SET is_admin_created = 1 WHERE id = ${orderId}`);

      const reviewId = createId();
      await db.insert(reviews).values({
        id: reviewId,
        orderId,
        serviceId: service.id,
        authorId: buyer.id,
        recipientId: id,
        rating: rating * 100,
        comment: pick(reviewComments),
        communicationRating: rand(rating - 1 < 1 ? 1 : rating - 1, 5) * 100,
        qualityRating: rand(rating - 1 < 1 ? 1 : rating - 1, 5) * 100,
        valueRating: rand(rating - 1 < 1 ? 1 : rating - 1, 5) * 100,
        isPublic: true,
        createdAt,
        updatedAt: createdAt,
      });
      await db.run(sql`UPDATE reviews SET is_admin_created = 1 WHERE id = ${reviewId}`);
      generated.reviews++;
    }
  }

  // Generate conversations
  if (body.conversations && body.conversations.count > 0) {
    const msgsPerConv = body.conversations.messagesPerConversation;
    for (let i = 0; i < body.conversations.count; i++) {
      const buyer = pick(managedUsers);
      const daysAgo = rand(1, 30);
      const createdAt = new Date(Date.now() - daysAgo * 86400000).toISOString();
      const convId = createId();
      const template = pick(msgTemplates);

      await db.insert(conversations).values({
        id: convId,
        buyerId: buyer.id,
        sellerId: id,
        status: 'OPEN',
        lastMessageAt: createdAt,
        messageCount: Math.min(msgsPerConv, template.length),
        createdAt,
        updatedAt: createdAt,
      });
      await db.run(sql`UPDATE conversations SET is_admin_created = 1 WHERE id = ${convId}`);
      generated.conversations++;

      for (let m = 0; m < Math.min(msgsPerConv, template.length); m++) {
        const msgId = createId();
        const msgTime = new Date(Date.parse(createdAt) + m * 300000).toISOString();
        const senderId = m % 2 === 0 ? buyer.id : id;
        await db.insert(messages).values({
          id: msgId,
          conversationId: convId,
          senderId,
          content: template[m],
          type: 'TEXT',
          createdAt: msgTime,
        });
        await db.run(sql`UPDATE messages SET is_admin_created = 1 WHERE id = ${msgId}`);
        generated.messages++;
      }

      await db.update(conversations).set({
        lastMessagePreview: template[Math.min(msgsPerConv, template.length) - 1].slice(0, 100),
      }).where(eq(conversations.id, convId));
    }
  }

  // Generate daily metrics
  if (body.metrics && body.metrics.days > 0) {
    for (let d = body.metrics.days; d >= 0; d--) {
      const date = new Date(Date.now() - d * 86400000).toISOString().slice(0, 10);
      const metricsId = createId();
      const views = rand(10, 200);
      const clicks = rand(Math.floor(views * 0.1), Math.floor(views * 0.4));
      const impressions = rand(views, views * 3);

      await db.run(sql`INSERT OR IGNORE INTO seller_metrics (id, user_id, date, profile_views, service_views, total_impressions, click_count, conversion_rate, response_rate, response_time_avg, created_at, updated_at) VALUES (${metricsId}, ${id}, ${date}, ${rand(5, 50)}, ${views}, ${impressions}, ${clicks}, ${rand(5, 25)}, ${rand(70, 100)}, ${rand(300, 3600)}, ${now}, ${now})`);
      generated.metrics++;
    }
  }

  // Update seller's denormalized counts
  if (generated.orders > 0 || generated.reviews > 0) {
    for (const service of sellerServices) {
      const [oc] = await db.select({ cnt: count() }).from(orders).where(eq(orders.serviceId, service.id));
      const [rc] = await db.select({ cnt: count(), avg: sql<number>`COALESCE(AVG(${reviews.rating}), 0)` }).from(reviews).where(eq(reviews.serviceId, service.id));
      await db.update(services).set({
        orderCount: Number(oc.cnt),
        reviewCount: Number(rc.cnt),
        rating: Math.round(Number(rc.avg)),
        updatedAt: now,
      }).where(eq(services.id, service.id));
    }

    // Update seller profile stats
    const [totalOrders] = await db.select({ cnt: count() }).from(orders).where(eq(orders.sellerId, id));
    const [totalReviews] = await db.select({ cnt: count(), avg: sql<number>`COALESCE(AVG(${reviews.rating}), 0)` }).from(reviews).where(eq(reviews.recipientId, id));
    await db.update(sellerProfiles).set({
      completedOrders: Number(totalOrders.cnt),
      reviewCount: Number(totalReviews.cnt),
      rating: Math.round(Number(totalReviews.avg)),
      updatedAt: now,
    }).where(eq(sellerProfiles.userId, id));
  }

  return c.json({ success: true, data: { generated } });
});

export default app;
