import { Hono } from 'hono';
import { z } from 'zod';
import { eq, and, desc, gte, lte, sql } from 'drizzle-orm';
import { 
  transactions, orders, escrowHolds, sellerPayouts, 
  refunds, users, sellerProfiles, bankDetails
} from '@zomieks/db';
import { createId } from '@paralleldrive/cuid2';
import type { Env } from '../types';
import { authMiddleware, requireAuth, requireSeller } from '../middleware/auth';
import { validate, getValidatedBody } from '../middleware/validation';

const app = new Hono<{ Bindings: Env }>();

app.use('*', authMiddleware);

// Schemas
const createPaymentSchema = z.object({
  orderId: z.string(),
  provider: z.enum(['PAYFAST', 'OZOW']).default('PAYFAST'),
  returnUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional(),
});

const withdrawSchema = z.object({
  amount: z.number().positive().min(100), // Min R1.00
  bankDetailsId: z.string().optional(),
});

const bankDetailsSchema = z.object({
  bankName: z.string().min(2).max(100),
  accountType: z.enum(['SAVINGS', 'CURRENT', 'TRANSMISSION']),
  accountNumber: z.string().min(6).max(20),
  branchCode: z.string().min(4).max(6),
  accountHolder: z.string().min(2).max(100),
});

// Helper: Generate PayFast payment URL
function generatePayFastUrl(env: Env, data: {
  merchantId: string;
  merchantKey: string;
  orderId: string;
  amount: number;
  itemName: string;
  buyerEmail: string;
  returnUrl: string;
  cancelUrl: string;
  notifyUrl: string;
}) {
  const params = new URLSearchParams({
    merchant_id: data.merchantId,
    merchant_key: data.merchantKey,
    return_url: data.returnUrl,
    cancel_url: data.cancelUrl,
    notify_url: data.notifyUrl,
    m_payment_id: data.orderId,
    amount: (data.amount / 100).toFixed(2),
    item_name: data.itemName.substring(0, 100),
    email_address: data.buyerEmail,
  });
  
  const sandbox = env.PAYFAST_SANDBOX === 'true' || env.NODE_ENV !== 'production';
  const baseUrl = sandbox 
    ? 'https://sandbox.payfast.co.za/eng/process'
    : 'https://www.payfast.co.za/eng/process';
  
  return `${baseUrl}?${params.toString()}`;
}

// Helper: Generate Ozow payment URL
async function generateOzowPaymentRequest(env: Env, data: {
  transactionId: string;
  amount: number;
  bankRef: string;
  isTest: boolean;
  successUrl: string;
  cancelUrl: string;
  errorUrl: string;
  notifyUrl: string;
}): Promise<string> {
  const siteCode = env.OZOW_SITE_CODE;
  const privateKey = env.OZOW_PRIVATE_KEY;
  
  const hashString = `${siteCode}ZAR${(data.amount / 100).toFixed(2)}${data.transactionId}${data.bankRef}${data.isTest}${data.successUrl}${data.cancelUrl}${data.errorUrl}${data.notifyUrl}${privateKey}`;
  const hashBuffer = await crypto.subtle.digest('SHA-512', new TextEncoder().encode(hashString.toLowerCase()));
  const hashCheck = Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  
  const params = new URLSearchParams({
    SiteCode: siteCode,
    CountryCode: 'ZA',
    CurrencyCode: 'ZAR',
    Amount: (data.amount / 100).toFixed(2),
    TransactionReference: data.transactionId,
    BankReference: data.bankRef,
    IsTest: String(data.isTest),
    SuccessUrl: data.successUrl,
    CancelUrl: data.cancelUrl,
    ErrorUrl: data.errorUrl,
    NotifyUrl: data.notifyUrl,
    HashCheck: hashCheck,
  });
  
  return `https://pay.ozow.com/?${params.toString()}`;
}

