import { Context, Next } from 'hono';
import { jwtVerify } from 'jose';
import { eq } from 'drizzle-orm';
import { users } from '@zomieks/db';
import type { Env } from '../types';

export async function authMiddleware(c: Context<{ Bindings: Env }>, next: Next) {
  const authHeader = c.req.header('Authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    c.set('user', null);
    return next();
  }
  
  const token = authHeader.substring(7);
  
  try {
    const secret = new TextEncoder().encode(c.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    
    if (!payload.sub || typeof payload.sub !== 'string') {
      c.set('user', null);
      return next();
    }
    
    // Get user from database
    const db = c.get('db');
    const user = await db.query.users.findFirst({
      where: eq(users.id, payload.sub),
      columns: {
        id: true,
        email: true,
        username: true,
        isSeller: true,
        isAdmin: true,
        isSuspended: true,
      },
    });
    
    if (!user || user.isSuspended) {
      c.set('user', null);
      return next();
    }
    
    c.set('user', {
      id: user.id,
      email: user.email,
      username: user.username,
      isSeller: user.isSeller,
      isAdmin: user.isAdmin,
    });
    
    return next();
  } catch (err) {
    c.set('user', null);
    return next();
  }
}

export function requireAuth(c: Context<{ Bindings: Env }>, next: Next) {
  const user = c.get('user');
  
  if (!user) {
    return c.json({
      success: false,
      error: { message: 'Authentication required' },
    }, 401);
  }
  
  return next();
}

export function requireSeller(c: Context<{ Bindings: Env }>, next: Next) {
  const user = c.get('user');
  
  if (!user) {
    return c.json({
      success: false,
      error: { message: 'Authentication required' },
    }, 401);
  }
  
  if (!user.isSeller) {
    return c.json({
      success: false,
      error: { message: 'Seller account required' },
    }, 403);
  }
  
  return next();
}

export function requireAdmin(c: Context<{ Bindings: Env }>, next: Next) {
  const user = c.get('user');
  
  if (!user) {
    return c.json({
      success: false,
      error: { message: 'Authentication required' },
    }, 401);
  }
  
  if (!user.isAdmin) {
    return c.json({
      success: false,
      error: { message: 'Admin access required' },
    }, 403);
  }
  
  return next();
}
