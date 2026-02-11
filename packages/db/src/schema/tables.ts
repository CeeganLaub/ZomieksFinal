// Drizzle Schema for Zomieks - Freelance Marketplace Platform
// Converted from Prisma for D1 (SQLite) compatibility

import { sqliteTable, text, integer, real, primaryKey, uniqueIndex, index } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';

// Helper for default cuid
const cuid = () => createId();

// ============ ENUMS (as string literals for SQLite) ============

export const roles = ['BUYER', 'SELLER', 'ADMIN', 'MODERATOR', 'SUPPORT', 'FINANCE', 'SUPER_ADMIN'] as const;
export type Role = typeof roles[number];

export const accountTypes = ['SAVINGS', 'CURRENT', 'TRANSMISSION'] as const;
export type AccountType = typeof accountTypes[number];

export const pricingTypes = ['ONE_TIME', 'SUBSCRIPTION', 'BOTH'] as const;
export type PricingType = typeof pricingTypes[number];

export const serviceStatuses = ['DRAFT', 'PENDING_REVIEW', 'ACTIVE', 'REJECTED', 'PAUSED'] as const;
export type ServiceStatus = typeof serviceStatuses[number];

export const packageTiers = ['BASIC', 'STANDARD', 'PREMIUM'] as const;
export type PackageTier = typeof packageTiers[number];

export const billingIntervals = ['MONTHLY', 'QUARTERLY', 'YEARLY'] as const;
export type BillingInterval = typeof billingIntervals[number];

export const orderStatuses = ['PENDING_PAYMENT', 'PAID', 'IN_PROGRESS', 'DELIVERED', 'REVISION_REQUESTED', 'COMPLETED', 'CANCELLED', 'DISPUTED'] as const;
export type OrderStatus = typeof orderStatuses[number];

export const milestoneStatuses = ['PENDING', 'IN_PROGRESS', 'DELIVERED', 'APPROVED', 'DISPUTED'] as const;
export type MilestoneStatus = typeof milestoneStatuses[number];

export const deliveryStatuses = ['PENDING', 'ACCEPTED', 'REVISION_REQUESTED'] as const;
export type DeliveryStatus = typeof deliveryStatuses[number];

export const subscriptionStatuses = ['PENDING', 'ACTIVE', 'PAUSED', 'PAST_DUE', 'CANCELLED', 'EXPIRED'] as const;
export type SubscriptionStatus = typeof subscriptionStatuses[number];

export const paymentGateways = ['PAYFAST', 'OZOW'] as const;
export type PaymentGateway = typeof paymentGateways[number];

export const transactionStatuses = ['PENDING', 'COMPLETED', 'FAILED', 'REFUNDED', 'PARTIALLY_REFUNDED'] as const;
export type TransactionStatus = typeof transactionStatuses[number];

export const transactionTypes = ['PAYMENT', 'REFUND', 'PAYOUT', 'ADJUSTMENT'] as const;
export type TransactionType = typeof transactionTypes[number];

export const paymentMethods = ['CARD', 'EFT', 'UNKNOWN'] as const;
export type PaymentMethod = typeof paymentMethods[number];

export const escrowStatuses = ['PENDING', 'HELD', 'RELEASED', 'REFUNDED', 'DISPUTED'] as const;
export type EscrowStatus = typeof escrowStatuses[number];

export const payoutStatuses = ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'] as const;
export type PayoutStatus = typeof payoutStatuses[number];

export const refundStatuses = ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'] as const;
export type RefundStatus = typeof refundStatuses[number];

export const disputeStatuses = ['OPEN', 'UNDER_REVIEW', 'RESOLVED_BUYER', 'RESOLVED_SELLER', 'RESOLVED_SPLIT', 'CLOSED'] as const;
export type DisputeStatus = typeof disputeStatuses[number];

export const conversationStatuses = ['OPEN', 'PENDING', 'RESOLVED', 'SPAM'] as const;
export type ConversationStatus = typeof conversationStatuses[number];

export const priorities = ['LOW', 'NORMAL', 'HIGH', 'URGENT'] as const;
export type Priority = typeof priorities[number];

export const messageTypes = ['TEXT', 'IMAGE', 'FILE', 'SYSTEM', 'ORDER_UPDATE', 'QUICK_OFFER'] as const;
export type MessageType = typeof messageTypes[number];

export const triggerTypes = ['NEW_CONVERSATION', 'KEYWORD', 'INACTIVITY', 'STAGE_CHANGE', 'SCHEDULED'] as const;
export type TriggerType = typeof triggerTypes[number];

export const actionTypes = ['SEND_MESSAGE', 'CHANGE_STAGE', 'ADD_LABEL', 'NOTIFY'] as const;
export type ActionType = typeof actionTypes[number];

export const sellerSubscriptionStatuses = ['PENDING', 'ACTIVE', 'PAST_DUE', 'CANCELLED', 'EXPIRED'] as const;
export type SellerSubscriptionStatus = typeof sellerSubscriptionStatuses[number];

export const courseLevels = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'ALL_LEVELS'] as const;
export type CourseLevel = typeof courseLevels[number];

export const courseStatuses = ['DRAFT', 'PUBLISHED', 'ARCHIVED'] as const;
export type CourseStatus = typeof courseStatuses[number];

export const kycStatuses = ['PENDING', 'SUBMITTED', 'VERIFIED', 'REJECTED'] as const;
export type KycStatus = typeof kycStatuses[number];

// ============ USER MODELS ============

export const users = sqliteTable('users', {
  id: text('id').primaryKey().$defaultFn(cuid),
  email: text('email').notNull().unique(),
  username: text('username').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  avatar: text('avatar'),
  bio: text('bio'),
  country: text('country'),
  timezone: text('timezone').default('Africa/Johannesburg'),
  phone: text('phone'),

  // Balance (in cents)
  creditBalance: integer('credit_balance').default(0).notNull(),

  // Status
  isEmailVerified: integer('is_email_verified', { mode: 'boolean' }).default(false).notNull(),
  isPhoneVerified: integer('is_phone_verified', { mode: 'boolean' }).default(false).notNull(),
  isSeller: integer('is_seller', { mode: 'boolean' }).default(false).notNull(),
  isAdmin: integer('is_admin', { mode: 'boolean' }).default(false).notNull(),
  isAdminCreated: integer('is_admin_created', { mode: 'boolean' }).default(false).notNull(),
  isSuspended: integer('is_suspended', { mode: 'boolean' }).default(false).notNull(),
  suspendedReason: text('suspended_reason'),

  // Timestamps (stored as ISO strings)
  lastLoginAt: text('last_login_at'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  emailIdx: index('users_email_idx').on(table.email),
  usernameIdx: index('users_username_idx').on(table.username),
  isSellerIdx: index('users_is_seller_idx').on(table.isSeller),
}));

