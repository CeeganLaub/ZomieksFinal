/**
 * Escrow Service
 * 
 * Handles escrow hold, release, and refund operations for the platform.
 * Implements the Merchant of Record (MoR) escrow model from 2.md spec.
 * 
 * Flow:
 * 1. Payment received -> processEscrowHold (creates HELD escrow)
 * 2. Order completed -> releaseEscrow (creates SellerPayout, marks RELEASED)
 * 3. Refund requested -> processRefund (marks REFUNDED, blocks payout)
 */

import { eq, and, sql, lte } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';
import { 
  escrowHolds, orders, transactions, sellerPayouts, 
  sellerProfiles, type EscrowStatus
} from '@zomieks/db';
import { DEFAULT_FEE_POLICY, getPayoutAvailableAt } from './fee-engine';
import type { DrizzleDb } from '@zomieks/db';

export interface EscrowHoldInput {
  transactionId: string;
  orderId: string;
  grossAmount: number;
  gatewayFee: number | null;
  netAmount: number | null;
  baseAmount: number;
  buyerPlatformFee: number;
  buyerProcessingFee: number;
  sellerPlatformFee: number;
  platformRevenue: number;
  sellerPayoutAmount: number;
  sellerId: string;
}

export interface ReleaseResult {
  success: boolean;
  payoutId?: string;
  availableAt?: string;
  error?: string;
}

export interface RefundResult {
  success: boolean;
  refundTransactionId?: string;
  error?: string;
}

/**
 * Create an escrow hold for a successful payment
 * Called from webhook after payment is verified
 */
export async function createEscrowHold(
  db: DrizzleDb,
  input: EscrowHoldInput
): Promise<string> {
  const holdId = createId();
  const now = new Date().toISOString();
  
  await db.insert(escrowHolds).values({
    id: holdId,
    transactionId: input.transactionId,
    orderId: input.orderId,
    // Amounts from gateway
    grossAmount: input.grossAmount,
    gatewayFee: input.gatewayFee,
    netAmount: input.netAmount,
    // Fee snapshots
    baseAmount: input.baseAmount,
    buyerPlatformFee: input.buyerPlatformFee,
    buyerProcessingFee: input.buyerProcessingFee,
    sellerPlatformFee: input.sellerPlatformFee,
    platformRevenue: input.platformRevenue,
    sellerPayoutAmount: input.sellerPayoutAmount,
    // Legacy fields
    amount: input.grossAmount,
    sellerAmount: input.sellerPayoutAmount,
    status: 'HELD',
    heldAt: now,
  });
  
  return holdId;
}

/**
 * Release escrow for a completed order
 * Creates a SellerPayout record with reserve period
 */
export async function releaseEscrow(
  db: DrizzleDb,
  orderId: string
): Promise<ReleaseResult> {
  // Get the escrow hold
  const hold = await db.query.escrowHolds.findFirst({
    where: eq(escrowHolds.orderId, orderId),
  });
  
  if (!hold) {
    return { success: false, error: 'Escrow hold not found' };
  }
  
  if (hold.status !== 'HELD') {
    return { success: false, error: `Cannot release escrow with status ${hold.status}` };
  }
  
  // Get the order
  const order = await db.query.orders.findFirst({
    where: eq(orders.id, orderId),
  });
  
  if (!order) {
    return { success: false, error: 'Order not found' };
  }
  
  // Check order status - should be DELIVERED or COMPLETED
  if (!['DELIVERED', 'COMPLETED', 'PAID'].includes(order.status)) {
    return { success: false, error: `Cannot release escrow for order status ${order.status}` };
  }
  
  const now = new Date().toISOString();
  const payoutId = createId();
  const availableAt = getPayoutAvailableAt(DEFAULT_FEE_POLICY.reserveDays);
  
  // Calculate payout amount
  const payoutAmount = hold.sellerPayoutAmount ?? hold.sellerAmount ?? 0;
  
  // Create the payout record
  await db.insert(sellerPayouts).values({
    id: payoutId,
    orderId: orderId,
    escrowHoldId: hold.id,
    sellerId: order.sellerId,
    amount: payoutAmount,
    netAmount: payoutAmount, // After seller fee already deducted
    currency: 'ZAR',
    status: 'PENDING',
    availableAt,
  });
  
  // Update escrow status
  await db.update(escrowHolds)
    .set({
      status: 'RELEASED',
      releasedAt: now,
      updatedAt: now,
    })
    .where(eq(escrowHolds.id, hold.id));
  
  // Update order status to COMPLETED if not already
  if (order.status !== 'COMPLETED') {
    await db.update(orders)
      .set({
        status: 'COMPLETED',
        completedAt: now,
        updatedAt: now,
      })
      .where(eq(orders.id, orderId));
  }
  
  // Update seller's balance tracking
  // Move from escrow to pending (available after reserve period)
  await db.update(sellerProfiles)
    .set({
      escrowBalance: sql`GREATEST(0, escrow_balance - ${payoutAmount})`,
      pendingBalance: sql`pending_balance + ${payoutAmount}`,
    })
    .where(eq(sellerProfiles.userId, order.sellerId));
  
  return {
    success: true,
    payoutId,
    availableAt,
  };
}

