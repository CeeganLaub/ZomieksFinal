-- Migration 0010: Comprehensive schema sync
-- Aligns D1 database columns with Drizzle ORM schema
-- Uses ADD COLUMN for missing columns and RENAME COLUMN for name mismatches

-- ============ SERVICES - missing columns ============
ALTER TABLE services ADD COLUMN video TEXT;
ALTER TABLE services ADD COLUMN rating INTEGER NOT NULL DEFAULT 0;
ALTER TABLE services ADD COLUMN review_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE services ADD COLUMN favorite_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE services ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1;
ALTER TABLE services ADD COLUMN is_paused INTEGER NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS services_rating_idx ON services(rating);

-- ============ SERVICE PACKAGES - missing column ============
ALTER TABLE service_packages ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1;

-- ============ SUBSCRIPTION TIERS - missing columns ============
ALTER TABLE subscription_tiers ADD COLUMN price INTEGER NOT NULL DEFAULT 0;
ALTER TABLE subscription_tiers ADD COLUMN interval TEXT NOT NULL DEFAULT 'MONTHLY';
ALTER TABLE subscription_tiers ADD COLUMN payfast_frequency INTEGER NOT NULL DEFAULT 3;
-- Migrate monthly_price to new price column
UPDATE subscription_tiers SET price = monthly_price WHERE price = 0 AND monthly_price > 0;

-- ============ ORDERS - missing columns ============
ALTER TABLE orders ADD COLUMN currency TEXT NOT NULL DEFAULT 'ZAR';
ALTER TABLE orders ADD COLUMN buyer_fee INTEGER DEFAULT 0;
ALTER TABLE orders ADD COLUMN seller_fee INTEGER DEFAULT 0;
ALTER TABLE orders ADD COLUMN seller_payout INTEGER DEFAULT 0;
ALTER TABLE orders ADD COLUMN revisions INTEGER NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN paid_at TEXT;
ALTER TABLE orders ADD COLUMN delivery_due_at TEXT;
ALTER TABLE orders ADD COLUMN cancel_reason TEXT;
-- Migrate legacy columns
UPDATE orders SET revisions = revisions_allowed WHERE revisions = 0 AND revisions_allowed > 0;
UPDATE orders SET cancel_reason = cancellation_reason WHERE cancel_reason IS NULL AND cancellation_reason IS NOT NULL;

-- ============ ORDER MILESTONES - column renames + adds ============
ALTER TABLE order_milestones ADD COLUMN name TEXT NOT NULL DEFAULT '';
ALTER TABLE order_milestones ADD COLUMN order_num INTEGER NOT NULL DEFAULT 0;
ALTER TABLE order_milestones ADD COLUMN due_at TEXT NOT NULL DEFAULT '';
ALTER TABLE order_milestones ADD COLUMN delivered_at TEXT;
ALTER TABLE order_milestones ADD COLUMN approved_at TEXT;
-- Migrate data from old columns
UPDATE order_milestones SET name = title WHERE name = '' AND title IS NOT NULL;
UPDATE order_milestones SET order_num = "order" WHERE order_num = 0;
UPDATE order_milestones SET due_at = due_date WHERE due_at = '' AND due_date IS NOT NULL;
UPDATE order_milestones SET approved_at = completed_at WHERE approved_at IS NULL AND completed_at IS NOT NULL;

-- ============ ORDER DELIVERIES - missing columns ============
ALTER TABLE order_deliveries ADD COLUMN attachments TEXT;
ALTER TABLE order_deliveries ADD COLUMN delivered_at TEXT NOT NULL DEFAULT '';
ALTER TABLE order_deliveries ADD COLUMN reviewed_at TEXT;
-- Migrate files to attachments
UPDATE order_deliveries SET attachments = files WHERE attachments IS NULL AND files IS NOT NULL;
UPDATE order_deliveries SET delivered_at = created_at WHERE delivered_at = '';

-- ============ ORDER REVISIONS - missing columns ============
ALTER TABLE order_revisions ADD COLUMN requested_at TEXT NOT NULL DEFAULT '';
ALTER TABLE order_revisions ADD COLUMN resolved_at TEXT;
UPDATE order_revisions SET requested_at = created_at WHERE requested_at = '';

-- ============ SUBSCRIPTIONS - missing columns ============
ALTER TABLE subscriptions ADD COLUMN current_period_start TEXT NOT NULL DEFAULT '';
ALTER TABLE subscriptions ADD COLUMN current_period_end TEXT NOT NULL DEFAULT '';
ALTER TABLE subscriptions ADD COLUMN payfast_token TEXT;
ALTER TABLE subscriptions ADD COLUMN payfast_subscription_id TEXT;
ALTER TABLE subscriptions ADD COLUMN paused_at TEXT;
ALTER TABLE subscriptions ADD COLUMN pause_reason TEXT;
ALTER TABLE subscriptions ADD COLUMN cancel_reason TEXT;
ALTER TABLE subscriptions ADD COLUMN current_usage TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_payfast_token_unique ON subscriptions(payfast_token);
-- Migrate legacy
UPDATE subscriptions SET payfast_subscription_id = gateway_subscription_id WHERE payfast_subscription_id IS NULL AND gateway_subscription_id IS NOT NULL;
UPDATE subscriptions SET paused_at = pause_start WHERE paused_at IS NULL AND pause_start IS NOT NULL;

