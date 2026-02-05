import { Hono } from 'hono';
import { eq, and } from 'drizzle-orm';
import { 
  transactions, orders, escrowHolds, subscriptions, 
  subscriptionPayments, sellerProfiles, users
} from '@zomieks/db';
import { createId } from '@paralleldrive/cuid2';
import type { Env } from '../types';

const app = new Hono<{ Bindings: Env }>();

// PayFast Webhook Handler
app.post('/payments/payfast', async (c) => {
  const db = c.get('db');
  const env = c.env;
  
  const formData = await c.req.formData();
  const data: Record<string, string> = {};
  formData.forEach((value, key) => {
    data[key] = value.toString();
  });
  
  // Validate PayFast signature
  const pfParamString = Object.keys(data)
    .filter(key => key !== 'signature')
    .sort()
    .map(key => `${key}=${encodeURIComponent(data[key]).replace(/%20/g, '+')}`)
    .join('&');
  
  const expectedSignature = await generateMD5(pfParamString + `&passphrase=${env.PAYFAST_PASSPHRASE}`);
  
  if (data.signature !== expectedSignature) {
    console.error('PayFast signature mismatch');
    return c.text('Invalid signature', 400);
  }
  
  // Validate source IP (PayFast IPs)
  const pfValidIps = [
    '197.97.145.144', '197.97.145.145', '197.97.145.146', '197.97.145.147',
    '41.74.179.194', '41.74.179.195', '41.74.179.196', '41.74.179.197',
  ];
  const sourceIp = c.req.header('CF-Connecting-IP') || '';
  
  // Skip IP check for sandbox
  if (env.PAYFAST_SANDBOX !== 'true' && !pfValidIps.includes(sourceIp)) {
    console.error('Invalid source IP:', sourceIp);
    return c.text('Invalid source', 403);
  }
  
  const paymentId = data.m_payment_id;
  const status = data.payment_status;
  const amountGross = Math.round(parseFloat(data.amount_gross) * 100);
  
  // Find transaction
  const transaction = await db.query.transactions.findFirst({
    where: eq(transactions.id, paymentId),
  });
  
  if (!transaction) {
    console.error('Transaction not found:', paymentId);
    return c.text('Transaction not found', 404);
  }
  
  const now = new Date().toISOString();
  
  if (status === 'COMPLETE') {
    // Update transaction
    await db.update(transactions)
      .set({
        status: 'COMPLETED',
        providerReference: data.pf_payment_id,
        metadata: { ...transaction.metadata, payfastData: data },
        updatedAt: now,
      })
      .where(eq(transactions.id, paymentId));
    
    // Process based on transaction type
    if (transaction.type === 'PAYMENT') {
      await processOrderPayment(db, env, transaction, amountGross, now);
    } else if (transaction.type === 'SUBSCRIPTION') {
      await processSubscriptionPayment(db, env, transaction, amountGross, now);
    }
  } else if (status === 'FAILED' || status === 'CANCELLED') {
    await db.update(transactions)
      .set({
        status: status === 'FAILED' ? 'FAILED' : 'CANCELLED',
        updatedAt: now,
      })
      .where(eq(transactions.id, paymentId));
  }
  
  return c.text('OK', 200);
});

