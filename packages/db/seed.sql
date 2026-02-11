-- Zomieks D1 Seed Data
-- 
-- Run schema migration first:
-- npx wrangler d1 migrations apply zomieks-db --local
--
-- Then run this seed:
-- npx wrangler d1 execute zomieks-db --local --file=./packages/db/seed.sql
--
-- For production:
-- npx wrangler d1 execute zomieks-db --file=./packages/db/seed.sql

-- Categories
INSERT INTO categories (id, name, slug, description, icon, "order", is_active, created_at, updated_at) VALUES 
('cat_graphics', 'Graphics & Design', 'graphics-design', 'Logos, brand identity, illustrations, and more', 'palette', 1, 1, datetime('now'), datetime('now')),
('cat_marketing', 'Digital Marketing', 'digital-marketing', 'SEO, social media, email marketing, and ads', 'trending-up', 2, 1, datetime('now'), datetime('now')),
('cat_writing', 'Writing & Translation', 'writing-translation', 'Content writing, copywriting, and translation services', 'file-text', 3, 1, datetime('now'), datetime('now')),
('cat_video', 'Video & Animation', 'video-animation', 'Video editing, animation, and motion graphics', 'video', 4, 1, datetime('now'), datetime('now')),
('cat_music', 'Music & Audio', 'music-audio', 'Music production, voice over, and audio editing', 'music', 5, 1, datetime('now'), datetime('now')),
('cat_programming', 'Programming & Tech', 'programming-tech', 'Web, mobile, and software development', 'code', 6, 1, datetime('now'), datetime('now')),
('cat_business', 'Business', 'business', 'Virtual assistance, market research, and business plans', 'briefcase', 7, 1, datetime('now'), datetime('now')),
('cat_data', 'Data', 'data', 'Data entry, data analysis, and data visualization', 'database', 8, 1, datetime('now'), datetime('now')),
('cat_photo', 'Photography', 'photography', 'Product photography, photo editing, and retouching', 'camera', 9, 1, datetime('now'), datetime('now')),
('cat_lifestyle', 'Lifestyle', 'lifestyle', 'Online tutoring, fitness, and wellness coaching', 'heart', 10, 1, datetime('now'), datetime('now'));

-- Default Fee Policy (ZAR)
INSERT INTO fee_policy (id, name, is_active, buyer_platform_pct, buyer_platform_min, buyer_processing_min, seller_tiers, buffer_pct, buffer_fixed, vat_pct, reserve_days, payout_minimum, created_at, updated_at) VALUES 
('fee_default', 'Default ZAR Policy', 1, 300, 500, 200, '[{"maxAmount":50000,"pct":800,"min":500},{"maxAmount":null,"pct":800,"min":500}]', 20, 50, 1500, 7, 5000, datetime('now'), datetime('now'));

-- Note: subscription_tiers, pipeline_stages, and labels are user-scoped
-- and are created per-user/per-service at runtime.

-- Note: Admin user should be created via the /api/auth/register endpoint
-- Then update their role to ADMIN using:
-- UPDATE users SET role = 'ADMIN' WHERE email = 'your-admin@email.com';
-- INSERT INTO user_roles (id, user_id, role, created_at) SELECT 'role_' || id, id, 'ADMIN', datetime('now') FROM users WHERE email = 'your-admin@email.com';
