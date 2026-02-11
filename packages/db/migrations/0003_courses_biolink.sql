-- Migration 0003: Courses, Digital Products, BioLink, Seller Subscriptions
-- Adds 12 new tables + missing columns on existing tables
-- Safe to run on existing data - all new columns have defaults or are nullable

-- ============ MISSING COLUMNS ON EXISTING TABLES ============

-- Users: credit balance and admin-created flag
ALTER TABLE users ADD COLUMN credit_balance INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN is_admin_created INTEGER NOT NULL DEFAULT 0;

-- Seller Profiles: KYC, seller fee, limits, bio fields
ALTER TABLE seller_profiles ADD COLUMN id_number TEXT;
ALTER TABLE seller_profiles ADD COLUMN kyc_status TEXT NOT NULL DEFAULT 'PENDING';
ALTER TABLE seller_profiles ADD COLUMN seller_fee_paid INTEGER NOT NULL DEFAULT 0;
ALTER TABLE seller_profiles ADD COLUMN seller_fee_transaction_id TEXT;
ALTER TABLE seller_profiles ADD COLUMN seller_fee_paid_at TEXT;
ALTER TABLE seller_profiles ADD COLUMN max_active_orders INTEGER NOT NULL DEFAULT 5;
ALTER TABLE seller_profiles ADD COLUMN bio_headline TEXT;
ALTER TABLE seller_profiles ADD COLUMN bio_theme_color TEXT NOT NULL DEFAULT '#10B981';
ALTER TABLE seller_profiles ADD COLUMN bio_background_color TEXT NOT NULL DEFAULT '#0a0a0a';
ALTER TABLE seller_profiles ADD COLUMN bio_text_color TEXT NOT NULL DEFAULT '#ffffff';
ALTER TABLE seller_profiles ADD COLUMN bio_button_style TEXT NOT NULL DEFAULT 'rounded';
ALTER TABLE seller_profiles ADD COLUMN bio_font TEXT NOT NULL DEFAULT 'Inter';
ALTER TABLE seller_profiles ADD COLUMN bio_social_links TEXT;
ALTER TABLE seller_profiles ADD COLUMN bio_featured_items TEXT;
ALTER TABLE seller_profiles ADD COLUMN bio_cta_text TEXT NOT NULL DEFAULT 'Get in Touch';
ALTER TABLE seller_profiles ADD COLUMN bio_enabled INTEGER NOT NULL DEFAULT 0;
ALTER TABLE seller_profiles ADD COLUMN bio_template TEXT NOT NULL DEFAULT 'services-showcase';
ALTER TABLE seller_profiles ADD COLUMN bio_quick_replies TEXT;
ALTER TABLE seller_profiles ADD COLUMN bio_show_testimonials INTEGER NOT NULL DEFAULT 1;
ALTER TABLE seller_profiles ADD COLUMN bio_testimonial_count INTEGER NOT NULL DEFAULT 6;

-- Escrow Holds: enrollment support
ALTER TABLE escrow_holds ADD COLUMN enrollment_id TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS escrow_holds_enrollment_id_unique ON escrow_holds(enrollment_id);

-- Refunds: course refund support
ALTER TABLE refunds ADD COLUMN order_id TEXT;
ALTER TABLE refunds ADD COLUMN enrollment_id TEXT;
ALTER TABLE refunds ADD COLUMN processing_fee INTEGER NOT NULL DEFAULT 0;
ALTER TABLE refunds ADD COLUMN refund_type TEXT NOT NULL DEFAULT 'GATEWAY';
CREATE INDEX IF NOT EXISTS refunds_order_id_idx ON refunds(order_id);
CREATE INDEX IF NOT EXISTS refunds_enrollment_id_idx ON refunds(enrollment_id);

-- Make refunds.transaction_id nullable (course refunds may not have a gateway transaction)
-- SQLite doesn't support ALTER COLUMN, but the column was already TEXT so NULL is allowed

-- ============ SELLER SUBSCRIPTIONS ============

