import { Hono } from 'hono';
import { eq, desc } from 'drizzle-orm';
import { sellerProfiles, sellerSubscriptions, sellerSubscriptionPayments, transactions } from '@zomieks/db';
import { createId } from '@paralleldrive/cuid2';
import { SELLER_PLAN } from '@zomieks/shared';
import type { Env } from '../types';
import { authMiddleware, requireSeller } from '../middleware/auth';

const app = new Hono<{ Bindings: Env }>();

// Helper: Generate Ozow payment URL for subscriptions
async function generateOzowSubscriptionPayment(env: Env, data: {
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

// GET /status — Get seller subscription status
app.get('/status', authMiddleware, requireSeller, async (c) => {
  const db = c.get('db');
  const user = c.get('user')!;

  const profile = await db.query.sellerProfiles.findFirst({
    where: eq(sellerProfiles.userId, user.id),
    with: {
      subscription: {
        with: {
          payments: {
            orderBy: [desc(sellerSubscriptionPayments.paidAt)],
            limit: 5,
          },
        },
      },
    },
  });

  if (!profile) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Seller profile not found' } }, 404);
  }

  const subscription = profile.subscription;

  return c.json({
    success: true,
    data: {
      hasSubscription: !!subscription,
      subscription: subscription
        ? {
            id: subscription.id,
            status: subscription.status,
            currentPeriodStart: subscription.currentPeriodStart,
            currentPeriodEnd: subscription.currentPeriodEnd,
            nextBillingDate: subscription.nextBillingDate,
            cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
            cancelledAt: subscription.cancelledAt,
            cancelReason: subscription.cancelReason,
            payments: subscription.payments,
          }
        : null,
      plan: SELLER_PLAN,
    },
  });
});

// POST /subscribe — Subscribe to Zomieks Pro
app.post('/subscribe', authMiddleware, requireSeller, async (c) => {
  const db = c.get('db');
  const user = c.get('user')!;

  const profile = await db.query.sellerProfiles.findFirst({
    where: eq(sellerProfiles.userId, user.id),
    with: { subscription: true },
  });

  if (!profile) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Seller profile not found' } }, 404);
  }

  if (profile.subscription?.status === 'ACTIVE') {
    return c.json({ success: false, error: { code: 'ALREADY_SUBSCRIBED', message: 'You already have an active subscription' } }, 400);
  }

  const now = new Date();
  const periodEnd = new Date(now);
  periodEnd.setMonth(periodEnd.getMonth() + 1);
  const nowIso = now.toISOString();
  const periodEndIso = periodEnd.toISOString();

  let subscriptionId: string;

  if (profile.subscription) {
    subscriptionId = profile.subscription.id;
    await db.update(sellerSubscriptions).set({
      status: 'PENDING',
      currentPeriodStart: nowIso,
      currentPeriodEnd: periodEndIso,
      nextBillingDate: periodEndIso,
      cancelAtPeriodEnd: false,
      cancelledAt: null,
      cancelReason: null,
      updatedAt: nowIso,
    }).where(eq(sellerSubscriptions.id, subscriptionId));
  } else {
    subscriptionId = createId();
    await db.insert(sellerSubscriptions).values({
      id: subscriptionId,
      sellerProfileId: profile.id,
      status: 'PENDING',
      currentPeriodStart: nowIso,
      currentPeriodEnd: periodEndIso,
      nextBillingDate: periodEndIso,
    });
  }

  // Create a transaction for the subscription payment
  const transactionId = createId();
  const amountCents = SELLER_PLAN.AMOUNT * 100; // R399 = 39900 cents

  await db.insert(transactions).values({
    id: transactionId,
    userId: user.id,
    type: 'PAYMENT',
    grossAmount: amountCents,
    amount: amountCents,
    gateway: 'OZOW',
    gatewayMethod: 'UNKNOWN',
    currency: 'ZAR',
    status: 'PENDING',
    rawPayload: {
      subscriptionId,
      sellerProfileId: profile.id,
      type: 'SELLER_SUBSCRIPTION',
    },
  });

  // Generate real OZOW payment URL
  const baseUrl = c.env.FRONTEND_URL || 'https://zomieks.com';
  const paymentUrl = await generateOzowSubscriptionPayment(c.env, {
    transactionId,
    amount: amountCents,
    bankRef: `ZPRO-${subscriptionId.slice(-8).toUpperCase()}`,
    isTest: c.env.OZOW_TEST_MODE === 'true',
    successUrl: `${baseUrl}/seller?subscription=success`,
    cancelUrl: `${baseUrl}/seller?subscription=cancelled`,
    errorUrl: `${baseUrl}/seller?subscription=error`,
    notifyUrl: `${c.env.API_URL || baseUrl}/api/v1/webhooks/payments/ozow-subscription`,
  });

  return c.json({
    success: true,
    data: { subscriptionId, paymentUrl },
  });
});

// POST /cancel — Cancel at end of period
app.post('/cancel', authMiddleware, requireSeller, async (c) => {
  const db = c.get('db');
  const user = c.get('user')!;
  const body = await c.req.json<{ reason?: string }>().catch(() => ({} as { reason?: string }));

  const profile = await db.query.sellerProfiles.findFirst({
    where: eq(sellerProfiles.userId, user.id),
    with: { subscription: true },
  });

  if (!profile?.subscription) {
    return c.json({ success: false, error: { code: 'NO_SUBSCRIPTION', message: 'No subscription found' } }, 404);
  }

  if (profile.subscription.status !== 'ACTIVE') {
    return c.json({ success: false, error: { code: 'NOT_ACTIVE', message: 'Subscription is not active' } }, 400);
  }

  const now = new Date().toISOString();
  await db.update(sellerSubscriptions).set({
    cancelAtPeriodEnd: true,
    cancelledAt: now,
    cancelReason: body.reason || 'User cancelled',
    updatedAt: now,
  }).where(eq(sellerSubscriptions.id, profile.subscription.id));

  return c.json({
    success: true,
    data: {
      message: 'Subscription will be cancelled at end of billing period',
      accessUntil: profile.subscription.currentPeriodEnd,
    },
  });
});

// POST /reactivate — Undo pending cancellation
app.post('/reactivate', authMiddleware, requireSeller, async (c) => {
  const db = c.get('db');
  const user = c.get('user')!;

  const profile = await db.query.sellerProfiles.findFirst({
    where: eq(sellerProfiles.userId, user.id),
    with: { subscription: true },
  });

  if (!profile?.subscription) {
    return c.json({ success: false, error: { code: 'NO_SUBSCRIPTION', message: 'No subscription found' } }, 404);
  }

  if (profile.subscription.status !== 'ACTIVE' || !profile.subscription.cancelAtPeriodEnd) {
    return c.json({ success: false, error: { code: 'NOT_CANCELLING', message: 'Subscription is not pending cancellation' } }, 400);
  }

  await db.update(sellerSubscriptions).set({
    cancelAtPeriodEnd: false,
    cancelledAt: null,
    cancelReason: null,
    updatedAt: new Date().toISOString(),
  }).where(eq(sellerSubscriptions.id, profile.subscription.id));

  return c.json({
    success: true,
    data: { message: 'Subscription reactivated' },
  });
});

export default app;
