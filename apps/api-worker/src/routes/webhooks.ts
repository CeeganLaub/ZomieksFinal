import { Hono } from 'hono';
import { eq, and, sql } from 'drizzle-orm';
import { 
  transactions, orders, escrowHolds, subscriptions, 
  subscriptionPayments, sellerProfiles, users, sellerPayouts
} from '@zomieks/db';
import { createId } from '@paralleldrive/cuid2';
import type { Env } from '../types';
import { DEFAULT_FEE_POLICY } from '../services/fee-engine';

const app = new Hono<{ Bindings: Env }>();

// Reserve period for payouts (days)
const RESERVE_DAYS = DEFAULT_FEE_POLICY.reserveDays;

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
  
  const orderId = data.m_payment_id;
  const status = data.payment_status;
  const pfPaymentId = data.pf_payment_id;
  
  // Parse amounts from ITN (in Rands, convert to cents)
  const amountGross = Math.round(parseFloat(data.amount_gross) * 100);
  const amountFee = Math.round(parseFloat(data.amount_fee || '0') * 100);
  const amountNet = Math.round(parseFloat(data.amount_net || data.amount_gross) * 100);
  
  // Find order by m_payment_id (order ID)
  const order = await db.query.orders.findFirst({
    where: eq(orders.id, orderId),
    with: { seller: true, buyer: true },
  });
  
  if (!order) {
    console.error('Order not found:', orderId);
    return c.text('Order not found', 404);
  }
  
  // CRITICAL: Verify amount matches expected gross
  const expectedGross = order.grossAmount ?? order.totalAmount ?? 0;
  if (amountGross !== expectedGross) {
    console.error(`Amount mismatch: received ${amountGross}, expected ${expectedGross}`);
    return c.text('Amount mismatch', 400);
  }
  
  // Idempotency: Check if we already processed this payment
  const existingTransaction = await db.query.transactions.findFirst({
    where: eq(transactions.gatewayRef, pfPaymentId),
  });
  
  if (existingTransaction) {
    console.log('Transaction already processed, returning OK');
    return c.text('OK', 200);
  }
  
  const now = new Date().toISOString();
  
  if (status === 'COMPLETE') {
    // Create transaction with gateway-aware fields
    const transactionId = createId();
    await db.insert(transactions).values({
      id: transactionId,
      orderId: order.id,
      userId: order.buyerId,
      type: 'PAYMENT',
      status: 'COMPLETED',
      gateway: 'PAYFAST',
      gatewayMethod: 'UNKNOWN', // PayFast doesn't indicate in ITN
      gatewayRef: pfPaymentId,
      // Amounts from ITN
      grossAmount: amountGross,
      gatewayFee: amountFee,
      netAmount: amountNet,
      // Fee snapshots from order
      baseAmount: order.baseAmount,
      buyerPlatformFee: order.buyerPlatformFee ?? 0,
      buyerProcessingFee: order.buyerProcessingFee ?? 0,
      sellerPlatformFee: order.sellerPlatformFee ?? 0,
      platformRevenue: order.platformRevenue ?? 0,
      sellerPayoutAmount: order.sellerPayoutAmount ?? 0,
      currency: 'ZAR',
      rawPayload: data,
      paidAt: now,
    });
    
    // Update order status to PAID (or IN_PROGRESS if you want)
    await db.update(orders)
      .set({
        status: 'PAID',
        paidAt: now,
        updatedAt: now,
      })
      .where(eq(orders.id, order.id));
    
    // Create escrow hold with net-aware fields
    await db.insert(escrowHolds).values({
      id: createId(),
      transactionId,
      orderId: order.id,
      // Amounts from ITN
      grossAmount: amountGross,
      gatewayFee: amountFee,
      netAmount: amountNet,
      // Fee snapshots
      baseAmount: order.baseAmount,
      buyerPlatformFee: order.buyerPlatformFee ?? 0,
      buyerProcessingFee: order.buyerProcessingFee ?? 0,
      sellerPlatformFee: order.sellerPlatformFee ?? 0,
      platformRevenue: order.platformRevenue ?? 0,
      sellerPayoutAmount: order.sellerPayoutAmount ?? 0,
      // Legacy fields
      amount: amountGross,
      sellerAmount: order.sellerPayoutAmount ?? 0,
      sellerId: order.sellerId,
      status: 'HELD',
      heldAt: now,
    });
    
    // Update seller's escrow balance using SQL expression
    const sellerPayoutAmt = order.sellerPayoutAmount ?? 0;
    await db.update(sellerProfiles)
      .set({
        escrowBalance: sql`escrow_balance + ${sellerPayoutAmt}`,
      })
      .where(eq(sellerProfiles.userId, order.sellerId));
    
    // Send notifications
    try {
      await env.NOTIFICATION_QUEUE.send({
        type: 'order_paid',
        orderId: order.id,
        buyerId: order.buyerId,
        sellerId: order.sellerId,
      });
      
      const seller = order.seller as { email?: string } | null;
      if (seller?.email) {
        await env.EMAIL_QUEUE.send({
          type: 'new_order',
          to: seller.email,
          data: {
            orderNumber: order.orderNumber,
            amount: (order.sellerPayoutAmount ?? 0) / 100,
          },
        });
      }
    } catch (err) {
      console.error('Failed to send notifications:', err);
    }
  } else if (status === 'FAILED' || status === 'CANCELLED') {
    // Update order status
    await db.update(orders)
      .set({
        status: 'CANCELLED',
        cancelReason: `Payment ${status.toLowerCase()}`,
        cancelledAt: now,
        updatedAt: now,
      })
      .where(eq(orders.id, order.id));
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
  
  const transactionRef = data.TransactionReference; // This is our transaction ID
  const ozowTxId = data.TransactionId; // Ozow's transaction ID
  const status = data.Status;
  const amountPaid = Math.round(parseFloat(data.Amount) * 100);
  
  // Find the pending transaction we created during payment initiation
  const pendingTx = await db.query.transactions.findFirst({
    where: eq(transactions.id, transactionRef),
  });
  
  if (!pendingTx || !pendingTx.orderId) {
    console.error('Transaction not found:', transactionRef);
    return c.json({ error: 'Transaction not found' }, 404);
  }
  
  // Find the order
  const order = await db.query.orders.findFirst({
    where: eq(orders.id, pendingTx.orderId),
    with: { seller: true, buyer: true },
  });
  
  if (!order) {
    console.error('Order not found:', pendingTx.orderId);
    return c.json({ error: 'Order not found' }, 404);
  }
  
  // Verify amount matches expected gross
  const expectedGross = order.grossAmount ?? order.totalAmount ?? 0;
  if (amountPaid !== expectedGross) {
    console.error(`Amount mismatch: received ${amountPaid}, expected ${expectedGross}`);
    return c.json({ error: 'Amount mismatch' }, 400);
  }
  
  // Idempotency: Check if already processed
  if (pendingTx.status === 'COMPLETED') {
    console.log('Transaction already processed, returning OK');
    return c.json({ success: true });
  }
  
  const now = new Date().toISOString();
  
  if (status === 'Complete') {
    // Ozow doesn't provide net/fee breakdown - we estimate
    // For EFT, estimate ~2% + R1.50 fee with VAT
    const estimatedFee = Math.round(amountPaid * 0.02 * 1.15 + 150 * 1.15);
    const estimatedNet = amountPaid - estimatedFee;
    
    // Update the transaction
    await db.update(transactions)
      .set({
        status: 'COMPLETED',
        gatewayRef: ozowTxId,
        gatewayMethod: 'EFT',
        grossAmount: amountPaid,
        gatewayFee: estimatedFee,
        netAmount: estimatedNet,
        // Fee snapshots
        baseAmount: order.baseAmount,
        buyerPlatformFee: order.buyerPlatformFee ?? 0,
        buyerProcessingFee: order.buyerProcessingFee ?? 0,
        sellerPlatformFee: order.sellerPlatformFee ?? 0,
        platformRevenue: order.platformRevenue ?? 0,
        sellerPayoutAmount: order.sellerPayoutAmount ?? 0,
        rawPayload: data,
        paidAt: now,
        updatedAt: now,
      })
      .where(eq(transactions.id, transactionRef));
    
    // Update order status
    await db.update(orders)
      .set({
        status: 'PAID',
        paidAt: now,
        updatedAt: now,
      })
      .where(eq(orders.id, order.id));
    
    // Create escrow hold
    await db.insert(escrowHolds).values({
      id: createId(),
      transactionId: transactionRef,
      orderId: order.id,
      grossAmount: amountPaid,
      gatewayFee: estimatedFee,
      netAmount: estimatedNet,
      baseAmount: order.baseAmount,
      buyerPlatformFee: order.buyerPlatformFee ?? 0,
      buyerProcessingFee: order.buyerProcessingFee ?? 0,
      sellerPlatformFee: order.sellerPlatformFee ?? 0,
      platformRevenue: order.platformRevenue ?? 0,
      sellerPayoutAmount: order.sellerPayoutAmount ?? 0,
      amount: amountPaid,
      sellerAmount: order.sellerPayoutAmount ?? 0,
      sellerId: order.sellerId,
      status: 'HELD',
      heldAt: now,
    });
    
    // Update seller escrow balance
    const sellerPayoutAmt2 = order.sellerPayoutAmount ?? 0;
    await db.update(sellerProfiles)
      .set({
        escrowBalance: sql`escrow_balance + ${sellerPayoutAmt2}`,
      })
      .where(eq(sellerProfiles.userId, order.sellerId));
    
    // Send notifications
    try {
      await env.NOTIFICATION_QUEUE.send({
        type: 'order_paid',
        orderId: order.id,
        buyerId: order.buyerId,
        sellerId: order.sellerId,
      });
      
      const seller2 = order.seller as { email?: string } | null;
      if (seller2?.email) {
        await env.EMAIL_QUEUE.send({
          type: 'new_order',
          to: seller2.email,
          data: {
            orderNumber: order.orderNumber,
            amount: (order.sellerPayoutAmount ?? 0) / 100,
          },
        });
      }
    } catch (err) {
      console.error('Failed to send notifications:', err);
    }
  } else if (status === 'Error' || status === 'Cancelled' || status === 'Abandoned') {
    await db.update(transactions)
      .set({
        status: status === 'Error' ? 'FAILED' : 'FAILED', // Use FAILED since CANCELLED not in enum
        updatedAt: now,
      })
      .where(eq(transactions.id, transactionRef));
    
    await db.update(orders)
      .set({
        status: 'CANCELLED',
        cancelReason: `Payment ${status.toLowerCase()}`,
        cancelledAt: now,
        updatedAt: now,
      })
      .where(eq(orders.id, order.id));
  }
  
  return c.json({ success: true });
});

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
