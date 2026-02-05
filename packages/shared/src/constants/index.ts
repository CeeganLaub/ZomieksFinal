// Fee configuration
export const PLATFORM_FEES = {
  BUYER_FEE_PERCENT: 3, // 3% added to buyer's total
  SELLER_FEE_PERCENT: 8, // 8% deducted from seller's earnings
} as const;

// Currencies
export const CURRENCIES = {
  ZAR: 'ZAR',
} as const;

// Order statuses
export const ORDER_STATUS = {
  PENDING_PAYMENT: 'PENDING_PAYMENT',
  PAID: 'PAID',
  IN_PROGRESS: 'IN_PROGRESS',
  DELIVERED: 'DELIVERED',
  REVISION_REQUESTED: 'REVISION_REQUESTED',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
  DISPUTED: 'DISPUTED',
} as const;

// Escrow statuses
export const ESCROW_STATUS = {
  PENDING: 'PENDING',
  HELD: 'HELD',
  RELEASED: 'RELEASED',
  REFUNDED: 'REFUNDED',
  DISPUTED: 'DISPUTED',
} as const;

// Subscription statuses
export const SUBSCRIPTION_STATUS = {
  PENDING: 'PENDING',
  ACTIVE: 'ACTIVE',
  PAUSED: 'PAUSED',
  PAST_DUE: 'PAST_DUE',
  CANCELLED: 'CANCELLED',
  EXPIRED: 'EXPIRED',
} as const;

// Billing intervals
export const BILLING_INTERVAL = {
  MONTHLY: 'MONTHLY',
  QUARTERLY: 'QUARTERLY',
  YEARLY: 'YEARLY',
} as const;

// PayFast frequency codes
export const PAYFAST_FREQUENCY = {
  MONTHLY: 3,
  QUARTERLY: 4,
  BIANNUALLY: 5,
  YEARLY: 6,
} as const;

// Conversation statuses
export const CONVERSATION_STATUS = {
  OPEN: 'OPEN',
  PENDING: 'PENDING',
  RESOLVED: 'RESOLVED',
  SPAM: 'SPAM',
} as const;

// Message types
export const MESSAGE_TYPE = {
  TEXT: 'TEXT',
  IMAGE: 'IMAGE',
  FILE: 'FILE',
  SYSTEM: 'SYSTEM',
  ORDER_UPDATE: 'ORDER_UPDATE',
  QUICK_OFFER: 'QUICK_OFFER',
} as const;

// User roles
export const USER_ROLE = {
  BUYER: 'BUYER',
  SELLER: 'SELLER',
  ADMIN: 'ADMIN',
  MODERATOR: 'MODERATOR',
  SUPPORT: 'SUPPORT',
  FINANCE: 'FINANCE',
  SUPER_ADMIN: 'SUPER_ADMIN',
} as const;

// Trigger types for auto-responses
export const TRIGGER_TYPE = {
  NEW_CONVERSATION: 'NEW_CONVERSATION',
  KEYWORD: 'KEYWORD',
  INACTIVITY: 'INACTIVITY',
  STAGE_CHANGE: 'STAGE_CHANGE',
  SCHEDULED: 'SCHEDULED',
} as const;

// Priority levels
export const PRIORITY = {
  LOW: 'LOW',
  NORMAL: 'NORMAL',
  HIGH: 'HIGH',
  URGENT: 'URGENT',
} as const;

// Payment gateways
export const PAYMENT_GATEWAY = {
  PAYFAST: 'PAYFAST',
  OZOW: 'OZOW',
} as const;

// Payout statuses
export const PAYOUT_STATUS = {
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
} as const;

// Service pricing types
export const PRICING_TYPE = {
  ONE_TIME: 'ONE_TIME',
  SUBSCRIPTION: 'SUBSCRIPTION',
  BOTH: 'BOTH',
} as const;

// Package tiers
export const PACKAGE_TIER = {
  BASIC: 'BASIC',
  STANDARD: 'STANDARD',
  PREMIUM: 'PREMIUM',
} as const;
