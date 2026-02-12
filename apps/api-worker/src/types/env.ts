// Cloudflare Workers Environment Bindings
export interface Env {
  // D1 Database
  DB: D1Database;
  
  // KV Namespaces
  CACHE: KVNamespace;
  SESSIONS: KVNamespace;
  RATE_LIMIT: KVNamespace;
  
  // R2 Bucket
  UPLOADS: R2Bucket;
  
  // Queues
  ESCROW_QUEUE: Queue;
  NOTIFICATION_QUEUE: Queue;
  EMAIL_QUEUE: Queue;
  
  // Durable Objects
  CHAT_ROOMS: DurableObjectNamespace;
  PRESENCE: DurableObjectNamespace;
  CRM_NOTIFICATIONS: DurableObjectNamespace;
  
  // Secrets
  JWT_SECRET: string;
  JWT_REFRESH_SECRET: string;
  PAYFAST_MERCHANT_ID: string;
  PAYFAST_MERCHANT_KEY: string;
  PAYFAST_PASSPHRASE: string;
  OZOW_SITE_CODE: string;
  OZOW_PRIVATE_KEY: string;
  OZOW_API_KEY: string;
  
  // Config
  FRONTEND_URL: string;
  APP_URL: string;
  API_URL: string;
  NODE_ENV: string;
  
  // Optional payment config
  PAYFAST_SANDBOX?: string;
  OZOW_TEST_MODE?: string;
  
  // Email
  RESEND_API_KEY?: string;
}

// Extend Hono context
declare module 'hono' {
  interface ContextVariableMap {
    user: {
      id: string;
      email: string;
      username: string;
      isSeller: boolean;
      isAdmin: boolean;
    } | null;
    db: import('@zomieks/db').DrizzleDb;
  }
}
