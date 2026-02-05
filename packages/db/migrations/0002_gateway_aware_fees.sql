-- Migration 0002: Gateway-Aware Fee Model
-- Adds support for new fee calculation system (2.md spec)
-- Safe to run on existing data - all new columns have defaults or are nullable

-- ============ SELLER PROFILES ============
-- Balance tracking for payouts
ALTER TABLE seller_profiles ADD COLUMN balance INTEGER NOT NULL DEFAULT 0;
ALTER TABLE seller_profiles ADD COLUMN pending_balance INTEGER NOT NULL DEFAULT 0;
ALTER TABLE seller_profiles ADD COLUMN escrow_balance INTEGER NOT NULL DEFAULT 0;

-- ============ BANK DETAILS ============
-- Support multiple bank accounts with default selection
ALTER TABLE bank_details ADD COLUMN is_default INTEGER NOT NULL DEFAULT 0;

-- ============ ORDERS ============
-- Gateway-aware fee breakdown
ALTER TABLE orders ADD COLUMN base_amount INTEGER NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN buyer_platform_fee INTEGER NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN buyer_processing_fee INTEGER NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN seller_platform_fee INTEGER NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN gross_amount INTEGER NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN platform_revenue INTEGER NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN seller_payout_amount INTEGER NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN gateway TEXT;
ALTER TABLE orders ADD COLUMN gateway_method TEXT;

-- Keep legacy fields for backward compatibility (buyer_fee, total_amount, seller_fee, seller_payout already exist)

-- ============ TRANSACTIONS ============
-- New fee model fields
ALTER TABLE transactions ADD COLUMN type TEXT NOT NULL DEFAULT 'PAYMENT';
ALTER TABLE transactions ADD COLUMN gateway_method TEXT;
ALTER TABLE transactions ADD COLUMN gateway_ref TEXT;
ALTER TABLE transactions ADD COLUMN gross_amount INTEGER;
ALTER TABLE transactions ADD COLUMN gateway_fee INTEGER;
ALTER TABLE transactions ADD COLUMN net_amount INTEGER;
ALTER TABLE transactions ADD COLUMN base_amount INTEGER;
ALTER TABLE transactions ADD COLUMN buyer_platform_fee INTEGER;
ALTER TABLE transactions ADD COLUMN buyer_processing_fee INTEGER;
ALTER TABLE transactions ADD COLUMN seller_platform_fee INTEGER;
ALTER TABLE transactions ADD COLUMN platform_revenue INTEGER;
ALTER TABLE transactions ADD COLUMN seller_payout_amount INTEGER;
ALTER TABLE transactions ADD COLUMN raw_payload TEXT;

-- Index for idempotency checks
CREATE UNIQUE INDEX IF NOT EXISTS transactions_gateway_ref_unique ON transactions(gateway_ref);
CREATE INDEX IF NOT EXISTS transactions_gateway_ref_idx ON transactions(gateway_ref);

-- ============ ESCROW HOLDS ============
-- Full fee audit trail
ALTER TABLE escrow_holds ADD COLUMN transaction_id TEXT REFERENCES transactions(id);
ALTER TABLE escrow_holds ADD COLUMN gross_amount INTEGER;
ALTER TABLE escrow_holds ADD COLUMN gateway_fee INTEGER;
ALTER TABLE escrow_holds ADD COLUMN net_amount INTEGER;
ALTER TABLE escrow_holds ADD COLUMN base_amount INTEGER;
ALTER TABLE escrow_holds ADD COLUMN buyer_platform_fee INTEGER;
ALTER TABLE escrow_holds ADD COLUMN buyer_processing_fee INTEGER;
ALTER TABLE escrow_holds ADD COLUMN seller_platform_fee INTEGER;
ALTER TABLE escrow_holds ADD COLUMN platform_revenue INTEGER;
ALTER TABLE escrow_holds ADD COLUMN seller_payout_amount INTEGER;

CREATE INDEX IF NOT EXISTS escrow_holds_transaction_id_idx ON escrow_holds(transaction_id);
CREATE INDEX IF NOT EXISTS escrow_holds_order_id_idx ON escrow_holds(order_id);

