-- CreateEnum
CREATE TYPE "Role" AS ENUM ('BUYER', 'SELLER', 'ADMIN', 'MODERATOR', 'SUPPORT', 'FINANCE', 'SUPER_ADMIN');

-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('SAVINGS', 'CURRENT', 'TRANSMISSION');

-- CreateEnum
CREATE TYPE "PricingType" AS ENUM ('ONE_TIME', 'SUBSCRIPTION', 'BOTH');

-- CreateEnum
CREATE TYPE "ServiceStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'ACTIVE', 'REJECTED', 'PAUSED');

-- CreateEnum
CREATE TYPE "PackageTier" AS ENUM ('BASIC', 'STANDARD', 'PREMIUM');

-- CreateEnum
CREATE TYPE "BillingInterval" AS ENUM ('MONTHLY', 'QUARTERLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING_PAYMENT', 'PAID', 'IN_PROGRESS', 'DELIVERED', 'REVISION_REQUESTED', 'COMPLETED', 'CANCELLED', 'DISPUTED');

-- CreateEnum
CREATE TYPE "MilestoneStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'DELIVERED', 'APPROVED', 'DISPUTED');

-- CreateEnum
CREATE TYPE "DeliveryStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REVISION_REQUESTED');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('PENDING', 'ACTIVE', 'PAUSED', 'PAST_DUE', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "PaymentGateway" AS ENUM ('PAYFAST', 'OZOW');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED', 'PARTIALLY_REFUNDED');

-- CreateEnum
CREATE TYPE "EscrowStatus" AS ENUM ('PENDING', 'HELD', 'RELEASED', 'REFUNDED', 'DISPUTED');

-- CreateEnum
CREATE TYPE "PayoutStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "RefundStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "DisputeStatus" AS ENUM ('OPEN', 'UNDER_REVIEW', 'RESOLVED_BUYER', 'RESOLVED_SELLER', 'RESOLVED_SPLIT', 'CLOSED');

-- CreateEnum
CREATE TYPE "ConversationStatus" AS ENUM ('OPEN', 'PENDING', 'RESOLVED', 'SPAM');

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "MessageType" AS ENUM ('TEXT', 'IMAGE', 'FILE', 'SYSTEM', 'ORDER_UPDATE', 'QUICK_OFFER');

-- CreateEnum
CREATE TYPE "TriggerType" AS ENUM ('NEW_CONVERSATION', 'KEYWORD', 'INACTIVITY', 'STAGE_CHANGE', 'SCHEDULED');