-- ============ SUBSCRIPTION PAYMENTS - missing columns ============
ALTER TABLE subscription_payments ADD COLUMN buyer_fee INTEGER NOT NULL DEFAULT 0;
ALTER TABLE subscription_payments ADD COLUMN total_amount INTEGER NOT NULL DEFAULT 0;
ALTER TABLE subscription_payments ADD COLUMN seller_fee INTEGER NOT NULL DEFAULT 0;
ALTER TABLE subscription_payments ADD COLUMN seller_payout INTEGER NOT NULL DEFAULT 0;
ALTER TABLE subscription_payments ADD COLUMN platform_revenue INTEGER NOT NULL DEFAULT 0;
ALTER TABLE subscription_payments ADD COLUMN escrow_status TEXT NOT NULL DEFAULT 'HELD';
ALTER TABLE subscription_payments ADD COLUMN released_at TEXT;
ALTER TABLE subscription_payments ADD COLUMN period_start TEXT NOT NULL DEFAULT '';
ALTER TABLE subscription_payments ADD COLUMN period_end TEXT NOT NULL DEFAULT '';
-- Migrate
UPDATE subscription_payments SET period_start = billing_period_start WHERE period_start = '' AND billing_period_start IS NOT NULL;
UPDATE subscription_payments SET period_end = billing_period_end WHERE period_end = '' AND billing_period_end IS NOT NULL;
UPDATE subscription_payments SET total_amount = amount WHERE total_amount = 0 AND amount > 0;

-- ============ SELLER PAYOUTS - missing columns ============
ALTER TABLE seller_payouts ADD COLUMN currency TEXT NOT NULL DEFAULT 'ZAR';
ALTER TABLE seller_payouts ADD COLUMN bank_reference TEXT;
ALTER TABLE seller_payouts ADD COLUMN failed_at TEXT;

-- ============ REFUNDS - missing column ============
ALTER TABLE refunds ADD COLUMN failed_reason TEXT;

-- ============ DISPUTES - column renames ============
ALTER TABLE disputes ADD COLUMN raised_by TEXT NOT NULL DEFAULT '';
ALTER TABLE disputes ADD COLUMN resolved_by TEXT;
UPDATE disputes SET raised_by = initiated_by WHERE raised_by = '' AND initiated_by IS NOT NULL;
UPDATE disputes SET resolved_by = resolver_id WHERE resolved_by IS NULL AND resolver_id IS NOT NULL;

-- ============ REVIEWS - column renames ============
ALTER TABLE reviews ADD COLUMN author_id TEXT NOT NULL DEFAULT '';
ALTER TABLE reviews ADD COLUMN recipient_id TEXT NOT NULL DEFAULT '';
ALTER TABLE reviews ADD COLUMN quality_rating INTEGER;
ALTER TABLE reviews ADD COLUMN value_rating INTEGER;
UPDATE reviews SET author_id = buyer_id WHERE author_id = '' AND buyer_id IS NOT NULL;
UPDATE reviews SET recipient_id = seller_id WHERE recipient_id = '' AND seller_id IS NOT NULL;
UPDATE reviews SET quality_rating = service_rating WHERE quality_rating IS NULL AND service_rating IS NOT NULL;
UPDATE reviews SET value_rating = recommendation_rating WHERE value_rating IS NULL AND recommendation_rating IS NOT NULL;

-- ============ NOTIFICATIONS - add message column ============
ALTER TABLE notifications ADD COLUMN message TEXT NOT NULL DEFAULT '';
UPDATE notifications SET message = body WHERE message = '' AND body IS NOT NULL;

-- ============ PIPELINE STAGES - renames + adds ============
ALTER TABLE pipeline_stages ADD COLUMN user_id TEXT;
ALTER TABLE pipeline_stages ADD COLUMN is_default INTEGER NOT NULL DEFAULT 0;
ALTER TABLE pipeline_stages ADD COLUMN auto_response_id TEXT;
UPDATE pipeline_stages SET user_id = seller_id WHERE user_id IS NULL AND seller_id IS NOT NULL;

-- ============ LABELS - add user_id ============
ALTER TABLE labels ADD COLUMN user_id TEXT;
UPDATE labels SET user_id = seller_id WHERE user_id IS NULL AND seller_id IS NOT NULL;