CREATE TABLE IF NOT EXISTS seller_subscriptions (
  id TEXT PRIMARY KEY,
  seller_profile_id TEXT NOT NULL UNIQUE REFERENCES seller_profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'PENDING',
  current_period_start TEXT NOT NULL,
  current_period_end TEXT NOT NULL,
  next_billing_date TEXT,
  payfast_token TEXT UNIQUE,
  payfast_subscription_id TEXT,
  cancel_at_period_end INTEGER NOT NULL DEFAULT 0,
  cancelled_at TEXT,
  cancel_reason TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS seller_subscriptions_status_idx ON seller_subscriptions(status);

CREATE TABLE IF NOT EXISTS seller_subscription_payments (
  id TEXT PRIMARY KEY,
  seller_subscription_id TEXT NOT NULL REFERENCES seller_subscriptions(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  gateway TEXT NOT NULL,
  gateway_payment_id TEXT NOT NULL UNIQUE,
  period_start TEXT NOT NULL,
  period_end TEXT NOT NULL,
  paid_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS seller_sub_payments_subscription_id_idx ON seller_subscription_payments(seller_subscription_id);

-- ============ COURSES ============

CREATE TABLE IF NOT EXISTS courses (
  id TEXT PRIMARY KEY,
  seller_id TEXT NOT NULL REFERENCES seller_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  subtitle TEXT,
  description TEXT NOT NULL,
  thumbnail TEXT,
  promo_video TEXT,
  category_id TEXT REFERENCES categories(id),
  tags TEXT DEFAULT '[]',
  level TEXT NOT NULL DEFAULT 'ALL_LEVELS',
  language TEXT NOT NULL DEFAULT 'English',
  price INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'ZAR',
  rating INTEGER NOT NULL DEFAULT 0,
  review_count INTEGER NOT NULL DEFAULT 0,
  enroll_count INTEGER NOT NULL DEFAULT 0,
  total_duration INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'DRAFT',
  is_featured INTEGER NOT NULL DEFAULT 0,
  published_at TEXT,
  requirements TEXT DEFAULT '[]',
  learnings TEXT DEFAULT '[]',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS courses_seller_id_idx ON courses(seller_id);
CREATE INDEX IF NOT EXISTS courses_category_id_idx ON courses(category_id);
CREATE INDEX IF NOT EXISTS courses_status_idx ON courses(status);
CREATE INDEX IF NOT EXISTS courses_rating_idx ON courses(rating);
CREATE INDEX IF NOT EXISTS courses_seller_status_idx ON courses(seller_id, status);
CREATE INDEX IF NOT EXISTS courses_slug_idx ON courses(slug);

CREATE TABLE IF NOT EXISTS course_sections (
  id TEXT PRIMARY KEY,
  course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  "order" INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS course_sections_course_order_unique ON course_sections(course_id, "order");
CREATE INDEX IF NOT EXISTS course_sections_course_id_idx ON course_sections(course_id);

CREATE TABLE IF NOT EXISTS course_lessons (
  id TEXT PRIMARY KEY,
  section_id TEXT NOT NULL REFERENCES course_sections(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  "order" INTEGER NOT NULL,
  video_url TEXT,
  duration INTEGER NOT NULL DEFAULT 0,
  is_free_preview INTEGER NOT NULL DEFAULT 0,
  resources TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS course_lessons_section_order_unique ON course_lessons(section_id, "order");
CREATE INDEX IF NOT EXISTS course_lessons_section_id_idx ON course_lessons(section_id);

CREATE TABLE IF NOT EXISTS course_enrollments (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  amount_paid INTEGER NOT NULL,
  gateway TEXT NOT NULL DEFAULT 'CREDIT',
  transaction_id TEXT,
  paid_at TEXT,
  progress_percent INTEGER NOT NULL DEFAULT 0,
  completed_at TEXT,
  refunded_at TEXT,
  refunded_amount INTEGER,
  refund_reason TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS course_enrollments_user_course_unique ON course_enrollments(user_id, course_id);
CREATE INDEX IF NOT EXISTS course_enrollments_user_id_idx ON course_enrollments(user_id);
CREATE INDEX IF NOT EXISTS course_enrollments_course_id_idx ON course_enrollments(course_id);

CREATE TABLE IF NOT EXISTS lesson_progress (
  id TEXT PRIMARY KEY,
  enrollment_id TEXT NOT NULL REFERENCES course_enrollments(id) ON DELETE CASCADE,
  lesson_id TEXT NOT NULL REFERENCES course_lessons(id) ON DELETE CASCADE,
  completed INTEGER NOT NULL DEFAULT 0,
  watched_secs INTEGER NOT NULL DEFAULT 0,
  completed_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS lesson_progress_enrollment_lesson_unique ON lesson_progress(enrollment_id, lesson_id);
CREATE INDEX IF NOT EXISTS lesson_progress_enrollment_id_idx ON lesson_progress(enrollment_id);

CREATE TABLE IF NOT EXISTS course_reviews (
  id TEXT PRIMARY KEY,
  course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id),
  rating INTEGER NOT NULL,
  comment TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS course_reviews_course_user_unique ON course_reviews(course_id, user_id);
CREATE INDEX IF NOT EXISTS course_reviews_course_id_idx ON course_reviews(course_id);

-- ============ DIGITAL PRODUCTS ============

CREATE TABLE IF NOT EXISTS digital_products (
  id TEXT PRIMARY KEY,
  seller_profile_id TEXT NOT NULL REFERENCES seller_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  price INTEGER NOT NULL,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  thumbnail TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  "order" INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS digital_products_seller_active_idx ON digital_products(seller_profile_id, is_active);

CREATE TABLE IF NOT EXISTS digital_product_purchases (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES digital_products(id) ON DELETE CASCADE,
  buyer_id TEXT NOT NULL REFERENCES users(id),
  amount_paid INTEGER NOT NULL,
  gateway TEXT NOT NULL DEFAULT 'credit',
  created_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS digital_product_purchases_product_buyer_unique ON digital_product_purchases(product_id, buyer_id);
CREATE INDEX IF NOT EXISTS digital_product_purchases_buyer_id_idx ON digital_product_purchases(buyer_id);

-- ============ BIOLINK ============

CREATE TABLE IF NOT EXISTS bio_faq_entries (
  id TEXT PRIMARY KEY,
  seller_profile_id TEXT NOT NULL REFERENCES seller_profiles(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  keywords TEXT DEFAULT '[]',
  "order" INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS bio_faq_entries_seller_profile_id_idx ON bio_faq_entries(seller_profile_id);

CREATE TABLE IF NOT EXISTS bio_link_events (
  id TEXT PRIMARY KEY,
  seller_profile_id TEXT NOT NULL REFERENCES seller_profiles(id) ON DELETE CASCADE,
  event TEXT NOT NULL,
  metadata TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS bio_link_events_seller_event_idx ON bio_link_events(seller_profile_id, event);
CREATE INDEX IF NOT EXISTS bio_link_events_seller_created_idx ON bio_link_events(seller_profile_id, created_at);
