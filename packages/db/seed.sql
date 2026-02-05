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

-- Subscription Tiers (prices in cents ZAR)
INSERT INTO subscription_tiers (id, name, slug, description, monthly_price, yearly_price, commission_rate, features, limits, is_active, "order", created_at, updated_at) VALUES 
('tier_starter', 'Starter', 'starter', 'Perfect for new sellers getting started', 0, 0, 2000, '["5 active services","Basic analytics","Standard support","14-day payout"]', '{"maxServices":5,"maxImages":3,"maxPackages":2}', 1, 1, datetime('now'), datetime('now')),
('tier_professional', 'Professional', 'professional', 'For established sellers scaling their business', 29900, 299900, 1500, '["20 active services","Advanced analytics","Priority support","7-day payout","Featured badge","Custom offers"]', '{"maxServices":20,"maxImages":10,"maxPackages":3}', 1, 2, datetime('now'), datetime('now')),
('tier_business', 'Business', 'business', 'For power sellers and agencies', 79900, 799900, 1000, '["Unlimited services","Full analytics suite","Dedicated support","3-day payout","Top seller badge","Custom offers","API access","Team accounts"]', '{"maxServices":-1,"maxImages":20,"maxPackages":5}', 1, 3, datetime('now'), datetime('now'));

-- Pipeline Stages (for CRM)
INSERT INTO pipeline_stages (id, name, slug, color, "order", created_at, updated_at) VALUES 
('stage_new', 'New Lead', 'new-lead', '#3B82F6', 1, datetime('now'), datetime('now')),
('stage_qualified', 'Qualified', 'qualified', '#10B981', 2, datetime('now'), datetime('now')),
('stage_proposal', 'Proposal Sent', 'proposal-sent', '#F59E0B', 3, datetime('now'), datetime('now')),
('stage_negotiation', 'Negotiation', 'negotiation', '#8B5CF6', 4, datetime('now'), datetime('now')),
('stage_won', 'Won', 'won', '#22C55E', 5, datetime('now'), datetime('now')),
('stage_lost', 'Lost', 'lost', '#EF4444', 6, datetime('now'), datetime('now'));

-- Default Labels
INSERT INTO labels (id, name, color, created_at, updated_at) VALUES 
('label_urgent', 'Urgent', '#EF4444', datetime('now'), datetime('now')),
('label_vip', 'VIP', '#F59E0B', datetime('now'), datetime('now')),
('label_new', 'New Customer', '#3B82F6', datetime('now'), datetime('now')),
('label_returning', 'Returning', '#10B981', datetime('now'), datetime('now')),
('label_followup', 'Follow Up', '#8B5CF6', datetime('now'), datetime('now'));

-- Note: Admin user should be created via the /api/auth/register endpoint
-- Then update their role to ADMIN using:
-- UPDATE users SET role = 'ADMIN' WHERE email = 'your-admin@email.com';
-- INSERT INTO user_roles (id, user_id, role, created_at) SELECT 'role_' || id, id, 'ADMIN', datetime('now') FROM users WHERE email = 'your-admin@email.com';
