import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '@/config/env.js';
import { prisma } from '@/lib/prisma.js';
import { redis } from '@/lib/redis.js';
import { AppError } from '@/middleware/error-handler.js';
import type { Role } from '@prisma/client';

const AUTH_CACHE_TTL = 300; // 5 minutes

export interface AuthUser {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  isSeller: boolean;
  isAdmin: boolean;
  roles: Role[];
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export interface JwtPayload {
  userId: string;
  type: 'access' | 'refresh';
}

export const authenticate = async (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader?.startsWith('Bearer ')) {
      throw new AppError(401, 'UNAUTHORIZED', 'Authentication required');
    }
    
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtPayload;
    
    if (decoded.type !== 'access') {
      throw new AppError(401, 'INVALID_TOKEN', 'Invalid token type');
    }
    
    // Check if user has been logged out of all sessions (blacklist)
    const isBlacklisted = await redis.get(`blacklist:user:${decoded.userId}`);
    if (isBlacklisted) {
      throw new AppError(401, 'SESSION_INVALIDATED', 'Session has been invalidated. Please login again.');
    }
    
    // Check Redis cache first, then fall back to DB
    const cacheKey = `auth:user:${decoded.userId}`;
    let authUser: AuthUser | null = null;

    const cached = await redis.get(cacheKey);
    if (cached) {
      authUser = JSON.parse(cached);
    }

    if (!authUser) {
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        include: { roles: true },
      });
      
      if (!user) {
        throw new AppError(401, 'USER_NOT_FOUND', 'User no longer exists');
      }
      
      if (user.isSuspended) {
        throw new AppError(403, 'ACCOUNT_SUSPENDED', 'Your account has been suspended');
      }
      
      authUser = {
        id: user.id,
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        isSeller: user.isSeller,
        isAdmin: user.isAdmin,
        roles: user.roles.map(r => r.role),
      };

      // Cache for subsequent requests
      await redis.setex(cacheKey, AUTH_CACHE_TTL, JSON.stringify(authUser));
    }
    
    req.user = authUser;
    
    next();
  } catch (error) {
    next(error);
  }
};

// Optional authentication - doesn't fail if no token
export const optionalAuth = async (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader?.startsWith('Bearer ')) {
      return next();
    }
    
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtPayload;
    
    if (decoded.type === 'access') {
      // Use Redis cache like authenticate middleware for consistent performance
      const cacheKey = `auth:user:${decoded.userId}`;
      const cached = await redis.get(cacheKey);

      if (cached) {
        req.user = JSON.parse(cached);
      } else {
        const user = await prisma.user.findUnique({
          where: { id: decoded.userId },
          include: { roles: true },
        });
        
        if (user && !user.isSuspended) {
          req.user = {
            id: user.id,
            email: user.email,
            username: user.username,
            firstName: user.firstName,
            lastName: user.lastName,
            isSeller: user.isSeller,
            isAdmin: user.isAdmin,
            roles: user.roles.map(r => r.role),
          };

          await redis.setex(cacheKey, AUTH_CACHE_TTL, JSON.stringify(req.user));
        }
      }
    }
    
    next();
  } catch {
    // Ignore token errors for optional auth
    next();
  }
};

// Role-based access control
export const requireRole = (...allowedRoles: Role[]) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError(401, 'UNAUTHORIZED', 'Authentication required'));
    }
    
    const hasRole = req.user.roles.some(role => allowedRoles.includes(role));
    
    if (!hasRole && !req.user.isAdmin) {
      return next(new AppError(403, 'FORBIDDEN', 'Insufficient permissions'));
    }
    
    next();
  };
};

// Require seller status
export const requireSeller = (req: Request, _res: Response, next: NextFunction) => {
  if (!req.user) {
    return next(new AppError(401, 'UNAUTHORIZED', 'Authentication required'));
  }
  
  if (!req.user.isSeller) {
    return next(new AppError(403, 'NOT_A_SELLER', 'Seller account required'));
  }
  
  next();
};

// Require admin status
export const requireAdmin = (req: Request, _res: Response, next: NextFunction) => {
  if (!req.user) {
    return next(new AppError(401, 'UNAUTHORIZED', 'Authentication required'));
  }
  
  if (!req.user.isAdmin) {
    return next(new AppError(403, 'NOT_ADMIN', 'Admin access required'));
  }
  
  next();
};

// Require active seller subscription (R399/month Pro plan)
export const requireActiveSubscription = async (req: Request, _res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return next(new AppError(401, 'UNAUTHORIZED', 'Authentication required'));
    }

    if (!req.user.isSeller) {
      return next(new AppError(403, 'NOT_A_SELLER', 'Seller account required'));
    }

    const sellerProfile = await prisma.sellerProfile.findUnique({
      where: { userId: req.user.id },
      include: { subscription: true },
    });

    if (!sellerProfile?.subscription || sellerProfile.subscription.status !== 'ACTIVE') {
      return next(new AppError(403, 'SUBSCRIPTION_REQUIRED', 'An active Zomieks Pro subscription is required'));
    }

    // Check if subscription period has expired
    if (new Date() > sellerProfile.subscription.currentPeriodEnd) {
      await prisma.sellerSubscription.update({
        where: { id: sellerProfile.subscription.id },
        data: { status: 'EXPIRED' },
      });
      return next(new AppError(403, 'SUBSCRIPTION_EXPIRED', 'Your Zomieks Pro subscription has expired'));
    }

    next();
  } catch (error) {
    next(error);
  }
};
