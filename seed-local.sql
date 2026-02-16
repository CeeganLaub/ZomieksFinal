-- Seed test users for local development
-- Password: Password123 (bcrypt hash below)

-- Clean up existing test data (order matters for FK constraints)
DELETE FROM website_sections WHERE website_id IN (SELECT id FROM websites WHERE seller_profile_id IN (SELECT id FROM seller_profiles WHERE user_id IN ('seed-admin-001', 'seed-seller-001')));
DELETE FROM websites WHERE seller_profile_id IN (SELECT id FROM seller_profiles WHERE user_id IN ('seed-admin-001', 'seed-seller-001'));
DELETE FROM seller_subscriptions WHERE seller_profile_id IN (SELECT id FROM seller_profiles WHERE user_id IN ('seed-admin-001', 'seed-seller-001'));
DELETE FROM seller_profiles WHERE user_id IN ('seed-admin-001', 'seed-seller-001');
DELETE FROM user_roles WHERE user_id IN ('seed-admin-001', 'seed-seller-001');
DELETE FROM users WHERE id IN ('seed-admin-001', 'seed-seller-001');

-- ADMIN USER
INSERT INTO users (id, email, username, password_hash, first_name, last_name, is_email_verified, is_seller, is_admin, created_at, updated_at)
VALUES ('seed-admin-001', 'admin@zomieks.com', 'admin', '$2a$10$uVqa.1vNdR9WCxNMBlbfS.e4vel98hAX1EvW10/.FOypX30Z4RdyW', 'Admin', 'User', 1, 0, 1, datetime('now'), datetime('now'));

INSERT INTO user_roles (id, user_id, role, created_at)
VALUES ('seed-role-admin', 'seed-admin-001', 'admin', datetime('now'));

-- PRO SELLER USER
INSERT INTO users (id, email, username, password_hash, first_name, last_name, is_email_verified, is_seller, is_admin, created_at, updated_at)
VALUES ('seed-seller-001', 'seller@zomieks.com', 'seller', '$2a$10$uVqa.1vNdR9WCxNMBlbfS.e4vel98hAX1EvW10/.FOypX30Z4RdyW', 'Test', 'Seller', 1, 1, 0, datetime('now'), datetime('now'));

INSERT INTO user_roles (id, user_id, role, created_at)
VALUES ('seed-role-seller', 'seed-seller-001', 'seller', datetime('now'));

-- Seller profile
INSERT INTO seller_profiles (id, user_id, display_name, professional_title, description, skills, languages, rating, review_count, completed_orders, level, is_verified, created_at, updated_at)
VALUES ('seed-sp-001', 'seed-seller-001', 'Test Seller', 'Pro Web Developer', 'Professional seller with Pro subscription for testing', '["Web Development","React","Node.js"]', '["English"]', 4800, 12, 25, 2, 1, datetime('now'), datetime('now'));

-- Active Pro subscription (required for website builder access)
INSERT INTO seller_subscriptions (id, seller_profile_id, status, current_period_start, current_period_end, next_billing_date, cancel_at_period_end, created_at, updated_at)
VALUES ('seed-sub-001', 'seed-sp-001', 'ACTIVE', datetime('now'), datetime('now', '+1 year'), datetime('now', '+1 month'), 0, datetime('now'), datetime('now'));
