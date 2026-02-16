-- Migration 0008: Sync conversations/messages with Drizzle schema + offer support
-- Adds missing CRM columns to conversations and offer columns to messages

-- ============ CONVERSATIONS - CRM columns ============
ALTER TABLE conversations ADD COLUMN lead_score INTEGER NOT NULL DEFAULT 0;
ALTER TABLE conversations ADD COLUMN source TEXT;
ALTER TABLE conversations ADD COLUMN pipeline_stage_id TEXT REFERENCES pipeline_stages(id);
ALTER TABLE conversations ADD COLUMN deal_value INTEGER;
ALTER TABLE conversations ADD COLUMN probability INTEGER;
ALTER TABLE conversations ADD COLUMN expected_close TEXT;
ALTER TABLE conversations ADD COLUMN first_response_at TEXT;
ALTER TABLE conversations ADD COLUMN message_count INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS conversations_pipeline_stage_id_idx ON conversations(pipeline_stage_id);

-- ============ MESSAGES - offer + automation columns ============
ALTER TABLE messages ADD COLUMN quick_offer TEXT;
ALTER TABLE messages ADD COLUMN is_auto_response INTEGER NOT NULL DEFAULT 0;
ALTER TABLE messages ADD COLUMN triggered_by TEXT;
ALTER TABLE messages ADD COLUMN delivered_at TEXT;