// POST /create - Create payment session
app.post('/create', requireAuth, validate(createPaymentSchema), async (c) => {
  const body = getValidatedBody<z.infer<typeof createPaymentSchema>>(c);
  const user = c.get('user')!;
  const db = c.get('db');
  const env = c.env;
  
  // Get order
  const order = await db.query.orders.findFirst({
    where: and(
      eq(orders.id, body.orderId),
      eq(orders.buyerId, user.id)
    ),
    with: { service: true },
  });
  
  if (!order) {
    return c.json({
      success: false,
      error: { message: 'Order not found' },
    }, 404);
  }
  
  if (order.status !== 'PENDING_PAYMENT') {
    return c.json({
      success: false,
      error: { message: 'Order already paid or cancelled' },
    }, 400);
  }
  
  // Create transaction - use grossAmount (new) with fallback to totalAmount (legacy)
  const chargeAmount = order.grossAmount ?? order.totalAmount ?? 0;
  const transactionId = createId();
  
  await db.insert(transactions).values({
    id: transactionId, // Use generated ID for Ozow reference
    orderId: order.id,
    userId: user.id,
    type: 'PAYMENT',
    grossAmount: chargeAmount,
    amount: chargeAmount, // legacy field
    gateway: body.provider,
    gatewayMethod: 'UNKNOWN',
    currency: 'ZAR',
    status: 'PENDING',
    rawPayload: {
      orderId: order.id,
      orderNumber: order.orderNumber,
    },
  });
  
  // Generate payment URL
  const baseUrl = env.FRONTEND_URL || 'https://zomieks.com';
  const returnUrl = body.returnUrl || `${baseUrl}/orders/${order.orderNumber}/success`;
  const cancelUrl = body.cancelUrl || `${baseUrl}/orders/${order.orderNumber}/cancel`;
  const notifyUrl = `${env.API_URL || baseUrl}/api/v1/webhooks/payments/${body.provider.toLowerCase()}`;
  
  let paymentUrl: string;
  
  if (body.provider === 'PAYFAST') {
    paymentUrl = generatePayFastUrl(env, {
      merchantId: env.PAYFAST_MERCHANT_ID,
      merchantKey: env.PAYFAST_MERCHANT_KEY,
      orderId: order.id,
      amount: chargeAmount,
      itemName: (order as any).service?.title || `Order ${order.orderNumber}`,
      buyerEmail: user.email,
      returnUrl,
      cancelUrl,
      notifyUrl,
    });
  } else {
    paymentUrl = await generateOzowPaymentRequest(env, {
      transactionId,
      amount: chargeAmount,
      bankRef: order.orderNumber,
      isTest: env.OZOW_TEST_MODE === 'true',
      successUrl: returnUrl,
      cancelUrl,
      errorUrl: cancelUrl,
      notifyUrl,
    });
  }
  
  return c.json({
    success: true,
    data: {
      transactionId,
      paymentUrl,
      provider: body.provider,
    },
  });
});

// GET /transactions - Get user transactions
app.get('/transactions', requireAuth, async (c) => {
  const user = c.get('user')!;
  const db = c.get('db');
  const page = parseInt(c.req.query('page') || '1');
  const limit = parseInt(c.req.query('limit') || '20');
  const type = c.req.query('type');
  const offset = (page - 1) * limit;
  
  let whereConditions: any[] = [eq(transactions.userId, user.id)];
  if (type && ['PAYMENT', 'REFUND', 'PAYOUT', 'ADJUSTMENT'].includes(type)) {
    whereConditions.push(eq(transactions.type, type as 'PAYMENT' | 'REFUND' | 'PAYOUT' | 'ADJUSTMENT'));
  }
  
  const txList = await db.query.transactions.findMany({
    where: and(...whereConditions),
    orderBy: desc(transactions.createdAt),
    limit,
    offset,
  });
  
  return c.json({
    success: true,
    data: txList.map(tx => ({
      id: tx.id,
      type: tx.type,
      amount: (tx.grossAmount ?? tx.amount ?? 0) / 100,
      currency: tx.currency,
      status: tx.status,
      gateway: tx.gateway,
      createdAt: tx.createdAt,
    })),
    meta: { page, limit },
  });
});

// GET /balance - Get seller balance
app.get('/balance', requireAuth, requireSeller, async (c) => {
  const user = c.get('user')!;
  const db = c.get('db');
  
  const profile = await db.query.sellerProfiles.findFirst({
    where: eq(sellerProfiles.userId, user.id),
  });
  
  if (!profile) {
    return c.json({
      success: false,
      error: { message: 'Seller profile not found' },
    }, 404);
  }
  
  // Get pending escrow
  const [escrowResult] = await db
    .select({ total: sql<number>`COALESCE(SUM(${escrowHolds.sellerAmount}), 0)` })
    .from(escrowHolds)
    .where(and(
      eq(escrowHolds.sellerId, user.id),
      eq(escrowHolds.status, 'HELD')
    ));
  
  // Get pending payouts
  const [payoutResult] = await db
    .select({ total: sql<number>`COALESCE(SUM(${sellerPayouts.amount}), 0)` })
    .from(sellerPayouts)
    .where(and(
      eq(sellerPayouts.sellerId, user.id),
      eq(sellerPayouts.status, 'PENDING')
    ));
  
  return c.json({
    success: true,
    data: {
      availableBalance: profile.balance / 100,
      pendingBalance: profile.pendingBalance / 100,
      escrowBalance: Number(escrowResult.total) / 100,
      pendingWithdrawals: Number(payoutResult.total) / 100,
      currency: 'ZAR',
    },
  });
});

