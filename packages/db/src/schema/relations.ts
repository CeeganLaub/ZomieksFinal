// Drizzle Relations for Zomieks
import { relations } from 'drizzle-orm';
import {
  users,
  userRoles,
  sellerProfiles,
  bankDetails,
  refreshTokens,
  sessions,
  categories,
  services,
  servicePackages,
  subscriptionTiers,
  favorites,
  orders,
  orderMilestones,
  orderDeliveries,
  orderRevisions,
  subscriptions,
  subscriptionPayments,
  transactions,
  escrowHolds,
  sellerPayouts,
  refunds,
  disputes,
  conversations,
  messages,
  pipelineStages,
  labels,
  conversationLabels,
  savedReplies,
  autoTriggers,
  conversationNotes,
  activities,
  reviews,
  notifications,
} from './tables';

// User relations
export const usersRelations = relations(users, ({ one, many }) => ({
  roles: many(userRoles),
  sellerProfile: one(sellerProfiles),
  bankDetails: one(bankDetails),
  refreshTokens: many(refreshTokens),
  sessions: many(sessions),
  services: many(services),
  buyerOrders: many(orders, { relationName: 'buyerOrders' }),
  sellerOrders: many(orders, { relationName: 'sellerOrders' }),
  buyerSubscriptions: many(subscriptions),
  buyerConversations: many(conversations, { relationName: 'buyerConversations' }),
  sellerConversations: many(conversations, { relationName: 'sellerConversations' }),
  messages: many(messages),
  pipelineStages: many(pipelineStages),
  labels: many(labels),
  savedReplies: many(savedReplies),
  autoTriggers: many(autoTriggers),
  conversationNotes: many(conversationNotes),
  notifications: many(notifications),
  payouts: many(sellerPayouts),
  authoredReviews: many(reviews, { relationName: 'reviewAuthor' }),
  receivedReviews: many(reviews, { relationName: 'reviewRecipient' }),
}));

export const userRolesRelations = relations(userRoles, ({ one }) => ({
  user: one(users, {
    fields: [userRoles.userId],
    references: [users.id],
  }),
}));

export const sellerProfilesRelations = relations(sellerProfiles, ({ one }) => ({
  user: one(users, {
    fields: [sellerProfiles.userId],
    references: [users.id],
  }),
}));

export const bankDetailsRelations = relations(bankDetails, ({ one }) => ({
  user: one(users, {
    fields: [bankDetails.userId],
    references: [users.id],
  }),
}));

