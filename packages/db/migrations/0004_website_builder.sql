-- Migration 0004: Website Builder
-- Adds website (storefront) and website_sections tables for the Shopify-like builder
-- Pro Seller subscribers can build full section-based websites

-- ============ WEBSITE (one per seller) ============

CREATE TABLE IF NOT EXISTS websites (
  id TEXT PRIMARY KEY,
  seller_profile_id TEXT NOT NULL UNIQUE REFERENCES seller_profiles(id) ON DELETE CASCADE,

  -- Site identity
  site_name TEXT NOT NULL DEFAULT '',
  tagline TEXT,
  logo_url TEXT,
  favicon_url TEXT,

  -- Global theme
  primary_color TEXT NOT NULL DEFAULT '#10B981',
  secondary_color TEXT NOT NULL DEFAULT '#0a0a0a',
  text_color TEXT NOT NULL DEFAULT '#ffffff',
  background_color TEXT NOT NULL DEFAULT '#0a0a0a',
  accent_color TEXT NOT NULL DEFAULT '#34d399',
  font_heading TEXT NOT NULL DEFAULT 'Inter',
  font_body TEXT NOT NULL DEFAULT 'Inter',
  button_style TEXT NOT NULL DEFAULT 'rounded',

  -- Navigation
  nav_links TEXT, -- JSON: [{ label, href, isExternal }]
  social_links TEXT, -- JSON: { twitter, instagram, linkedin, ... }
  footer_text TEXT,

  -- SEO
  meta_title TEXT,
  meta_description TEXT,
  og_image TEXT,

  -- Status
  is_published INTEGER NOT NULL DEFAULT 0,
  published_at TEXT,
  custom_domain TEXT,

  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS websites_seller_profile_id_unique ON websites(seller_profile_id);
CREATE INDEX IF NOT EXISTS websites_is_published_idx ON websites(is_published);

-- ============ WEBSITE SECTIONS ============

CREATE TABLE IF NOT EXISTS website_sections (
  id TEXT PRIMARY KEY,
  website_id TEXT NOT NULL REFERENCES websites(id) ON DELETE CASCADE,

  -- Section type: hero, about, services, courses, portfolio, testimonials,
  -- post_project, faq, contact, products, features, stats, video, text, banner, newsletter
  section_type TEXT NOT NULL,
  title TEXT,
  subtitle TEXT,

  -- Order for arrangement
  sort_order INTEGER NOT NULL DEFAULT 0,

  -- Section-specific data (JSON blob for flexibility)
  -- Each section type stores different data here
  content TEXT, -- JSON

  -- Visibility
  is_visible INTEGER NOT NULL DEFAULT 1,

  -- Style overrides (optional per-section)
  background_color TEXT,
  text_color TEXT,
  padding TEXT NOT NULL DEFAULT 'normal', -- compact, normal, spacious

  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS website_sections_website_id_idx ON website_sections(website_id);
CREATE INDEX IF NOT EXISTS website_sections_sort_order_idx ON website_sections(website_id, sort_order);

-- ============ PROJECT SUBMISSIONS (from Post a Project section) ============

CREATE TABLE IF NOT EXISTS project_submissions (
  id TEXT PRIMARY KEY,
  website_id TEXT NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
  
  -- Submitter info
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  
  -- Project details
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  budget TEXT,
  timeline TEXT,
  attachments TEXT, -- JSON array of URLs
  
  -- Status
  status TEXT NOT NULL DEFAULT 'NEW', -- NEW, REVIEWED, CONTACTED, ACCEPTED, REJECTED
  seller_notes TEXT,
  
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS project_submissions_website_id_idx ON project_submissions(website_id);
CREATE INDEX IF NOT EXISTS project_submissions_status_idx ON project_submissions(website_id, status);