/**
 * Process a refund for an order (manual MVP)
 * Marks escrow as REFUNDED and creates a REFUND transaction
 */
export async function processRefund(
  db: DrizzleDb,
  orderId: string,
  reason: string,
  requestedBy: string
): Promise<RefundResult> {
  // Get the order
  const order = await db.query.orders.findFirst({
    where: eq(orders.id, orderId),
  });
  
  if (!order) {
    return { success: false, error: 'Order not found' };
  }
  
  // Can only refund orders that are PAID or IN_PROGRESS (before release)
  if (!['PAID', 'IN_PROGRESS'].includes(order.status)) {
    return { success: false, error: `Cannot refund order with status ${order.status}` };
  }
  
  // Get escrow hold
  const hold = await db.query.escrowHolds.findFirst({
    where: eq(escrowHolds.orderId, orderId),
  });
  
  if (!hold) {
    return { success: false, error: 'Escrow hold not found' };
  }
  
  // Check if already released
  if (hold.status === 'RELEASED') {
    return { success: false, error: 'Cannot refund - escrow already released' };
  }
  
  // Check for existing payout
  const existingPayout = await db.query.sellerPayouts.findFirst({
    where: and(
      eq(sellerPayouts.orderId, orderId),
      eq(sellerPayouts.status, 'PENDING')
    ),
  });
  
  if (existingPayout) {
    // Mark the pending payout as failed due to refund
    await db.update(sellerPayouts)
      .set({
        status: 'FAILED',
        failedReason: 'Order refunded',
        failedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(sellerPayouts.id, existingPayout.id));
  }
  
  const now = new Date().toISOString();
  const refundTxId = createId();
  
  // Create refund transaction
  await db.insert(transactions).values({
    id: refundTxId,
    orderId: orderId,
    userId: order.buyerId,
    type: 'REFUND',
    status: 'COMPLETED', // Manual refund - admin processes in gateway dashboard
    gateway: (order.gateway as 'PAYFAST' | 'OZOW') ?? 'PAYFAST',
    gatewayMethod: (order.gatewayMethod as 'CARD' | 'EFT' | 'UNKNOWN') ?? 'UNKNOWN',
    grossAmount: order.grossAmount ?? order.totalAmount ?? 0,
    baseAmount: order.baseAmount,
    buyerPlatformFee: order.buyerPlatformFee ?? 0,
    buyerProcessingFee: order.buyerProcessingFee ?? 0,
    sellerPlatformFee: order.sellerPlatformFee ?? 0,
    platformRevenue: order.platformRevenue ?? 0,
    currency: 'ZAR',
    rawPayload: { reason, requestedBy, refundedAt: now },
  });
  
  // Update escrow status
  await db.update(escrowHolds)
    .set({
      status: 'REFUNDED',
      refundedAt: now,
      updatedAt: now,
    })
    .where(eq(escrowHolds.id, hold.id));
  
  // Update order status (use CANCELLED since REFUNDED is not a valid order status)
  await db.update(orders)
    .set({
      status: 'CANCELLED',
      cancelReason: `Refund: ${reason}`,
      cancelledAt: now,
      updatedAt: now,
    })
    .where(eq(orders.id, orderId));
  
  // Update seller's escrow balance (reduce by sellerPayoutAmount)
  const sellerPayoutAmt = hold.sellerPayoutAmount ?? hold.sellerAmount ?? 0;
  await db.update(sellerProfiles)
    .set({
      escrowBalance: sql`GREATEST(0, escrow_balance - ${sellerPayoutAmt})`,
    })
    .where(eq(sellerProfiles.userId, order.sellerId));
  
  return {
    success: true,
    refundTransactionId: refundTxId,
  };
}

/**
 * Get escrow status for an order
 */
export async function getEscrowStatus(
  db: DrizzleDb,
  orderId: string
): Promise<{ status: EscrowStatus | null; hold: any | null }> {
  const hold = await db.query.escrowHolds.findFirst({
    where: eq(escrowHolds.orderId, orderId),
  });
  
  return {
    status: hold?.status ?? null,
    hold,
  };
}

/**
 * Get available payouts for a seller
 * Payouts that have passed their reserve period
 */
export async function getAvailablePayouts(
  db: DrizzleDb,
  sellerId: string
): Promise<any[]> {
  const now = new Date().toISOString();
  
  const payouts = await db.query.sellerPayouts.findMany({
    where: and(
      eq(sellerPayouts.sellerId, sellerId),
      eq(sellerPayouts.status, 'PENDING'),
      lte(sellerPayouts.availableAt, now)
    ),
  });
  
  return payouts;
}
