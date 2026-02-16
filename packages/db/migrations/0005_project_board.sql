-- Migration: 0005_project_board
-- Marketplace project board: buyers post projects, sellers bid

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  buyer_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category_id TEXT REFERENCES categories(id),
  budget_min INTEGER, -- in cents (ZAR)
  budget_max INTEGER, -- in cents (ZAR)
  deadline TEXT,      -- ISO date string
  attachments TEXT DEFAULT '[]', -- JSON array of URLs
  skills TEXT DEFAULT '[]',      -- JSON array of required skills
  status TEXT NOT NULL DEFAULT 'OPEN', -- OPEN | IN_PROGRESS | COMPLETED | CANCELLED
  selected_bid_id TEXT,
  bid_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX idx_projects_buyer_id ON projects(buyer_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_category ON projects(category_id);
CREATE INDEX idx_projects_created ON projects(created_at);

CREATE TABLE IF NOT EXISTS project_bids (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  seller_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL, -- in cents (ZAR)
  delivery_days INTEGER NOT NULL,
  proposal TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING', -- PENDING | ACCEPTED | REJECTED | WITHDRAWN
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX idx_project_bids_project_id ON project_bids(project_id);
CREATE INDEX idx_project_bids_seller_id ON project_bids(seller_id);
CREATE UNIQUE INDEX idx_project_bids_unique ON project_bids(project_id, seller_id);