export const userRoles = sqliteTable('user_roles', {
  id: text('id').primaryKey().$defaultFn(cuid),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: text('role').$type<Role>().notNull(),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  userRoleUnique: uniqueIndex('user_roles_user_role_unique').on(table.userId, table.role),
  userIdIdx: index('user_roles_user_id_idx').on(table.userId),
}));

export const sellerProfiles = sqliteTable('seller_profiles', {
  id: text('id').primaryKey().$defaultFn(cuid),
  userId: text('user_id').notNull().unique().references(() => users.id, { onDelete: 'cascade' }),

  displayName: text('display_name').notNull(),
  professionalTitle: text('professional_title').notNull(),
  description: text('description').notNull(),
  skills: text('skills', { mode: 'json' }).$type<string[]>().default([]),
  languages: text('languages', { mode: 'json' }).$type<{ language: string; proficiency: string }[]>().default([]),

  // Stats (using integer for cents/100ths)
  rating: integer('rating').default(0).notNull(), // Store as integer * 100, e.g., 450 = 4.50
  reviewCount: integer('review_count').default(0).notNull(),
  completedOrders: integer('completed_orders').default(0).notNull(),
  responseTimeMinutes: integer('response_time_minutes'),
  onTimeDeliveryRate: integer('on_time_delivery_rate').default(10000).notNull(), // 10000 = 100.00%

  // Level & Verification
  level: integer('level').default(1).notNull(),
  isVerified: integer('is_verified', { mode: 'boolean' }).default(false).notNull(),
  verifiedAt: text('verified_at'),

  // KYC
  idNumber: text('id_number'),
  kycStatus: text('kyc_status').$type<KycStatus>().default('PENDING').notNull(),

  // Seller Fee
  sellerFeePaid: integer('seller_fee_paid', { mode: 'boolean' }).default(false).notNull(),
  sellerFeeTransactionId: text('seller_fee_transaction_id'),
  sellerFeePaidAt: text('seller_fee_paid_at'),

  // Limits
  maxActiveOrders: integer('max_active_orders').default(5).notNull(),
  
  // Balance (in cents) - calculated from escrow/payouts
  balance: integer('balance').default(0).notNull(), // Available to withdraw
  pendingBalance: integer('pending_balance').default(0).notNull(), // In withdrawal process
  escrowBalance: integer('escrow_balance').default(0).notNull(), // Held in escrow

  // Availability
  isAvailable: integer('is_available', { mode: 'boolean' }).default(true).notNull(),
  vacationMode: integer('vacation_mode', { mode: 'boolean' }).default(false).notNull(),
  vacationUntil: text('vacation_until'),

  // Bio/Link Page
  bioHeadline: text('bio_headline'),
  bioThemeColor: text('bio_theme_color').default('#10B981').notNull(),
  bioBackgroundColor: text('bio_background_color').default('#0a0a0a').notNull(),
  bioTextColor: text('bio_text_color').default('#ffffff').notNull(),
  bioButtonStyle: text('bio_button_style').default('rounded').notNull(),
  bioFont: text('bio_font').default('Inter').notNull(),
  bioSocialLinks: text('bio_social_links', { mode: 'json' }).$type<Record<string, string>>(),
  bioFeaturedItems: text('bio_featured_items', { mode: 'json' }).$type<string[]>(),
  bioCtaText: text('bio_cta_text').default('Get in Touch').notNull(),
  bioEnabled: integer('bio_enabled', { mode: 'boolean' }).default(false).notNull(),
  bioTemplate: text('bio_template').default('services-showcase').notNull(),
  bioQuickReplies: text('bio_quick_replies', { mode: 'json' }).$type<string[]>(),
  bioShowTestimonials: integer('bio_show_testimonials', { mode: 'boolean' }).default(true).notNull(),
  bioTestimonialCount: integer('bio_testimonial_count').default(6).notNull(),

  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  ratingIdx: index('seller_profiles_rating_idx').on(table.rating),
  levelIdx: index('seller_profiles_level_idx').on(table.level),
}));

export const bankDetails = sqliteTable('bank_details', {
  id: text('id').primaryKey().$defaultFn(cuid),
  userId: text('user_id').notNull().unique().references(() => users.id, { onDelete: 'cascade' }),

  bankName: text('bank_name').notNull(),
  accountNumber: text('account_number').notNull(),
  branchCode: text('branch_code').notNull(),
  accountType: text('account_type').$type<AccountType>().notNull(),
  accountHolder: text('account_holder').notNull(),

  isDefault: integer('is_default', { mode: 'boolean' }).default(false).notNull(),
  isVerified: integer('is_verified', { mode: 'boolean' }).default(false).notNull(),
  verifiedAt: text('verified_at'),

  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
});

export const refreshTokens = sqliteTable('refresh_tokens', {
  id: text('id').primaryKey().$defaultFn(cuid),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  expiresAt: text('expires_at').notNull(),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  userIdIdx: index('refresh_tokens_user_id_idx').on(table.userId),
  tokenIdx: index('refresh_tokens_token_idx').on(table.token),
}));

export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey().$defaultFn(cuid),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  userAgent: text('user_agent'),
  ipAddress: text('ip_address'),
  lastActiveAt: text('last_active_at').notNull().$defaultFn(() => new Date().toISOString()),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  userIdIdx: index('sessions_user_id_idx').on(table.userId),
}));

// ============ SERVICE MODELS ============

export const categories = sqliteTable('categories', {
  id: text('id').primaryKey().$defaultFn(cuid),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description'),
  icon: text('icon'),
  image: text('image'),
  parentId: text('parent_id'),
  order: integer('order').default(0).notNull(),
  isActive: integer('is_active', { mode: 'boolean' }).default(true).notNull(),

  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  parentIdIdx: index('categories_parent_id_idx').on(table.parentId),
  slugIdx: index('categories_slug_idx').on(table.slug),
}));

