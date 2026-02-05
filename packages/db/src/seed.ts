/**
 * D1 Database Seed Script
 * Run with: npx wrangler d1 execute zomieks-db --file=./packages/db/seed.sql
 * 
 * This file generates the SQL for seeding initial data
 */

import { createId } from '@paralleldrive/cuid2';

// Generate seed SQL
export function generateSeedSQL(): string {
  const now = new Date().toISOString();
  
  // Categories
  const categories = [
    { id: createId(), name: 'Graphics & Design', slug: 'graphics-design', description: 'Logos, brand identity, illustrations, and more', icon: 'palette', order: 1 },
    { id: createId(), name: 'Digital Marketing', slug: 'digital-marketing', description: 'SEO, social media, email marketing, and ads', icon: 'trending-up', order: 2 },
    { id: createId(), name: 'Writing & Translation', slug: 'writing-translation', description: 'Content writing, copywriting, and translation services', icon: 'file-text', order: 3 },
    { id: createId(), name: 'Video & Animation', slug: 'video-animation', description: 'Video editing, animation, and motion graphics', icon: 'video', order: 4 },
    { id: createId(), name: 'Music & Audio', slug: 'music-audio', description: 'Music production, voice over, and audio editing', icon: 'music', order: 5 },
    { id: createId(), name: 'Programming & Tech', slug: 'programming-tech', description: 'Web, mobile, and software development', icon: 'code', order: 6 },
    { id: createId(), name: 'Business', slug: 'business', description: 'Virtual assistance, market research, and business plans', icon: 'briefcase', order: 7 },
    { id: createId(), name: 'Data', slug: 'data', description: 'Data entry, data analysis, and data visualization', icon: 'database', order: 8 },
    { id: createId(), name: 'Photography', slug: 'photography', description: 'Product photography, photo editing, and retouching', icon: 'camera', order: 9 },
    { id: createId(), name: 'Lifestyle', slug: 'lifestyle', description: 'Online tutoring, fitness, and wellness coaching', icon: 'heart', order: 10 },
  ];

  // Subscription Tiers
  const tiers = [
    { 
      id: createId(), 
      name: 'Starter', 
      slug: 'starter',
      description: 'Perfect for new sellers getting started',
      monthlyPrice: 0, // Free tier
      yearlyPrice: 0,
      commissionRate: 2000, // 20%
      features: JSON.stringify(['5 active services', 'Basic analytics', 'Standard support', '14-day payout']),
      limits: JSON.stringify({ maxServices: 5, maxImages: 3, maxPackages: 2 }),
      isActive: true,
      order: 1
    },
    { 
      id: createId(), 
      name: 'Professional', 
      slug: 'professional',
      description: 'For established sellers scaling their business',
      monthlyPrice: 29900, // R299/month
      yearlyPrice: 299900, // R2999/year (2 months free)
      commissionRate: 1500, // 15%
      features: JSON.stringify(['20 active services', 'Advanced analytics', 'Priority support', '7-day payout', 'Featured badge', 'Custom offers']),
      limits: JSON.stringify({ maxServices: 20, maxImages: 10, maxPackages: 3 }),
      isActive: true,
      order: 2
    },
    { 
      id: createId(), 
      name: 'Business', 
      slug: 'business',
      description: 'For power sellers and agencies',
      monthlyPrice: 79900, // R799/month
      yearlyPrice: 799900, // R7999/year (2 months free)
      commissionRate: 1000, // 10%
      features: JSON.stringify(['Unlimited services', 'Full analytics suite', 'Dedicated support', '3-day payout', 'Top seller badge', 'Custom offers', 'API access', 'Team accounts']),
      limits: JSON.stringify({ maxServices: -1, maxImages: 20, maxPackages: 5 }),
      isActive: true,
      order: 3
    },
  ];

  // Admin user (you should change the password hash after first login)
  const adminId = createId();
  const adminRoleId = createId();
  
  // Password hash for 'admin123' - CHANGE THIS IN PRODUCTION
  // This is a placeholder - you'll need to generate a real hash
  const adminPasswordPlaceholder = 'CHANGE_ME_AFTER_FIRST_RUN';

  let sql = `-- Zomieks D1 Seed Data
-- Generated: ${now}
-- 
-- IMPORTANT: Run the schema migration first!
-- npx wrangler d1 migrations apply zomieks-db
--
-- Then run this seed:
-- npx wrangler d1 execute zomieks-db --file=./seed.sql

-- Categories
`;

  for (const cat of categories) {
    sql += `INSERT INTO categories (id, name, slug, description, icon, "order", is_active, created_at, updated_at) VALUES ('${cat.id}', '${cat.name}', '${cat.slug}', '${cat.description}', '${cat.icon}', ${cat.order}, 1, '${now}', '${now}');\n`;
  }

  sql += `\n-- Subscription Tiers\n`;

  for (const tier of tiers) {
    sql += `INSERT INTO subscription_tiers (id, name, slug, description, monthly_price, yearly_price, commission_rate, features, limits, is_active, "order", created_at, updated_at) VALUES ('${tier.id}', '${tier.name}', '${tier.slug}', '${tier.description}', ${tier.monthlyPrice}, ${tier.yearlyPrice}, ${tier.commissionRate}, '${tier.features}', '${tier.limits}', ${tier.isActive ? 1 : 0}, ${tier.order}, '${now}', '${now}');\n`;
  }

  sql += `
-- Admin User (password: admin123 - CHANGE IMMEDIATELY)
-- NOTE: You must generate a proper password hash and update this user
-- Use the /api/auth/register endpoint to create a real admin, then update role

INSERT INTO users (id, email, password_hash, first_name, last_name, role, is_email_verified, created_at, updated_at) VALUES ('${adminId}', 'admin@zomieks.co.za', '${adminPasswordPlaceholder}', 'Admin', 'User', 'ADMIN', 1, '${now}', '${now}');

INSERT INTO user_roles (id, user_id, role, created_at) VALUES ('${adminRoleId}', '${adminId}', 'ADMIN', '${now}');

-- Pipeline Stages (for CRM)
INSERT INTO pipeline_stages (id, name, slug, color, "order", created_at, updated_at) VALUES ('${createId()}', 'New Lead', 'new-lead', '#3B82F6', 1, '${now}', '${now}');
INSERT INTO pipeline_stages (id, name, slug, color, "order", created_at, updated_at) VALUES ('${createId()}', 'Qualified', 'qualified', '#10B981', 2, '${now}', '${now}');
INSERT INTO pipeline_stages (id, name, slug, color, "order", created_at, updated_at) VALUES ('${createId()}', 'Proposal Sent', 'proposal-sent', '#F59E0B', 3, '${now}', '${now}');
INSERT INTO pipeline_stages (id, name, slug, color, "order", created_at, updated_at) VALUES ('${createId()}', 'Negotiation', 'negotiation', '#8B5CF6', 4, '${now}', '${now}');
INSERT INTO pipeline_stages (id, name, slug, color, "order", created_at, updated_at) VALUES ('${createId()}', 'Won', 'won', '#22C55E', 5, '${now}', '${now}');
INSERT INTO pipeline_stages (id, name, slug, color, "order", created_at, updated_at) VALUES ('${createId()}', 'Lost', 'lost', '#EF4444', 6, '${now}', '${now}');

-- Default Labels
INSERT INTO labels (id, name, color, created_at, updated_at) VALUES ('${createId()}', 'Urgent', '#EF4444', '${now}', '${now}');
INSERT INTO labels (id, name, color, created_at, updated_at) VALUES ('${createId()}', 'VIP', '#F59E0B', '${now}', '${now}');
INSERT INTO labels (id, name, color, created_at, updated_at) VALUES ('${createId()}', 'New Customer', '#3B82F6', '${now}', '${now}');
INSERT INTO labels (id, name, color, created_at, updated_at) VALUES ('${createId()}', 'Returning', '#10B981', '${now}', '${now}');
INSERT INTO labels (id, name, color, created_at, updated_at) VALUES ('${createId()}', 'Follow Up', '#8B5CF6', '${now}', '${now}');
`;

  return sql;
}

// Run if executed directly
if (typeof process !== 'undefined' && process.argv[2] === '--generate') {
  console.log(generateSeedSQL());
}
