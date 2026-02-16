import { Hono } from 'hono';
import { eq, sql } from 'drizzle-orm';
import { 
  transactions, orders, escrowHolds,
  sellerProfiles, sellerSubscriptions, sellerSubscriptionPayments,
  sellerPayouts
} from '@zomieks/db';
import { createId } from '@paralleldrive/cuid2';
import type { Env } from '../types';
import { DEFAULT_FEE_POLICY } from '../services/fee-engine';

const app = new Hono<{ Bindings: Env }>();

// Reserve period for payouts (days)
const RESERVE_DAYS = DEFAULT_FEE_POLICY.reserveDays;

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

// Ozow Subscription Webhook Handler
app.post('/payments/ozow-subscription', async (c) => {
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
    console.error('Ozow subscription hash mismatch');
    return c.json({ error: 'Invalid hash' }, 400);
  }
  
  const transactionRef = data.TransactionReference;
  const ozowTxId = data.TransactionId;
  const status = data.Status;
  const amountPaid = Math.round(parseFloat(data.Amount) * 100);
  
  // Find the pending transaction
  const pendingTx = await db.query.transactions.findFirst({
    where: eq(transactions.id, transactionRef),
  });
  
  // Extract subscriptionId from rawPayload metadata
  const payload = pendingTx?.rawPayload as { subscriptionId?: string; type?: string } | null;
  const sellerSubscriptionId = payload?.subscriptionId;
  
  if (!pendingTx || !sellerSubscriptionId || payload?.type !== 'SELLER_SUBSCRIPTION') {
    console.error('Subscription transaction not found:', transactionRef);
    return c.json({ error: 'Transaction not found' }, 404);
  }
  
  // Idempotency check
  if (pendingTx.status === 'COMPLETED') {
    return c.json({ success: true });
  }
  
  const now = new Date();
  const nowIso = now.toISOString();
  
  if (status === 'Complete') {
    // Update transaction
    await db.update(transactions)
      .set({
        status: 'COMPLETED',
        gatewayRef: ozowTxId,
        gatewayMethod: 'EFT',
        grossAmount: amountPaid,
        netAmount: amountPaid,
        rawPayload: data,
        paidAt: nowIso,
        updatedAt: nowIso,
      })
      .where(eq(transactions.id, transactionRef));
    
    // Activate the subscription
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1);
    
    await db.update(sellerSubscriptions)
      .set({
        status: 'ACTIVE',
        currentPeriodStart: nowIso,
        currentPeriodEnd: periodEnd.toISOString(),
        nextBillingDate: periodEnd.toISOString(),
        updatedAt: nowIso,
      })
      .where(eq(sellerSubscriptions.id, sellerSubscriptionId));
    
    // Record subscription payment
    await db.insert(sellerSubscriptionPayments).values({
      id: createId(),
      sellerSubscriptionId,
      amount: amountPaid,
      gateway: 'OZOW',
      gatewayPaymentId: ozowTxId,
      periodStart: nowIso,
      periodEnd: periodEnd.toISOString(),
      paidAt: nowIso,
    });
    
    // Update seller profile to mark as Pro (enable bio, courses etc.)
    const subscription = await db.query.sellerSubscriptions.findFirst({
      where: eq(sellerSubscriptions.id, sellerSubscriptionId),
    });
    if (subscription) {
      await db.update(sellerProfiles)
        .set({
          bioEnabled: true,
          updatedAt: nowIso,
        })
        .where(eq(sellerProfiles.id, subscription.sellerProfileId));
    }
  } else if (status === 'Error' || status === 'Cancelled' || status === 'Abandoned') {
    await db.update(transactions)
      .set({
        status: 'FAILED',
        rawPayload: data,
        updatedAt: nowIso,
      })
      .where(eq(transactions.id, transactionRef));
  }
  
  return c.json({ success: true });
});

// Ozow Payout Webhook Handler
// Called by Ozow when a payout status changes (Complete, Error, Cancelled)
app.post('/payments/ozow-payout', async (c) => {
  const db = c.get('db');
  const env = c.env;
  
  const data = await c.req.json();
  
  // Verify hash
  const hashString = `${data.SiteCode}${data.TransactionId}${data.PayoutReference}${data.Amount}${data.Status}${env.OZOW_PRIVATE_KEY}`;
  const hashBuffer = await crypto.subtle.digest('SHA-512', new TextEncoder().encode(hashString.toLowerCase()));
  const expectedHash = Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  
  if (data.Hash && data.Hash.toLowerCase() !== expectedHash) {
    console.error('Ozow payout hash mismatch');
    return c.json({ error: 'Invalid hash' }, 400);
  }
  
  const payoutId = data.PayoutReference;
  const ozowTxId = data.TransactionId;
  const status = data.Status;
  const now = new Date().toISOString();
  
  if (!payoutId) {
    console.error('Ozow payout webhook: missing PayoutReference');
    return c.json({ error: 'Missing reference' }, 400);
  }
  
  const payout = await db.query.sellerPayouts.findFirst({
    where: eq(sellerPayouts.id, payoutId),
  });
  
  if (!payout) {
    console.error('Payout not found:', payoutId);
    return c.json({ error: 'Payout not found' }, 404);
  }
  
  // Idempotency: already completed
  if (payout.status === 'COMPLETED') {
    return c.json({ success: true });
  }
  
  if (status === 'Complete' || status === 'COMPLETE') {
    // Mark payout as completed
    await db.update(sellerPayouts)
      .set({
        status: 'COMPLETED',
        externalRef: ozowTxId,
        processedAt: now,
        updatedAt: now,
      })
      .where(eq(sellerPayouts.id, payoutId));
    
    // Update seller balance
    await db.update(sellerProfiles)
      .set({
        pendingBalance: sql`GREATEST(0, pending_balance - ${payout.amount})`,
      })
      .where(eq(sellerProfiles.userId, payout.sellerId));
    
    console.log(`Payout ${payoutId} completed via Ozow: ${ozowTxId}`);
  } else if (status === 'Error' || status === 'Cancelled' || status === 'Failed') {
    // Mark as failed — funds return to available balance
    await db.update(sellerPayouts)
      .set({
        status: 'FAILED',
        failedReason: `Ozow payout ${status.toLowerCase()}: ${data.StatusMessage || ''}`,
        updatedAt: now,
      })
      .where(eq(sellerPayouts.id, payoutId));
    
    // Return funds to available balance
    await db.update(sellerProfiles)
      .set({
        balance: sql`balance + ${payout.amount}`,
        pendingBalance: sql`GREATEST(0, pending_balance - ${payout.amount})`,
      })
      .where(eq(sellerProfiles.userId, payout.sellerId));
    
    console.error(`Payout ${payoutId} failed via Ozow: ${data.StatusMessage || status}`);
  }
  
  return c.json({ success: true });
});

// Stripe webhook (future implementation)
app.post('/stripe', async (c) => {
  // Placeholder for Stripe webhook handling
  return c.json({ received: true });
});

export default app;
