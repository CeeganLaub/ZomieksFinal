import { Hono } from 'hono';
import { z } from 'zod';
import { eq, and, desc, gte, lte, count } from 'drizzle-orm';
import { 
  subscriptions, subscriptionTiers, subscriptionPayments,
  transactions, users, services, orders
} from '@zomieks/db';
import { createId } from '@paralleldrive/cuid2';
import type { Env } from '../types';
import { authMiddleware, requireAuth, requireSeller } from '../middleware/auth';
import { validate, getValidatedBody } from '../middleware/validation';

const app = new Hono<{ Bindings: Env }>();

app.use('*', authMiddleware);

// Schemas
const subscribeSchema = z.object({
  tierId: z.string(),
  paymentProvider: z.enum(['PAYFAST', 'OZOW']).default('PAYFAST'),
  billingCycle: z.enum(['MONTHLY', 'QUARTERLY', 'YEARLY']).default('MONTHLY'),
});

const cancelSchema = z.object({
  reason: z.string().max(500).optional(),
  feedback: z.string().max(1000).optional(),
});

// GET /tiers - List subscription tiers
app.get('/tiers', async (c) => {
  const db = c.get('db');
  
  const tiers = await db.query.subscriptionTiers.findMany({
    where: eq(subscriptionTiers.isActive, true),
    orderBy: [subscriptionTiers.monthlyPrice],
  });
  
  return c.json({
    success: true,
    data: tiers.map(tier => ({
      id: tier.id,
      name: tier.name,
      description: tier.description,
      monthlyPrice: tier.monthlyPrice / 100,
      quarterlyPrice: tier.quarterlyPrice / 100,
      yearlyPrice: tier.yearlyPrice / 100,
      features: tier.features,
      limits: tier.limits,
      isPopular: tier.isPopular,
    })),
  });
});

// GET /current - Get current subscription
app.get('/current', requireAuth, async (c) => {
  const user = c.get('user')!;
  const db = c.get('db');
  
  const subscription = await db.query.subscriptions.findFirst({
    where: and(
      eq(subscriptions.userId, user.id),
      eq(subscriptions.status, 'ACTIVE')
    ),
    with: { tier: true },
  });
  
  if (!subscription) {
    return c.json({
      success: true,
      data: null,
    });
  }
  
  return c.json({
    success: true,
    data: {
      id: subscription.id,
      tier: {
        id: subscription.tier.id,
        name: subscription.tier.name,
        features: subscription.tier.features,
      },
      billingCycle: subscription.billingCycle,
      currentPeriodStart: subscription.currentPeriodStart,
      currentPeriodEnd: subscription.currentPeriodEnd,
      nextBillingDate: subscription.nextBillingDate,
      amount: subscription.amount / 100,
      status: subscription.status,
      autoRenew: subscription.autoRenew,
    },
  });
});

