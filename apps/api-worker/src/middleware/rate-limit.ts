import { Context, Next } from 'hono';
import type { Env } from '../types';

interface RateLimitOptions {
  limit: number;       // Max requests
  windowMs: number;    // Time window in ms
  keyPrefix?: string;  // Prefix for KV key
}

export function rateLimit(options: RateLimitOptions) {
  const { limit, windowMs, keyPrefix = 'rl' } = options;
  const windowSec = Math.ceil(windowMs / 1000);
  
  return async (c: Context<{ Bindings: Env }>, next: Next) => {
    // Get identifier (user ID or IP)
    const user = c.get('user');
    const identifier = user?.id || c.req.header('CF-Connecting-IP') || 'unknown';
    
    const key = `${keyPrefix}:${identifier}`;
    
    try {
      // Get current count from KV
      const current = await c.env.RATE_LIMIT.get(key);
      const count = current ? parseInt(current, 10) : 0;
      
      if (count >= limit) {
        return c.json({
          success: false,
          error: { message: 'Too many requests, please try again later' },
        }, 429);
      }
      
      // Increment counter
      await c.env.RATE_LIMIT.put(key, String(count + 1), {
        expirationTtl: windowSec,
      });
      
      // Set rate limit headers
      c.header('X-RateLimit-Limit', String(limit));
      c.header('X-RateLimit-Remaining', String(limit - count - 1));
      
      return next();
    } catch (err) {
      // If rate limit fails, allow the request through
      console.error('Rate limit error:', err);
      return next();
    }
  };
}

// Preset rate limiters
export const authRateLimit = rateLimit({
  limit: 5,
  windowMs: 15 * 60 * 1000, // 5 attempts per 15 minutes
  keyPrefix: 'auth',
});

export const apiRateLimit = rateLimit({
  limit: 100,
  windowMs: 60 * 1000, // 100 requests per minute
  keyPrefix: 'api',
});

export const uploadRateLimit = rateLimit({
  limit: 20,
  windowMs: 60 * 1000, // 20 uploads per minute
  keyPrefix: 'upload',
});
