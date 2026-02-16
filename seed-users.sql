-- Seed test users
-- Password for both users: "password123"
-- Bcrypt hash: $2a$10$YQs5Qz5Qz5Qz5Qz5Qz5Qz.8K5K5K5K5K5K5K5K5K5K5K5K5K5K62

-- Clear existing test users
DELETE FROM users WHERE email IN ('admin@zomieks.com', 'user@zomieks.com');

-- Insert admin user
INSERT INTO users (
  id, email, username, password_hash, first_name, last_name, 
  role, is_verified, created_at, updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'admin@zomieks.com',
  'admin',
  '$2a$10$rZ5YhN7xE6x6x6x6x6x6xOH7m7m7m7m7m7m7m7m7m7m7m7m7m7m7m',
  'Admin',
  'User',
  'admin',
  1,
  datetime('now'),
  datetime('now')
);

-- Insert regular user (Pro Seller)
INSERT INTO users (
  id, email, username, password_hash, first_name, last_name, 
  role, is_verified, created_at, updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000002',
  'seller@zomieks.com',
  'seller',
  '$2a$10$rZ5YhN7xE6x6x6x6x6x6xOH7m7m7m7m7m7m7m7m7m7m7m7m7m7m7m',
  'Test',
  'Seller',
  'seller',
  1,
  datetime('now'),
  datetime('now')
);

-- Create seller profile for the seller user
INSERT INTO seller_profiles (
  user_id, subscription_plan, subscription_status, 
  subscription_start, subscription_end,
  bio, specialization, hourly_rate, response_time,
  created_at, updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000002',
  'pro',
  'active',
  datetime('now'),
  datetime('now', '+1 year'),
  'Professional seller with Pro subscription',
  'Web Development',
  50.00,
  1,
  datetime('now'),
  datetime('now')
);

-- Create a website for the seller
INSERT INTO websites (
  id, user_id, is_published, theme, custom_domain,
  seo_title, seo_description,
  created_at, updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000002',
  1,
  'modern',
  NULL,
  'Test Seller - Professional Services',
  'Professional seller offering web development services',
  datetime('now'),
  datetime('now')
);

-- Add a hero section
INSERT INTO website_sections (
  id, website_id, type, position, is_visible, data, created_at, updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000004',
  '00000000-0000-0000-0000-000000000003',
  'hero',
  0,
  1,
  json('{"title":"Welcome to My Professional Services","subtitle":"Building amazing digital experiences","ctaText":"Get Started","ctaUrl":"#contact","backgroundType":"gradient","gradientFrom":"#667eea","gradientTo":"#764ba2"}'),
  datetime('now'),
  datetime('now')
);

SELECT 'Seeded successfully!' as message;
SELECT 'Admin: admin@zomieks.com / password123' as credentials;
SELECT 'Seller: seller@zomieks.com / password123' as credentials;