// POST /subscribe - Create subscription
app.post('/subscribe', requireAuth, validate(subscribeSchema), async (c) => {
  const body = getValidatedBody<z.infer<typeof subscribeSchema>>(c);
  const user = c.get('user')!;
  const db = c.get('db');
  const env = c.env;
  
  // Check for existing active subscription
  const existing = await db.query.subscriptions.findFirst({
    where: and(
      eq(subscriptions.userId, user.id),
      eq(subscriptions.status, 'ACTIVE')
    ),
  });
  
  if (existing) {
    return c.json({
      success: false,
      error: { message: 'Already have an active subscription. Please cancel first or upgrade.' },
    }, 400);
  }
  
  // Get tier
  const tier = await db.query.subscriptionTiers.findFirst({
    where: and(
      eq(subscriptionTiers.id, body.tierId),
      eq(subscriptionTiers.isActive, true)
    ),
  });
  
  if (!tier) {
    return c.json({
      success: false,
      error: { message: 'Subscription tier not found' },
    }, 404);
  }
  
  // Calculate amount based on billing cycle
  let amount: number;
  let periodDays: number;
  
  switch (body.billingCycle) {
    case 'QUARTERLY':
      amount = tier.quarterlyPrice;
      periodDays = 90;
      break;
    case 'YEARLY':
      amount = tier.yearlyPrice;
      periodDays = 365;
      break;
    default:
      amount = tier.monthlyPrice;
      periodDays = 30;
  }
  
  const subscriptionId = createId();
  const transactionId = createId();
  const now = new Date();
  const periodEnd = new Date(now.getTime() + periodDays * 24 * 60 * 60 * 1000);
  
  // Create pending subscription
  await db.insert(subscriptions).values({
    id: subscriptionId,
    userId: user.id,
    tierId: body.tierId,
    status: 'PENDING',
    billingCycle: body.billingCycle,
    amount,
    currentPeriodStart: now.toISOString(),
    currentPeriodEnd: periodEnd.toISOString(),
    nextBillingDate: periodEnd.toISOString(),
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  });
  
  // Create transaction
  await db.insert(transactions).values({
    id: transactionId,
    userId: user.id,
    type: 'SUBSCRIPTION',
    amount,
    currency: 'ZAR',
    status: 'PENDING',
    provider: body.paymentProvider,
    metadata: {
      subscriptionId,
      tierId: body.tierId,
      tierName: tier.name,
      billingCycle: body.billingCycle,
    },
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  });
  
  // Generate payment URL
  const baseUrl = env.APP_URL || 'https://zomieks.com';
  const returnUrl = `${baseUrl}/subscription/success`;
  const cancelUrl = `${baseUrl}/subscription/cancel`;
  const notifyUrl = `${baseUrl}/api/v1/webhooks/subscription/${body.paymentProvider.toLowerCase()}`;
  
  // Use appropriate payment provider
  const itemName = `${tier.name} Subscription (${body.billingCycle.toLowerCase()})`;
  
  const params = new URLSearchParams({
    merchant_id: env.PAYFAST_MERCHANT_ID,
    merchant_key: env.PAYFAST_MERCHANT_KEY,
    return_url: returnUrl,
    cancel_url: cancelUrl,
    notify_url: notifyUrl,
    m_payment_id: transactionId,
    amount: (amount / 100).toFixed(2),
    item_name: itemName,
    email_address: user.email,
    subscription_type: '1',
    recurring_amount: (amount / 100).toFixed(2),
    frequency: body.billingCycle === 'MONTHLY' ? '3' : body.billingCycle === 'QUARTERLY' ? '4' : '6',
    cycles: '0',
  });
  
  const sandbox = env.PAYFAST_SANDBOX === 'true';
  const paymentUrl = sandbox
    ? `https://sandbox.payfast.co.za/eng/process?${params.toString()}`
    : `https://www.payfast.co.za/eng/process?${params.toString()}`;
  
  return c.json({
    success: true,
    data: {
      subscriptionId,
      transactionId,
      paymentUrl,
    },
  });
});

// POST /cancel - Cancel subscription
app.post('/cancel', requireAuth, validate(cancelSchema), async (c) => {
  const body = getValidatedBody<z.infer<typeof cancelSchema>>(c);
  const user = c.get('user')!;
  const db = c.get('db');
  
  const subscription = await db.query.subscriptions.findFirst({
    where: and(
      eq(subscriptions.userId, user.id),
      eq(subscriptions.status, 'ACTIVE')
    ),
  });
  
  if (!subscription) {
    return c.json({
      success: false,
      error: { message: 'No active subscription found' },
    }, 404);
  }
  
  const now = new Date().toISOString();
  
  // Mark for cancellation at period end
  await db.update(subscriptions)
    .set({
      status: 'CANCELLED',
      autoRenew: false,
      cancelledAt: now,
      cancellationReason: body.reason || null,
      updatedAt: now,
    })
    .where(eq(subscriptions.id, subscription.id));
  
  // Queue email notification
  await c.env.EMAIL_QUEUE?.send({
    type: 'subscription_cancelled',
    to: user.email,
    data: {
      name: user.firstName || user.username,
      endDate: subscription.currentPeriodEnd,
    },
  });
  
  return c.json({
    success: true,
    data: {
      cancelledAt: now,
      accessUntil: subscription.currentPeriodEnd,
    },
  });
});