export const services = sqliteTable('services', {
  id: text('id').primaryKey().$defaultFn(cuid),
  sellerId: text('seller_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  categoryId: text('category_id').notNull().references(() => categories.id),

  title: text('title').notNull(),
  slug: text('slug').notNull(),
  description: text('description').notNull(),
  pricingType: text('pricing_type').$type<PricingType>().notNull(),

  // Media (JSON arrays)
  images: text('images', { mode: 'json' }).$type<string[]>().default([]),
  video: text('video'),

  // Metadata
  tags: text('tags', { mode: 'json' }).$type<string[]>().default([]),
  faqs: text('faqs', { mode: 'json' }).$type<{ question: string; answer: string }[]>(),
  requirements: text('requirements'),

  // Stats (rating as integer * 100)
  rating: integer('rating').default(0).notNull(),
  reviewCount: integer('review_count').default(0).notNull(),
  orderCount: integer('order_count').default(0).notNull(),
  viewCount: integer('view_count').default(0).notNull(),
  favoriteCount: integer('favorite_count').default(0).notNull(),

  // Status
  status: text('status').$type<ServiceStatus>().default('DRAFT').notNull(),
  isActive: integer('is_active', { mode: 'boolean' }).default(true).notNull(),
  isPaused: integer('is_paused', { mode: 'boolean' }).default(false).notNull(),
  rejectionReason: text('rejection_reason'),

  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  sellerSlugUnique: uniqueIndex('services_seller_slug_unique').on(table.sellerId, table.slug),
  categoryIdIdx: index('services_category_id_idx').on(table.categoryId),
  sellerIdIdx: index('services_seller_id_idx').on(table.sellerId),
  statusIdx: index('services_status_idx').on(table.status),
  ratingIdx: index('services_rating_idx').on(table.rating),
}));

export const servicePackages = sqliteTable('service_packages', {
  id: text('id').primaryKey().$defaultFn(cuid),
  serviceId: text('service_id').notNull().references(() => services.id, { onDelete: 'cascade' }),

  tier: text('tier').$type<PackageTier>().notNull(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  price: integer('price').notNull(), // Store in cents
  deliveryDays: integer('delivery_days').notNull(),
  revisions: integer('revisions').default(0).notNull(),
  features: text('features', { mode: 'json' }).$type<string[]>().default([]),

  isActive: integer('is_active', { mode: 'boolean' }).default(true).notNull(),

  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  serviceTierUnique: uniqueIndex('service_packages_service_tier_unique').on(table.serviceId, table.tier),
  serviceIdIdx: index('service_packages_service_id_idx').on(table.serviceId),
}));

export const subscriptionTiers = sqliteTable('subscription_tiers', {
  id: text('id').primaryKey().$defaultFn(cuid),
  serviceId: text('service_id').notNull().references(() => services.id, { onDelete: 'cascade' }),

  name: text('name').notNull(),
  description: text('description').notNull(),
  price: integer('price').notNull(), // Store in cents
  interval: text('interval').$type<BillingInterval>().notNull(),
  features: text('features', { mode: 'json' }).$type<string[]>().default([]),
  limits: text('limits', { mode: 'json' }).$type<Record<string, number>>(),

  payFastFrequency: integer('payfast_frequency').notNull(),

  isActive: integer('is_active', { mode: 'boolean' }).default(true).notNull(),
  order: integer('order').default(0).notNull(),

  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  serviceNameUnique: uniqueIndex('subscription_tiers_service_name_unique').on(table.serviceId, table.name),
  serviceIdIdx: index('subscription_tiers_service_id_idx').on(table.serviceId),
}));

export const favorites = sqliteTable('favorites', {
  id: text('id').primaryKey().$defaultFn(cuid),
  userId: text('user_id').notNull(),
  serviceId: text('service_id').notNull().references(() => services.id, { onDelete: 'cascade' }),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  userServiceUnique: uniqueIndex('favorites_user_service_unique').on(table.userId, table.serviceId),
  userIdIdx: index('favorites_user_id_idx').on(table.userId),
}));

// ============ ORDER MODELS ============

export const orders = sqliteTable('orders', {
  id: text('id').primaryKey().$defaultFn(cuid),
  orderNumber: text('order_number').notNull().unique(),

  // Parties
  buyerId: text('buyer_id').notNull().references(() => users.id),
  sellerId: text('seller_id').notNull().references(() => users.id),
  serviceId: text('service_id').notNull().references(() => services.id),
  packageId: text('package_id').references(() => servicePackages.id),

  // Pricing (all in cents) - Gateway-aware fee model
  baseAmount: integer('base_amount').notNull(),
  buyerPlatformFee: integer('buyer_platform_fee').notNull().default(0), // Marketplace buyer fee (e.g., 3%)
  buyerProcessingFee: integer('buyer_processing_fee').notNull().default(0), // Covers gateway costs
  sellerPlatformFee: integer('seller_platform_fee').notNull().default(0), // Seller fee (tiered)
  grossAmount: integer('gross_amount').notNull().default(0), // baseAmount + buyerPlatformFee + buyerProcessingFee
  platformRevenue: integer('platform_revenue').notNull().default(0), // buyerPlatformFee + sellerPlatformFee
  sellerPayoutAmount: integer('seller_payout_amount').notNull().default(0), // baseAmount - sellerPlatformFee
  currency: text('currency').default('ZAR').notNull(),
  
  // Payment method info
  gateway: text('gateway').$type<PaymentGateway>(),
  gatewayMethod: text('gateway_method').$type<PaymentMethod>(),
  
  // Legacy fields (deprecated, kept for migration)
  buyerFee: integer('buyer_fee').default(0),
  totalAmount: integer('total_amount').default(0),
  sellerFee: integer('seller_fee').default(0),
  sellerPayout: integer('seller_payout').default(0),

  // Status
  status: text('status').$type<OrderStatus>().default('PENDING_PAYMENT').notNull(),

  // Requirements & Details
  requirements: text('requirements'),
  deliveryDays: integer('delivery_days').notNull(),
  revisions: integer('revisions').default(0).notNull(),
  revisionsUsed: integer('revisions_used').default(0).notNull(),

  // Dates
  paidAt: text('paid_at'),
  startedAt: text('started_at'),
  deliveryDueAt: text('delivery_due_at'),
  deliveredAt: text('delivered_at'),
  completedAt: text('completed_at'),
  cancelledAt: text('cancelled_at'),
  cancelReason: text('cancel_reason'),

  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  buyerIdIdx: index('orders_buyer_id_idx').on(table.buyerId),
  sellerIdIdx: index('orders_seller_id_idx').on(table.sellerId),
  statusIdx: index('orders_status_idx').on(table.status),
  orderNumberIdx: index('orders_order_number_idx').on(table.orderNumber),
}));

export const orderMilestones = sqliteTable('order_milestones', {
  id: text('id').primaryKey().$defaultFn(cuid),
  orderId: text('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),

  name: text('name').notNull(),
  description: text('description').notNull(),
  amount: integer('amount').notNull(), // cents
  orderNum: integer('order_num').notNull(),

  status: text('status').$type<MilestoneStatus>().default('PENDING').notNull(),
  dueAt: text('due_at').notNull(),
  deliveredAt: text('delivered_at'),
  approvedAt: text('approved_at'),

  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  orderIdIdx: index('order_milestones_order_id_idx').on(table.orderId),
}));

