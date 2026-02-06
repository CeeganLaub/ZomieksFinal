import { Context, Next } from 'hono';
import type { Env } from '../types';

interface RequestLog {
  timestamp: string;
  method: string;
  path: string;
  status: number;
  duration: number;
  error?: string;
  stack?: string;
  body?: any;
  query?: Record<string, string>;
  userId?: string;
}

const recentErrors: RequestLog[] = [];
const MAX_ERRORS = 50;

export function devLogger() {
  return async (c: Context<{ Bindings: Env }>, next: Next) => {
    const start = Date.now();
    const method = c.req.method;
    const path = c.req.path;
    
    // Log request details in dev
    if (c.env.ENVIRONMENT === 'development') {
      console.log(`\n📥 ${method} ${path}`);
      
      // Log query params
      const query = Object.fromEntries(new URL(c.req.url).searchParams);
      if (Object.keys(query).length > 0) {
        console.log('   Query:', JSON.stringify(query));
      }
      
      // Log body for POST/PUT/PATCH
      if (['POST', 'PUT', 'PATCH'].includes(method)) {
        try {
          const body = await c.req.raw.clone().json();
          // Mask sensitive fields
          const maskedBody = maskSensitiveData(body);
          console.log('   Body:', JSON.stringify(maskedBody));
        } catch {
          // Not JSON body
        }
      }
    }
    
    try {
      await next();
      
      const duration = Date.now() - start;
      const status = c.res.status;
      
      // Color-coded status
      const statusColor = status < 300 ? '✅' : status < 400 ? '↪️' : status < 500 ? '⚠️' : '❌';
      
      if (c.env.ENVIRONMENT === 'development') {
        console.log(`📤 ${statusColor} ${status} (${duration}ms)`);
      }
      
      // Track errors
      if (status >= 400) {
        const log: RequestLog = {
          timestamp: new Date().toISOString(),
          method,
          path,
          status,
          duration,
          userId: c.get('user')?.id,
        };
        
        recentErrors.unshift(log);
        if (recentErrors.length > MAX_ERRORS) {
          recentErrors.pop();
        }
      }
    } catch (err) {
      const duration = Date.now() - start;
      const error = err as Error;
      
      console.error(`\n❌ ERROR in ${method} ${path}`);
      console.error(`   Message: ${error.message}`);
      if (c.env.ENVIRONMENT === 'development') {
        console.error(`   Stack: ${error.stack}`);
      }
      
      // Track error
      const log: RequestLog = {
        timestamp: new Date().toISOString(),
        method,
        path,
        status: 500,
        duration,
        error: error.message,
        stack: error.stack,
        userId: c.get('user')?.id,
      };
      
      recentErrors.unshift(log);
      if (recentErrors.length > MAX_ERRORS) {
        recentErrors.pop();
      }
      
      throw err;
    }
  };
}

function maskSensitiveData(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;
  
  const sensitiveFields = ['password', 'token', 'secret', 'key', 'apiKey', 'api_key', 'accessToken', 'refreshToken'];
  const masked = { ...obj };
  
  for (const field of sensitiveFields) {
    if (field in masked) {
      masked[field] = '***REDACTED***';
    }
  }
  
  return masked;
}

// Debug endpoint to view recent errors (dev only)
export function getRecentErrors() {
  return recentErrors;
}

export function clearErrors() {
  recentErrors.length = 0;
}
