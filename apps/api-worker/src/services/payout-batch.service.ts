/**
 * Payout Batch Service
 * 
 * Handles batch processing of seller payouts.
 * Implements manual bank EFT MVP as per 2.md spec.
 * 
 * Flow:
 * 1. Admin triggers batch creation
 * 2. System selects eligible payouts (PENDING, availableAt <= now, >= payoutMin)
 * 3. Payouts marked as PROCESSING with batchId
 * 4. Export data generated for bank EFT processing
 * 5. Admin confirms batch with external references
 * 6. Payouts marked as PAID
 */

import { eq, and, lte, gte, sql } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';
import { sellerPayouts, sellerProfiles, bankDetails, users } from '@zomieks/db';
import { DEFAULT_FEE_POLICY } from './fee-engine';
import type { DrizzleDb } from '@zomieks/db';

export interface PayoutBatchItem {
  payoutId: string;
  sellerId: string;
  sellerEmail: string;
  sellerName: string;
  amount: number; // In cents
  amountRands: number; // For display
  currency: string;
  orderId: string | null;
  // Bank details
  bankName: string;
  accountNumber: string; // Last 4 masked
  accountNumberFull: string; // For actual EFT
  branchCode: string;
  accountHolder: string;
  accountType: string;
}

export interface PayoutBatch {
  batchId: string;
  createdAt: string;
  totalAmount: number;
  totalAmountRands: number;
  payoutCount: number;
  items: PayoutBatchItem[];
}

export interface BatchConfirmInput {
  payoutId: string;
  externalRef: string;
}

export interface BatchConfirmResult {
  success: boolean;
  confirmedCount: number;
  failedCount: number;
  errors: string[];
}

/**
 * Create a new payout batch
 * Selects eligible payouts and marks them as PROCESSING
 */
export async function createPayoutBatch(db: DrizzleDb): Promise<PayoutBatch | null> {
  const now = new Date().toISOString();
  const batchId = `BAT_${createId()}`;
  const payoutMin = DEFAULT_FEE_POLICY.payoutMin;
  
  // Find eligible payouts
  const eligiblePayouts = await db.query.sellerPayouts.findMany({
    where: and(
      eq(sellerPayouts.status, 'PENDING'),
      lte(sellerPayouts.availableAt, now),
      gte(sellerPayouts.amount, payoutMin)
    ),
  });
  
  if (eligiblePayouts.length === 0) {
    return null;
  }
  
  const items: PayoutBatchItem[] = [];
  
  for (const payout of eligiblePayouts) {
    // Get seller info
    const seller = await db.query.users.findFirst({
      where: eq(users.id, payout.sellerId),
    });
    
    if (!seller) continue;
    
    // Get bank details
    const bank = await db.query.bankDetails.findFirst({
      where: and(
        eq(bankDetails.userId, payout.sellerId),
        eq(bankDetails.isDefault, true)
      ),
    });
    
    if (!bank) {
      console.log(`Skipping payout ${payout.id}: no bank details for seller ${payout.sellerId}`);
      continue;
    }
    
    // Mark as PROCESSING
    await db.update(sellerPayouts)
      .set({
        status: 'PROCESSING',
        batchId,
        updatedAt: now,
      })
      .where(eq(sellerPayouts.id, payout.id));
    
    items.push({
      payoutId: payout.id,
      sellerId: payout.sellerId,
      sellerEmail: seller.email,
      sellerName: `${seller.firstName} ${seller.lastName}`,
      amount: payout.amount,
      amountRands: payout.amount / 100,
      currency: payout.currency || 'ZAR',
      orderId: payout.orderId,
      bankName: bank.bankName,
      accountNumber: `****${bank.accountNumber.slice(-4)}`,
      accountNumberFull: bank.accountNumber,
      branchCode: bank.branchCode,
      accountHolder: bank.accountHolder,
      accountType: bank.accountType,
    });
  }
  
  if (items.length === 0) {
    return null;
  }
  
  const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);
  
  return {
    batchId,
    createdAt: now,
    totalAmount,
    totalAmountRands: totalAmount / 100,
    payoutCount: items.length,
    items,
  };
}

/**
 * Confirm a batch of payouts after bank EFT processing
 * Marks payouts as PAID and records external references
 */
export async function confirmPayoutBatch(
  db: DrizzleDb,
  batchId: string,
  confirmations: BatchConfirmInput[]
): Promise<BatchConfirmResult> {
  const now = new Date().toISOString();
  let confirmedCount = 0;
  let failedCount = 0;
  const errors: string[] = [];
  
  for (const conf of confirmations) {
    const payout = await db.query.sellerPayouts.findFirst({
      where: and(
        eq(sellerPayouts.id, conf.payoutId),
        eq(sellerPayouts.batchId, batchId),
        eq(sellerPayouts.status, 'PROCESSING')
      ),
    });
    
    if (!payout) {
      errors.push(`Payout ${conf.payoutId} not found in batch or not in PROCESSING status`);
      failedCount++;
      continue;
    }
    
    // Mark as PAID
    await db.update(sellerPayouts)
      .set({
        status: 'PAID',
        externalRef: conf.externalRef,
        processedAt: now,
        updatedAt: now,
      })
      .where(eq(sellerPayouts.id, payout.id));
    
    // Update seller's balance (move from pending to withdrawn)
    await db.update(sellerProfiles)
      .set({
        pendingBalance: sql`GREATEST(0, pending_balance - ${payout.amount})`,
        // Optionally track total withdrawn
      })
      .where(eq(sellerProfiles.userId, payout.sellerId));
    
    confirmedCount++;
  }
  
  return {
    success: confirmedCount > 0,
    confirmedCount,
    failedCount,
    errors,
  };
}