// GET /escrow - Get escrow details
app.get('/escrow', requireAuth, requireSeller, async (c) => {
  const user = c.get('user')!;
  const db = c.get('db');
  
  const holds = await db.query.escrowHolds.findMany({
    where: and(
      eq(escrowHolds.sellerId, user.id),
      eq(escrowHolds.status, 'HELD')
    ),
    with: {
      order: { columns: { orderNumber: true } },
    },
    orderBy: desc(escrowHolds.createdAt),
  });
  
  return c.json({
    success: true,
    data: holds.map(hold => ({
      id: hold.id,
      orderId: hold.orderId,
      orderNumber: hold.order?.orderNumber,
      sellerAmount: hold.sellerAmount / 100,
      platformFee: hold.platformFee / 100,
      estimatedRelease: hold.releaseDate,
      createdAt: hold.createdAt,
    })),
  });
});

// POST /withdraw - Request withdrawal
app.post('/withdraw', requireAuth, requireSeller, validate(withdrawSchema), async (c) => {
  const body = getValidatedBody<z.infer<typeof withdrawSchema>>(c);
  const user = c.get('user')!;
  const db = c.get('db');
  
  const profile = await db.query.sellerProfiles.findFirst({
    where: eq(sellerProfiles.userId, user.id),
  });
  
  if (!profile) {
    return c.json({
      success: false,
      error: { message: 'Seller profile not found' },
    }, 404);
  }
  
  if (profile.balance < body.amount) {
    return c.json({
      success: false,
      error: { message: 'Insufficient balance' },
    }, 400);
  }
  
  // Get bank details
  let bankDetail;
  if (body.bankDetailsId) {
    bankDetail = await db.query.bankDetails.findFirst({
      where: and(
        eq(bankDetails.id, body.bankDetailsId),
        eq(bankDetails.userId, user.id)
      ),
    });
  } else {
    bankDetail = await db.query.bankDetails.findFirst({
      where: and(
        eq(bankDetails.userId, user.id),
        eq(bankDetails.isDefault, true)
      ),
    });
  }
  
  if (!bankDetail) {
    return c.json({
      success: false,
      error: { message: 'No bank details found. Please add bank details first.' },
    }, 400);
  }
  
  const payoutId = createId();
  const now = new Date().toISOString();
  
  // Create payout request
  await db.insert(sellerPayouts).values({
    id: payoutId,
    sellerId: user.id,
    amount: body.amount,
    currency: 'ZAR',
    status: 'PENDING',
    bankDetailsSnapshot: {
      bankName: bankDetail.bankName,
      accountNumber: bankDetail.accountNumber.slice(-4),
      accountHolder: bankDetail.accountHolder,
    },
    createdAt: now,
    updatedAt: now,
  });
  
  // Deduct from available balance
  await db.update(sellerProfiles)
    .set({
      balance: profile.balance - body.amount,
      pendingBalance: profile.pendingBalance + body.amount,
    })
    .where(eq(sellerProfiles.userId, user.id));
  
  return c.json({
    success: true,
    data: {
      payoutId,
      amount: body.amount / 100,
      status: 'PENDING',
      estimatedArrival: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    },
  });
});

// GET /payouts - Get payout history
app.get('/payouts', requireAuth, requireSeller, async (c) => {
  const user = c.get('user')!;
  const db = c.get('db');
  const page = parseInt(c.req.query('page') || '1');
  const limit = parseInt(c.req.query('limit') || '20');
  const offset = (page - 1) * limit;
  
  const payouts = await db.query.sellerPayouts.findMany({
    where: eq(sellerPayouts.sellerId, user.id),
    orderBy: desc(sellerPayouts.createdAt),
    limit,
    offset,
  });
  
  return c.json({
    success: true,
    data: payouts.map(p => ({
      id: p.id,
      amount: p.amount / 100,
      currency: p.currency,
      status: p.status,
      bankDetails: p.bankDetailsSnapshot,
      processedAt: p.processedAt,
      createdAt: p.createdAt,
    })),
    meta: { page, limit },
  });
});

// Bank Details Management
app.get('/bank-details', requireAuth, requireSeller, async (c) => {
  const user = c.get('user')!;
  const db = c.get('db');
  
  const details = await db.query.bankDetails.findMany({
    where: eq(bankDetails.userId, user.id),
    orderBy: desc(bankDetails.createdAt),
  });
  
  return c.json({
    success: true,
    data: details.map(d => ({
      id: d.id,
      bankName: d.bankName,
      accountType: d.accountType,
      accountNumber: `****${d.accountNumber.slice(-4)}`,
      branchCode: d.branchCode,
      accountHolder: d.accountHolder,
      isDefault: d.isDefault,
      isVerified: d.isVerified,
    })),
  });
});

