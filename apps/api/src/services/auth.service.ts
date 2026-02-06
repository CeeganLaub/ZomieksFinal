import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma.js';
import { redis } from '@/lib/redis.js';
import { env } from '@/config/env.js';
import { AppError } from '@/middleware/error-handler.js';
import type { JwtPayload } from '@/middleware/auth.js';
import type { RegisterInput, LoginInput } from '@zomieks/shared';

const SALT_ROUNDS = 12;

export const authService = {
  async register(data: RegisterInput) {
    // Check if email exists
    const existingEmail = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase() },
    });
    
    if (existingEmail) {
      throw new AppError(409, 'EMAIL_EXISTS', 'An account with this email already exists');
    }
    
    // Check if username exists
    const existingUsername = await prisma.user.findUnique({
      where: { username: data.username.toLowerCase() },
    });
    
    if (existingUsername) {
      throw new AppError(409, 'USERNAME_EXISTS', 'This username is already taken');
    }
    
    // Hash password
    const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);
    
    // Create user with BUYER role
    const user = await prisma.user.create({
      data: {
        email: data.email.toLowerCase(),
        username: data.username.toLowerCase(),
        passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        roles: {
          create: { role: 'BUYER' },
        },
      },
      include: { roles: true },
    });
    
    // Generate tokens
    const tokens = await this.generateTokens(user.id);
    
    // TODO: Send verification email
    
    return {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        isSeller: user.isSeller,
        isAdmin: user.isAdmin,
        roles: user.roles.map(r => r.role),
      },
      ...tokens,
    };
  },

  async login(data: LoginInput) {
    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase() },
      include: { roles: true },
    });
    
    if (!user) {
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
    }
    
    if (user.isSuspended) {
      throw new AppError(403, 'ACCOUNT_SUSPENDED', user.suspendedReason || 'Your account has been suspended');
    }
    
    // Verify password
    const isValidPassword = await bcrypt.compare(data.password, user.passwordHash);
    
    if (!isValidPassword) {
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
    }
    
    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });
    
    // Generate tokens
    const tokens = await this.generateTokens(user.id);
    
    return {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        avatar: user.avatar,
        isSeller: user.isSeller,
        isAdmin: user.isAdmin,
        roles: user.roles.map(r => r.role),
      },
      ...tokens,
    };
  },

  async refreshToken(refreshToken: string) {
    // Verify refresh token
    let decoded: JwtPayload;
    try {
      decoded = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as JwtPayload;
    } catch {
      throw new AppError(401, 'INVALID_TOKEN', 'Invalid refresh token');
    }
    
    if (decoded.type !== 'refresh') {
      throw new AppError(401, 'INVALID_TOKEN', 'Invalid token type');
    }
    
    // Check if token exists in database
    const storedToken = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: { include: { roles: true } } },
    });
    
    if (!storedToken || storedToken.expiresAt < new Date()) {
      if (storedToken) {
        await prisma.refreshToken.delete({ where: { id: storedToken.id } });
      }
      throw new AppError(401, 'TOKEN_EXPIRED', 'Refresh token has expired');
    }
    
    // Delete old token and generate new ones
    await prisma.refreshToken.delete({ where: { id: storedToken.id } });
    
    const tokens = await this.generateTokens(storedToken.user.id);
    
    return {
      user: {
        id: storedToken.user.id,
        email: storedToken.user.email,
        username: storedToken.user.username,
        firstName: storedToken.user.firstName,
        lastName: storedToken.user.lastName,
        avatar: storedToken.user.avatar,
        isSeller: storedToken.user.isSeller,
        isAdmin: storedToken.user.isAdmin,
        roles: storedToken.user.roles.map(r => r.role),
      },
      ...tokens,
    };
  },

  async logout(refreshToken: string, userId: string) {
    // Delete the refresh token
    await prisma.refreshToken.deleteMany({
      where: { 
        token: refreshToken,
        userId,
      },
    });
  },

  async logoutAll(userId: string) {
    // Delete all refresh tokens for user
    await prisma.refreshToken.deleteMany({
      where: { userId },
    });
    
    // Invalidate all access tokens via Redis blacklist
    await redis.setex(`blacklist:user:${userId}`, 900, '1'); // 15 min (access token lifetime)
  },

  async generateTokens(userId: string) {
    const accessToken = jwt.sign(
      { userId, type: 'access' } as JwtPayload,
      env.JWT_ACCESS_SECRET,
      { expiresIn: env.JWT_ACCESS_EXPIRES_IN } as jwt.SignOptions
    );
    
    const refreshToken = jwt.sign(
      { userId, type: 'refresh' } as JwtPayload,
      env.JWT_REFRESH_SECRET,
      { expiresIn: env.JWT_REFRESH_EXPIRES_IN } as jwt.SignOptions
    );
    
    // Store refresh token
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    
    await prisma.refreshToken.create({
      data: {
        userId,
        token: refreshToken,
        expiresAt,
      },
    });
    
    return { accessToken, refreshToken };
  },

  async forgotPassword(email: string) {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
    
    // Always return success to prevent email enumeration
    if (!user) return;
    
    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    
    // Store in Redis with 1 hour expiry
    await redis.setex(`reset:${hashedToken}`, 3600, user.id);
    
    // TODO: Send password reset email with token
    // For now, log it (remove in production)
    console.log(`Password reset token for ${email}: ${resetToken}`);
  },

  async resetPassword(token: string, newPassword: string) {
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    
    const userId = await redis.get(`reset:${hashedToken}`);
    
    if (!userId) {
      throw new AppError(400, 'INVALID_TOKEN', 'Password reset token is invalid or expired');
    }
    
    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    
    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });
    
    // Delete reset token
    await redis.del(`reset:${hashedToken}`);
    
    // Logout all sessions
    await this.logoutAll(userId);
  },

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });
    
    if (!user) {
      throw new AppError(404, 'USER_NOT_FOUND', 'User not found');
    }
    
    // Verify current password
    const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
    
    if (!isValid) {
      throw new AppError(400, 'INVALID_PASSWORD', 'Current password is incorrect');
    }
    
    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    
    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });
    
    // Logout all other sessions
    await this.logoutAll(userId);
  },
};