/**
 * Mark batch payouts as failed
 */
export async function failPayoutBatch(
  db: DrizzleDb,
  batchId: string,
  failureReason: string,
  payoutIds?: string[] // If not provided, fail all in batch
): Promise<{ failedCount: number }> {
  const now = new Date().toISOString();
  
  // Get payouts to fail
  let payoutsToFail;
  if (payoutIds && payoutIds.length > 0) {
    payoutsToFail = await db.query.sellerPayouts.findMany({
      where: and(
        eq(sellerPayouts.batchId, batchId),
        eq(sellerPayouts.status, 'PROCESSING')
      ),
    });
    payoutsToFail = payoutsToFail.filter(p => payoutIds.includes(p.id));
  } else {
    payoutsToFail = await db.query.sellerPayouts.findMany({
      where: and(
        eq(sellerPayouts.batchId, batchId),
        eq(sellerPayouts.status, 'PROCESSING')
      ),
    });
  }
  
  for (const payout of payoutsToFail) {
    // Mark as FAILED
    await db.update(sellerPayouts)
      .set({
        status: 'FAILED',
        failureReason,
        updatedAt: now,
      })
      .where(eq(sellerPayouts.id, payout.id));
    
    // Return amount to pending balance (will be available for next batch)
    // Since the payout failed, we leave pendingBalance as is - the money stays pending
  }
  
  return {
    failedCount: payoutsToFail.length,
  };
}

/**
 * Get batch status and details
 */
export async function getBatchStatus(
  db: DrizzleDb,
  batchId: string
): Promise<{
  batchId: string;
  status: 'PROCESSING' | 'PARTIALLY_CONFIRMED' | 'CONFIRMED' | 'FAILED';
  totalCount: number;
  paidCount: number;
  failedCount: number;
  processingCount: number;
} | null> {
  const payouts = await db.query.sellerPayouts.findMany({
    where: eq(sellerPayouts.batchId, batchId),
  });
  
  if (payouts.length === 0) {
    return null;
  }
  
  const paidCount = payouts.filter(p => p.status === 'PAID').length;
  const failedCount = payouts.filter(p => p.status === 'FAILED').length;
  const processingCount = payouts.filter(p => p.status === 'PROCESSING').length;
  
  let status: 'PROCESSING' | 'PARTIALLY_CONFIRMED' | 'CONFIRMED' | 'FAILED';
  if (processingCount === payouts.length) {
    status = 'PROCESSING';
  } else if (paidCount === payouts.length) {
    status = 'CONFIRMED';
  } else if (failedCount === payouts.length) {
    status = 'FAILED';
  } else {
    status = 'PARTIALLY_CONFIRMED';
  }
  
  return {
    batchId,
    status,
    totalCount: payouts.length,
    paidCount,
    failedCount,
    processingCount,
  };
}

/**
 * Get pending payout summary for a seller
 */
export async function getSellerPayoutSummary(
  db: DrizzleDb,
  sellerId: string
): Promise<{
  pendingCount: number;
  pendingAmount: number;
  availableCount: number;
  availableAmount: number;
  processingCount: number;
  processingAmount: number;
}> {
  const now = new Date().toISOString();
  
  const payouts = await db.query.sellerPayouts.findMany({
    where: and(
      eq(sellerPayouts.sellerId, sellerId),
      eq(sellerPayouts.status, 'PENDING')
    ),
  });
  
  const processingPayouts = await db.query.sellerPayouts.findMany({
    where: and(
      eq(sellerPayouts.sellerId, sellerId),
      eq(sellerPayouts.status, 'PROCESSING')
    ),
  });
  
  const available = payouts.filter(p => (p.availableAt ?? '') <= now);
  const pending = payouts.filter(p => (p.availableAt ?? '') > now);
  
  return {
    pendingCount: pending.length,
    pendingAmount: pending.reduce((sum, p) => sum + (p.amount || 0), 0),
    availableCount: available.length,
    availableAmount: available.reduce((sum, p) => sum + (p.amount || 0), 0),
    processingCount: processingPayouts.length,
    processingAmount: processingPayouts.reduce((sum, p) => sum + (p.amount || 0), 0),
  };
}

/**
 * Generate CSV export for bank processing
 */
export function generateBatchCSV(batch: PayoutBatch): string {
  const headers = [
    'Payout ID',
    'Seller Email',
    'Seller Name',
    'Amount (ZAR)',
    'Bank Name',
    'Account Number',
    'Branch Code',
    'Account Holder',
    'Account Type',
    'Reference',
  ];
  
  const rows = batch.items.map(item => [
    item.payoutId,
    item.sellerEmail,
    item.sellerName,
    item.amountRands.toFixed(2),
    item.bankName,
    item.accountNumberFull,
    item.branchCode,
    item.accountHolder,
    item.accountType,
    `ZOMIEKS_${item.payoutId.slice(-8).toUpperCase()}`,
  ]);
  
  const csv = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
  ].join('\n');
  
  return csv;
}