export const refreshTokensRelations = relations(refreshTokens, ({ one }) => ({
  user: one(users, {
    fields: [refreshTokens.userId],
    references: [users.id],
  }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

// Category relations (self-referencing)
export const categoriesRelations = relations(categories, ({ one, many }) => ({
  parent: one(categories, {
    fields: [categories.parentId],
    references: [categories.id],
    relationName: 'categoryHierarchy',
  }),
  children: many(categories, { relationName: 'categoryHierarchy' }),
  services: many(services),
}));

// Service relations
export const servicesRelations = relations(services, ({ one, many }) => ({
  seller: one(users, {
    fields: [services.sellerId],
    references: [users.id],
  }),
  category: one(categories, {
    fields: [services.categoryId],
    references: [categories.id],
  }),
  packages: many(servicePackages),
  subscriptionTiers: many(subscriptionTiers),
  orders: many(orders),
  subscriptions: many(subscriptions),
  reviews: many(reviews),
  favorites: many(favorites),
}));

export const servicePackagesRelations = relations(servicePackages, ({ one, many }) => ({
  service: one(services, {
    fields: [servicePackages.serviceId],
    references: [services.id],
  }),
  orders: many(orders),
}));

export const subscriptionTiersRelations = relations(subscriptionTiers, ({ one, many }) => ({
  service: one(services, {
    fields: [subscriptionTiers.serviceId],
    references: [services.id],
  }),
  subscriptions: many(subscriptions),
}));

export const favoritesRelations = relations(favorites, ({ one }) => ({
  service: one(services, {
    fields: [favorites.serviceId],
    references: [services.id],
  }),
}));

// Order relations
export const ordersRelations = relations(orders, ({ one, many }) => ({
  buyer: one(users, {
    fields: [orders.buyerId],
    references: [users.id],
    relationName: 'buyerOrders',
  }),
  seller: one(users, {
    fields: [orders.sellerId],
    references: [users.id],
    relationName: 'sellerOrders',
  }),
  service: one(services, {
    fields: [orders.serviceId],
    references: [services.id],
  }),
  package: one(servicePackages, {
    fields: [orders.packageId],
    references: [servicePackages.id],
  }),
  transactions: many(transactions),
  escrowHolds: many(escrowHolds),
  deliveries: many(orderDeliveries),
  revisionRequests: many(orderRevisions),
  milestones: many(orderMilestones),
  conversation: one(conversations),
  review: one(reviews),
  dispute: one(disputes),
}));

export const orderMilestonesRelations = relations(orderMilestones, ({ one, many }) => ({
  order: one(orders, {
    fields: [orderMilestones.orderId],
    references: [orders.id],
  }),
  deliveries: many(orderDeliveries),
  escrowHold: one(escrowHolds),
}));

export const orderDeliveriesRelations = relations(orderDeliveries, ({ one }) => ({
  order: one(orders, {
    fields: [orderDeliveries.orderId],
    references: [orders.id],
  }),
  milestone: one(orderMilestones, {
    fields: [orderDeliveries.milestoneId],
    references: [orderMilestones.id],
  }),
}));

export const orderRevisionsRelations = relations(orderRevisions, ({ one }) => ({
  order: one(orders, {
    fields: [orderRevisions.orderId],
    references: [orders.id],
  }),
}));

// Subscription relations
export const subscriptionsRelations = relations(subscriptions, ({ one, many }) => ({
  buyer: one(users, {
    fields: [subscriptions.buyerId],
    references: [users.id],
  }),
  service: one(services, {
    fields: [subscriptions.serviceId],
    references: [services.id],
  }),
  tier: one(subscriptionTiers, {
    fields: [subscriptions.tierId],
    references: [subscriptionTiers.id],
  }),
  payments: many(subscriptionPayments),
}));

export const subscriptionPaymentsRelations = relations(subscriptionPayments, ({ one }) => ({
  subscription: one(subscriptions, {
    fields: [subscriptionPayments.subscriptionId],
    references: [subscriptions.id],
  }),
  escrowHold: one(escrowHolds),
}));

// Payment relations
export const transactionsRelations = relations(transactions, ({ one, many }) => ({
  order: one(orders, {
    fields: [transactions.orderId],
    references: [orders.id],
  }),
  escrowHolds: many(escrowHolds),
  refunds: many(refunds),
}));

export const escrowHoldsRelations = relations(escrowHolds, ({ one }) => ({
  transaction: one(transactions, {
    fields: [escrowHolds.transactionId],
    references: [transactions.id],
  }),
  order: one(orders, {
    fields: [escrowHolds.orderId],
    references: [orders.id],
  }),
  milestone: one(orderMilestones, {
    fields: [escrowHolds.milestoneId],
    references: [orderMilestones.id],
  }),
  subscriptionPayment: one(subscriptionPayments, {
    fields: [escrowHolds.subscriptionPaymentId],
    references: [subscriptionPayments.id],
  }),
  payout: one(sellerPayouts, {
    fields: [escrowHolds.payoutId],
    references: [sellerPayouts.id],
  }),
}));

export const sellerPayoutsRelations = relations(sellerPayouts, ({ one, many }) => ({
  seller: one(users, {
    fields: [sellerPayouts.sellerId],
    references: [users.id],
  }),
  escrowHolds: many(escrowHolds),
}));

export const refundsRelations = relations(refunds, ({ one }) => ({
  transaction: one(transactions, {
    fields: [refunds.transactionId],
    references: [transactions.id],
  }),
}));

export const disputesRelations = relations(disputes, ({ one }) => ({
  order: one(orders, {
    fields: [disputes.orderId],
    references: [orders.id],
  }),
}));

// Conversation/CRM relations
export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  buyer: one(users, {
    fields: [conversations.buyerId],
    references: [users.id],
    relationName: 'buyerConversations',
  }),
  seller: one(users, {
    fields: [conversations.sellerId],
    references: [users.id],
    relationName: 'sellerConversations',
  }),
  order: one(orders, {
    fields: [conversations.orderId],
    references: [orders.id],
  }),
  pipelineStage: one(pipelineStages, {
    fields: [conversations.pipelineStageId],
    references: [pipelineStages.id],
  }),
  messages: many(messages),
  labels: many(conversationLabels),
  notes: many(conversationNotes),
  activities: many(activities),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
  sender: one(users, {
    fields: [messages.senderId],
    references: [users.id],
  }),
}));

export const pipelineStagesRelations = relations(pipelineStages, ({ one, many }) => ({
  user: one(users, {
    fields: [pipelineStages.userId],
    references: [users.id],
  }),
  conversations: many(conversations),
}));

export const labelsRelations = relations(labels, ({ one, many }) => ({
  user: one(users, {
    fields: [labels.userId],
    references: [users.id],
  }),
  conversations: many(conversationLabels),
}));

export const conversationLabelsRelations = relations(conversationLabels, ({ one }) => ({
  conversation: one(conversations, {
    fields: [conversationLabels.conversationId],
    references: [conversations.id],
  }),
  label: one(labels, {
    fields: [conversationLabels.labelId],
    references: [labels.id],
  }),
}));

export const savedRepliesRelations = relations(savedReplies, ({ one }) => ({
  user: one(users, {
    fields: [savedReplies.userId],
    references: [users.id],
  }),
}));

export const autoTriggersRelations = relations(autoTriggers, ({ one }) => ({
  user: one(users, {
    fields: [autoTriggers.userId],
    references: [users.id],
  }),
}));

export const conversationNotesRelations = relations(conversationNotes, ({ one }) => ({
  conversation: one(conversations, {
    fields: [conversationNotes.conversationId],
    references: [conversations.id],
  }),
  user: one(users, {
    fields: [conversationNotes.userId],
    references: [users.id],
  }),
}));

export const activitiesRelations = relations(activities, ({ one }) => ({
  conversation: one(conversations, {
    fields: [activities.conversationId],
    references: [conversations.id],
  }),
}));

// Review relations
export const reviewsRelations = relations(reviews, ({ one }) => ({
  order: one(orders, {
    fields: [reviews.orderId],
    references: [orders.id],
  }),
  service: one(services, {
    fields: [reviews.serviceId],
    references: [services.id],
  }),
  author: one(users, {
    fields: [reviews.authorId],
    references: [users.id],
    relationName: 'reviewAuthor',
  }),
  recipient: one(users, {
    fields: [reviews.recipientId],
    references: [users.id],
    relationName: 'reviewRecipient',
  }),
}));

// Notification relations
export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));
