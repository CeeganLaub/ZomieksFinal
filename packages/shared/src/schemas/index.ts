import { z } from 'zod';
import { 
  ORDER_STATUS, 
  ESCROW_STATUS, 
  SUBSCRIPTION_STATUS, 
  BILLING_INTERVAL,
  CONVERSATION_STATUS,
  MESSAGE_TYPE,
  USER_ROLE,
  PRIORITY,
  PAYMENT_GATEWAY,
  PRICING_TYPE,
  PACKAGE_TIER,
} from '../constants';

// ============ Auth Schemas ============

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must be at most 30 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export const resetPasswordSchema = z.object({
  token: z.string(),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
});

// ============ User Schemas ============

export const updateProfileSchema = z.object({
  firstName: z.string().min(2).optional(),
  lastName: z.string().min(2).optional(),
  bio: z.string().max(500).optional(),
  avatar: z.string().url().optional(),
  languages: z.array(z.string()).optional(),
  skills: z.array(z.string()).optional(),
  country: z.string().optional(),
  timezone: z.string().optional(),
});

export const sellerOnboardingSchema = z.object({
  displayName: z.string().min(2, 'Display name is required'),
  professionalTitle: z.string().min(5, 'Professional title is required'),
  description: z.string().min(50, 'Description must be at least 50 characters'),
  skills: z.array(z.string()).min(1, 'At least one skill is required'),
  languages: z.array(z.object({
    language: z.string(),
    proficiency: z.enum(['BASIC', 'CONVERSATIONAL', 'FLUENT', 'NATIVE']),
  })).min(1, 'At least one language is required'),
  bankDetails: z.object({
    bankName: z.string(),
    accountNumber: z.string(),
    branchCode: z.string(),
    accountType: z.enum(['SAVINGS', 'CURRENT', 'TRANSMISSION']),
  }).optional(),
});

// ============ Service Schemas ============

export const createServiceSchema = z.object({
  title: z.string().min(10, 'Title must be at least 10 characters').max(80),
  categoryId: z.string(),
  subcategoryId: z.string().optional(),
  description: z.string().min(100, 'Description must be at least 100 characters'),
  pricingType: z.enum([PRICING_TYPE.ONE_TIME, PRICING_TYPE.SUBSCRIPTION, PRICING_TYPE.BOTH]),
  tags: z.array(z.string()).min(1).max(5),
  images: z.array(z.string().url()).min(1).max(5),
  video: z.string().url().optional(),
  faqs: z.array(z.object({
    question: z.string(),
    answer: z.string(),
  })).optional(),
});

export const servicePackageSchema = z.object({
  tier: z.enum([PACKAGE_TIER.BASIC, PACKAGE_TIER.STANDARD, PACKAGE_TIER.PREMIUM]),
  name: z.string().min(2),
  description: z.string().min(20),
  price: z.number().min(50, 'Minimum price is R50'),
  deliveryDays: z.number().min(1).max(90),
  revisions: z.number().min(0).max(99),
  features: z.array(z.string()).min(1),
});

export const subscriptionTierSchema = z.object({
  name: z.string().min(2),
  description: z.string().min(20),
  price: z.number().min(50, 'Minimum price is R50'),
  interval: z.enum([BILLING_INTERVAL.MONTHLY, BILLING_INTERVAL.QUARTERLY, BILLING_INTERVAL.YEARLY]),
  features: z.array(z.string()).min(1),
  limits: z.record(z.number()).optional(),
});

// ============ Order Schemas ============

export const createOrderSchema = z.object({
  serviceId: z.string(),
  packageTier: z.enum([PACKAGE_TIER.BASIC, PACKAGE_TIER.STANDARD, PACKAGE_TIER.PREMIUM]).optional(),
  subscriptionTierId: z.string().optional(),
  requirements: z.string().optional(),
  paymentGateway: z.enum([PAYMENT_GATEWAY.PAYFAST, PAYMENT_GATEWAY.OZOW]),
});

export const orderDeliverySchema = z.object({
  message: z.string().min(10, 'Please provide delivery details'),
  attachments: z.array(z.object({
    url: z.string().url(),
    name: z.string(),
    size: z.number(),
    type: z.string(),
  })).optional(),
});

export const orderRevisionSchema = z.object({
  message: z.string().min(20, 'Please explain what needs to be revised'),
});