-- CreateEnum
CREATE TYPE "ActionType" AS ENUM ('SEND_MESSAGE', 'CHANGE_STAGE', 'ADD_LABEL', 'NOTIFY');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "avatar" TEXT,
    "bio" TEXT,
    "country" TEXT,
    "timezone" TEXT DEFAULT 'Africa/Johannesburg',
    "phone" TEXT,
    "isEmailVerified" BOOLEAN NOT NULL DEFAULT false,
    "isPhoneVerified" BOOLEAN NOT NULL DEFAULT false,
    "isSeller" BOOLEAN NOT NULL DEFAULT false,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "isSuspended" BOOLEAN NOT NULL DEFAULT false,
    "suspendedReason" TEXT,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserRole" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SellerProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "professionalTitle" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "skills" TEXT[],
    "languages" JSONB NOT NULL,
    "rating" DECIMAL(3,2) NOT NULL DEFAULT 0,
    "reviewCount" INTEGER NOT NULL DEFAULT 0,
    "completedOrders" INTEGER NOT NULL DEFAULT 0,
    "responseTimeMinutes" INTEGER,
    "onTimeDeliveryRate" DECIMAL(5,2) NOT NULL DEFAULT 100,
    "level" INTEGER NOT NULL DEFAULT 1,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "verifiedAt" TIMESTAMP(3),
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "vacationMode" BOOLEAN NOT NULL DEFAULT false,
    "vacationUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SellerProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankDetails" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bankName" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "branchCode" TEXT NOT NULL,
    "accountType" "AccountType" NOT NULL,
    "accountHolder" TEXT NOT NULL,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BankDetails_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "image" TEXT,
    "parentId" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Service" (
    "id" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "pricingType" "PricingType" NOT NULL,
    "images" TEXT[],
    "video" TEXT,
    "tags" TEXT[],
    "faqs" JSONB,
    "requirements" TEXT,
    "rating" DECIMAL(3,2) NOT NULL DEFAULT 0,
    "reviewCount" INTEGER NOT NULL DEFAULT 0,
    "orderCount" INTEGER NOT NULL DEFAULT 0,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "favoriteCount" INTEGER NOT NULL DEFAULT 0,
    "status" "ServiceStatus" NOT NULL DEFAULT 'DRAFT',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isPaused" BOOLEAN NOT NULL DEFAULT false,
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Service_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServicePackage" (
    "id" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "tier" "PackageTier" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "deliveryDays" INTEGER NOT NULL,
    "revisions" INTEGER NOT NULL DEFAULT 0,
    "features" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServicePackage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubscriptionTier" (
    "id" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "interval" "BillingInterval" NOT NULL,
    "features" TEXT[],
    "limits" JSONB,
    "payFastFrequency" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubscriptionTier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Favorite" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Favorite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "packageId" TEXT,
    "baseAmount" DECIMAL(10,2) NOT NULL,
    "buyerFee" DECIMAL(10,2) NOT NULL,
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "sellerFee" DECIMAL(10,2) NOT NULL,
    "sellerPayout" DECIMAL(10,2) NOT NULL,
    "platformRevenue" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'ZAR',
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
    "requirements" TEXT,
    "deliveryDays" INTEGER NOT NULL,
    "revisions" INTEGER NOT NULL DEFAULT 0,
    "revisionsUsed" INTEGER NOT NULL DEFAULT 0,
    "paidAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "deliveryDueAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "cancelReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderMilestone" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "order_num" INTEGER NOT NULL,
    "status" "MilestoneStatus" NOT NULL DEFAULT 'PENDING',
    "dueAt" TIMESTAMP(3) NOT NULL,
    "deliveredAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrderMilestone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderDelivery" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "milestoneId" TEXT,
    "message" TEXT NOT NULL,
    "attachments" JSONB,
    "status" "DeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "deliveredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderRevision" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "OrderRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "tierId" TEXT NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'PENDING',
    "currentPeriodStart" TIMESTAMP(3) NOT NULL,
    "currentPeriodEnd" TIMESTAMP(3) NOT NULL,
    "nextBillingDate" TIMESTAMP(3),
    "payFastToken" TEXT,
    "payFastSubscriptionId" TEXT,
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "pausedAt" TIMESTAMP(3),
    "pauseReason" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "cancelReason" TEXT,
    "currentUsage" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubscriptionPayment" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "buyerFee" DECIMAL(10,2) NOT NULL,
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "sellerFee" DECIMAL(10,2) NOT NULL,
    "sellerPayout" DECIMAL(10,2) NOT NULL,
    "platformRevenue" DECIMAL(10,2) NOT NULL,
    "gateway" "PaymentGateway" NOT NULL,
    "gatewayPaymentId" TEXT NOT NULL,
    "escrowStatus" "EscrowStatus" NOT NULL DEFAULT 'HELD',
    "releasedAt" TIMESTAMP(3),
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubscriptionPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "orderId" TEXT,
    "gateway" "PaymentGateway" NOT NULL,
    "gatewayTransactionId" TEXT NOT NULL,
    "gatewayReference" TEXT,
    "amount" DECIMAL(10,2) NOT NULL,
    "buyerFee" DECIMAL(10,2) NOT NULL,
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "sellerFee" DECIMAL(10,2) NOT NULL,
    "sellerPayout" DECIMAL(10,2) NOT NULL,
    "platformRevenue" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'ZAR',
    "status" "TransactionStatus" NOT NULL DEFAULT 'PENDING',
    "gatewayData" JSONB,
    "paidAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "failedReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EscrowHold" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT,
    "orderId" TEXT,
    "milestoneId" TEXT,
    "subscriptionPaymentId" TEXT,
    "amount" DECIMAL(10,2) NOT NULL,
    "sellerAmount" DECIMAL(10,2) NOT NULL,
    "status" "EscrowStatus" NOT NULL DEFAULT 'HELD',
    "holdUntil" TIMESTAMP(3),
    "releasedAt" TIMESTAMP(3),
    "refundedAt" TIMESTAMP(3),
    "payoutId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EscrowHold_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SellerPayout" (
    "id" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'ZAR',
    "status" "PayoutStatus" NOT NULL DEFAULT 'PENDING',
    "bankReference" TEXT,
    "processedAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "failedReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SellerPayout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Refund" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "RefundStatus" NOT NULL DEFAULT 'PENDING',
    "gatewayRefundId" TEXT,
    "processedAt" TIMESTAMP(3),
    "failedReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Refund_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Dispute" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "raisedBy" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "evidence" JSONB,
    "status" "DisputeStatus" NOT NULL DEFAULT 'OPEN',
    "resolution" TEXT,
    "resolvedBy" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Dispute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Conversation" (
    "id" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "orderId" TEXT,
    "status" "ConversationStatus" NOT NULL DEFAULT 'OPEN',
    "leadScore" INTEGER NOT NULL DEFAULT 0,
    "priority" "Priority" NOT NULL DEFAULT 'NORMAL',
    "source" TEXT,
    "pipelineStageId" TEXT,
    "dealValue" DECIMAL(10,2),
    "probability" INTEGER,
    "expectedClose" TIMESTAMP(3),
    "firstResponseAt" TIMESTAMP(3),
    "lastMessageAt" TIMESTAMP(3),
    "unreadBuyerCount" INTEGER NOT NULL DEFAULT 0,
    "unreadSellerCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "type" "MessageType" NOT NULL DEFAULT 'TEXT',
    "attachments" JSONB,
    "quickOffer" JSONB,
    "isAutoResponse" BOOLEAN NOT NULL DEFAULT false,
    "triggeredBy" TEXT,
    "deliveredAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PipelineStage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "color" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "autoResponseId" TEXT,

    CONSTRAINT "PipelineStage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Label" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL,

    CONSTRAINT "Label_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConversationLabel" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "labelId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConversationLabel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavedReply" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "shortcut" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "category" TEXT,
    "usageCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "SavedReply_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutoTrigger" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "triggerType" "TriggerType" NOT NULL,
    "conditions" JSONB NOT NULL,
    "actionType" "ActionType" NOT NULL,
    "actionPayload" JSONB NOT NULL,
    "delayMinutes" INTEGER NOT NULL DEFAULT 0,
    "activeHoursOnly" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "AutoTrigger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConversationNote" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConversationNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Activity" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "performedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT NOT NULL,
    "communicationRating" INTEGER,
    "qualityRating" INTEGER,
    "valueRating" INTEGER,
    "sellerResponse" TEXT,
    "sellerRespondedAt" TIMESTAMP(3),
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "data" JSONB,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConversationMetrics" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "newConversations" INTEGER NOT NULL DEFAULT 0,
    "messagesReceived" INTEGER NOT NULL DEFAULT 0,
    "messagesSent" INTEGER NOT NULL DEFAULT 0,
    "avgFirstResponseMs" INTEGER,
    "avgResponseTimeMs" INTEGER,
    "responsesWithin1Hr" INTEGER NOT NULL DEFAULT 0,
    "dealsWon" INTEGER NOT NULL DEFAULT 0,
    "dealsLost" INTEGER NOT NULL DEFAULT 0,
    "dealValueWon" DECIMAL(12,2) NOT NULL DEFAULT 0,

    CONSTRAINT "ConversationMetrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SellerMetrics" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "ordersReceived" INTEGER NOT NULL DEFAULT 0,
    "ordersCompleted" INTEGER NOT NULL DEFAULT 0,
    "ordersCancelled" INTEGER NOT NULL DEFAULT 0,
    "grossRevenue" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "platformFees" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "netRevenue" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "avgDeliveryTimeHrs" INTEGER,
    "onTimeDeliveries" INTEGER NOT NULL DEFAULT 0,
    "lateDeliveries" INTEGER NOT NULL DEFAULT 0,
    "reviewsReceived" INTEGER NOT NULL DEFAULT 0,
    "avgRating" DECIMAL(3,2),

    CONSTRAINT "SellerMetrics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_username_idx" ON "User"("username");

-- CreateIndex
CREATE INDEX "User_isSeller_idx" ON "User"("isSeller");

-- CreateIndex
CREATE INDEX "UserRole_userId_idx" ON "UserRole"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserRole_userId_role_key" ON "UserRole"("userId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "SellerProfile_userId_key" ON "SellerProfile"("userId");

-- CreateIndex
CREATE INDEX "SellerProfile_rating_idx" ON "SellerProfile"("rating");

-- CreateIndex
CREATE INDEX "SellerProfile_level_idx" ON "SellerProfile"("level");

-- CreateIndex
CREATE UNIQUE INDEX "BankDetails_userId_key" ON "BankDetails"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_token_key" ON "RefreshToken"("token");

-- CreateIndex
CREATE INDEX "RefreshToken_userId_idx" ON "RefreshToken"("userId");

-- CreateIndex
CREATE INDEX "RefreshToken_token_idx" ON "RefreshToken"("token");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");

-- CreateIndex
CREATE INDEX "Category_parentId_idx" ON "Category"("parentId");

-- CreateIndex
CREATE INDEX "Category_slug_idx" ON "Category"("slug");

-- CreateIndex
CREATE INDEX "Service_categoryId_idx" ON "Service"("categoryId");

-- CreateIndex
CREATE INDEX "Service_sellerId_idx" ON "Service"("sellerId");

-- CreateIndex
CREATE INDEX "Service_status_idx" ON "Service"("status");

-- CreateIndex
CREATE INDEX "Service_rating_idx" ON "Service"("rating");

-- CreateIndex
CREATE UNIQUE INDEX "Service_sellerId_slug_key" ON "Service"("sellerId", "slug");

-- CreateIndex
CREATE INDEX "ServicePackage_serviceId_idx" ON "ServicePackage"("serviceId");

-- CreateIndex
CREATE UNIQUE INDEX "ServicePackage_serviceId_tier_key" ON "ServicePackage"("serviceId", "tier");

-- CreateIndex
CREATE INDEX "SubscriptionTier_serviceId_idx" ON "SubscriptionTier"("serviceId");

-- CreateIndex
CREATE UNIQUE INDEX "SubscriptionTier_serviceId_name_key" ON "SubscriptionTier"("serviceId", "name");

-- CreateIndex
CREATE INDEX "Favorite_userId_idx" ON "Favorite"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Favorite_userId_serviceId_key" ON "Favorite"("userId", "serviceId");

-- CreateIndex
CREATE UNIQUE INDEX "Order_orderNumber_key" ON "Order"("orderNumber");

-- CreateIndex
CREATE INDEX "Order_buyerId_idx" ON "Order"("buyerId");

-- CreateIndex
CREATE INDEX "Order_sellerId_idx" ON "Order"("sellerId");

-- CreateIndex
CREATE INDEX "Order_status_idx" ON "Order"("status");

-- CreateIndex
CREATE INDEX "Order_orderNumber_idx" ON "Order"("orderNumber");

-- CreateIndex
CREATE INDEX "OrderMilestone_orderId_idx" ON "OrderMilestone"("orderId");

-- CreateIndex
CREATE INDEX "OrderDelivery_orderId_idx" ON "OrderDelivery"("orderId");

-- CreateIndex
CREATE INDEX "OrderRevision_orderId_idx" ON "OrderRevision"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_payFastToken_key" ON "Subscription"("payFastToken");

-- CreateIndex
CREATE INDEX "Subscription_buyerId_idx" ON "Subscription"("buyerId");

-- CreateIndex
CREATE INDEX "Subscription_serviceId_idx" ON "Subscription"("serviceId");

-- CreateIndex
CREATE INDEX "Subscription_status_idx" ON "Subscription"("status");

-- CreateIndex
CREATE UNIQUE INDEX "SubscriptionPayment_gatewayPaymentId_key" ON "SubscriptionPayment"("gatewayPaymentId");

-- CreateIndex
CREATE INDEX "SubscriptionPayment_subscriptionId_idx" ON "SubscriptionPayment"("subscriptionId");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_gatewayTransactionId_key" ON "Transaction"("gatewayTransactionId");

-- CreateIndex
CREATE INDEX "Transaction_orderId_idx" ON "Transaction"("orderId");

-- CreateIndex
CREATE INDEX "Transaction_status_idx" ON "Transaction"("status");

-- CreateIndex
CREATE UNIQUE INDEX "EscrowHold_milestoneId_key" ON "EscrowHold"("milestoneId");

-- CreateIndex
CREATE UNIQUE INDEX "EscrowHold_subscriptionPaymentId_key" ON "EscrowHold"("subscriptionPaymentId");

-- CreateIndex
CREATE INDEX "EscrowHold_status_idx" ON "EscrowHold"("status");

-- CreateIndex
CREATE INDEX "EscrowHold_transactionId_idx" ON "EscrowHold"("transactionId");

-- CreateIndex
CREATE INDEX "SellerPayout_sellerId_idx" ON "SellerPayout"("sellerId");

-- CreateIndex
CREATE INDEX "SellerPayout_status_idx" ON "SellerPayout"("status");

-- CreateIndex
CREATE INDEX "Refund_transactionId_idx" ON "Refund"("transactionId");

-- CreateIndex
CREATE UNIQUE INDEX "Dispute_orderId_key" ON "Dispute"("orderId");

-- CreateIndex
CREATE INDEX "Dispute_status_idx" ON "Dispute"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Conversation_orderId_key" ON "Conversation"("orderId");

-- CreateIndex
CREATE INDEX "Conversation_sellerId_status_idx" ON "Conversation"("sellerId", "status");

-- CreateIndex
CREATE INDEX "Conversation_pipelineStageId_idx" ON "Conversation"("pipelineStageId");

-- CreateIndex
CREATE UNIQUE INDEX "Conversation_buyerId_sellerId_key" ON "Conversation"("buyerId", "sellerId");

-- CreateIndex
CREATE INDEX "Message_conversationId_createdAt_idx" ON "Message"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "Message_senderId_idx" ON "Message"("senderId");

-- CreateIndex
CREATE INDEX "PipelineStage_userId_idx" ON "PipelineStage"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PipelineStage_userId_order_key" ON "PipelineStage"("userId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "PipelineStage_userId_name_key" ON "PipelineStage"("userId", "name");

-- CreateIndex
CREATE INDEX "Label_userId_idx" ON "Label"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Label_userId_name_key" ON "Label"("userId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "ConversationLabel_conversationId_labelId_key" ON "ConversationLabel"("conversationId", "labelId");

-- CreateIndex
CREATE INDEX "SavedReply_userId_idx" ON "SavedReply"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "SavedReply_userId_shortcut_key" ON "SavedReply"("userId", "shortcut");

-- CreateIndex
CREATE INDEX "AutoTrigger_userId_isActive_idx" ON "AutoTrigger"("userId", "isActive");

-- CreateIndex
CREATE INDEX "ConversationNote_conversationId_idx" ON "ConversationNote"("conversationId");

-- CreateIndex
CREATE INDEX "Activity_conversationId_createdAt_idx" ON "Activity"("conversationId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Review_orderId_key" ON "Review"("orderId");

-- CreateIndex
CREATE INDEX "Review_serviceId_idx" ON "Review"("serviceId");

-- CreateIndex
CREATE INDEX "Review_recipientId_idx" ON "Review"("recipientId");

-- CreateIndex
CREATE INDEX "Notification_userId_readAt_idx" ON "Notification"("userId", "readAt");

-- CreateIndex
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "ConversationMetrics_userId_date_idx" ON "ConversationMetrics"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "ConversationMetrics_userId_date_key" ON "ConversationMetrics"("userId", "date");

-- CreateIndex
CREATE INDEX "SellerMetrics_userId_date_idx" ON "SellerMetrics"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "SellerMetrics_userId_date_key" ON "SellerMetrics"("userId", "date");

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SellerProfile" ADD CONSTRAINT "SellerProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankDetails" ADD CONSTRAINT "BankDetails_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Service" ADD CONSTRAINT "Service_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Service" ADD CONSTRAINT "Service_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServicePackage" ADD CONSTRAINT "ServicePackage_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionTier" ADD CONSTRAINT "SubscriptionTier_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "ServicePackage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderMilestone" ADD CONSTRAINT "OrderMilestone_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderDelivery" ADD CONSTRAINT "OrderDelivery_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderDelivery" ADD CONSTRAINT "OrderDelivery_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "OrderMilestone"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderRevision" ADD CONSTRAINT "OrderRevision_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_tierId_fkey" FOREIGN KEY ("tierId") REFERENCES "SubscriptionTier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionPayment" ADD CONSTRAINT "SubscriptionPayment_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EscrowHold" ADD CONSTRAINT "EscrowHold_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EscrowHold" ADD CONSTRAINT "EscrowHold_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EscrowHold" ADD CONSTRAINT "EscrowHold_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "OrderMilestone"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EscrowHold" ADD CONSTRAINT "EscrowHold_subscriptionPaymentId_fkey" FOREIGN KEY ("subscriptionPaymentId") REFERENCES "SubscriptionPayment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EscrowHold" ADD CONSTRAINT "EscrowHold_payoutId_fkey" FOREIGN KEY ("payoutId") REFERENCES "SellerPayout"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SellerPayout" ADD CONSTRAINT "SellerPayout_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_pipelineStageId_fkey" FOREIGN KEY ("pipelineStageId") REFERENCES "PipelineStage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PipelineStage" ADD CONSTRAINT "PipelineStage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Label" ADD CONSTRAINT "Label_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationLabel" ADD CONSTRAINT "ConversationLabel_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationLabel" ADD CONSTRAINT "ConversationLabel_labelId_fkey" FOREIGN KEY ("labelId") REFERENCES "Label"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedReply" ADD CONSTRAINT "SavedReply_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutoTrigger" ADD CONSTRAINT "AutoTrigger_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationNote" ADD CONSTRAINT "ConversationNote_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationNote" ADD CONSTRAINT "ConversationNote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
