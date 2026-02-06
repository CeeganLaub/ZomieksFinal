import { PLATFORM_FEES } from '../constants/index.js';

/**
 * Calculate fees for an order
 * @param baseAmount - The service price before any fees
 * @returns Object containing all fee calculations
 */
export function calculateOrderFees(baseAmount: number) {
  const buyerFee = Math.round(baseAmount * (PLATFORM_FEES.BUYER_FEE_PERCENT / 100) * 100) / 100;
  const sellerFee = Math.round(baseAmount * (PLATFORM_FEES.SELLER_FEE_PERCENT / 100) * 100) / 100;
  const totalAmount = Math.round((baseAmount + buyerFee) * 100) / 100;
  const sellerPayout = Math.round((baseAmount - sellerFee) * 100) / 100;
  const platformRevenue = Math.round((buyerFee + sellerFee) * 100) / 100;

  return {
    baseAmount,
    buyerFee,
    sellerFee,
    totalAmount,
    sellerPayout,
    platformRevenue,
  };
}

/**
 * Format currency amount in ZAR
 * @param amount - The amount to format
 * @returns Formatted string like "R 1,234.56"
 */
export function formatCurrency(amount: number, currency: string = 'ZAR'): string {
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

/**
 * Generate a random string for IDs, tokens, etc.
 * @param length - Length of the string
 * @returns Random alphanumeric string
 */
export function generateRandomString(length: number = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Generate order number in format KZ-YYYYMMDD-XXXXX
 * @returns Order number string
 */
export function generateOrderNumber(): string {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `KZ-${dateStr}-${random}`;
}

/**
 * Slugify a string for URLs
 * @param text - Text to slugify
 * @returns URL-safe slug
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Calculate delivery due date
 * @param deliveryDays - Number of days for delivery
 * @returns Due date
 */
export function calculateDeliveryDueDate(deliveryDays: number): Date {
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + deliveryDays);
  return dueDate;
}

/**
 * Check if a date is overdue
 * @param dueDate - The due date to check
 * @returns Boolean indicating if overdue
 */
export function isOverdue(dueDate: Date): boolean {
  return new Date() > new Date(dueDate);
}

/**
 * Calculate time remaining until a date
 * @param targetDate - The target date
 * @returns Object with days, hours, minutes remaining
 */
export function timeRemaining(targetDate: Date): { days: number; hours: number; minutes: number; isOverdue: boolean } {
  const now = new Date().getTime();
  const target = new Date(targetDate).getTime();
  const diff = target - now;

  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, isOverdue: true };
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  return { days, hours, minutes, isOverdue: false };
}

/**
 * Truncate text with ellipsis
 * @param text - Text to truncate
 * @param maxLength - Maximum length
 * @returns Truncated text
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

/**
 * Get initials from a name
 * @param firstName - First name
 * @param lastName - Last name (optional)
 * @returns Initials (e.g., "JD")
 */
export function getInitials(firstName: string, lastName?: string): string {
  const first = firstName.charAt(0).toUpperCase();
  const last = lastName ? lastName.charAt(0).toUpperCase() : '';
  return first + last;
}

/**
 * Format relative time (e.g., "2 hours ago")
 * @param date - The date to format
 * @returns Relative time string
 */
export function formatRelativeTime(date: Date | string): string {
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);

  if (diffSecs < 60) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffWeeks < 4) return `${diffWeeks}w ago`;
  if (diffMonths < 12) return `${diffMonths}mo ago`;
  return then.toLocaleDateString();
}

/**
 * Validate South African phone number
 * @param phone - Phone number to validate
 * @returns Boolean indicating if valid
 */
export function isValidSAPhoneNumber(phone: string): boolean {
  // Matches: 0821234567, +27821234567, 27821234567
  const regex = /^(\+?27|0)[6-8][0-9]{8}$/;
  return regex.test(phone.replace(/\s/g, ''));
}

/**
 * Sanitize filename for uploads
 * @param filename - Original filename
 * @returns Sanitized filename
 */
export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .replace(/_{2,}/g, '_')
    .toLowerCase();
}
