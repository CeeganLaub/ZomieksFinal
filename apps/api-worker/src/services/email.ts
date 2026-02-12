/**
 * Email Service
 * Handles sending emails via Mailchannels (free for Workers) or other providers
 */

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}

interface EmailQueueMessage {
  type: string;
  to: string;
  data: Record<string, any>;
}

// Email templates
const templates = {
  welcome: (data: { name: string }) => ({
    subject: 'Welcome to Zomieks!',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #00b22d;">Welcome to Zomieks!</h1>
        <p>Hi ${data.name},</p>
        <p>Thank you for joining Zomieks, South Africa's marketplace for freelance services.</p>
        <p>You can now:</p>
        <ul>
          <li>Browse thousands of services from talented freelancers</li>
          <li>Create your own gigs and start earning</li>
          <li>Connect with clients and grow your business</li>
        </ul>
        <a href="https://zomieks.com/explore" style="display: inline-block; background: #00b22d; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 16px;">Explore Services</a>
        <p style="margin-top: 24px; color: #666;">Need help? Contact our support team anytime.</p>
        <p style="color: #666;">— The Zomieks Team</p>
      </div>
    `,
  }),

  email_verification: (data: { name: string; verificationUrl: string }) => ({
    subject: 'Verify your Zomieks email',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #00b22d;">Verify Your Email</h1>
        <p>Hi ${data.name},</p>
        <p>Please verify your email address by clicking the button below:</p>
        <a href="${data.verificationUrl}" style="display: inline-block; background: #00b22d; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">Verify Email</a>
        <p style="color: #666; font-size: 14px;">This link expires in 24 hours.</p>
        <p style="color: #666;">If you didn't create an account, you can ignore this email.</p>
      </div>
    `,
  }),

  password_reset: (data: { name: string; resetUrl: string }) => ({
    subject: 'Reset your Zomieks password',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #00b22d;">Reset Your Password</h1>
        <p>Hi ${data.name},</p>
        <p>We received a request to reset your password. Click the button below to create a new password:</p>
        <a href="${data.resetUrl}" style="display: inline-block; background: #00b22d; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">Reset Password</a>
        <p style="color: #666; font-size: 14px;">This link expires in 1 hour.</p>
        <p style="color: #666;">If you didn't request this, you can safely ignore this email.</p>
      </div>
    `,
  }),

  new_order: (data: { orderNumber: string; amount: number; buyerName?: string }) => ({
    subject: `New Order #${data.orderNumber}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #00b22d;">New Order Received!</h1>
        <p>Great news! You have a new order.</p>
        <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <p style="margin: 0;"><strong>Order:</strong> #${data.orderNumber}</p>
          ${data.buyerName ? `<p style="margin: 8px 0 0;"><strong>Buyer:</strong> ${data.buyerName}</p>` : ''}
          <p style="margin: 8px 0 0;"><strong>Amount:</strong> R${data.amount.toFixed(2)}</p>
        </div>
        <a href="https://zomieks.com/seller/orders/${data.orderNumber}" style="display: inline-block; background: #00b22d; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">View Order</a>
      </div>
    `,
  }),

  order_delivered: (data: { orderNumber: string; sellerName?: string }) => ({
    subject: `Order #${data.orderNumber} Delivered`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #00b22d;">Your Order Has Been Delivered!</h1>
        <p>The seller has submitted their delivery for order #${data.orderNumber}.</p>
        <p>Please review the delivery and accept it if you're satisfied, or request a revision if needed.</p>
        <a href="https://zomieks.com/orders/${data.orderNumber}" style="display: inline-block; background: #00b22d; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">Review Delivery</a>
        <p style="color: #666; font-size: 14px;">Note: The delivery will be auto-accepted after 3 days if no action is taken.</p>
      </div>
    `,
  }),

  order_completed: (data: { orderNumber: string; amount: number }) => ({
    subject: `Order #${data.orderNumber} Completed`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #00b22d;">Order Completed!</h1>
        <p>Order #${data.orderNumber} has been marked as complete.</p>
        <p>R${data.amount.toFixed(2)} has been added to your available balance.</p>
        <a href="https://zomieks.com/seller/earnings" style="display: inline-block; background: #00b22d; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">View Earnings</a>
      </div>
    `,
  }),

  subscription_activated: (data: { name: string }) => ({
    subject: 'Your Zomieks subscription is active!',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #00b22d;">Subscription Activated!</h1>
        <p>Hi ${data.name},</p>
        <p>Your subscription has been activated successfully. Enjoy all the premium features!</p>
        <a href="https://zomieks.com/seller/dashboard" style="display: inline-block; background: #00b22d; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">Go to Dashboard</a>
      </div>
    `,
  }),

  subscription_cancelled: (data: { name: string; endDate: string }) => ({
    subject: 'Your Zomieks subscription has been cancelled',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #00b22d;">Subscription Cancelled</h1>
        <p>Hi ${data.name},</p>
        <p>Your subscription has been cancelled. You'll continue to have access until ${new Date(data.endDate).toLocaleDateString()}.</p>
        <p>We're sorry to see you go! If you change your mind, you can reactivate anytime.</p>
        <a href="https://zomieks.com/subscription" style="display: inline-block; background: #00b22d; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">Reactivate Subscription</a>
      </div>
    `,
  }),

  payment_failed: (data: { name: string }) => ({
    subject: 'Payment failed - Action required',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #e74c3c;">Payment Failed</h1>
        <p>Hi ${data.name},</p>
        <p>We were unable to process your payment. Please update your payment method to continue enjoying Zomieks.</p>
        <a href="https://zomieks.com/settings/billing" style="display: inline-block; background: #00b22d; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">Update Payment Method</a>
      </div>
    `,
  }),

  payout_sent: (data: { amount: number; reference?: string }) => ({
    subject: 'Your payout is on the way!',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #00b22d;">Payout Sent!</h1>
        <p>Your payout of R${data.amount.toFixed(2)} has been sent to your bank account.</p>
        ${data.reference ? `<p>Reference: ${data.reference}</p>` : ''}
        <p style="color: #666;">Funds typically arrive within 1-3 business days.</p>
      </div>
    `,
  }),
};

// Send email via Resend API (https://resend.com)
// Falls back to console logging if RESEND_API_KEY is not configured
export async function sendEmail(options: EmailOptions, fromEmail: string, fromName: string): Promise<boolean> {
  try {
    // Try Resend API first
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${(globalThis as any).__RESEND_API_KEY || 'not-configured'}`,
      },
      body: JSON.stringify({
        from: `${fromName} <${fromEmail}>`,
        to: [options.to],
        reply_to: options.replyTo || undefined,
        subject: options.subject,
        html: options.html,
        text: options.text || undefined,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Email send error:', response.status, error);
      // Log the email for debugging but don't fail silently
      console.log('Email would have been sent to:', options.to, 'Subject:', options.subject);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Email send error:', error);
    console.log('Email would have been sent to:', options.to, 'Subject:', options.subject);
    return false;
  }
}

// Process email queue
export async function processEmailQueue(
  message: EmailQueueMessage,
  fromEmail: string = 'noreply@zomieks.com',
  fromName: string = 'Zomieks'
): Promise<boolean> {
  const template = templates[message.type as keyof typeof templates];
  
  if (!template) {
    console.error('Unknown email template:', message.type);
    return false;
  }
  
  const { subject, html } = template(message.data as any);
  
  return sendEmail({
    to: message.to,
    subject,
    html,
  }, fromEmail, fromName);
}

export { templates };