export const orderDeliveries = sqliteTable('order_deliveries', {
  id: text('id').primaryKey().$defaultFn(cuid),
  orderId: text('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  milestoneId: text('milestone_id').references(() => orderMilestones.id),

  message: text('message').notNull(),
  attachments: text('attachments', { mode: 'json' }).$type<{ url: string; name: string; size: number; type: string }[]>(),

  status: text('status').$type<DeliveryStatus>().default('PENDING').notNull(),
  deliveredAt: text('delivered_at').notNull().$defaultFn(() => new Date().toISOString()),
  reviewedAt: text('reviewed_at'),

  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  orderIdIdx: index('order_deliveries_order_id_idx').on(table.orderId),
}));

export const orderRevisions = sqliteTable('order_revisions', {
  id: text('id').primaryKey().$defaultFn(cuid),
  orderId: text('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),

  message: text('message').notNull(),
  requestedAt: text('requested_at').notNull().$defaultFn(() => new Date().toISOString()),
  resolvedAt: text('resolved_at'),
}, (table) => ({
  orderIdIdx: index('order_revisions_order_id_idx').on(table.orderId),
}));

// ============ SUBSCRIPTION MODELS ============

export const subscriptions = sqliteTable('subscriptions', {
  id: text('id').primaryKey().$defaultFn(cuid),

  buyerId: text('buyer_id').notNull().references(() => users.id),
  serviceId: text('service_id').notNull().references(() => services.id),
  tierId: text('tier_id').notNull().references(() => subscriptionTiers.id),

  status: text('status').$type<SubscriptionStatus>().default('PENDING').notNull(),

  currentPeriodStart: text('current_period_start').notNull(),
  currentPeriodEnd: text('current_period_end').notNull(),
  nextBillingDate: text('next_billing_date'),

  payFastToken: text('payfast_token').unique(),
  payFastSubscriptionId: text('payfast_subscription_id'),

  cancelAtPeriodEnd: integer('cancel_at_period_end', { mode: 'boolean' }).default(false).notNull(),
  pausedAt: text('paused_at'),
  pauseReason: text('pause_reason'),
  cancelledAt: text('cancelled_at'),
  cancelReason: text('cancel_reason'),

  currentUsage: text('current_usage', { mode: 'json' }),

  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  buyerIdIdx: index('subscriptions_buyer_id_idx').on(table.buyerId),
  serviceIdIdx: index('subscriptions_service_id_idx').on(table.serviceId),
  statusIdx: index('subscriptions_status_idx').on(table.status),
}));

export const subscriptionPayments = sqliteTable('subscription_payments', {
  id: text('id').primaryKey().$defaultFn(cuid),
  subscriptionId: text('subscription_id').notNull().references(() => subscriptions.id, { onDelete: 'cascade' }),

  amount: integer('amount').notNull(), // cents
  buyerFee: integer('buyer_fee').notNull(),
  totalAmount: integer('total_amount').notNull(),
  sellerFee: integer('seller_fee').notNull(),
  sellerPayout: integer('seller_payout').notNull(),
  platformRevenue: integer('platform_revenue').notNull(),

  gateway: text('gateway').$type<PaymentGateway>().notNull(),
  gatewayPaymentId: text('gateway_payment_id').notNull().unique(),

  escrowStatus: text('escrow_status').$type<EscrowStatus>().default('HELD').notNull(),
  releasedAt: text('released_at'),

  periodStart: text('period_start').notNull(),
  periodEnd: text('period_end').notNull(),
  paidAt: text('paid_at').notNull(),

  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  subscriptionIdIdx: index('subscription_payments_subscription_id_idx').on(table.subscriptionId),
}));

// ============ PAYMENT MODELS ============

export const transactions = sqliteTable('transactions', {
  id: text('id').primaryKey().$defaultFn(cuid),
  orderId: text('order_id').references(() => orders.id),
  subscriptionId: text('subscription_id'),
  userId: text('user_id').references(() => users.id),

  // Transaction type and status
  type: text('type').$type<TransactionType>().default('PAYMENT').notNull(),
  status: text('status').$type<TransactionStatus>().default('PENDING').notNull(),

  // Gateway info
  gateway: text('gateway').$type<PaymentGateway>().notNull(),
  gatewayMethod: text('gateway_method').$type<PaymentMethod>(),
  gatewayRef: text('gateway_ref').unique(), // pf_payment_id or ozow ref
  gatewayTransactionId: text('gateway_transaction_id'), // legacy, keep for migration
  gatewayReference: text('gateway_reference'),

  // Amounts (all in cents) - Gateway-aware
  grossAmount: integer('gross_amount').notNull(), // What buyer paid
  gatewayFee: integer('gateway_fee'), // Fee charged by gateway (from ITN)
  netAmount: integer('net_amount'), // grossAmount - gatewayFee (from ITN)
  
  // Fee snapshots (from order at time of payment)
  baseAmount: integer('base_amount'),
  buyerPlatformFee: integer('buyer_platform_fee'),
  buyerProcessingFee: integer('buyer_processing_fee'),
  sellerPlatformFee: integer('seller_platform_fee'),
  platformRevenue: integer('platform_revenue'),
  sellerPayoutAmount: integer('seller_payout_amount'),
  
  currency: text('currency').default('ZAR').notNull(),

  // Raw gateway response
  rawPayload: text('raw_payload', { mode: 'json' }),
  gatewayData: text('gateway_data', { mode: 'json' }), // legacy

  // Legacy fields (deprecated)
  amount: integer('amount'),
  buyerFee: integer('buyer_fee'),
  totalAmount: integer('total_amount'),
  sellerFee: integer('seller_fee'),
  sellerPayout: integer('seller_payout'),

  paidAt: text('paid_at'),
  failedAt: text('failed_at'),
  failedReason: text('failed_reason'),

  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  orderIdIdx: index('transactions_order_id_idx').on(table.orderId),
  statusIdx: index('transactions_status_idx').on(table.status),
  gatewayRefIdx: index('transactions_gateway_ref_idx').on(table.gatewayRef),
}));

