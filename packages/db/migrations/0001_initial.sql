-- Initial schema migration for Zomieks D1 database
-- Generated from Drizzle schema

-- USERS
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  avatar TEXT,
  bio TEXT,
  country TEXT,
  timezone TEXT DEFAULT 'Africa/Johannesburg',
  phone TEXT,
  is_email_verified INTEGER NOT NULL DEFAULT 0,
  is_phone_verified INTEGER NOT NULL DEFAULT 0,
  is_seller INTEGER NOT NULL DEFAULT 0,
  is_admin INTEGER NOT NULL DEFAULT 0,
  is_suspended INTEGER NOT NULL DEFAULT 0,
  suspended_reason TEXT,
  last_login_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS users_email_idx ON users(email);
CREATE INDEX IF NOT EXISTS users_username_idx ON users(username);
CREATE INDEX IF NOT EXISTS users_is_seller_idx ON users(is_seller);

-- USER ROLES
CREATE TABLE IF NOT EXISTS user_roles (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS user_roles_user_role_unique ON user_roles(user_id, role);
CREATE INDEX IF NOT EXISTS user_roles_user_id_idx ON user_roles(user_id);

-- SELLER PROFILES
CREATE TABLE IF NOT EXISTS seller_profiles (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  professional_title TEXT NOT NULL,
  description TEXT NOT NULL,
  skills TEXT DEFAULT '[]',
  languages TEXT DEFAULT '[]',
  rating INTEGER NOT NULL DEFAULT 0,
  review_count INTEGER NOT NULL DEFAULT 0,
  completed_orders INTEGER NOT NULL DEFAULT 0,
  response_time_minutes INTEGER,
  on_time_delivery_rate INTEGER NOT NULL DEFAULT 10000,
  level INTEGER NOT NULL DEFAULT 1,
  is_verified INTEGER NOT NULL DEFAULT 0,
  verified_at TEXT,
  is_available INTEGER NOT NULL DEFAULT 1,
  vacation_mode INTEGER NOT NULL DEFAULT 0,
  vacation_until TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS seller_profiles_rating_idx ON seller_profiles(rating);
CREATE INDEX IF NOT EXISTS seller_profiles_level_idx ON seller_profiles(level);

-- BANK DETAILS
CREATE TABLE IF NOT EXISTS bank_details (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  bank_name TEXT NOT NULL,
  account_number TEXT NOT NULL,
  branch_code TEXT NOT NULL,
  account_type TEXT NOT NULL,
  account_holder TEXT NOT NULL,
  is_verified INTEGER NOT NULL DEFAULT 0,
  verified_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- REFRESH TOKENS
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS refresh_tokens_user_id_idx ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS refresh_tokens_token_idx ON refresh_tokens(token);

-- SESSIONS
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_agent TEXT,
  ip_address TEXT,
  last_active_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions(user_id);

-- CATEGORIES
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT,
  image TEXT,
  parent_id TEXT REFERENCES categories(id),
  "order" INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS categories_slug_idx ON categories(slug);
CREATE INDEX IF NOT EXISTS categories_parent_id_idx ON categories(parent_id);

-- SERVICES
CREATE TABLE IF NOT EXISTS services (
  id TEXT PRIMARY KEY,
  seller_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id TEXT NOT NULL REFERENCES categories(id),
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT NOT NULL,
  requirements TEXT,
  images TEXT DEFAULT '[]',
  tags TEXT DEFAULT '[]',
  faqs TEXT DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'DRAFT',
  pricing_type TEXT NOT NULL DEFAULT 'ONE_TIME',
  view_count INTEGER NOT NULL DEFAULT 0,
  order_count INTEGER NOT NULL DEFAULT 0,
  is_featured INTEGER NOT NULL DEFAULT 0,
  featured_until TEXT,
  rejection_reason TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS services_seller_id_idx ON services(seller_id);
CREATE INDEX IF NOT EXISTS services_category_id_idx ON services(category_id);
CREATE INDEX IF NOT EXISTS services_status_idx ON services(status);
CREATE UNIQUE INDEX IF NOT EXISTS services_seller_slug_unique ON services(seller_id, slug);

-- SERVICE PACKAGES
CREATE TABLE IF NOT EXISTS service_packages (
  id TEXT PRIMARY KEY,
  service_id TEXT NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  tier TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  price INTEGER NOT NULL,
  delivery_days INTEGER NOT NULL,
  revisions INTEGER NOT NULL DEFAULT 0,
  features TEXT DEFAULT '[]',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS service_packages_service_id_idx ON service_packages(service_id);
CREATE UNIQUE INDEX IF NOT EXISTS service_packages_service_tier_unique ON service_packages(service_id, tier);

-- SUBSCRIPTION TIERS
CREATE TABLE IF NOT EXISTS subscription_tiers (
  id TEXT PRIMARY KEY,
  service_id TEXT REFERENCES services(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  monthly_price INTEGER NOT NULL,
  yearly_price INTEGER,
  commission_rate INTEGER NOT NULL DEFAULT 2000,
  features TEXT DEFAULT '[]',
  limits TEXT DEFAULT '{}',
  is_active INTEGER NOT NULL DEFAULT 1,
  "order" INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- FAVORITES
CREATE TABLE IF NOT EXISTS favorites (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  service_id TEXT NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS favorites_user_service_unique ON favorites(user_id, service_id);
CREATE INDEX IF NOT EXISTS favorites_user_id_idx ON favorites(user_id);

-- ORDERS
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  order_number TEXT NOT NULL UNIQUE,
  buyer_id TEXT NOT NULL REFERENCES users(id),
  seller_id TEXT NOT NULL REFERENCES users(id),
  service_id TEXT NOT NULL REFERENCES services(id),
  package_id TEXT REFERENCES service_packages(id),
  subscription_id TEXT,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  requirements TEXT,
  buyer_notes TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING_PAYMENT',
  price INTEGER NOT NULL,
  service_fee INTEGER NOT NULL DEFAULT 0,
  total_amount INTEGER NOT NULL,
  delivery_days INTEGER NOT NULL,
  revisions_allowed INTEGER NOT NULL DEFAULT 0,
  revisions_used INTEGER NOT NULL DEFAULT 0,
  deadline TEXT,
  started_at TEXT,
  delivered_at TEXT,
  completed_at TEXT,
  cancelled_at TEXT,
  cancellation_reason TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS orders_buyer_id_idx ON orders(buyer_id);
CREATE INDEX IF NOT EXISTS orders_seller_id_idx ON orders(seller_id);
CREATE INDEX IF NOT EXISTS orders_status_idx ON orders(status);
CREATE INDEX IF NOT EXISTS orders_order_number_idx ON orders(order_number);

-- ORDER MILESTONES
CREATE TABLE IF NOT EXISTS order_milestones (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  amount INTEGER NOT NULL,
  due_date TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING',
  "order" INTEGER NOT NULL,
  completed_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS order_milestones_order_id_idx ON order_milestones(order_id);

-- ORDER DELIVERIES
CREATE TABLE IF NOT EXISTS order_deliveries (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  milestone_id TEXT REFERENCES order_milestones(id),
  message TEXT NOT NULL,
  files TEXT DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'PENDING',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS order_deliveries_order_id_idx ON order_deliveries(order_id);

-- ORDER REVISIONS
CREATE TABLE IF NOT EXISTS order_revisions (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  delivery_id TEXT NOT NULL REFERENCES order_deliveries(id),
  message TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS order_revisions_order_id_idx ON order_revisions(order_id);

-- SUBSCRIPTIONS
CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY,
  buyer_id TEXT NOT NULL REFERENCES users(id),
  seller_id TEXT NOT NULL REFERENCES users(id),
  service_id TEXT NOT NULL REFERENCES services(id),
  tier_id TEXT NOT NULL REFERENCES subscription_tiers(id),
  status TEXT NOT NULL DEFAULT 'PENDING',
  billing_interval TEXT NOT NULL DEFAULT 'MONTHLY',
  price INTEGER NOT NULL,
  next_billing_date TEXT,
  cancelled_at TEXT,
  cancel_at_period_end INTEGER NOT NULL DEFAULT 0,
  pause_start TEXT,
  pause_end TEXT,
  trial_end TEXT,
  gateway TEXT NOT NULL,
  gateway_subscription_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS subscriptions_buyer_id_idx ON subscriptions(buyer_id);
CREATE INDEX IF NOT EXISTS subscriptions_seller_id_idx ON subscriptions(seller_id);
CREATE INDEX IF NOT EXISTS subscriptions_status_idx ON subscriptions(status);

-- SUBSCRIPTION PAYMENTS
CREATE TABLE IF NOT EXISTS subscription_payments (
  id TEXT PRIMARY KEY,
  subscription_id TEXT NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  status TEXT NOT NULL,
  billing_period_start TEXT NOT NULL,
  billing_period_end TEXT NOT NULL,
  paid_at TEXT,
  gateway TEXT NOT NULL,
  gateway_payment_id TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS subscription_payments_subscription_id_idx ON subscription_payments(subscription_id);

-- TRANSACTIONS
CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  order_id TEXT REFERENCES orders(id),
  subscription_id TEXT REFERENCES subscriptions(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  type TEXT NOT NULL,
  amount INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'ZAR',
  status TEXT NOT NULL DEFAULT 'PENDING',
  gateway TEXT NOT NULL,
  gateway_transaction_id TEXT,
  gateway_response TEXT,
  metadata TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS transactions_user_id_idx ON transactions(user_id);
CREATE INDEX IF NOT EXISTS transactions_order_id_idx ON transactions(order_id);
CREATE INDEX IF NOT EXISTS transactions_status_idx ON transactions(status);

-- ESCROW HOLDS
CREATE TABLE IF NOT EXISTS escrow_holds (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL UNIQUE REFERENCES orders(id),
  amount INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING',
  held_at TEXT,
  released_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS escrow_holds_status_idx ON escrow_holds(status);

-- SELLER PAYOUTS
CREATE TABLE IF NOT EXISTS seller_payouts (
  id TEXT PRIMARY KEY,
  seller_id TEXT NOT NULL REFERENCES users(id),
  amount INTEGER NOT NULL,
  fee INTEGER NOT NULL DEFAULT 0,
  net_amount INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING',
  bank_details_id TEXT REFERENCES bank_details(id),
  processed_at TEXT,
  failed_reason TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS seller_payouts_seller_id_idx ON seller_payouts(seller_id);
CREATE INDEX IF NOT EXISTS seller_payouts_status_idx ON seller_payouts(status);

-- REFUNDS
CREATE TABLE IF NOT EXISTS refunds (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id),
  transaction_id TEXT REFERENCES transactions(id),
  amount INTEGER NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING',
  processed_at TEXT,
  gateway_refund_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS refunds_order_id_idx ON refunds(order_id);

-- DISPUTES
CREATE TABLE IF NOT EXISTS disputes (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL UNIQUE REFERENCES orders(id),
  initiated_by TEXT NOT NULL REFERENCES users(id),
  reason TEXT NOT NULL,
  description TEXT NOT NULL,
  evidence TEXT DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'OPEN',
  resolution TEXT,
  resolved_at TEXT,
  resolver_id TEXT REFERENCES users(id),
  refund_amount INTEGER,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS disputes_status_idx ON disputes(status);

-- CONVERSATIONS
CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  buyer_id TEXT NOT NULL REFERENCES users(id),
  seller_id TEXT NOT NULL REFERENCES users(id),
  order_id TEXT REFERENCES orders(id),
  subject TEXT,
  status TEXT NOT NULL DEFAULT 'OPEN',
  priority TEXT NOT NULL DEFAULT 'NORMAL',
  stage_id TEXT,
  assigned_to TEXT,
  is_starred INTEGER NOT NULL DEFAULT 0,
  is_archived INTEGER NOT NULL DEFAULT 0,
  unread_buyer INTEGER NOT NULL DEFAULT 0,
  unread_seller INTEGER NOT NULL DEFAULT 0,
  last_message_at TEXT,
  last_message_preview TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS conversations_buyer_id_idx ON conversations(buyer_id);
CREATE INDEX IF NOT EXISTS conversations_seller_id_idx ON conversations(seller_id);
CREATE INDEX IF NOT EXISTS conversations_status_idx ON conversations(status);

-- MESSAGES
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id TEXT NOT NULL REFERENCES users(id),
  type TEXT NOT NULL DEFAULT 'TEXT',
  content TEXT NOT NULL,
  attachments TEXT DEFAULT '[]',
  metadata TEXT,
  is_read INTEGER NOT NULL DEFAULT 0,
  read_at TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS messages_conversation_id_idx ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS messages_sender_id_idx ON messages(sender_id);

-- PIPELINE STAGES
CREATE TABLE IF NOT EXISTS pipeline_stages (
  id TEXT PRIMARY KEY,
  seller_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#6B7280',
  "order" INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- LABELS
CREATE TABLE IF NOT EXISTS labels (
  id TEXT PRIMARY KEY,
  seller_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#6B7280',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- CONVERSATION LABELS
CREATE TABLE IF NOT EXISTS conversation_labels (
  conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  label_id TEXT NOT NULL REFERENCES labels(id) ON DELETE CASCADE,
  PRIMARY KEY (conversation_id, label_id)
);

-- SAVED REPLIES
CREATE TABLE IF NOT EXISTS saved_replies (
  id TEXT PRIMARY KEY,
  seller_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  shortcut TEXT,
  use_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS saved_replies_seller_id_idx ON saved_replies(seller_id);

-- AUTO TRIGGERS
CREATE TABLE IF NOT EXISTS auto_triggers (
  id TEXT PRIMARY KEY,
  seller_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  trigger_type TEXT NOT NULL,
  conditions TEXT DEFAULT '{}',
  action_type TEXT NOT NULL,
  action_data TEXT DEFAULT '{}',
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- CONVERSATION NOTES
CREATE TABLE IF NOT EXISTS conversation_notes (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  author_id TEXT NOT NULL REFERENCES users(id),
  content TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS conversation_notes_conversation_id_idx ON conversation_notes(conversation_id);

-- ACTIVITIES
CREATE TABLE IF NOT EXISTS activities (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  action TEXT NOT NULL,
  details TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS activities_entity_idx ON activities(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS activities_user_id_idx ON activities(user_id);

-- REVIEWS
CREATE TABLE IF NOT EXISTS reviews (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL UNIQUE REFERENCES orders(id),
  buyer_id TEXT NOT NULL REFERENCES users(id),
  seller_id TEXT NOT NULL REFERENCES users(id),
  service_id TEXT NOT NULL REFERENCES services(id),
  rating INTEGER NOT NULL,
  communication_rating INTEGER,
  service_rating INTEGER,
  recommendation_rating INTEGER,
  comment TEXT,
  seller_response TEXT,
  seller_responded_at TEXT,
  is_public INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS reviews_seller_id_idx ON reviews(seller_id);
CREATE INDEX IF NOT EXISTS reviews_service_id_idx ON reviews(service_id);

-- NOTIFICATIONS
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  link TEXT,
  data TEXT,
  is_read INTEGER NOT NULL DEFAULT 0,
  read_at TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS notifications_user_id_idx ON notifications(user_id);
CREATE INDEX IF NOT EXISTS notifications_unread_idx ON notifications(user_id, is_read);

-- CONVERSATION METRICS (for CRM analytics)
CREATE TABLE IF NOT EXISTS conversation_metrics (
  id TEXT PRIMARY KEY,
  seller_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  total_conversations INTEGER NOT NULL DEFAULT 0,
  new_conversations INTEGER NOT NULL DEFAULT 0,
  resolved_conversations INTEGER NOT NULL DEFAULT 0,
  avg_response_time_minutes INTEGER,
  avg_resolution_time_minutes INTEGER,
  messages_sent INTEGER NOT NULL DEFAULT 0,
  messages_received INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS conversation_metrics_seller_date_unique ON conversation_metrics(seller_id, date);

-- SELLER METRICS
CREATE TABLE IF NOT EXISTS seller_metrics (
  id TEXT PRIMARY KEY,
  seller_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  revenue INTEGER NOT NULL DEFAULT 0,
  orders_received INTEGER NOT NULL DEFAULT 0,
  orders_completed INTEGER NOT NULL DEFAULT 0,
  orders_cancelled INTEGER NOT NULL DEFAULT 0,
  avg_rating INTEGER,
  reviews_received INTEGER NOT NULL DEFAULT 0,
  profile_views INTEGER NOT NULL DEFAULT 0,
  service_views INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS seller_metrics_seller_date_unique ON seller_metrics(seller_id, date);