// ============ Message Schemas ============

export const sendMessageSchema = z.object({
  conversationId: z.string(),
  content: z.string().min(1, 'Message cannot be empty').max(5000),
  type: z.enum([MESSAGE_TYPE.TEXT, MESSAGE_TYPE.IMAGE, MESSAGE_TYPE.FILE, MESSAGE_TYPE.QUICK_OFFER]).default(MESSAGE_TYPE.TEXT),
  attachments: z.array(z.object({
    url: z.string().url(),
    name: z.string(),
    size: z.number(),
    type: z.string(),
  })).optional(),
  quickOffer: z.object({
    description: z.string(),
    price: z.number(),
    deliveryDays: z.number(),
  }).optional(),
});

export const createConversationSchema = z.object({
  recipientId: z.string(),
  initialMessage: z.string().min(1).max(5000),
  serviceId: z.string().optional(),
});

// ============ CRM Schemas ============

export const updateConversationSchema = z.object({
  status: z.enum([CONVERSATION_STATUS.OPEN, CONVERSATION_STATUS.PENDING, CONVERSATION_STATUS.RESOLVED, CONVERSATION_STATUS.SPAM]).optional(),
  pipelineStageId: z.string().optional(),
  priority: z.enum([PRIORITY.LOW, PRIORITY.NORMAL, PRIORITY.HIGH, PRIORITY.URGENT]).optional(),
  dealValue: z.number().optional(),
  expectedClose: z.string().datetime().optional(),
  labelIds: z.array(z.string()).optional(),
});

export const createPipelineStageSchema = z.object({
  name: z.string().min(2),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  order: z.number().int().min(0),
  autoResponseId: z.string().optional(),
});

export const createLabelSchema = z.object({
  name: z.string().min(2).max(30),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
});

export const createSavedReplySchema = z.object({
  shortcut: z.string().min(2).max(20).regex(/^\/[a-z0-9_]+$/),
  title: z.string().min(2),
  content: z.string().min(1).max(2000),
  category: z.string().optional(),
});

export const createAutoTriggerSchema = z.object({
  name: z.string().min(2),
  triggerType: z.enum(['NEW_CONVERSATION', 'KEYWORD', 'INACTIVITY', 'STAGE_CHANGE', 'SCHEDULED']),
  conditions: z.record(z.any()),
  actionType: z.enum(['SEND_MESSAGE', 'CHANGE_STAGE', 'ADD_LABEL', 'NOTIFY']),
  actionPayload: z.record(z.any()),
  delayMinutes: z.number().int().min(0).default(0),
  activeHoursOnly: z.boolean().default(false),
});

export const createNoteSchema = z.object({
  conversationId: z.string(),
  content: z.string().min(1).max(2000),
  isPinned: z.boolean().default(false),
});

// ============ Payment Schemas ============

export const initiatePaymentSchema = z.object({
  orderId: z.string(),
  gateway: z.enum([PAYMENT_GATEWAY.PAYFAST, PAYMENT_GATEWAY.OZOW]),
});

// ============ Type Exports ============

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type SellerOnboardingInput = z.infer<typeof sellerOnboardingSchema>;
export type CreateServiceInput = z.infer<typeof createServiceSchema>;
export type ServicePackageInput = z.infer<typeof servicePackageSchema>;
export type SubscriptionTierInput = z.infer<typeof subscriptionTierSchema>;
export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type OrderDeliveryInput = z.infer<typeof orderDeliverySchema>;
export type OrderRevisionInput = z.infer<typeof orderRevisionSchema>;
export type SendMessageInput = z.infer<typeof sendMessageSchema>;
export type CreateConversationInput = z.infer<typeof createConversationSchema>;
export type UpdateConversationInput = z.infer<typeof updateConversationSchema>;
export type CreatePipelineStageInput = z.infer<typeof createPipelineStageSchema>;
export type CreateLabelInput = z.infer<typeof createLabelSchema>;
export type CreateSavedReplyInput = z.infer<typeof createSavedReplySchema>;
export type CreateAutoTriggerInput = z.infer<typeof createAutoTriggerSchema>;
export type CreateNoteInput = z.infer<typeof createNoteSchema>;
export type InitiatePaymentInput = z.infer<typeof initiatePaymentSchema>;