export const escrowHolds = sqliteTable('escrow_holds', {
  id: text('id').primaryKey().$defaultFn(cuid),
  transactionId: text('transaction_id').references(() => transactions.id),
  orderId: text('order_id').unique().references(() => orders.id),
  milestoneId: text('milestone_id').unique().references(() => orderMilestones.id),
  subscriptionPaymentId: text('subscription_payment_id').unique().references(() => subscriptionPayments.id),
  enrollmentId: text('enrollment_id').unique(),

  // Amounts from gateway (all in cents)
  grossAmount: integer('gross_amount').notNull(),
  gatewayFee: integer('gateway_fee'),
  netAmount: integer('net_amount'),

  // Fee snapshots (audit trail)
  baseAmount: integer('base_amount'),
  buyerPlatformFee: integer('buyer_platform_fee'),
  buyerProcessingFee: integer('buyer_processing_fee'),
  sellerPlatformFee: integer('seller_platform_fee'),
  platformRevenue: integer('platform_revenue'),
  sellerPayoutAmount: integer('seller_payout_amount'),

  // Legacy fields
  amount: integer('amount'),
  sellerAmount: integer('seller_amount'),

  status: text('status').$type<EscrowStatus>().default('HELD').notNull(),
  holdUntil: text('hold_until'),
  heldAt: text('held_at').$defaultFn(() => new Date().toISOString()),

  releasedAt: text('released_at'),
  refundedAt: text('refunded_at'),

  // Track payout via sellerPayouts.escrowHoldId instead (avoids circular reference)
  payoutId: text('payout_id'),

  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  statusIdx: index('escrow_holds_status_idx').on(table.status),
  transactionIdIdx: index('escrow_holds_transaction_id_idx').on(table.transactionId),
  orderIdIdx: index('escrow_holds_order_id_idx').on(table.orderId),
}));

export const sellerPayouts = sqliteTable('seller_payouts', {
  id: text('id').primaryKey().$defaultFn(cuid),
  sellerId: text('seller_id').notNull().references(() => users.id),
  orderId: text('order_id').references(() => orders.id),
  escrowHoldId: text('escrow_hold_id').references(() => escrowHolds.id),

  amount: integer('amount').notNull(), // cents - what seller gets
  fee: integer('fee').default(0), // any payout fee (if applicable)
  netAmount: integer('net_amount').notNull(), // amount - fee
  currency: text('currency').default('ZAR').notNull(),

  status: text('status').$type<PayoutStatus>().default('PENDING').notNull(),
  
  // Batch payout support
  batchId: text('batch_id'),
  availableAt: text('available_at'), // When funds become available for payout (reserve period)
  externalRef: text('external_ref'), // Bank EFT reference
  
  // Snapshot of bank details at time of payout request
  bankDetailsSnapshot: text('bank_details_snapshot', { mode: 'json' }).$type<{
    bankName: string;
    accountNumber: string;
    branchCode: string;
    accountHolder: string;
    accountType: string;
  }>(),

  bankReference: text('bank_reference'), // legacy
  processedAt: text('processed_at'),
  failedAt: text('failed_at'),
  failedReason: text('failed_reason'),

  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  sellerIdIdx: index('seller_payouts_seller_id_idx').on(table.sellerId),
  statusIdx: index('seller_payouts_status_idx').on(table.status),
  batchIdIdx: index('seller_payouts_batch_id_idx').on(table.batchId),
  availableAtIdx: index('seller_payouts_available_at_idx').on(table.availableAt),
}));

export const refunds = sqliteTable('refunds', {
  id: text('id').primaryKey().$defaultFn(cuid),
  transactionId: text('transaction_id').references(() => transactions.id),

  orderId: text('order_id'),
  enrollmentId: text('enrollment_id'),

  amount: integer('amount').notNull(), // cents
  processingFee: integer('processing_fee').default(0).notNull(), // cents
  reason: text('reason').notNull(),
  refundType: text('refund_type').default('GATEWAY').notNull(), // GATEWAY or CREDIT

  status: text('status').$type<RefundStatus>().default('PENDING').notNull(),

  gatewayRefundId: text('gateway_refund_id'),
  processedAt: text('processed_at'),
  failedReason: text('failed_reason'),

  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  transactionIdIdx: index('refunds_transaction_id_idx').on(table.transactionId),
  orderIdIdx: index('refunds_order_id_idx').on(table.orderId),
  enrollmentIdIdx: index('refunds_enrollment_id_idx').on(table.enrollmentId),
}));

export const disputes = sqliteTable('disputes', {
  id: text('id').primaryKey().$defaultFn(cuid),
  orderId: text('order_id').notNull().unique().references(() => orders.id),

  raisedBy: text('raised_by').notNull(),
  reason: text('reason').notNull(),
  evidence: text('evidence', { mode: 'json' }).$type<{ url: string; description: string }[]>(),

  status: text('status').$type<DisputeStatus>().default('OPEN').notNull(),
  resolution: text('resolution'),
  resolvedBy: text('resolved_by'),
  resolvedAt: text('resolved_at'),

  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  statusIdx: index('disputes_status_idx').on(table.status),
}));

// ============ CONVERSATION/CRM MODELS ============

export const conversations = sqliteTable('conversations', {
  id: text('id').primaryKey().$defaultFn(cuid),

  buyerId: text('buyer_id').notNull().references(() => users.id),
  sellerId: text('seller_id').notNull().references(() => users.id),
  orderId: text('order_id').unique().references(() => orders.id),

  status: text('status').$type<ConversationStatus>().default('OPEN').notNull(),
  leadScore: integer('lead_score').default(0).notNull(),
  priority: text('priority').$type<Priority>().default('NORMAL').notNull(),
  source: text('source'),

  pipelineStageId: text('pipeline_stage_id').references(() => pipelineStages.id),
  dealValue: integer('deal_value'), // cents
  probability: integer('probability'),
  expectedClose: text('expected_close'),

  firstResponseAt: text('first_response_at'),
  lastMessageAt: text('last_message_at'),
  unreadBuyerCount: integer('unread_buyer_count').default(0).notNull(),
  unreadSellerCount: integer('unread_seller_count').default(0).notNull(),

  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  buyerSellerUnique: uniqueIndex('conversations_buyer_seller_unique').on(table.buyerId, table.sellerId),
  sellerStatusIdx: index('conversations_seller_status_idx').on(table.sellerId, table.status),
  pipelineStageIdIdx: index('conversations_pipeline_stage_id_idx').on(table.pipelineStageId),
}));

export const messages = sqliteTable('messages', {
  id: text('id').primaryKey().$defaultFn(cuid),
  conversationId: text('conversation_id').notNull().references(() => conversations.id, { onDelete: 'cascade' }),
  senderId: text('sender_id').notNull().references(() => users.id),

  content: text('content').notNull(),
  type: text('type').$type<MessageType>().default('TEXT').notNull(),

  attachments: text('attachments', { mode: 'json' }).$type<{ url: string; name: string; size: number; type: string }[]>(),
  quickOffer: text('quick_offer', { mode: 'json' }).$type<{ description: string; price: number; deliveryDays: number; status: string }>(),

  isAutoResponse: integer('is_auto_response', { mode: 'boolean' }).default(false).notNull(),
  triggeredBy: text('triggered_by'),

  deliveredAt: text('delivered_at'),
  readAt: text('read_at'),

  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  conversationCreatedIdx: index('messages_conversation_created_idx').on(table.conversationId, table.createdAt),
  senderIdIdx: index('messages_sender_id_idx').on(table.senderId),
}));