// POST /reactivate - Reactivate cancelled subscription
app.post('/reactivate', requireAuth, async (c) => {
  const user = c.get('user')!;
  const db = c.get('db');
  
  const subscription = await db.query.subscriptions.findFirst({
    where: and(
      eq(subscriptions.userId, user.id),
      eq(subscriptions.status, 'CANCELLED')
    ),
  });
  
  if (!subscription) {
    return c.json({
      success: false,
      error: { message: 'No cancelled subscription found' },
    }, 404);
  }
  
  // Check if still within period
  const periodEnd = new Date(subscription.currentPeriodEnd);
  if (periodEnd < new Date()) {
    return c.json({
      success: false,
      error: { message: 'Subscription period has ended. Please create a new subscription.' },
    }, 400);
  }
  
  const now = new Date().toISOString();
  
  await db.update(subscriptions)
    .set({
      status: 'ACTIVE',
      autoRenew: true,
      cancelledAt: null,
      cancellationReason: null,
      updatedAt: now,
    })
    .where(eq(subscriptions.id, subscription.id));
  
  return c.json({
    success: true,
    message: 'Subscription reactivated',
  });
});

// GET /history - Get subscription payment history
app.get('/history', requireAuth, async (c) => {
  const user = c.get('user')!;
  const db = c.get('db');
  const page = parseInt(c.req.query('page') || '1');
  const limit = parseInt(c.req.query('limit') || '20');
  const offset = (page - 1) * limit;
  
  const payments = await db.query.subscriptionPayments.findMany({
    where: eq(subscriptionPayments.userId, user.id),
    with: { subscription: { with: { tier: true } } },
    orderBy: desc(subscriptionPayments.createdAt),
    limit,
    offset,
  });
  
  return c.json({
    success: true,
    data: payments.map(p => ({
      id: p.id,
      amount: p.amount / 100,
      currency: p.currency,
      status: p.status,
      tierName: p.subscription?.tier?.name,
      billingPeriod: {
        start: p.periodStart,
        end: p.periodEnd,
      },
      paidAt: p.paidAt,
      createdAt: p.createdAt,
    })),
    meta: { page, limit },
  });
});

// GET /usage - Get subscription usage stats
app.get('/usage', requireAuth, async (c) => {
  const user = c.get('user')!;
  const db = c.get('db');
  
  const subscription = await db.query.subscriptions.findFirst({
    where: and(
      eq(subscriptions.userId, user.id),
      eq(subscriptions.status, 'ACTIVE')
    ),
    with: { tier: true },
  });
  
  if (!subscription) {
    return c.json({
      success: true,
      data: {
        tier: 'FREE',
        limits: {
          activeServices: { used: 0, limit: 3 },
          monthlyOrders: { used: 0, limit: 10 },
          responseTime: { value: 'Standard' },
        },
      },
    });
  }
  
  // Calculate actual usage from orders and services
  const limits = subscription.tier.limits as Record<string, number>;
  
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  
  const [activeServiceCount] = await db.select({ count: count() })
    .from(services)
    .where(and(eq(services.sellerId, user.id), eq(services.status, 'ACTIVE')));
  
  const [monthlyOrderCount] = await db.select({ count: count() })
    .from(orders)
    .where(and(eq(orders.sellerId, user.id), gte(orders.createdAt, monthStart)));
  
  return c.json({
    success: true,
    data: {
      tier: subscription.tier.name,
      limits: {
        activeServices: { used: activeServiceCount?.count || 0, limit: limits.activeServices || 999 },
        monthlyOrders: { used: monthlyOrderCount?.count || 0, limit: limits.monthlyOrders || 999 },
        responseTime: { value: limits.prioritySupport ? 'Priority' : 'Standard' },
      },
      features: subscription.tier.features,
    },
  });
});

export default app;