-- ============ CONVERSATION LABELS - recreate with id PK ============
-- Save existing data
CREATE TABLE IF NOT EXISTS conversation_labels_backup AS SELECT * FROM conversation_labels;
DROP TABLE IF EXISTS conversation_labels;
CREATE TABLE conversation_labels (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  label_id TEXT NOT NULL REFERENCES labels(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT ''
);
CREATE UNIQUE INDEX IF NOT EXISTS conversation_labels_unique ON conversation_labels(conversation_id, label_id);
-- Restore data with generated IDs
INSERT INTO conversation_labels (id, conversation_id, label_id, created_at)
SELECT lower(hex(randomblob(12))), conversation_id, label_id, datetime('now')
FROM conversation_labels_backup;
DROP TABLE IF EXISTS conversation_labels_backup;

-- ============ SAVED REPLIES - renames + adds ============
ALTER TABLE saved_replies ADD COLUMN user_id TEXT;
ALTER TABLE saved_replies ADD COLUMN category TEXT;
ALTER TABLE saved_replies ADD COLUMN usage_count INTEGER NOT NULL DEFAULT 0;
UPDATE saved_replies SET user_id = seller_id WHERE user_id IS NULL AND seller_id IS NOT NULL;
UPDATE saved_replies SET usage_count = use_count WHERE usage_count = 0 AND use_count > 0;

-- ============ AUTO TRIGGERS - renames + adds ============
ALTER TABLE auto_triggers ADD COLUMN user_id TEXT;
ALTER TABLE auto_triggers ADD COLUMN action_payload TEXT NOT NULL DEFAULT '{}';
ALTER TABLE auto_triggers ADD COLUMN delay_minutes INTEGER NOT NULL DEFAULT 0;
ALTER TABLE auto_triggers ADD COLUMN active_hours_only INTEGER NOT NULL DEFAULT 0;
UPDATE auto_triggers SET user_id = seller_id WHERE user_id IS NULL AND seller_id IS NOT NULL;
UPDATE auto_triggers SET action_payload = action_data WHERE action_payload = '{}' AND action_data IS NOT NULL;

-- ============ CONVERSATION NOTES - renames + adds ============
ALTER TABLE conversation_notes ADD COLUMN user_id TEXT;
ALTER TABLE conversation_notes ADD COLUMN is_pinned INTEGER NOT NULL DEFAULT 0;
UPDATE conversation_notes SET user_id = author_id WHERE user_id IS NULL AND author_id IS NOT NULL;

-- ============ ACTIVITIES - recreate to match Drizzle schema ============
CREATE TABLE IF NOT EXISTS activities_backup AS SELECT * FROM activities;
DROP TABLE IF EXISTS activities;
CREATE TABLE activities (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  data TEXT NOT NULL DEFAULT '{}',
  performed_by TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS activities_conversation_created_idx ON activities(conversation_id, created_at);

-- ============ CONVERSATION METRICS - renames + adds ============
ALTER TABLE conversation_metrics ADD COLUMN user_id TEXT;
ALTER TABLE conversation_metrics ADD COLUMN avg_first_response_ms INTEGER;
ALTER TABLE conversation_metrics ADD COLUMN avg_response_time_ms INTEGER;
ALTER TABLE conversation_metrics ADD COLUMN responses_within_1hr INTEGER NOT NULL DEFAULT 0;
ALTER TABLE conversation_metrics ADD COLUMN deals_won INTEGER NOT NULL DEFAULT 0;
ALTER TABLE conversation_metrics ADD COLUMN deals_lost INTEGER NOT NULL DEFAULT 0;
ALTER TABLE conversation_metrics ADD COLUMN deal_value_won INTEGER NOT NULL DEFAULT 0;
UPDATE conversation_metrics SET user_id = seller_id WHERE user_id IS NULL AND seller_id IS NOT NULL;

-- ============ SELLER METRICS - renames + adds ============
ALTER TABLE seller_metrics ADD COLUMN user_id TEXT;
ALTER TABLE seller_metrics ADD COLUMN gross_revenue INTEGER NOT NULL DEFAULT 0;
ALTER TABLE seller_metrics ADD COLUMN platform_fees INTEGER NOT NULL DEFAULT 0;
ALTER TABLE seller_metrics ADD COLUMN net_revenue INTEGER NOT NULL DEFAULT 0;
ALTER TABLE seller_metrics ADD COLUMN avg_delivery_time_hrs INTEGER;
ALTER TABLE seller_metrics ADD COLUMN on_time_deliveries INTEGER NOT NULL DEFAULT 0;
ALTER TABLE seller_metrics ADD COLUMN late_deliveries INTEGER NOT NULL DEFAULT 0;
UPDATE seller_metrics SET user_id = seller_id WHERE user_id IS NULL AND seller_id IS NOT NULL;
UPDATE seller_metrics SET gross_revenue = revenue WHERE gross_revenue = 0 AND revenue > 0;