export const pipelineStages = sqliteTable('pipeline_stages', {
  id: text('id').primaryKey().$defaultFn(cuid),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),

  name: text('name').notNull(),
  order: integer('order').notNull(),
  color: text('color').notNull(),
  isDefault: integer('is_default', { mode: 'boolean' }).default(false).notNull(),
  autoResponseId: text('auto_response_id'),
}, (table) => ({
  userOrderUnique: uniqueIndex('pipeline_stages_user_order_unique').on(table.userId, table.order),
  userNameUnique: uniqueIndex('pipeline_stages_user_name_unique').on(table.userId, table.name),
  userIdIdx: index('pipeline_stages_user_id_idx').on(table.userId),
}));

export const labels = sqliteTable('labels', {
  id: text('id').primaryKey().$defaultFn(cuid),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),

  name: text('name').notNull(),
  color: text('color').notNull(),
}, (table) => ({
  userNameUnique: uniqueIndex('labels_user_name_unique').on(table.userId, table.name),
  userIdIdx: index('labels_user_id_idx').on(table.userId),
}));

export const conversationLabels = sqliteTable('conversation_labels', {
  id: text('id').primaryKey().$defaultFn(cuid),
  conversationId: text('conversation_id').notNull().references(() => conversations.id, { onDelete: 'cascade' }),
  labelId: text('label_id').notNull().references(() => labels.id, { onDelete: 'cascade' }),

  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  conversationLabelUnique: uniqueIndex('conversation_labels_unique').on(table.conversationId, table.labelId),
}));

export const savedReplies = sqliteTable('saved_replies', {
  id: text('id').primaryKey().$defaultFn(cuid),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),

  shortcut: text('shortcut').notNull(),
  title: text('title').notNull(),
  content: text('content').notNull(),
  category: text('category'),
  usageCount: integer('usage_count').default(0).notNull(),
}, (table) => ({
  userShortcutUnique: uniqueIndex('saved_replies_user_shortcut_unique').on(table.userId, table.shortcut),
  userIdIdx: index('saved_replies_user_id_idx').on(table.userId),
}));

export const autoTriggers = sqliteTable('auto_triggers', {
  id: text('id').primaryKey().$defaultFn(cuid),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),

  name: text('name').notNull(),
  isActive: integer('is_active', { mode: 'boolean' }).default(true).notNull(),

  triggerType: text('trigger_type').$type<TriggerType>().notNull(),
  conditions: text('conditions', { mode: 'json' }).notNull(),

  actionType: text('action_type').$type<ActionType>().notNull(),
  actionPayload: text('action_payload', { mode: 'json' }).notNull(),

  delayMinutes: integer('delay_minutes').default(0).notNull(),
  activeHoursOnly: integer('active_hours_only', { mode: 'boolean' }).default(false).notNull(),
}, (table) => ({
  userActiveIdx: index('auto_triggers_user_active_idx').on(table.userId, table.isActive),
}));

export const conversationNotes = sqliteTable('conversation_notes', {
  id: text('id').primaryKey().$defaultFn(cuid),
  conversationId: text('conversation_id').notNull().references(() => conversations.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id),

  content: text('content').notNull(),
  isPinned: integer('is_pinned', { mode: 'boolean' }).default(false).notNull(),

  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  conversationIdIdx: index('conversation_notes_conversation_id_idx').on(table.conversationId),
}));

export const activities = sqliteTable('activities', {
  id: text('id').primaryKey().$defaultFn(cuid),
  conversationId: text('conversation_id').notNull().references(() => conversations.id, { onDelete: 'cascade' }),

  action: text('action').notNull(),
  data: text('data', { mode: 'json' }).notNull(),
  performedBy: text('performed_by').notNull(),

  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  conversationCreatedIdx: index('activities_conversation_created_idx').on(table.conversationId, table.createdAt),
}));

// ============ REVIEW MODEL ============

export const reviews = sqliteTable('reviews', {
  id: text('id').primaryKey().$defaultFn(cuid),
  orderId: text('order_id').notNull().unique().references(() => orders.id),
  serviceId: text('service_id').notNull().references(() => services.id),

  authorId: text('author_id').notNull().references(() => users.id),
  recipientId: text('recipient_id').notNull().references(() => users.id),

  rating: integer('rating').notNull(), // 1-5
  comment: text('comment').notNull(),

  communicationRating: integer('communication_rating'),
  qualityRating: integer('quality_rating'),
  valueRating: integer('value_rating'),

  sellerResponse: text('seller_response'),
  sellerRespondedAt: text('seller_responded_at'),

  isPublic: integer('is_public', { mode: 'boolean' }).default(true).notNull(),

  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  serviceIdIdx: index('reviews_service_id_idx').on(table.serviceId),
  recipientIdIdx: index('reviews_recipient_id_idx').on(table.recipientId),
}));

// ============ NOTIFICATION MODEL ============

export const notifications = sqliteTable('notifications', {
  id: text('id').primaryKey().$defaultFn(cuid),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),

  type: text('type').notNull(),
  title: text('title').notNull(),
  message: text('message').notNull(),
  data: text('data', { mode: 'json' }),

  readAt: text('read_at'),

  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  userReadIdx: index('notifications_user_read_idx').on(table.userId, table.readAt),
  userCreatedIdx: index('notifications_user_created_idx').on(table.userId, table.createdAt),
}));

// ============ ANALYTICS MODELS ============

export const conversationMetrics = sqliteTable('conversation_metrics', {
  id: text('id').primaryKey().$defaultFn(cuid),
  userId: text('user_id').notNull(),
  date: text('date').notNull(), // YYYY-MM-DD

  newConversations: integer('new_conversations').default(0).notNull(),
  messagesReceived: integer('messages_received').default(0).notNull(),
  messagesSent: integer('messages_sent').default(0).notNull(),

  avgFirstResponseMs: integer('avg_first_response_ms'),
  avgResponseTimeMs: integer('avg_response_time_ms'),
  responsesWithin1Hr: integer('responses_within_1hr').default(0).notNull(),

  dealsWon: integer('deals_won').default(0).notNull(),
  dealsLost: integer('deals_lost').default(0).notNull(),
  dealValueWon: integer('deal_value_won').default(0).notNull(), // cents
}, (table) => ({
  userDateUnique: uniqueIndex('conversation_metrics_user_date_unique').on(table.userId, table.date),
  userDateIdx: index('conversation_metrics_user_date_idx').on(table.userId, table.date),
}));