app.post('/bank-details', requireAuth, requireSeller, validate(bankDetailsSchema), async (c) => {
  const body = getValidatedBody<z.infer<typeof bankDetailsSchema>>(c);
  const user = c.get('user')!;
  const db = c.get('db');
  
  // Check existing count
  const existing = await db.query.bankDetails.findMany({
    where: eq(bankDetails.userId, user.id),
  });
  
  if (existing.length >= 3) {
    return c.json({
      success: false,
      error: { message: 'Maximum 3 bank accounts allowed' },
    }, 400);
  }
  
  const id = createId();
  const now = new Date().toISOString();
  const isFirst = existing.length === 0;
  
  await db.insert(bankDetails).values({
    id,
    userId: user.id,
    bankName: body.bankName,
    accountType: body.accountType,
    accountNumber: body.accountNumber,
    branchCode: body.branchCode,
    accountHolder: body.accountHolder,
    isDefault: isFirst,
  });
  
  return c.json({
    success: true,
    data: {
      id,
      bankName: body.bankName,
      accountNumber: `****${body.accountNumber.slice(-4)}`,
      isDefault: isFirst,
    },
  });
});

app.patch('/bank-details/:id/default', requireAuth, requireSeller, async (c) => {
  const { id } = c.req.param();
  const user = c.get('user')!;
  const db = c.get('db');
  
  const detail = await db.query.bankDetails.findFirst({
    where: and(
      eq(bankDetails.id, id),
      eq(bankDetails.userId, user.id)
    ),
  });
  
  if (!detail) {
    return c.json({
      success: false,
      error: { message: 'Bank details not found' },
    }, 404);
  }
  
  // Remove default from all
  await db.update(bankDetails)
    .set({ isDefault: false })
    .where(eq(bankDetails.userId, user.id));
  
  // Set this as default
  await db.update(bankDetails)
    .set({ isDefault: true })
    .where(eq(bankDetails.id, id));
  
  return c.json({
    success: true,
    message: 'Default bank details updated',
  });
});

app.delete('/bank-details/:id', requireAuth, requireSeller, async (c) => {
  const { id } = c.req.param();
  const user = c.get('user')!;
  const db = c.get('db');
  
  const detail = await db.query.bankDetails.findFirst({
    where: and(
      eq(bankDetails.id, id),
      eq(bankDetails.userId, user.id)
    ),
  });
  
  if (!detail) {
    return c.json({
      success: false,
      error: { message: 'Bank details not found' },
    }, 404);
  }
  
  await db.delete(bankDetails).where(eq(bankDetails.id, id));
  
  // If was default, set another as default
  if (detail.isDefault) {
    const another = await db.query.bankDetails.findFirst({
      where: eq(bankDetails.userId, user.id),
    });
    if (another) {
      await db.update(bankDetails)
        .set({ isDefault: true })
        .where(eq(bankDetails.id, another.id));
    }
  }
  
  return c.json({
    success: true,
    message: 'Bank details deleted',
  });
});

// GET /earnings - Get earnings summary
app.get('/earnings', requireAuth, requireSeller, async (c) => {
  const user = c.get('user')!;
  const db = c.get('db');
  const period = c.req.query('period') || '30d';
  
  let startDate: Date;
  const now = new Date();
  
  switch (period) {
    case '7d':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case '30d':
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case '90d':
      startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      break;
    case 'year':
      startDate = new Date(now.getFullYear(), 0, 1);
      break;
    default:
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }
  
  // Get completed orders in period
  const [orderStats] = await db
    .select({
      count: sql<number>`COUNT(*)`,
      revenue: sql<number>`COALESCE(SUM(${orders.sellerPayoutAmount}), 0)`,
    })
    .from(orders)
    .where(and(
      eq(orders.sellerId, user.id),
      eq(orders.status, 'COMPLETED'),
      gte(orders.completedAt, startDate.toISOString())
    ));
  
  // Get cancelled orders
  const [cancelledStats] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(orders)
    .where(and(
      eq(orders.sellerId, user.id),
      eq(orders.status, 'CANCELLED'),
      gte(orders.updatedAt, startDate.toISOString())
    ));
  
  return c.json({
    success: true,
    data: {
      period,
      earnings: Number(orderStats.revenue) / 100,
      ordersCompleted: Number(orderStats.count),
      ordersCancelled: Number(cancelledStats.count),
      currency: 'ZAR',
    },
  });
});

export default app;
