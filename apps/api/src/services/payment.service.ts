import crypto from 'crypto';
import { env } from '@/config/env.js';
import { calculateOrderFees, PAYFAST_FREQUENCY } from '@kiekz/shared';

interface PayFastPaymentParams {
  paymentId: string;
  amount: number;
  itemName: string;
  email: string;
  firstName: string;
  lastName: string;
  returnUrl: string;
  cancelUrl: string;
  notifyUrl: string;
}

interface PayFastSubscriptionParams extends PayFastPaymentParams {
  subscriptionId: string;
  frequency: number;
  billingDate: number;
}

interface OzowPaymentParams {
  transactionReference: string;
  amount: number;
  bankReference: string;
  customerEmail: string;
  successUrl: string;
  cancelUrl: string;
  errorUrl: string;
  notifyUrl: string;
}

// Generate PayFast signature
function generatePayFastSignature(data: Record<string, string>, passphrase: string): string {
  const orderedParams = Object.keys(data)
    .sort()
    .map(key => `${key}=${encodeURIComponent(data[key]).replace(/%20/g, '+')}`)
    .join('&');
  
  const signatureString = passphrase 
    ? `${orderedParams}&passphrase=${encodeURIComponent(passphrase)}`
    : orderedParams;
    
  return crypto.createHash('md5').update(signatureString).digest('hex');
}

// Create PayFast payment URL
export async function createPayFastPayment(params: PayFastPaymentParams): Promise<string> {
  const baseUrl = env.PAYFAST_SANDBOX 
    ? 'https://sandbox.payfast.co.za/eng/process' 
    : 'https://www.payfast.co.za/eng/process';

  const data: Record<string, string> = {
    merchant_id: env.PAYFAST_MERCHANT_ID,
    merchant_key: env.PAYFAST_MERCHANT_KEY,
    return_url: params.returnUrl,
    cancel_url: params.cancelUrl,
    notify_url: params.notifyUrl,
    email_address: params.email,
    name_first: params.firstName,
    name_last: params.lastName,
    m_payment_id: params.paymentId,
    amount: params.amount.toFixed(2),
    item_name: params.itemName.substring(0, 100),
  };

  data.signature = generatePayFastSignature(data, env.PAYFAST_PASSPHRASE);

  const queryString = Object.entries(data)
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join('&');

  return `${baseUrl}?${queryString}`;
}

// Create PayFast subscription
export async function createPayFastSubscription(params: PayFastSubscriptionParams): Promise<string> {
  const baseUrl = env.PAYFAST_SANDBOX 
    ? 'https://sandbox.payfast.co.za/eng/process' 
    : 'https://www.payfast.co.za/eng/process';

  const data: Record<string, string> = {
    merchant_id: env.PAYFAST_MERCHANT_ID,
    merchant_key: env.PAYFAST_MERCHANT_KEY,
    return_url: params.returnUrl,
    cancel_url: params.cancelUrl,
    notify_url: params.notifyUrl,
    email_address: params.email,
    name_first: params.firstName,
    name_last: params.lastName,
    m_payment_id: params.subscriptionId,
    amount: params.amount.toFixed(2),
    item_name: params.itemName.substring(0, 100),
    // Subscription fields
    subscription_type: '1',
    billing_date: params.billingDate.toString(),
    recurring_amount: params.amount.toFixed(2),
    frequency: params.frequency.toString(),
    cycles: '0', // Indefinite
  };

  data.signature = generatePayFastSignature(data, env.PAYFAST_PASSPHRASE);

  const queryString = Object.entries(data)
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join('&');

  return `${baseUrl}?${queryString}`;
}

// Validate PayFast ITN
export function validatePayFastSignature(data: Record<string, string>, passphrase: string): boolean {
  const receivedSignature = data.signature;
  delete data.signature;
  
  const calculatedSignature = generatePayFastSignature(data, passphrase);
  return receivedSignature === calculatedSignature;
}

// PayFast allowed IPs
export const PAYFAST_IPS = [
  '197.97.145.144',
  '197.97.145.145',
  '197.97.145.146',
  '197.97.145.147',
  '41.74.179.194',
  '41.74.179.195',
  '41.74.179.196',
  '41.74.179.197',
];

// Create OZOW payment URL
export async function createOzowPayment(params: OzowPaymentParams): Promise<string> {
  const hashString = [
    env.OZOW_SITE_CODE,
    'ZA',
    'ZAR',
    params.amount.toFixed(2),
    params.transactionReference,
    params.bankReference,
    params.customerEmail,
    String(env.OZOW_IS_TEST),
    env.OZOW_PRIVATE_KEY,
  ].join('').toLowerCase();

  const hashCheck = crypto.createHash('sha512').update(hashString).digest('hex');

  const data = {
    SiteCode: env.OZOW_SITE_CODE,
    CountryCode: 'ZA',
    CurrencyCode: 'ZAR',
    Amount: params.amount.toFixed(2),
    TransactionReference: params.transactionReference,
    BankReference: params.bankReference,
    Customer: params.customerEmail,
    SuccessUrl: params.successUrl,
    CancelUrl: params.cancelUrl,
    ErrorUrl: params.errorUrl,
    NotifyUrl: params.notifyUrl,
    IsTest: String(env.OZOW_IS_TEST),
    HashCheck: hashCheck,
  };

  const queryString = Object.entries(data)
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join('&');

  return `https://pay.ozow.com/?${queryString}`;
}

// Validate OZOW hash
export function validateOzowHash(data: Record<string, string>): boolean {
  const receivedHash = data.Hash?.toLowerCase();
  
  const hashString = [
    data.SiteCode,
    data.TransactionId,
    data.TransactionReference,
    data.Amount,
    data.Status,
    data.Optional1 || '',
    data.Optional2 || '',
    data.Optional3 || '',
    data.Optional4 || '',
    data.Optional5 || '',
    data.CurrencyCode,
    data.IsTest,
    data.StatusMessage,
    env.OZOW_PRIVATE_KEY,
  ].join('').toLowerCase();

  const calculatedHash = crypto.createHash('sha512').update(hashString).digest('hex');
  
  return receivedHash === calculatedHash;
}