export const sellerMetrics = sqliteTable('seller_metrics', {
  id: text('id').primaryKey().$defaultFn(cuid),
  userId: text('user_id').notNull(),
  date: text('date').notNull(), // YYYY-MM-DD

  ordersReceived: integer('orders_received').default(0).notNull(),
  ordersCompleted: integer('orders_completed').default(0).notNull(),
  ordersCancelled: integer('orders_cancelled').default(0).notNull(),

  grossRevenue: integer('gross_revenue').default(0).notNull(), // cents
  platformFees: integer('platform_fees').default(0).notNull(),
  netRevenue: integer('net_revenue').default(0).notNull(),

  avgDeliveryTimeHrs: integer('avg_delivery_time_hrs'),
  onTimeDeliveries: integer('on_time_deliveries').default(0).notNull(),
  lateDeliveries: integer('late_deliveries').default(0).notNull(),

  reviewsReceived: integer('reviews_received').default(0).notNull(),
  avgRating: integer('avg_rating'), // *100
}, (table) => ({
  userDateUnique: uniqueIndex('seller_metrics_user_date_unique').on(table.userId, table.date),
  userDateIdx: index('seller_metrics_user_date_idx').on(table.userId, table.date),
}));

// ============ CONFIGURATION MODELS ============

/**
 * Site Configuration - Key-value store for platform settings
 * Supports encrypted values for sensitive data like API keys
 */
export const siteConfig = sqliteTable('site_config', {
  id: text('id').primaryKey().$defaultFn(cuid),
  category: text('category').notNull(), // e.g., 'smtp', 'payfast', 'ozow', 'cloudflare', 'general'
  key: text('key').notNull(),
  value: text('value'), // Plain text value
  encryptedValue: text('encrypted_value'), // For sensitive data like API keys
  description: text('description'),
  isSecret: integer('is_secret', { mode: 'boolean' }).default(false).notNull(),
  
  updatedBy: text('updated_by').references(() => users.id),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  categoryKeyUnique: uniqueIndex('site_config_category_key_unique').on(table.category, table.key),
  categoryIdx: index('site_config_category_idx').on(table.category),
}));

/**
 * Fee Policy - Platform fee configuration
 * Only one active policy at a time
 */
export const feePolicy = sqliteTable('fee_policy', {
  id: text('id').primaryKey().$defaultFn(cuid),
  name: text('name').notNull(),
  isActive: integer('is_active', { mode: 'boolean' }).default(false).notNull(),
  
  // Buyer fees
  buyerPlatformPct: integer('buyer_platform_pct').notNull(), // Stored as basis points (300 = 3%)
  buyerPlatformMin: integer('buyer_platform_min').notNull(), // Cents
  buyerProcessingMin: integer('buyer_processing_min').notNull(), // Cents
  
  // Seller fee tiers (stored as JSON)
  sellerTiers: text('seller_tiers', { mode: 'json' }).$type<{
    maxAmount: number | null; // null = no limit
    pct: number; // basis points
    min: number; // cents
  }[]>().notNull(),
  
  // Gateway settings
  bufferPct: integer('buffer_pct').notNull(), // basis points (20 = 0.2%)
  bufferFixed: integer('buffer_fixed').notNull(), // cents
  vatPct: integer('vat_pct').notNull(), // basis points (1500 = 15%)
  
  // Payout settings
  reserveDays: integer('reserve_days').notNull(),
  payoutMinimum: integer('payout_minimum').notNull(), // cents
  
  // Audit
  createdBy: text('created_by').references(() => users.id),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  isActiveIdx: index('fee_policy_is_active_idx').on(table.isActive),
}));

// ============ SELLER SUBSCRIPTION MODELS ============

export const sellerSubscriptions = sqliteTable('seller_subscriptions', {
  id: text('id').primaryKey().$defaultFn(cuid),
  sellerProfileId: text('seller_profile_id').notNull().unique().references(() => sellerProfiles.id, { onDelete: 'cascade' }),

  status: text('status').$type<SellerSubscriptionStatus>().default('PENDING').notNull(),

  currentPeriodStart: text('current_period_start').notNull(),
  currentPeriodEnd: text('current_period_end').notNull(),
  nextBillingDate: text('next_billing_date'),

  payFastToken: text('payfast_token').unique(),
  payFastSubscriptionId: text('payfast_subscription_id'),

  cancelAtPeriodEnd: integer('cancel_at_period_end', { mode: 'boolean' }).default(false).notNull(),
  cancelledAt: text('cancelled_at'),
  cancelReason: text('cancel_reason'),

  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  statusIdx: index('seller_subscriptions_status_idx').on(table.status),
}));

export const sellerSubscriptionPayments = sqliteTable('seller_subscription_payments', {
  id: text('id').primaryKey().$defaultFn(cuid),
  sellerSubscriptionId: text('seller_subscription_id').notNull().references(() => sellerSubscriptions.id, { onDelete: 'cascade' }),

  amount: integer('amount').notNull(), // cents
  gateway: text('gateway').$type<PaymentGateway>().notNull(),
  gatewayPaymentId: text('gateway_payment_id').notNull().unique(),

  periodStart: text('period_start').notNull(),
  periodEnd: text('period_end').notNull(),
  paidAt: text('paid_at').notNull(),

  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  subscriptionIdIdx: index('seller_sub_payments_subscription_id_idx').on(table.sellerSubscriptionId),
}));

// ============ COURSE MODELS ============

export const courses = sqliteTable('courses', {
  id: text('id').primaryKey().$defaultFn(cuid),
  sellerId: text('seller_id').notNull().references(() => sellerProfiles.id, { onDelete: 'cascade' }),

  title: text('title').notNull(),
  slug: text('slug').notNull().unique(),
  subtitle: text('subtitle'),
  description: text('description').notNull(),
  thumbnail: text('thumbnail'),
  promoVideo: text('promo_video'),

  categoryId: text('category_id').references(() => categories.id),
  tags: text('tags', { mode: 'json' }).$type<string[]>().default([]),
  level: text('level').$type<CourseLevel>().default('ALL_LEVELS').notNull(),
  language: text('language').default('English').notNull(),

  price: integer('price').notNull(), // cents
  currency: text('currency').default('ZAR').notNull(),

  rating: integer('rating').default(0).notNull(), // *100
  reviewCount: integer('review_count').default(0).notNull(),
  enrollCount: integer('enroll_count').default(0).notNull(),
  totalDuration: integer('total_duration').default(0).notNull(), // seconds

  status: text('status').$type<CourseStatus>().default('DRAFT').notNull(),
  isFeatured: integer('is_featured', { mode: 'boolean' }).default(false).notNull(),
  publishedAt: text('published_at'),

  requirements: text('requirements', { mode: 'json' }).$type<string[]>().default([]),
  learnings: text('learnings', { mode: 'json' }).$type<string[]>().default([]),

  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  sellerIdIdx: index('courses_seller_id_idx').on(table.sellerId),
  categoryIdIdx: index('courses_category_id_idx').on(table.categoryId),
  statusIdx: index('courses_status_idx').on(table.status),
  ratingIdx: index('courses_rating_idx').on(table.rating),
  sellerStatusIdx: index('courses_seller_status_idx').on(table.sellerId, table.status),
  slugIdx: index('courses_slug_idx').on(table.slug),
}));

