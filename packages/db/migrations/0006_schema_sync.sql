-- Migration 0006: Sync DB schema with Drizzle definitions
-- Adds missing columns to transactions and escrow_holds tables

-- ============ TRANSACTIONS - missing columns ============
ALTER TABLE transactions ADD COLUMN gateway_reference TEXT;
ALTER TABLE transactions ADD COLUMN gateway_data TEXT;
ALTER TABLE transactions ADD COLUMN buyer_fee INTEGER;
ALTER TABLE transactions ADD COLUMN total_amount INTEGER;
ALTER TABLE transactions ADD COLUMN seller_fee INTEGER;
ALTER TABLE transactions ADD COLUMN seller_payout INTEGER;
ALTER TABLE transactions ADD COLUMN paid_at TEXT;
ALTER TABLE transactions ADD COLUMN failed_at TEXT;
ALTER TABLE transactions ADD COLUMN failed_reason TEXT;

-- Add index for gateway_ref (was in schema but not created)
CREATE INDEX IF NOT EXISTS transactions_gateway_ref_idx ON transactions(gateway_ref);

-- ============ ESCROW_HOLDS - missing columns ============
ALTER TABLE escrow_holds ADD COLUMN milestone_id TEXT;
ALTER TABLE escrow_holds ADD COLUMN subscription_payment_id TEXT;
ALTER TABLE escrow_holds ADD COLUMN seller_amount INTEGER;
ALTER TABLE escrow_holds ADD COLUMN hold_until TEXT;
ALTER TABLE escrow_holds ADD COLUMN refunded_at TEXT;
ALTER TABLE escrow_holds ADD COLUMN payout_id TEXT;
ALTER TABLE escrow_holds ADD COLUMN seller_id TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS escrow_holds_milestone_id_unique ON escrow_holds(milestone_id);
CREATE UNIQUE INDEX IF NOT EXISTS escrow_holds_subscription_payment_id_unique ON escrow_holds(subscription_payment_id);
