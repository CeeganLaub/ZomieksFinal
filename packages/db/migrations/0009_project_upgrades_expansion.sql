-- Add new project upgrade columns
ALTER TABLE projects ADD COLUMN is_sealed INTEGER NOT NULL DEFAULT 0;
ALTER TABLE projects ADD COLUMN is_private INTEGER NOT NULL DEFAULT 0;
ALTER TABLE projects ADD COLUMN has_ip_agreement INTEGER NOT NULL DEFAULT 0;

-- Add IP agreement tracking to bids
ALTER TABLE project_bids ADD COLUMN ip_agreed_at TEXT;
