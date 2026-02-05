import type {
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
  TRIGGER_TYPE,
  PAYOUT_STATUS,
} from '../constants';

// ============ Utility Types ============

export type ValueOf<T> = T[keyof T];

export type OrderStatus = ValueOf<typeof ORDER_STATUS>;
export type EscrowStatus = ValueOf<typeof ESCROW_STATUS>;
export type SubscriptionStatus = ValueOf<typeof SUBSCRIPTION_STATUS>;
export type BillingInterval = ValueOf<typeof BILLING_INTERVAL>;
export type ConversationStatus = ValueOf<typeof CONVERSATION_STATUS>;
export type MessageType = ValueOf<typeof MESSAGE_TYPE>;
export type UserRole = ValueOf<typeof USER_ROLE>;
export type Priority = ValueOf<typeof PRIORITY>;
export type PaymentGateway = ValueOf<typeof PAYMENT_GATEWAY>;
export type PricingType = ValueOf<typeof PRICING_TYPE>;
export type PackageTier = ValueOf<typeof PACKAGE_TIER>;
export type TriggerType = ValueOf<typeof TRIGGER_TYPE>;
export type PayoutStatus = ValueOf<typeof PAYOUT_STATUS>;

// ============ User Types ============

export interface User {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  bio?: string;
  country?: string;
  timezone?: string;
  isEmailVerified: boolean;
  isSeller: boolean;
  isAdmin: boolean;
  roles: UserRole[];
  createdAt: Date;
  updatedAt: Date;
}

export interface SellerProfile {
  id: string;
  userId: string;
  displayName: string;
  professionalTitle: string;
  description: string;
  skills: string[];
  languages: { language: string; proficiency: string }[];
  rating: number;
  reviewCount: number;
  completedOrders: number;
  responseTime: number; // in minutes
  isVerified: boolean;
  level: number; // 1, 2, 3 like Fiverr
  createdAt: Date;
}

// ============ Service Types ============

