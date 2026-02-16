/**
 * Ozow Payout Service
 * 
 * Handles automated payouts to sellers via Ozow Payouts API.
 * Only active when admin enables `payouts.ozow_auto_enabled` in site config.
 * 
 * When disabled, payouts are processed manually via bank EFT (CSV export + admin confirmation).
 * When enabled, this service calls the Ozow Payouts API to initiate bank transfers.
 */

import { eq, and } from 'drizzle-orm';
import { siteConfig, sellerPayouts } from '@zomieks/db';
import type { DrizzleDb } from '@zomieks/db';
import type { Env } from '../types';

export type PayoutMode = 'manual' | 'ozow';

/**
 * Check whether Ozow auto-payouts are enabled via admin configuration.
 * Returns 'ozow' if enabled AND API keys are configured, otherwise 'manual'.
 */
export async function getPayoutMode(db: DrizzleDb): Promise<PayoutMode> {
  const toggle = await db.query.siteConfig.findFirst({
    where: and(
      eq(siteConfig.category, 'payouts'),
      eq(siteConfig.key, 'ozow_auto_enabled')
    ),
  });

  if (toggle?.value !== 'true') return 'manual';

  // Also require API key to be configured
  const apiKey = await db.query.siteConfig.findFirst({
    where: and(
      eq(siteConfig.category, 'payouts'),
      eq(siteConfig.key, 'ozow_payout_api_key')
    ),
  });

  if (!apiKey?.value && !apiKey?.encryptedValue) return 'manual';

  return 'ozow';
}

/**
 * Get Ozow payout credentials from site config
 */
async function getOzowPayoutCredentials(db: DrizzleDb): Promise<{ apiKey: string; siteCode: string } | null> {
  const [apiKeyRow, siteCodeRow] = await Promise.all([
    db.query.siteConfig.findFirst({
      where: and(
        eq(siteConfig.category, 'payouts'),
        eq(siteConfig.key, 'ozow_payout_api_key')
      ),
    }),
    db.query.siteConfig.findFirst({
      where: and(
        eq(siteConfig.category, 'payouts'),
        eq(siteConfig.key, 'ozow_payout_site_code')
      ),
    }),
  ]);

  const apiKey = apiKeyRow?.value || apiKeyRow?.encryptedValue;
  const siteCode = siteCodeRow?.value || '';

  if (!apiKey) return null;

  return { apiKey, siteCode };
}

/**
 * Generate SHA-512 hash for Ozow payout verification
 */
async function generatePayoutHash(input: string): Promise<string> {
  const hashBuffer = await crypto.subtle.digest(
    'SHA-512',
    new TextEncoder().encode(input.toLowerCase())
  );
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export interface OzowPayoutRequest {
  payoutId: string;
  amount: number; // cents
  bankName: string;
  accountNumber: string;
  branchCode: string;
  accountHolder: string;
  accountType: string;
  reference: string;
}

export interface OzowPayoutResult {
  success: boolean;
  transactionId?: string;
  error?: string;
}

/**
 * Create a payout via Ozow Payouts API
 * 
 * Calls: POST https://api.ozow.com/payouts
 * Auth: Bearer token (OZOW_API_KEY)
 * 
 * Returns the Ozow transaction ID on success.
 */
export async function createOzowPayout(
  db: DrizzleDb,
  env: Env,
  request: OzowPayoutRequest
): Promise<OzowPayoutResult> {
  const credentials = await getOzowPayoutCredentials(db);

  if (!credentials) {
    return { success: false, error: 'Ozow payout credentials not configured' };
  }

  try {
    const amountRands = (request.amount / 100).toFixed(2);
    
    const payload = {
      SiteCode: credentials.siteCode || env.OZOW_SITE_CODE,
      Amount: amountRands,
      BankReference: request.reference,
      AccountNumber: request.accountNumber,
      BranchCode: request.branchCode,
      AccountHolder: request.accountHolder,
      BankName: request.bankName,
      PayoutReference: request.payoutId,
      NotifyUrl: `${env.API_URL || env.APP_URL}/api/v1/webhooks/payments/ozow-payout`,
    };

    // Generate hash check
    const hashInput = [
      payload.SiteCode,
      payload.Amount,
      payload.BankReference,
      payload.AccountNumber,
      payload.PayoutReference,
      credentials.apiKey,
    ].join('');

    const hashCheck = await generatePayoutHash(hashInput);

    const response = await fetch('https://api.ozow.com/payouts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${credentials.apiKey}`,
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        ...payload,
        HashCheck: hashCheck,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Ozow payout API error:', response.status, errorText);
      return { 
        success: false, 
        error: `Ozow API error: ${response.status} - ${errorText.slice(0, 200)}` 
      };
    }

    const result = await response.json() as { TransactionId?: string; PayoutId?: string; Status?: string };

    return {
      success: true,
      transactionId: result.TransactionId || result.PayoutId || '',
    };
  } catch (error) {
    console.error('Ozow payout request failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Process a batch of payouts via Ozow API.
 * Calls createOzowPayout for each item and returns results.
 */
export async function processOzowBatch(
  db: DrizzleDb,
  env: Env,
  items: Array<{
    payoutId: string;
    amount: number;
    bankName: string;
    accountNumber: string;
    branchCode: string;
    accountHolder: string;
    accountType: string;
  }>
): Promise<{ successCount: number; failCount: number; results: OzowPayoutResult[] }> {
  let successCount = 0;
  let failCount = 0;
  const results: OzowPayoutResult[] = [];
  const now = new Date().toISOString();

  for (const item of items) {
    const reference = `ZOMIEKS_${item.payoutId.slice(-8).toUpperCase()}`;
    
    const result = await createOzowPayout(db, env, {
      ...item,
      reference,
    });

    results.push(result);

    if (result.success) {
      // Update payout with Ozow reference
      await db.update(sellerPayouts)
        .set({
          externalRef: result.transactionId,
          updatedAt: now,
        })
        .where(eq(sellerPayouts.id, item.payoutId));
      successCount++;
    } else {
      // Mark individual payout as failed
      await db.update(sellerPayouts)
        .set({
          status: 'FAILED',
          failedReason: result.error || 'Ozow API call failed',
          updatedAt: now,
        })
        .where(eq(sellerPayouts.id, item.payoutId));
      failCount++;
    }
  }

  return { successCount, failCount, results };
}
