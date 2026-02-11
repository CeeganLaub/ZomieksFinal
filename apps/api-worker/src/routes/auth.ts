import { Hono } from 'hono';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { SignJWT, jwtVerify } from 'jose';
import { users, refreshTokens, sellerProfiles, userRoles } from '@zomieks/db';
import { createId } from '@paralleldrive/cuid2';
import bcrypt from 'bcryptjs';
import type { Env } from '../types';
import { authMiddleware, requireAuth } from '../middleware/auth';
import { authRateLimit } from '../middleware/rate-limit';
import { validate, getValidatedBody } from '../middleware/validation';

const app = new Hono<{ Bindings: Env }>();

// Schemas
const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(100),
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/),
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8).max(100),
});

// Helper: Hash password using SubtleCrypto
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const hash = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    256
  );
  const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');
  const hashHex = Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
  return `${saltHex}:${hashHex}`;
}

async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  // Detect bcrypt hashes (migrated from Express/Prisma)
  if (storedHash.startsWith('$2a$') || storedHash.startsWith('$2b$')) {
    return bcrypt.compare(password, storedHash);
  }

  // PBKDF2 format: saltHex:hashHex
  const [saltHex, hashHex] = storedHash.split(':');
  if (!saltHex || !hashHex) return false;
  
  const salt = new Uint8Array(saltHex.match(/.{2}/g)!.map(byte => parseInt(byte, 16)));
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const hash = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    256
  );
  const computedHashHex = Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
  return computedHashHex === hashHex;
}

// Helper: Check if hash needs migration from bcrypt to PBKDF2
function needsRehash(storedHash: string): boolean {
  return storedHash.startsWith('$2a$') || storedHash.startsWith('$2b$');
}

// Helper: Generate tokens
async function generateTokens(userId: string, env: Env) {
  const accessSecret = new TextEncoder().encode(env.JWT_SECRET);
  const refreshSecret = new TextEncoder().encode(env.JWT_REFRESH_SECRET);
  
  const accessToken = await new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('15m')
    .sign(accessSecret);
  
  const refreshToken = await new SignJWT({ sub: userId, type: 'refresh' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(refreshSecret);
  
  return { accessToken, refreshToken };
}

// Helper: Format user response
function formatUserResponse(user: any, sellerProfile?: any) {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    firstName: user.firstName,
    lastName: user.lastName,
    avatar: user.avatar,
    isSeller: user.isSeller,
    isAdmin: user.isAdmin,
    sellerProfile: sellerProfile ? {
      displayName: sellerProfile.displayName,
      professionalTitle: sellerProfile.professionalTitle,
      rating: sellerProfile.rating / 100, // Convert from integer
      reviewCount: sellerProfile.reviewCount,
      isVerified: sellerProfile.isVerified,
    } : undefined,
  };
}

// POST /register
app.post('/register', authRateLimit, validate(registerSchema), async (c) => {
  const body = getValidatedBody<z.infer<typeof registerSchema>>(c);
  const db = c.get('db');
  
  // Check if email or username exists
  const existing = await db.query.users.findFirst({
    where: (users, { or, eq }) => or(
      eq(users.email, body.email.toLowerCase()),
      eq(users.username, body.username.toLowerCase())
    ),
  });
  
  if (existing) {
    const field = existing.email === body.email.toLowerCase() ? 'email' : 'username';
    return c.json({
      success: false,
      error: { message: `This ${field} is already registered` },
    }, 400);
  }
  
  // Hash password and create user
  const passwordHash = await hashPassword(body.password);
  const userId = createId();
  
  await db.insert(users).values({
    id: userId,
    email: body.email.toLowerCase(),
    username: body.username.toLowerCase(),
    passwordHash,
    firstName: body.firstName,
    lastName: body.lastName,
  });
  
  // Add buyer role
  await db.insert(userRoles).values({
    userId,
    role: 'BUYER',
  });
  
  // Get created user
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });
  
  // Generate tokens
  const tokens = await generateTokens(userId, c.env);
  
  // Store refresh token
  await db.insert(refreshTokens).values({
    userId,
    token: tokens.refreshToken,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  });
  
  // TODO: Queue email verification email
  
  return c.json({
    success: true,
    data: {
      user: formatUserResponse(user),
      accessToken: tokens.accessToken,
    },
  }, 201);
});

