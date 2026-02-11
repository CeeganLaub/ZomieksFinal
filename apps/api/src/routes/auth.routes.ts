import { Router } from 'express';
import { authService } from '@/services/auth.service.js';
import { prisma } from '@/lib/prisma.js';
import { authenticate } from '@/middleware/auth.js';
import { authRateLimiter } from '@/middleware/rate-limiter.js';
import { validate } from '@/middleware/validate.js';
import { 
  loginSchema, 
  registerSchema, 
  forgotPasswordSchema, 
  resetPasswordSchema 
} from '@zomieks/shared';
import { z } from 'zod';

const router = Router();

// Register
router.post(
  '/register',
  authRateLimiter,
  validate(registerSchema),
  async (req, res, next) => {
    try {
      const result = await authService.register(req.body);
      
      // Set refresh token as HTTP-only cookie
      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });
      
      res.status(201).json({
        success: true,
        data: {
          user: result.user,
          accessToken: result.accessToken,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Login
router.post(
  '/login',
  authRateLimiter,
  validate(loginSchema),
  async (req, res, next) => {
    try {
      const result = await authService.login(req.body);
      
      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });
      
      res.json({
        success: true,
        data: {
          user: result.user,
          accessToken: result.accessToken,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Refresh token
router.post('/refresh', async (req, res, next) => {
  try {
    const refreshToken = req.cookies.refreshToken || req.body.refreshToken;
    
    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        error: { code: 'NO_TOKEN', message: 'Refresh token required' },
      });
    }
    
    const result = await authService.refreshToken(refreshToken);
    
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    
    res.json({
      success: true,
      data: {
        user: result.user,
        accessToken: result.accessToken,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Logout
router.post('/logout', authenticate, async (req, res, next) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    
    if (refreshToken) {
      await authService.logout(refreshToken, req.user!.id);
    }
    
    res.clearCookie('refreshToken');
    
    res.json({ success: true, data: { message: 'Logged out successfully' } });
  } catch (error) {
    next(error);
  }
});

// Logout all sessions
router.post('/logout-all', authenticate, async (req, res, next) => {
  try {
    await authService.logoutAll(req.user!.id);
    
    res.clearCookie('refreshToken');
    
    res.json({ success: true, data: { message: 'Logged out of all sessions' } });
  } catch (error) {
    next(error);
  }
});

// Forgot password
router.post(
  '/forgot-password',
  authRateLimiter,
  validate(forgotPasswordSchema),
  async (req, res, next) => {
    try {
      await authService.forgotPassword(req.body.email);
      
      res.json({
        success: true,
        data: { message: 'If an account exists with this email, a reset link has been sent' },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Reset password
router.post(
  '/reset-password',
  authRateLimiter,
  validate(resetPasswordSchema),
  async (req, res, next) => {
    try {
      await authService.resetPassword(req.body.token, req.body.password);
      
      res.json({
        success: true,
        data: { message: 'Password has been reset successfully' },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Change password (authenticated)
router.post(
  '/change-password',
  authenticate,
  validate(z.object({
    currentPassword: z.string(),
    newPassword: z.string().min(8),
  })),
  async (req, res, next) => {
    try {
      await authService.changePassword(
        req.user!.id,
        req.body.currentPassword,
        req.body.newPassword
      );
      
      res.json({
        success: true,
        data: { message: 'Password changed successfully' },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get current user
router.get('/me', authenticate, async (req, res) => {
  res.json({
    success: true,
    data: { user: req.user },
  });
});

// Guest upgrade — convert a guest user created by guest-start into a full account
router.post(
  '/guest-upgrade',
  authenticate,
  validate(z.object({
    username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/),
    password: z.string().min(8).regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/),
    firstName: z.string().min(1).max(50),
    lastName: z.string().min(1).max(50),
    country: z.string().min(2).max(3).default('ZA'),
  })),
  async (req, res, next) => {
    try {
      const userId = req.user!.id;
      const { username, password, firstName, lastName, country } = req.body;

      // Verify current user is a guest (username starts with guest_)
      const currentUser = await prisma.user.findUnique({ where: { id: userId } });
      if (!currentUser || !currentUser.username.startsWith('guest_')) {
        return res.status(400).json({
          success: false,
          error: { code: 'NOT_GUEST', message: 'This account is not a guest account' },
        });
      }

      // Check username uniqueness
      const existing = await prisma.user.findUnique({ where: { username: username.toLowerCase() } });
      if (existing && existing.id !== userId) {
        return res.status(409).json({
          success: false,
          error: { code: 'USERNAME_TAKEN', message: 'Username is already taken' },
        });
      }

      // Hash password and update user
      const { hash } = await import('bcryptjs');
      const passwordHash = await hash(password, 12);

      await prisma.user.update({
        where: { id: userId },
        data: {
          username: username.toLowerCase(),
          firstName,
          lastName,
          country,
          passwordHash,
          emailVerified: true, // Trust the email from guest-start
        },
      });

      // Generate fresh tokens
      const tokens = await authService.generateTokens(userId);

      res.cookie('refreshToken', tokens.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      res.json({
        success: true,
        data: {
          accessToken: tokens.accessToken,
          user: { id: userId, username: username.toLowerCase(), firstName, lastName },
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