export interface Service {
  id: string;
  sellerId: string;
  title: string;
  slug: string;
  description: string;
  categoryId: string;
  subcategoryId?: string;
  pricingType: PricingType;
  tags: string[];
  images: string[];
  video?: string;
  faqs: { question: string; answer: string }[];
  rating: number;
  reviewCount: number;
  orderCount: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ServicePackage {
  id: string;
  serviceId: string;
  tier: PackageTier;
  name: string;
  description: string;
  price: number;
  deliveryDays: number;
  revisions: number;
  features: string[];
}

export interface SubscriptionTier {
  id: string;
  serviceId: string;
  name: string;
  description: string;
  price: number;
  interval: BillingInterval;
  features: string[];
  limits?: Record<string, number>;
  isActive: boolean;
}

// ============ Order Types ============

export interface Order {
  id: string;
  orderNumber: string;
  buyerId: string;
  sellerId: string;
  serviceId: string;
  packageId?: string;
  subscriptionTierId?: string;
  status: OrderStatus;
  baseAmount: number;
  buyerFee: number;
  totalAmount: number; // baseAmount + buyerFee
  sellerFee: number;
  sellerPayout: number; // baseAmount - sellerFee
  platformRevenue: number; // buyerFee + sellerFee
  currency: string;
  requirements?: string;
  deliveryDueAt?: Date;
  deliveredAt?: Date;
  completedAt?: Date;
  cancelledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderMilestone {
  id: string;
  orderId: string;
  name: string;
  description: string;
  amount: number;
  dueAt: Date;
  status: OrderStatus;
  deliveredAt?: Date;
  approvedAt?: Date;
}

export interface OrderDelivery {
  id: string;
  orderId: string;
  milestoneId?: string;
  message: string;
  attachments: Attachment[];
  deliveredAt: Date;
  status: 'PENDING' | 'ACCEPTED' | 'REVISION_REQUESTED';
}

export interface Attachment {
  url: string;
  name: string;
  size: number;
  type: string;
}

// ============ Subscription Types ============

export interface Subscription {
  id: string;
  buyerId: string;
  serviceId: string;
  tierId: string;
  status: SubscriptionStatus;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  nextBillingDate?: Date;
  cancelAtPeriodEnd: boolean;
  pausedAt?: Date;
  cancelledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ============ Payment Types ============

export interface Transaction {
  id: string;
  orderId?: string;
  subscriptionId?: string;
  gateway: PaymentGateway;
  gatewayTransactionId: string;
  amount: number;
  buyerFee: number;
  sellerFee: number;
  platformRevenue: number;
  sellerPayout: number;
  currency: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';
  paidAt?: Date;
  createdAt: Date;
}

export interface EscrowHold {
  id: string;
  transactionId: string;
  orderId?: string;
  subscriptionPaymentId?: string;
  amount: number;
  status: EscrowStatus;
  holdUntil?: Date;
  releasedAt?: Date;
  refundedAt?: Date;
  createdAt: Date;
}

export interface SellerPayout {
  id: string;
  sellerId: string;
  amount: number;
  currency: string;
  status: PayoutStatus;
  sourceType: 'ORDER' | 'SUBSCRIPTION';
  sourceId: string;
  processedAt?: Date;
  failedReason?: string;
  createdAt: Date;
}

// ============ Conversation/CRM Types ============

export interface Conversation {
  id: string;
  buyerId: string;
  sellerId: string;
  status: ConversationStatus;
  leadScore: number;
  priority: Priority;
  source?: string;
  pipelineStageId?: string;
  dealValue?: number;
  probability?: number;
  expectedClose?: Date;
  firstResponseAt?: Date;
  lastMessageAt?: Date;
  unreadCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  type: MessageType;
  isAutoResponse: boolean;
  triggeredBy?: string;
  readAt?: Date;
  deliveredAt?: Date;
  attachments: Attachment[];
  quickOffer?: QuickOffer;
  createdAt: Date;
}

export interface QuickOffer {
  description: string;
  price: number;
  deliveryDays: number;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED';
}

export interface PipelineStage {
  id: string;
  userId: string;
  name: string;
  order: number;
  color: string;
  isDefault: boolean;
  autoResponseId?: string;
}

export interface Label {
  id: string;
  userId: string;
  name: string;
  color: string;
}

export interface SavedReply {
  id: string;
  userId: string;
  shortcut: string;
  title: string;
  content: string;
  category?: string;
  usageCount: number;
}

export interface AutoTrigger {
  id: string;
  userId: string;
  name: string;
  isActive: boolean;
  triggerType: TriggerType;
  conditions: Record<string, any>;
  actionType: 'SEND_MESSAGE' | 'CHANGE_STAGE' | 'ADD_LABEL' | 'NOTIFY';
  actionPayload: Record<string, any>;
  delayMinutes: number;
  activeHoursOnly: boolean;
}

export interface ConversationNote {
  id: string;
  conversationId: string;
  userId: string;
  content: string;
  isPinned: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ============ Analytics Types ============

export interface ConversationMetrics {
  id: string;
  userId: string;
  date: Date;
  newConversations: number;
  messagesReceived: number;
  messagesSent: number;
  avgFirstResponseMs?: number;
  avgResponseTimeMs?: number;
  responsesWithin1Hr: number;
  dealsWon: number;
  dealsLost: number;
  dealValueWon: number;
}

// ============ API Response Types ============

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}

export interface PaginatedResponse<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

// ============ Socket Event Types ============

export interface ChatEvents {
  'message:send': { conversationId: string; content: string; type: MessageType };
  'message:read': { conversationId: string; messageId: string };
  'typing:start': { conversationId: string };
  'typing:stop': { conversationId: string };
  'message:new': Message;
  'message:delivered': { messageId: string };
  'message:read_ack': { messageId: string; readAt: Date };
  'typing:update': { conversationId: string; userId: string; isTyping: boolean };
}

export interface CRMEvents {
  'conversation:updated': { id: string; changes: Partial<Conversation> };
  'pipeline:moved': { conversationId: string; from: string; to: string };
  'label:added': { conversationId: string; label: Label };
  'note:added': { conversationId: string; note: ConversationNote };
  'metrics:updated': ConversationMetrics;
}

export interface NotificationEvents {
  'notification:new': Notification;
  'notification:read': { id: string };
}

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  readAt?: Date;
  createdAt: Date;
}
