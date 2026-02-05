/**
 * Fee Engine Service
 * 
 * Gateway-aware fee calculations for Zomieks marketplace.
 * Implements profit-safe fee model as per 2.md spec.
 * 
 * Fee Model:
 * - buyerPlatformFee: Marketplace fee (e.g., 3% with min)
 * - buyerProcessingFee: Covers gateway costs (min + buffer)
 * - sellerPlatformFee: Seller fee (tiered, with min)
 * 
 * Gross Amount = baseAmount + buyerPlatformFee + buyerProcessingFee
 * Platform Revenue = buyerPlatformFee + sellerPlatformFee
 * Seller Payout = baseAmount - sellerPlatformFee
 */

export type Gateway = 'PAYFAST' | 'OZOW';
export type PaymentMethod = 'CARD' | 'EFT' | 'UNKNOWN';

export interface SellerTier {
  upTo: number;      // Max amount in cents for this tier (use Infinity for last tier)
  pct: number;       // Seller fee percentage (e.g., 0.12 = 12%)
  min: number;       // Minimum fee in cents (e.g., 1500 = R15)
}

export interface FeePolicy {
  // Buyer fees
  buyerPlatformPct: number;      // e.g., 0.03 (3%)
  buyerPlatformMin: number;      // e.g., 1000 (R10 in cents)
  buyerProcessingMin: number;    // e.g., 1500 (R15 in cents)
  
  // Seller tiers
  sellerTiers: SellerTier[];
  
  // Gateway fee estimation buffers
  bufferPct: number;             // e.g., 0.002 (0.2%)
  bufferFixed: number;           // e.g., 100 (R1 in cents)
  vatPct: number;                // e.g., 0.15 (15% VAT)
  
  // Reserve period for payouts
  reserveDays: number;           // e.g., 7 days
  payoutMin: number;             // Minimum payout amount in cents
}

export interface FeeCalcInput {
  baseAmount: number;            // Service price in cents
  gateway: Gateway;
  method: PaymentMethod;
  policy: FeePolicy;
}

export interface FeeCalcOutput {
  baseAmount: number;            // Original service price
  buyerPlatformFee: number;      // Marketplace buyer fee
  buyerProcessingFee: number;    // Gateway cost coverage
  grossAmount: number;           // Total buyer pays
  
  sellerPlatformFee: number;     // Seller's marketplace fee
  sellerPayoutAmount: number;    // What seller receives
  
  platformRevenue: number;       // buyerPlatformFee + sellerPlatformFee
  
  estimatedGatewayFee: number;   // Estimated gateway fee (for info)
  estimatedNetToPlatform: number; // gross - estimatedGatewayFee
  
  currency: string;
  gateway: Gateway;
  method: PaymentMethod;
  
  // Breakdown for display
  breakdown: {
    label: string;
    amount: number;
  }[];
}

// Default fee policy (MVP config from 2.md)
export const DEFAULT_FEE_POLICY: FeePolicy = {
  buyerPlatformPct: 0.03,        // 3%
  buyerPlatformMin: 1000,        // R10
  buyerProcessingMin: 1500,      // R15
  
  sellerTiers: [
    { upTo: 50000, pct: 0.12, min: 1500 },   // <= R500: 12% min R15
    { upTo: 200000, pct: 0.10, min: 2000 },  // <= R2000: 10% min R20
    { upTo: Infinity, pct: 0.08, min: 3000 }, // > R2000: 8% min R30
  ],
  
  bufferPct: 0.002,              // 0.2%
  bufferFixed: 100,              // R1
  vatPct: 0.15,                  // 15%
  
  reserveDays: 7,
  payoutMin: 10000,              // R100 minimum payout
};

/**
 * Round to cents (2 decimal places when converted to Rands)
 */
function roundCents(amount: number): number {
  return Math.round(amount);
}

/**
 * Estimate PayFast gateway fee (conservative, includes VAT)
 * 
 * PayFast fees (ex VAT):
 * - Card: 3.2% + R2 (320 cents)
 * - Instant EFT: 2% (min R2)
 */
function estimatePayFastFee(grossAmount: number, method: PaymentMethod, vatPct: number, bufferPct: number, bufferFixed: number): number {
  let feeExVat: number;
  
  if (method === 'CARD' || method === 'UNKNOWN') {
    // Card: 3.2% + R2 (more conservative for UNKNOWN)
    feeExVat = grossAmount * 0.032 + 200;
  } else {
    // EFT: 2% min R2
    feeExVat = Math.max(grossAmount * 0.02, 200);
  }
  
  // Add VAT
  let feeInclVat = feeExVat * (1 + vatPct);
  
  // Add buffer
  feeInclVat = feeInclVat * (1 + bufferPct) + bufferFixed;
  
  return roundCents(feeInclVat);
}

/**
 * Estimate Ozow gateway fee (conservative, includes VAT)
 * 
 * Ozow EFT: ~1.5% - 2% + small fixed (varies by bank)
 * Use conservative 2% + R1.50 estimate
 */
