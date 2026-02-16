-- Migration 0010: Schema sync marker
-- Actual schema changes are applied by deploy workflow's Schema Fixes step
-- which handles idempotent ALTER TABLE ADD COLUMN (SQLite limitation)
SELECT 1;