// Ozow Webhook Handler
app.post('/payments/ozow', async (c) => {
  const db = c.get('db');
  const env = c.env;
  
  const data = await c.req.json();
  
  // Verify hash
  const hashString = `${data.SiteCode}${data.TransactionId}${data.TransactionReference}${data.Amount}${data.Status}${data.Optional1 || ''}${data.Optional2 || ''}${data.Optional3 || ''}${data.Optional4 || ''}${data.Optional5 || ''}${data.CurrencyCode}${data.IsTest}${data.StatusMessage}${env.OZOW_PRIVATE_KEY}`;
  
  const hashBuffer = await crypto.subtle.digest('SHA-512', new TextEncoder().encode(hashString.toLowerCase()));
  const expectedHash = Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  
  if (data.Hash.toLowerCase() !== expectedHash) {
    console.error('Ozow hash mismatch');
    return c.json({ error: 'Invalid hash' }, 400);
  }
  
  const transactionRef = data.TransactionReference;
  const status = data.Status;
  const amountPaid = Math.round(parseFloat(data.Amount) * 100);
  
  // Find transaction
  const transaction = await db.query.transactions.findFirst({
    where: eq(transactions.id, transactionRef),
  });
  
  if (!transaction) {
    console.error('Transaction not found:', transactionRef);
    return c.json({ error: 'Transaction not found' }, 404);
  }
  
  const now = new Date().toISOString();
  
  if (status === 'Complete') {
    await db.update(transactions)
      .set({
        status: 'COMPLETED',
        providerReference: data.TransactionId,
        metadata: { ...transaction.metadata, ozowData: data },
        updatedAt: now,
      })
      .where(eq(transactions.id, transactionRef));
    
    if (transaction.type === 'PAYMENT') {
      await processOrderPayment(db, env, transaction, amountPaid, now);
    } else if (transaction.type === 'SUBSCRIPTION') {
      await processSubscriptionPayment(db, env, transaction, amountPaid, now);
    }
  } else if (status === 'Error' || status === 'Cancelled' || status === 'Abandoned') {
    await db.update(transactions)
      .set({
        status: status === 'Error' ? 'FAILED' : 'CANCELLED',
        updatedAt: now,
      })
      .where(eq(transactions.id, transactionRef));
  }
  
  return c.json({ success: true });
});

// Helper: Process order payment
async function processOrderPayment(db: any, env: Env, transaction: any, amountPaid: number, now: string) {
  const metadata = transaction.metadata as { orderId?: string };
  if (!metadata?.orderId) return;
  
  const order = await db.query.orders.findFirst({
    where: eq(orders.id, metadata.orderId),
    with: { seller: true },
  });
  
  if (!order) return;
  
  // Calculate fees
  const buyerFee = Math.round(amountPaid * 0.03);
  const sellerFee = Math.round((amountPaid - buyerFee) * 0.08);
  const sellerAmount = amountPaid - buyerFee - sellerFee;
  const platformFee = buyerFee + sellerFee;
  
  // Update order
  await db.update(orders)
    .set({
      paymentStatus: 'PAID',
      status: 'IN_PROGRESS',
      buyerFee,
      platformFee,
      sellerAmount,
      paidAt: now,
      updatedAt: now,
    })
    .where(eq(orders.id, order.id));
  
  // Create escrow hold
  await db.insert(escrowHolds).values({
    id: createId(),
    orderId: order.id,
    sellerId: order.sellerId,
    amount: amountPaid,
    sellerAmount,
    platformFee,
    status: 'HELD',
    createdAt: now,
    updatedAt: now,
  });
  
  // Send notifications
  await env.NOTIFICATION_QUEUE.send({
    type: 'order_paid',
    orderId: order.id,
    buyerId: order.buyerId,
    sellerId: order.sellerId,
  });
  
  // Send email to seller
  if (order.seller?.email) {
    await env.EMAIL_QUEUE.send({
      type: 'new_order',
      to: order.seller.email,
      data: {
        orderNumber: order.orderNumber,
        amount: sellerAmount / 100,
      },
    });
  }
}

// Helper: Process subscription payment
async function processSubscriptionPayment(db: any, env: Env, transaction: any, amountPaid: number, now: string) {
  const metadata = transaction.metadata as { subscriptionId?: string; tierId?: string };
  if (!metadata?.subscriptionId) return;
  
  const subscription = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.id, metadata.subscriptionId),
    with: { user: true },
  });
  
  if (!subscription) return;
  
  // Activate subscription
  await db.update(subscriptions)
    .set({
      status: 'ACTIVE',
      updatedAt: now,
    })
    .where(eq(subscriptions.id, subscription.id));
  
  // Create payment record
  await db.insert(subscriptionPayments).values({
    id: createId(),
    subscriptionId: subscription.id,
    userId: subscription.userId,
    amount: amountPaid,
    currency: 'ZAR',
    status: 'PAID',
    periodStart: subscription.currentPeriodStart,
    periodEnd: subscription.currentPeriodEnd,
    paidAt: now,
    createdAt: now,
    updatedAt: now,
  });
  
  // Send welcome email
  if (subscription.user?.email) {
    await env.EMAIL_QUEUE.send({
      type: 'subscription_activated',
      to: subscription.user.email,
      data: {
        name: subscription.user.firstName || subscription.user.username,
      },
    });
  }
}