-- ============ SELLER PAYOUTS ============
-- Batch payout support
ALTER TABLE seller_payouts ADD COLUMN order_id TEXT REFERENCES orders(id);
ALTER TABLE seller_payouts ADD COLUMN escrow_hold_id TEXT REFERENCES escrow_holds(id);
ALTER TABLE seller_payouts ADD COLUMN batch_id TEXT;
ALTER TABLE seller_payouts ADD COLUMN available_at TEXT;
ALTER TABLE seller_payouts ADD COLUMN external_ref TEXT;
ALTER TABLE seller_payouts ADD COLUMN failure_reason TEXT;
ALTER TABLE seller_payouts ADD COLUMN bank_details_snapshot TEXT;

CREATE INDEX IF NOT EXISTS seller_payouts_batch_id_idx ON seller_payouts(batch_id);
CREATE INDEX IF NOT EXISTS seller_payouts_available_at_idx ON seller_payouts(available_at);

-- ============ DATA MIGRATION ============
-- Migrate existing orders to new fee fields if they have legacy data
-- This sets base_amount = price and calculates other fields from legacy columns
UPDATE orders 
SET 
  base_amount = COALESCE(price, 0),
  gross_amount = COALESCE(total_amount, 0),
  buyer_platform_fee = COALESCE(buyer_fee, 0),
  seller_platform_fee = COALESCE(seller_fee, 0),
  seller_payout_amount = COALESCE(seller_payout, 0),
  platform_revenue = COALESCE(buyer_fee, 0) + COALESCE(seller_fee, 0)
WHERE base_amount = 0 AND COALESCE(total_amount, 0) > 0;

-- Migrate existing transactions
UPDATE transactions
SET gross_amount = COALESCE(amount, 0)
WHERE gross_amount IS NULL AND amount IS NOT NULL;

-- Migrate existing escrow holds
UPDATE escrow_holds
SET gross_amount = COALESCE(amount, 0)
WHERE gross_amount IS NULL AND amount IS NOT NULL;

-- Set first bank account as default for users with bank details
UPDATE bank_details
SET is_default = 1
WHERE id IN (
  SELECT MIN(id) FROM bank_details GROUP BY user_id
);

-- ============ NOTES ============
-- Legacy columns kept for backward compatibility:
-- orders: price, buyer_fee, total_amount, seller_fee, seller_payout
-- transactions: amount, buyer_fee, total_amount, seller_fee, seller_payout
-- escrow_holds: amount, seller_amount
-- 
-- New code should use:
-- - baseAmount, grossAmount, buyerPlatformFee, buyerProcessingFee, sellerPlatformFee
-- - platformRevenue, sellerPayoutAmount

-- ============ SITE CONFIGURATION ============
-- Key-value store for platform settings

CREATE TABLE IF NOT EXISTS site_config (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL,
  key TEXT NOT NULL,
  value TEXT,
  encrypted_value TEXT,
  description TEXT,
  is_secret INTEGER NOT NULL DEFAULT 0,
  updated_by TEXT REFERENCES users(id),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS site_config_category_key_unique ON site_config(category, key);
CREATE INDEX IF NOT EXISTS site_config_category_idx ON site_config(category);

-- ============ FEE POLICY ============
-- Fee configuration table

CREATE TABLE IF NOT EXISTS fee_policy (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 0,
  buyer_platform_pct INTEGER NOT NULL,
  buyer_platform_min INTEGER NOT NULL,
  buyer_processing_min INTEGER NOT NULL,
  seller_tiers TEXT NOT NULL,
  buffer_pct INTEGER NOT NULL,
  buffer_fixed INTEGER NOT NULL,
  vat_pct INTEGER NOT NULL,
  reserve_days INTEGER NOT NULL,
  payout_minimum INTEGER NOT NULL,
  created_by TEXT REFERENCES users(id),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS fee_policy_is_active_idx ON fee_policy(is_active);

-- Insert default fee policy
INSERT INTO fee_policy (
  id, name, is_active, 
  buyer_platform_pct, buyer_platform_min, buyer_processing_min,
  seller_tiers, buffer_pct, buffer_fixed, vat_pct,
  reserve_days, payout_minimum, created_at, updated_at
) VALUES (
  'default_policy', 'Default Policy', 1,
  300, 1000, 1500,
  '[{"maxAmount":50000,"pct":1200,"min":1500},{"maxAmount":200000,"pct":1000,"min":2000},{"maxAmount":null,"pct":800,"min":3000}]',
  20, 100, 1500,
  7, 10000,
  datetime('now'), datetime('now')
);