// POST /login
app.post('/login', authRateLimit, validate(loginSchema), async (c) => {
  const body = getValidatedBody<z.infer<typeof loginSchema>>(c);
  const db = c.get('db');
  
  // Find user
  const user = await db.query.users.findFirst({
    where: eq(users.email, body.email.toLowerCase()),
    with: {
      sellerProfile: true,
    },
  });
  
  if (!user) {
    return c.json({
      success: false,
      error: { message: 'Invalid email or password' },
    }, 401);
  }
  
  if (user.isSuspended) {
    return c.json({
      success: false,
      error: { message: 'Your account has been suspended' },
    }, 403);
  }
  
  // Verify password
  const isValid = await verifyPassword(body.password, user.passwordHash);
  if (!isValid) {
    return c.json({
      success: false,
      error: { message: 'Invalid email or password' },
    }, 401);
  }
  
  // Migrate bcrypt hash to PBKDF2 on successful login
  const newHash = needsRehash(user.passwordHash)
    ? await hashPassword(body.password)
    : null;

  // Update last login (and password hash if migrating)
  await db.update(users)
    .set({
      lastLoginAt: new Date().toISOString(),
      ...(newHash ? { passwordHash: newHash } : {}),
    })
    .where(eq(users.id, user.id));
  
  // Generate tokens
  const tokens = await generateTokens(user.id, c.env);
  
  // Store refresh token
  await db.insert(refreshTokens).values({
    userId: user.id,
    token: tokens.refreshToken,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  });
  
  return c.json({
    success: true,
    data: {
      user: formatUserResponse(user, user.sellerProfile),
      accessToken: tokens.accessToken,
    },
  });
});

// POST /refresh
app.post('/refresh', async (c) => {
  const body = await c.req.json<{ refreshToken?: string }>();
  const db = c.get('db');
  
  if (!body.refreshToken) {
    return c.json({
      success: false,
      error: { message: 'Refresh token required' },
    }, 400);
  }
  
  try {
    // Verify refresh token
    const secret = new TextEncoder().encode(c.env.JWT_REFRESH_SECRET);
    const { payload } = await jwtVerify(body.refreshToken, secret);
    
    if (!payload.sub || payload.type !== 'refresh') {
      throw new Error('Invalid token');
    }
    
    // Check if token exists in DB
    const storedToken = await db.query.refreshTokens.findFirst({
      where: eq(refreshTokens.token, body.refreshToken),
    });
    
    if (!storedToken || new Date(storedToken.expiresAt) < new Date()) {
      throw new Error('Token expired');
    }
    
    // Delete old token
    await db.delete(refreshTokens).where(eq(refreshTokens.token, body.refreshToken));
    
    // Generate new tokens
    const tokens = await generateTokens(payload.sub, c.env);
    
    // Store new refresh token
    await db.insert(refreshTokens).values({
      userId: payload.sub,
      token: tokens.refreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    });
    
    return c.json({
      success: true,
      data: { accessToken: tokens.accessToken },
    });
  } catch {
    return c.json({
      success: false,
      error: { message: 'Invalid refresh token' },
    }, 401);
  }
});

// GET /me
app.get('/me', authMiddleware, requireAuth, async (c) => {
  const authedUser = c.get('user')!;
  const db = c.get('db');
  
  const user = await db.query.users.findFirst({
    where: eq(users.id, authedUser.id),
    with: {
      sellerProfile: true,
    },
  });
  
  if (!user) {
    return c.json({
      success: false,
      error: { message: 'User not found' },
    }, 404);
  }
  
  return c.json({
    success: true,
    data: {
      user: formatUserResponse(user, user.sellerProfile),
    },
  });
});

// POST /logout
app.post('/logout', authMiddleware, async (c) => {
  const authHeader = c.req.header('Authorization');
  const db = c.get('db');
  
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    // Delete all refresh tokens for this user
    const user = c.get('user');
    if (user) {
      await db.delete(refreshTokens).where(eq(refreshTokens.userId, user.id));
    }
  }
  
  return c.json({ success: true });
});

// POST /forgot-password
app.post('/forgot-password', authRateLimit, validate(forgotPasswordSchema), async (c) => {
  const body = getValidatedBody<z.infer<typeof forgotPasswordSchema>>(c);
  const db = c.get('db');
  
  // Always return success to prevent email enumeration
  const user = await db.query.users.findFirst({
    where: eq(users.email, body.email.toLowerCase()),
  });
  
  if (user) {
    // TODO: Generate reset token and queue email
    // Store reset token in KV with 1 hour expiry
    const resetToken = createId();
    await c.env.CACHE.put(`password-reset:${resetToken}`, user.id, {
      expirationTtl: 3600, // 1 hour
    });
    
    // TODO: Queue email with reset link
  }
  
  return c.json({
    success: true,
    message: 'If an account exists with this email, you will receive a password reset link',
  });
});

// POST /reset-password
app.post('/reset-password', authRateLimit, validate(resetPasswordSchema), async (c) => {
  const body = getValidatedBody<z.infer<typeof resetPasswordSchema>>(c);
  const db = c.get('db');
  
  // Get user ID from reset token
  const userId = await c.env.CACHE.get(`password-reset:${body.token}`);
  
  if (!userId) {
    return c.json({
      success: false,
      error: { message: 'Invalid or expired reset token' },
    }, 400);
  }
  
  // Hash new password and update
  const passwordHash = await hashPassword(body.password);
  await db.update(users)
    .set({ passwordHash, updatedAt: new Date().toISOString() })
    .where(eq(users.id, userId));
  
  // Delete reset token
  await c.env.CACHE.delete(`password-reset:${body.token}`);
  
  // Invalidate all refresh tokens
  await db.delete(refreshTokens).where(eq(refreshTokens.userId, userId));
  
  return c.json({
    success: true,
    message: 'Password has been reset successfully',
  });
});

export default app;
