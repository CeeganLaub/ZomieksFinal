-- Migration 0007: Expand project board with upgrades, files, payments, reviews
-- Also adds is_featured, is_urgent, completed_at to projects table

-- ============ PROJECTS - new columns ============
ALTER TABLE projects ADD COLUMN is_featured INTEGER NOT NULL DEFAULT 0;
ALTER TABLE projects ADD COLUMN is_urgent INTEGER NOT NULL DEFAULT 0;
ALTER TABLE projects ADD COLUMN completed_at TEXT;
ALTER TABLE projects ADD COLUMN awarded_seller_id TEXT REFERENCES users(id);

-- ============ PROJECT UPGRADES ============
CREATE TABLE IF NOT EXISTS project_upgrades (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- FEATURED | URGENT
  amount INTEGER NOT NULL, -- in cents (ZAR), R100 = 10000
  status TEXT NOT NULL DEFAULT 'PENDING', -- PENDING | PAID | EXPIRED
  payment_ref TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_project_upgrades_project_id ON project_upgrades(project_id);

-- ============ PROJECT FILES ============
CREATE TABLE IF NOT EXISTS project_files (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  uploaded_by TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER NOT NULL DEFAULT 0,
  file_type TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_project_files_project_id ON project_files(project_id);

-- ============ PROJECT PAYMENTS (milestone-based) ============
CREATE TABLE IF NOT EXISTS project_payments (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  bid_id TEXT REFERENCES project_bids(id),
  payer_id TEXT NOT NULL REFERENCES users(id),
  payee_id TEXT NOT NULL REFERENCES users(id),
  amount INTEGER NOT NULL, -- in cents
  platform_fee INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'PENDING', -- PENDING | HELD | RELEASED | REFUNDED
  milestone_label TEXT,
  payment_ref TEXT,
  released_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_project_payments_project_id ON project_payments(project_id);
CREATE INDEX IF NOT EXISTS idx_project_payments_payer_id ON project_payments(payer_id);

-- ============ PROJECT REVIEWS ============
CREATE TABLE IF NOT EXISTS project_reviews (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  reviewer_id TEXT NOT NULL REFERENCES users(id),
  reviewee_id TEXT NOT NULL REFERENCES users(id),
  rating INTEGER NOT NULL, -- 1-5
  comment TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_project_reviews_project_id ON project_reviews(project_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_project_reviews_unique ON project_reviews(project_id, reviewer_id);
