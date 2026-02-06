import { Router } from 'express';
import { authenticate, optionalAuth } from '@/middleware/auth.js';
import { prisma } from '@/lib/prisma.js';
import { validate } from '@/middleware/validate.js';
import { updateProfileSchema, sellerOnboardingSchema, SELLER_FEE_AMOUNT } from '@zomieks/shared';

const router = Router();

// Get user favorites (must be before /:username to avoid matching "favorites" as username)
router.get('/favorites', authenticate, async (req, res, next) => {
  try {
    const favorites = await prisma.favorite.findMany({
      where: { userId: req.user!.id },
      include: {
        service: {
          select: {
            id: true,
            title: true,
            slug: true,
            images: true,
            rating: true,
            reviewCount: true,
            seller: {
              select: {
                username: true,
                sellerProfile: { select: { displayName: true } },
              },
            },
            packages: {
              where: { tier: 'BASIC' },
              select: { price: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: { favorites } });
  } catch (error) {
    next(error);
  }
});

// Add favorite
router.post('/favorites/:serviceId', authenticate, async (req, res, next) => {
  try {
    const { serviceId } = req.params;

    const service = await prisma.service.findUnique({ where: { id: serviceId } });
    if (!service) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Service not found' },
      });
    }

    await prisma.favorite.upsert({
      where: { userId_serviceId: { userId: req.user!.id, serviceId } },
      create: { userId: req.user!.id, serviceId },
      update: {},
    });

    await prisma.service.update({
      where: { id: serviceId },
      data: { favoriteCount: { increment: 1 } },
    });

    res.json({ success: true, data: null });
  } catch (error) {
    next(error);
  }
});

// Remove favorite
router.delete('/favorites/:serviceId', authenticate, async (req, res, next) => {
  try {
    const { serviceId } = req.params;

    const existing = await prisma.favorite.findUnique({
      where: { userId_serviceId: { userId: req.user!.id, serviceId } },
    });

    if (existing) {
      await prisma.favorite.delete({
        where: { userId_serviceId: { userId: req.user!.id, serviceId } },
      });

      await prisma.service.update({
        where: { id: serviceId },
        data: { favoriteCount: { decrement: 1 } },
      });
    }

    res.json({ success: true, data: null });
  } catch (error) {
    next(error);
  }
});

// Seller dashboard stats (must be before /:username)
router.get('/seller/stats', authenticate, async (req, res, next) => {
  try {
    if (!req.user!.isSeller) {
      return res.status(403).json({
        success: false,
        error: { code: 'NOT_A_SELLER', message: 'Seller account required' },
      });
    }

    const [orders, earnings, conversations, profile] = await Promise.all([
      prisma.order.aggregate({
        where: { sellerId: req.user!.id },
        _count: { id: true },
      }),
      prisma.order.aggregate({
        where: { sellerId: req.user!.id, status: 'COMPLETED' },
        _sum: { sellerPayout: true },
      }),
      prisma.conversation.count({
        where: { sellerId: req.user!.id, status: 'OPEN' },
      }),
      prisma.sellerProfile.findUnique({
        where: { userId: req.user!.id },
        select: { rating: true, reviewCount: true, completedOrders: true, sellerFeePaid: true },
      }),
    ]);

    res.json({
      success: true,
      data: {
        totalOrders: orders._count.id,
        totalEarnings: earnings._sum.sellerPayout || 0,
        openConversations: conversations,
        rating: profile?.rating || 0,
        reviewCount: profile?.reviewCount || 0,
        completedOrders: profile?.completedOrders || 0,
        sellerFeePaid: profile?.sellerFeePaid || false,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Check seller fee status
router.get('/seller/fee-status', authenticate, async (req, res, next) => {
  try {
    const profile = await prisma.sellerProfile.findUnique({
      where: { userId: req.user!.id },
      select: { sellerFeePaid: true, sellerFeePaidAt: true },
    });

    res.json({
      success: true,
      data: {
        feeAmount: SELLER_FEE_AMOUNT,
        feePaid: profile?.sellerFeePaid || false,
        feePaidAt: profile?.sellerFeePaidAt || null,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Pay seller fee (R399 one-time)
router.post('/seller/pay-fee', authenticate, async (req, res, next) => {
  try {
    const profile = await prisma.sellerProfile.findUnique({
      where: { userId: req.user!.id },
    });

    if (!profile) {
      return res.status(403).json({
        success: false,
        error: { code: 'NOT_A_SELLER', message: 'Become a seller first' },
      });
    }

    if (profile.sellerFeePaid) {
      return res.status(400).json({
        success: false,
        error: { code: 'ALREADY_PAID', message: 'Seller fee already paid' },
      });
    }

    // For now, mark as paid directly (in production, redirect to PayFast)
    // In a real implementation you'd create a PayFast payment and handle via webhook
    await prisma.sellerProfile.update({
      where: { id: profile.id },
      data: {
        sellerFeePaid: true,
        sellerFeePaidAt: new Date(),
        sellerFeeTransactionId: `SF-${Date.now()}`, // placeholder
      },
    });

    res.json({
      success: true,
      data: { message: 'Seller fee paid successfully! You can now create courses.' },
    });
  } catch (error) {
    next(error);
  }
});

// Get user profile by username
router.get('/:username', optionalAuth, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { username: (req.params.username as string).toLowerCase() },
      select: {
        id: true,
        username: true,
        firstName: true,
        lastName: true,
        avatar: true,
        bio: true,
        country: true,
        isSeller: true,
        createdAt: true,
        sellerProfile: {
          select: {
            displayName: true,
            professionalTitle: true,
            description: true,
            skills: true,
            languages: true,
            rating: true,
            reviewCount: true,
            completedOrders: true,
            level: true,
            isVerified: true,
            isAvailable: true,
          },
        },
        services: {
          where: { isActive: true, status: 'ACTIVE' },
          select: {
            id: true,
            title: true,
            slug: true,
            images: true,
            rating: true,
            reviewCount: true,
            packages: {
              where: { tier: 'BASIC' },
              select: { price: true },
            },
          },
          take: 10,
        },
        receivedReviews: {
          where: { isPublic: true },
          select: {
            id: true,
            rating: true,
            comment: true,
            createdAt: true,
            author: {
              select: {
                username: true,
                firstName: true,
                avatar: true,
              },
            },
          },
          take: 5,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'User not found' },
      });
    }

    res.json({ success: true, data: { user } });
  } catch (error) {
    next(error);
  }
});

// Update own profile
router.patch(
  '/profile',
  authenticate,
  validate(updateProfileSchema),
  async (req, res, next) => {
    try {
      const user = await prisma.user.update({
        where: { id: req.user!.id },
        data: req.body,
        select: {
          id: true,
          email: true,
          username: true,
          firstName: true,
          lastName: true,
          avatar: true,
          bio: true,
          country: true,
          timezone: true,
          isSeller: true,
        },
      });

      res.json({ success: true, data: { user } });
    } catch (error) {
      next(error);
    }
  }
);

// Become a seller
router.post(
  '/become-seller',
  authenticate,
  validate(sellerOnboardingSchema),
  async (req, res, next) => {
    try {
      // Check SA-only restriction for selling
      const currentUser = await prisma.user.findUnique({
        where: { id: req.user!.id },
        select: { country: true, firstName: true, lastName: true },
      });

      if (!currentUser?.country || currentUser.country.toUpperCase() !== 'ZA') {
        return res.status(403).json({
          success: false,
          error: { code: 'COUNTRY_RESTRICTED', message: 'Selling is currently available to South African users only. International support coming soon!' },
        });
      }

      const { displayName, professionalTitle, description, skills, languages, bankDetails, idNumber } = req.body;

      // Create seller profile
      const [user] = await prisma.$transaction([
        prisma.user.update({
          where: { id: req.user!.id },
          data: {
            isSeller: true,
            roles: {
              create: { role: 'SELLER' },
            },
            sellerProfile: {
              create: {
                displayName,
                professionalTitle,
                description,
                skills,
                languages,
                idNumber,
                kycStatus: 'PENDING',
              },
            },
            bankDetails: {
              create: {
                bankName: bankDetails.bankName,
                accountNumber: bankDetails.accountNumber,
                branchCode: bankDetails.branchCode,
                accountType: bankDetails.accountType,
                accountHolder: bankDetails.accountHolder || `${currentUser.firstName} ${currentUser.lastName}`,
              },
            },
          },
          include: {
            sellerProfile: true,
            roles: true,
          },
        }),
        // Create default pipeline stages
        prisma.pipelineStage.createMany({
          data: [
            { userId: req.user!.id, name: 'New Lead', order: 0, color: '#3B82F6', isDefault: true },
            { userId: req.user!.id, name: 'Contacted', order: 1, color: '#F59E0B' },
            { userId: req.user!.id, name: 'Quoted', order: 2, color: '#8B5CF6' },
            { userId: req.user!.id, name: 'Negotiating', order: 3, color: '#EC4899' },
            { userId: req.user!.id, name: 'Won', order: 4, color: '#10B981' },
            { userId: req.user!.id, name: 'Lost', order: 5, color: '#EF4444' },
          ],
        }),
      ]);

      res.status(201).json({ success: true, data: { user } });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