// Subscription renewal webhook (PayFast recurring)
app.post('/subscription/payfast', async (c) => {
  const db = c.get('db');
  const env = c.env;
  
  const formData = await c.req.formData();
  const data: Record<string, string> = {};
  formData.forEach((value, key) => {
    data[key] = value.toString();
  });
  
  // Similar validation as payment webhook...
  const pfParamString = Object.keys(data)
    .filter(key => key !== 'signature')
    .sort()
    .map(key => `${key}=${encodeURIComponent(data[key]).replace(/%20/g, '+')}`)
    .join('&');
  
  const expectedSignature = await generateMD5(pfParamString + `&passphrase=${env.PAYFAST_PASSPHRASE}`);
  
  if (data.signature !== expectedSignature) {
    return c.text('Invalid signature', 400);
  }
  
  const subscriptionToken = data.token;
  const status = data.payment_status;
  const amountGross = Math.round(parseFloat(data.amount_gross) * 100);
  
  // Find subscription by PayFast token
  const subscription = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.providerSubscriptionId, subscriptionToken),
    with: { user: true, tier: true },
  });
  
  if (!subscription) {
    console.error('Subscription not found for token:', subscriptionToken);
    return c.text('Subscription not found', 404);
  }
  
  const now = new Date();
  const nowStr = now.toISOString();
  
  if (status === 'COMPLETE') {
    // Calculate next period
    let nextPeriodEnd: Date;
    switch (subscription.billingCycle) {
      case 'QUARTERLY':
        nextPeriodEnd = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
        break;
      case 'YEARLY':
        nextPeriodEnd = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        nextPeriodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    }
    
    // Update subscription periods
    await db.update(subscriptions)
      .set({
        currentPeriodStart: nowStr,
        currentPeriodEnd: nextPeriodEnd.toISOString(),
        nextBillingDate: nextPeriodEnd.toISOString(),
        updatedAt: nowStr,
      })
      .where(eq(subscriptions.id, subscription.id));
    
    // Create payment record
    await db.insert(subscriptionPayments).values({
      id: createId(),
      subscriptionId: subscription.id,
      userId: subscription.userId,
      amount: amountGross,
      currency: 'ZAR',
      status: 'PAID',
      periodStart: nowStr,
      periodEnd: nextPeriodEnd.toISOString(),
      paidAt: nowStr,
      createdAt: nowStr,
      updatedAt: nowStr,
    });
    
    // Create transaction
    await db.insert(transactions).values({
      id: createId(),
      userId: subscription.userId,
      type: 'SUBSCRIPTION_RENEWAL',
      amount: amountGross,
      currency: 'ZAR',
      status: 'COMPLETED',
      provider: 'PAYFAST',
      providerReference: data.pf_payment_id,
      metadata: {
        subscriptionId: subscription.id,
        tierName: subscription.tier?.name,
        billingCycle: subscription.billingCycle,
      },
      createdAt: nowStr,
      updatedAt: nowStr,
    });
  } else if (status === 'FAILED') {
    // Handle failed renewal - could implement retry logic or grace period
    await db.update(subscriptions)
      .set({
        status: 'PAST_DUE',
        updatedAt: nowStr,
      })
      .where(eq(subscriptions.id, subscription.id));
    
    // Notify user
    if (subscription.user?.email) {
      await env.EMAIL_QUEUE.send({
        type: 'payment_failed',
        to: subscription.user.email,
        data: {
          name: subscription.user.firstName || subscription.user.username,
        },
      });
    }
  }
  
  return c.text('OK', 200);
});

// Stripe webhook (future implementation)
app.post('/stripe', async (c) => {
  // Placeholder for Stripe webhook handling
  return c.json({ received: true });
});

// Helper: Generate MD5 hash
async function generateMD5(input: string): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('MD5', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export default app;
