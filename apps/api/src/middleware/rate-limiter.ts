import rateLimit from 'express-rate-limit';
import { redis } from '@/lib/redis.js';

// Custom Redis store for rate limiting
class RedisStore {
  prefix: string;
  
  constructor(prefix = 'rl:') {
    this.prefix = prefix;
  }

  async increment(key: string): Promise<{ totalHits: number; resetTime: Date }> {
    const results = await redis
      .multi()
      .incr(`${this.prefix}${key}`)
      .ttl(`${this.prefix}${key}`)
      .exec();

    const totalHits = results?.[0]?.[1] as number;
    const ttl = results?.[1]?.[1] as number;

    // Set expiry on first hit
    if (totalHits === 1) {
      await redis.expire(`${this.prefix}${key}`, 60);
    }

    const resetTime = new Date(Date.now() + ttl * 1000);
    return { totalHits, resetTime };
  }

  async decrement(key: string): Promise<void> {
    await redis.decr(`${this.prefix}${key}`);
  }

  async resetKey(key: string): Promise<void> {
    await redis.del(`${this.prefix}${key}`);
  }
}

// General API rate limiter
export const rateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests, please try again later',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.ip || req.headers['x-forwarded-for']?.toString() || 'unknown';
  },
});

// Strict rate limiter for auth endpoints
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per 15 minutes
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many login attempts, please try again later',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Upload rate limiter
export const uploadRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 uploads per minute
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many upload attempts, please try again later',
    },
  },
});
