import { Hono } from 'hono';
import { z } from 'zod';
import { eq, and, desc, sql, count, gte, lte, like, or } from 'drizzle-orm';
import { 
  users, orders, services, sellerProfiles, transactions,
  disputes, refunds, sellerPayouts, subscriptions, categories, bankDetails
} from '@zomieks/db';
import { createId } from '@paralleldrive/cuid2';
import type { Env } from '../types';
import { authMiddleware, requireAuth, requireAdmin } from '../middleware/auth';
import { validate, getValidatedBody } from '../middleware/validation';
import {
  createPayoutBatch,
  confirmPayoutBatch,
  failPayoutBatch,
  getBatchStatus,
  generateBatchCSV,
} from '../services/payout-batch.service';

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
      revenue: sql<number>`COALESCE(SUM(CASE WHEN ${orders.status} = 'COMPLETED' THEN ${orders.platformFee} ELSE 0 END), 0)`,
    })
    .from(orders);
  
  // Monthly revenue
  const [monthlyRevenue] = await db
    .select({
      total: sql<number>`COALESCE(SUM(${orders.platformFee}), 0)`,
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
  
  if (role === 'seller') {
    whereConditions.push(eq(users.isSeller, true));
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
        .set({ isSuspended: true, suspendedAt: now, updatedAt: now })
        .where(eq(users.id, id));
      break;
    
    case 'unsuspend':
      await db.update(users)
        .set({ isSuspended: false, suspendedAt: null, updatedAt: now })
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
      // Soft delete - just mark as suspended with deleted reason
      await db.update(users)
        .set({ 
          isSuspended: true, 
          suspendedAt: now,
          deletedAt: now,
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

// Service Management
app.get('/services', async (c) => {
  const db = c.get('db');
  const page = parseInt(c.req.query('page') || '1');
  const limit = parseInt(c.req.query('limit') || '20');
  const status = c.req.query('status');
  const offset = (page - 1) * limit;
  
  let whereConditions: any[] = [];
  
  if (status) {
    whereConditions.push(eq(services.status, status));
  }
  
  const serviceList = await db.query.services.findMany({
    where: whereConditions.length > 0 ? and(...whereConditions) : undefined,
    with: {
      seller: { columns: { username: true, email: true } },
      category: { columns: { name: true } },
    },
    orderBy: desc(services.createdAt),
    limit,
    offset,
  });
  
  return c.json({
    success: true,
    data: serviceList.map(s => ({
      id: s.id,
      title: s.title,
      slug: s.slug,
      status: s.status,
      isActive: s.isActive,
      isFeatured: s.isFeatured,
      seller: s.seller,
      category: s.category,
      createdAt: s.createdAt,
    })),
    meta: { page, limit },
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
      openedBy: { columns: { username: true } },
    },
    orderBy: desc(disputes.createdAt),
    limit,
    offset,
  });
  
  return c.json({
    success: true,
    data: disputeList,
    meta: { page, limit },
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
      openedBy: true,
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
  
  if (dispute.status !== 'OPEN' && dispute.status !== 'IN_REVIEW') {
    return c.json({
      success: false,
      error: { message: 'Dispute already resolved' },
    }, 400);
  }
  
  const now = new Date().toISOString();
  
  // Update dispute
  await db.update(disputes)
    .set({
      status: 'RESOLVED',
      resolution: body.resolution,
      resolvedById: admin.id,
      resolvedAt: now,
      adminNotes: body.notes || null,
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

// Batch Payout Management

// Create a new payout batch from eligible payouts
app.post('/payouts/batches/create', async (c) => {
  const db = c.get('db');
  
  const batch = await createPayoutBatch(db);
  
  if (!batch) {
    return c.json({
      success: false,
      error: { message: 'No eligible payouts found' },
    }, 404);
  }
  
  return c.json({
    success: true,
    data: {
      batchId: batch.batchId,
      createdAt: batch.createdAt,
      totalAmount: batch.totalAmountRands,
      payoutCount: batch.payoutCount,
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

export default app;