function estimateOzowFee(grossAmount: number, vatPct: number, bufferPct: number, bufferFixed: number): number {
  // Ozow is always EFT-based: ~2% + R1.50
  let feeExVat = grossAmount * 0.02 + 150;
  
  // Add VAT
  let feeInclVat = feeExVat * (1 + vatPct);
  
  // Add buffer
  feeInclVat = feeInclVat * (1 + bufferPct) + bufferFixed;
  
  return roundCents(feeInclVat);
}

/**
 * Calculate seller fee based on tiered pricing
 */
function calculateSellerFee(baseAmount: number, tiers: SellerTier[]): number {
  // Find applicable tier
  const tier = tiers.find(t => baseAmount <= t.upTo) || tiers[tiers.length - 1];
  
  const percentageFee = roundCents(baseAmount * tier.pct);
  return Math.max(percentageFee, tier.min);
}

/**
 * Calculate buyer processing fee (to cover gateway costs)
 * 
 * This ensures platform doesn't lose money on gateway fees.
 * We estimate the gateway fee and add a buffer, with a minimum.
 */
function calculateBuyerProcessingFee(
  baseAmount: number,
  buyerPlatformFee: number,
  gateway: Gateway,
  method: PaymentMethod,
  policy: FeePolicy
): number {
  // First, estimate gross amount (will be slightly circular, but close enough)
  const preliminaryGross = baseAmount + buyerPlatformFee + policy.buyerProcessingMin;
  
  // Estimate gateway fee
  let estimatedFee: number;
  if (gateway === 'OZOW') {
    estimatedFee = estimateOzowFee(preliminaryGross, policy.vatPct, policy.bufferPct, policy.bufferFixed);
  } else {
    estimatedFee = estimatePayFastFee(preliminaryGross, method, policy.vatPct, policy.bufferPct, policy.bufferFixed);
  }
  
  // Processing fee should cover estimated gateway fee
  return Math.max(estimatedFee, policy.buyerProcessingMin);
}

/**
 * Main fee calculation function
 * 
 * Implements the complete fee model from 2.md spec.
 */
export function calculateFees(input: FeeCalcInput): FeeCalcOutput {
  const { baseAmount, gateway, method, policy } = input;
  
  // Validate base amount
  if (baseAmount < 5000) { // R50 minimum
    throw new Error('Minimum order amount is R50');
  }
  
  // 1. Calculate buyer platform fee
  const buyerPlatformFee = Math.max(
    roundCents(baseAmount * policy.buyerPlatformPct),
    policy.buyerPlatformMin
  );
  
  // 2. Calculate buyer processing fee (covers gateway costs)
  const buyerProcessingFee = calculateBuyerProcessingFee(
    baseAmount,
    buyerPlatformFee,
    gateway,
    method,
    policy
  );
  
  // 3. Calculate gross amount (what buyer pays)
  const grossAmount = baseAmount + buyerPlatformFee + buyerProcessingFee;
  
  // 4. Calculate seller fee (tiered)
  const sellerPlatformFee = calculateSellerFee(baseAmount, policy.sellerTiers);
  
  // 5. Calculate seller payout
  const sellerPayoutAmount = baseAmount - sellerPlatformFee;
  
  // 6. Calculate platform revenue
  const platformRevenue = buyerPlatformFee + sellerPlatformFee;
  
  // 7. Estimate actual gateway fee (for informational purposes)
  let estimatedGatewayFee: number;
  if (gateway === 'OZOW') {
    estimatedGatewayFee = estimateOzowFee(grossAmount, policy.vatPct, 0, 0); // No buffer for estimate display
  } else {
    estimatedGatewayFee = estimatePayFastFee(grossAmount, method, policy.vatPct, 0, 0);
  }
  
  const estimatedNetToPlatform = grossAmount - estimatedGatewayFee;
  
  return {
    baseAmount,
    buyerPlatformFee,
    buyerProcessingFee,
    grossAmount,
    sellerPlatformFee,
    sellerPayoutAmount,
    platformRevenue,
    estimatedGatewayFee,
    estimatedNetToPlatform,
    currency: 'ZAR',
    gateway,
    method,
    breakdown: [
      { label: 'Service price', amount: baseAmount },
      { label: 'Platform fee', amount: buyerPlatformFee },
      { label: 'Processing fee', amount: buyerProcessingFee },
      { label: 'Total', amount: grossAmount },
    ],
  };
}

/**
 * Format amount in cents to display string (e.g., "R 150.00")
 */
export function formatAmount(cents: number): string {
  return `R ${(cents / 100).toFixed(2)}`;
}

/**
 * Get available at date (current time + reserve days)
 */
export function getPayoutAvailableAt(reserveDays: number = DEFAULT_FEE_POLICY.reserveDays): string {
  const date = new Date();
  date.setDate(date.getDate() + reserveDays);
  return date.toISOString();
}

/**
 * Validate that ITN amount matches expected gross
 */
export function validatePaymentAmount(
  receivedGrossCents: number,
  expectedGrossCents: number,
  toleranceCents: number = 0 // No tolerance by default - exact match required
): boolean {
  return Math.abs(receivedGrossCents - expectedGrossCents) <= toleranceCents;
}