export const courseSections = sqliteTable('course_sections', {
  id: text('id').primaryKey().$defaultFn(cuid),
  courseId: text('course_id').notNull().references(() => courses.id, { onDelete: 'cascade' }),

  title: text('title').notNull(),
  order: integer('order').notNull(),

  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  courseOrderUnique: uniqueIndex('course_sections_course_order_unique').on(table.courseId, table.order),
  courseIdIdx: index('course_sections_course_id_idx').on(table.courseId),
}));

export const courseLessons = sqliteTable('course_lessons', {
  id: text('id').primaryKey().$defaultFn(cuid),
  sectionId: text('section_id').notNull().references(() => courseSections.id, { onDelete: 'cascade' }),

  title: text('title').notNull(),
  description: text('description'),
  order: integer('order').notNull(),

  videoUrl: text('video_url'),
  duration: integer('duration').default(0).notNull(), // seconds
  isFreePreview: integer('is_free_preview', { mode: 'boolean' }).default(false).notNull(),

  resources: text('resources', { mode: 'json' }),

  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  sectionOrderUnique: uniqueIndex('course_lessons_section_order_unique').on(table.sectionId, table.order),
  sectionIdIdx: index('course_lessons_section_id_idx').on(table.sectionId),
}));

export const courseEnrollments = sqliteTable('course_enrollments', {
  id: text('id').primaryKey().$defaultFn(cuid),
  userId: text('user_id').notNull().references(() => users.id),
  courseId: text('course_id').notNull().references(() => courses.id, { onDelete: 'cascade' }),

  amountPaid: integer('amount_paid').notNull(), // cents
  gateway: text('gateway').default('CREDIT').notNull(),
  transactionId: text('transaction_id'),
  paidAt: text('paid_at'),

  progressPercent: integer('progress_percent').default(0).notNull(),
  completedAt: text('completed_at'),

  refundedAt: text('refunded_at'),
  refundedAmount: integer('refunded_amount'), // cents
  refundReason: text('refund_reason'),

  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  userCourseUnique: uniqueIndex('course_enrollments_user_course_unique').on(table.userId, table.courseId),
  userIdIdx: index('course_enrollments_user_id_idx').on(table.userId),
  courseIdIdx: index('course_enrollments_course_id_idx').on(table.courseId),
}));

export const lessonProgress = sqliteTable('lesson_progress', {
  id: text('id').primaryKey().$defaultFn(cuid),
  enrollmentId: text('enrollment_id').notNull().references(() => courseEnrollments.id, { onDelete: 'cascade' }),
  lessonId: text('lesson_id').notNull().references(() => courseLessons.id, { onDelete: 'cascade' }),

  completed: integer('completed', { mode: 'boolean' }).default(false).notNull(),
  watchedSecs: integer('watched_secs').default(0).notNull(),

  completedAt: text('completed_at'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  enrollmentLessonUnique: uniqueIndex('lesson_progress_enrollment_lesson_unique').on(table.enrollmentId, table.lessonId),
  enrollmentIdIdx: index('lesson_progress_enrollment_id_idx').on(table.enrollmentId),
}));

export const courseReviews = sqliteTable('course_reviews', {
  id: text('id').primaryKey().$defaultFn(cuid),
  courseId: text('course_id').notNull().references(() => courses.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id),

  rating: integer('rating').notNull(), // 1-5
  comment: text('comment').notNull(),

  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  courseUserUnique: uniqueIndex('course_reviews_course_user_unique').on(table.courseId, table.userId),
  courseIdIdx: index('course_reviews_course_id_idx').on(table.courseId),
}));

// ============ DIGITAL PRODUCT MODELS ============

export const digitalProducts = sqliteTable('digital_products', {
  id: text('id').primaryKey().$defaultFn(cuid),
  sellerProfileId: text('seller_profile_id').notNull().references(() => sellerProfiles.id, { onDelete: 'cascade' }),

  title: text('title').notNull(),
  description: text('description').notNull(),
  price: integer('price').notNull(), // cents
  fileUrl: text('file_url').notNull(),
  fileName: text('file_name').notNull(),
  fileSize: integer('file_size').notNull(),
  thumbnail: text('thumbnail'),
  isActive: integer('is_active', { mode: 'boolean' }).default(true).notNull(),
  order: integer('order').default(0).notNull(),

  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  sellerActiveIdx: index('digital_products_seller_active_idx').on(table.sellerProfileId, table.isActive),
}));

export const digitalProductPurchases = sqliteTable('digital_product_purchases', {
  id: text('id').primaryKey().$defaultFn(cuid),
  productId: text('product_id').notNull().references(() => digitalProducts.id, { onDelete: 'cascade' }),
  buyerId: text('buyer_id').notNull().references(() => users.id),

  amountPaid: integer('amount_paid').notNull(), // cents
  gateway: text('gateway').default('credit').notNull(),

  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  productBuyerUnique: uniqueIndex('digital_product_purchases_product_buyer_unique').on(table.productId, table.buyerId),
  buyerIdIdx: index('digital_product_purchases_buyer_id_idx').on(table.buyerId),
}));

// ============ BIOLINK MODELS ============

export const bioFaqEntries = sqliteTable('bio_faq_entries', {
  id: text('id').primaryKey().$defaultFn(cuid),
  sellerProfileId: text('seller_profile_id').notNull().references(() => sellerProfiles.id, { onDelete: 'cascade' }),

  question: text('question').notNull(),
  answer: text('answer').notNull(),
  keywords: text('keywords', { mode: 'json' }).$type<string[]>().default([]),
  order: integer('order').default(0).notNull(),

  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  sellerProfileIdIdx: index('bio_faq_entries_seller_profile_id_idx').on(table.sellerProfileId),
}));

export const bioLinkEvents = sqliteTable('bio_link_events', {
  id: text('id').primaryKey().$defaultFn(cuid),
  sellerProfileId: text('seller_profile_id').notNull().references(() => sellerProfiles.id, { onDelete: 'cascade' }),

  event: text('event').notNull(),
  metadata: text('metadata', { mode: 'json' }),

  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  sellerEventIdx: index('bio_link_events_seller_event_idx').on(table.sellerProfileId, table.event),
  sellerCreatedIdx: index('bio_link_events_seller_created_idx').on(table.sellerProfileId, table.createdAt),
}));
