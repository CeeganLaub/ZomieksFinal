import { Router } from 'express';
import { authenticate, optionalAuth, requireSeller } from '@/middleware/auth.js';
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

// ============ SELLER ANALYTICS ============

// Get seller analytics data
router.get('/seller/analytics', authenticate, requireSeller, async (req, res, next) => {
  try {
    const userId = req.user!.id;

    // Fetch seller profile for biolink and profile stats
    const sellerProfile = await prisma.sellerProfile.findUnique({
      where: { userId },
      select: {
        id: true,
        rating: true,
        reviewCount: true,
        completedOrders: true,
        onTimeDeliveryRate: true,
        responseTimeMinutes: true,
        level: true,
        bioEnabled: true,
      },
    });

    if (!sellerProfile) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Seller profile not found' },
      });
    }

    // Fetch services with stats
    const services = await prisma.service.findMany({
      where: { sellerId: userId },
      select: {
        id: true,
        title: true,
        slug: true,
        status: true,
        isActive: true,
        rating: true,
        reviewCount: true,
        orderCount: true,
        viewCount: true,
        favoriteCount: true,
        createdAt: true,
        packages: {
          where: { tier: 'BASIC' },
          select: { price: true },
        },
      },
      orderBy: { orderCount: 'desc' },
    });

    // Fetch courses with stats
    const courses = await prisma.course.findMany({
      where: { sellerId: sellerProfile.id },
      select: {
        id: true,
        title: true,
        slug: true,
        status: true,
        rating: true,
        reviewCount: true,
        enrollCount: true,
        price: true,
        totalDuration: true,
        createdAt: true,
        _count: {
          select: { reviews: true },
        },
      },
      orderBy: { enrollCount: 'desc' },
    });

    // Aggregate order stats by status
    const ordersByStatus = await prisma.order.groupBy({
      by: ['status'],
      where: { sellerId: userId },
      _count: { id: true },
      _sum: { totalAmount: true, sellerPayout: true },
    });

    // Monthly earnings (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const completedOrders = await prisma.order.findMany({
      where: {
        sellerId: userId,
        status: 'COMPLETED',
        completedAt: { gte: sixMonthsAgo },
      },
      select: {
        sellerPayout: true,
        completedAt: true,
      },
      orderBy: { completedAt: 'asc' },
    });

    // Group monthly earnings
    const monthlyEarnings: Record<string, number> = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthlyEarnings[key] = 0;
    }
    completedOrders.forEach((o) => {
      if (o.completedAt) {
        const key = `${o.completedAt.getFullYear()}-${String(o.completedAt.getMonth() + 1).padStart(2, '0')}`;
        if (key in monthlyEarnings) {
          monthlyEarnings[key] += Number(o.sellerPayout || 0);
        }
      }
    });

    // Total revenue and order stats
    const totalRevenue = ordersByStatus.reduce(
      (sum, s) => sum + Number(s._sum.sellerPayout || 0),
      0
    );
    const totalOrders = ordersByStatus.reduce(
      (sum, s) => sum + s._count.id,
      0
    );

    // Service aggregate stats
    const totalServiceViews = services.reduce((sum, s) => sum + s.viewCount, 0);
    const totalServiceOrders = services.reduce((sum, s) => sum + s.orderCount, 0);
    const totalServiceFavorites = services.reduce((sum, s) => sum + s.favoriteCount, 0);
    const conversionRate = totalServiceViews > 0
      ? ((totalServiceOrders / totalServiceViews) * 100)
      : 0;

    // Course aggregate stats
    const totalEnrollments = courses.reduce((sum, c) => sum + c.enrollCount, 0);
    const totalCourseRevenue = courses.reduce(
      (sum, c) => sum + (c.enrollCount * Number(c.price)),
      0
    );

    res.json({
      success: true,
      data: {
        overview: {
          totalRevenue,
          totalOrders,
          totalServiceViews,
          conversionRate: Number(conversionRate.toFixed(2)),
          totalEnrollments,
          rating: Number(sellerProfile.rating),
          reviewCount: sellerProfile.reviewCount,
          completedOrders: sellerProfile.completedOrders,
          onTimeDeliveryRate: Number(sellerProfile.onTimeDeliveryRate),
          responseTimeMinutes: sellerProfile.responseTimeMinutes,
          level: sellerProfile.level,
        },
        services: services.map((s) => ({
          id: s.id,
          title: s.title,
          slug: s.slug,
          status: s.status,
          isActive: s.isActive,
          rating: Number(s.rating),
          reviewCount: s.reviewCount,
          orderCount: s.orderCount,
          viewCount: s.viewCount,
          favoriteCount: s.favoriteCount,
          startingPrice: s.packages[0] ? Number(s.packages[0].price) : 0,
          conversionRate: s.viewCount > 0
            ? Number(((s.orderCount / s.viewCount) * 100).toFixed(2))
            : 0,
          createdAt: s.createdAt,
        })),
        courses: courses.map((c) => ({
          id: c.id,
          title: c.title,
          slug: c.slug,
          status: c.status,
          rating: Number(c.rating),
          reviewCount: c.reviewCount,
          enrollCount: c.enrollCount,
          price: Number(c.price),
          totalDuration: c.totalDuration,
          estimatedRevenue: c.enrollCount * Number(c.price),
          createdAt: c.createdAt,
        })),
        biolink: {
          enabled: sellerProfile.bioEnabled,
        },
        ordersByStatus: ordersByStatus.map((s) => ({
          status: s.status,
          count: s._count.id,
          totalAmount: Number(s._sum.totalAmount || 0),
        })),
        monthlyEarnings: Object.entries(monthlyEarnings).map(([month, amount]) => ({
          month,
          amount,
        })),
        totals: {
          services: {
            count: services.length,
            activeCount: services.filter((s) => s.isActive && s.status === 'ACTIVE').length,
            totalViews: totalServiceViews,
            totalOrders: totalServiceOrders,
            totalFavorites: totalServiceFavorites,
          },
          courses: {
            count: courses.length,
            publishedCount: courses.filter((c) => c.status === 'PUBLISHED').length,
            totalEnrollments,
            estimatedRevenue: totalCourseRevenue,
          },
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// ============ BIOLINK ENDPOINTS ============

// Get own BioLink settings (for builder)
router.get('/seller/biolink', authenticate, requireSeller, async (req, res, next) => {
  try {
    const profile = await prisma.sellerProfile.findUnique({
      where: { userId: req.user!.id },
      select: {
        bioHeadline: true,
        bioCoverImage: true,
        bioThemeColor: true,
        bioBackgroundColor: true,
        bioTextColor: true,
        bioButtonStyle: true,
        bioFont: true,
        bioSocialLinks: true,
        bioFeaturedItems: true,
        bioCtaText: true,
        bioEnabled: true,
        displayName: true,
        professionalTitle: true,
        subscription: { select: { status: true } },
      },
    });

    if (!profile) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Seller profile not found' },
      });
    }

    res.json({ success: true, data: { biolink: profile } });
  } catch (error) {
    next(error);
  }
});

// Update BioLink settings
router.put('/seller/biolink', authenticate, requireSeller, async (req, res, next) => {
  try {
    const {
      bioHeadline,
      bioCoverImage,
      bioThemeColor,
      bioBackgroundColor,
      bioTextColor,
      bioButtonStyle,
      bioFont,
      bioSocialLinks,
      bioFeaturedItems,
      bioCtaText,
      bioEnabled,
    } = req.body;

    const profile = await prisma.sellerProfile.update({
      where: { userId: req.user!.id },
      data: {
        ...(bioHeadline !== undefined && { bioHeadline }),
        ...(bioCoverImage !== undefined && { bioCoverImage }),
        ...(bioThemeColor !== undefined && { bioThemeColor }),
        ...(bioBackgroundColor !== undefined && { bioBackgroundColor }),
        ...(bioTextColor !== undefined && { bioTextColor }),
        ...(bioButtonStyle !== undefined && { bioButtonStyle }),
        ...(bioFont !== undefined && { bioFont }),
        ...(bioSocialLinks !== undefined && { bioSocialLinks }),
        ...(bioFeaturedItems !== undefined && { bioFeaturedItems }),
        ...(bioCtaText !== undefined && { bioCtaText }),
        ...(bioEnabled !== undefined && { bioEnabled }),
      },
      select: {
        bioHeadline: true,
        bioCoverImage: true,
        bioThemeColor: true,
        bioBackgroundColor: true,
        bioTextColor: true,
        bioButtonStyle: true,
        bioFont: true,
        bioSocialLinks: true,
        bioFeaturedItems: true,
        bioCtaText: true,
        bioEnabled: true,
      },
    });

    res.json({ success: true, data: { biolink: profile } });
  } catch (error) {
    next(error);
  }
});

// Toggle BioLink on/off
router.post('/seller/biolink/toggle', authenticate, requireSeller, async (req, res, next) => {
  try {
    const profile = await prisma.sellerProfile.findUnique({
      where: { userId: req.user!.id },
      select: { bioEnabled: true, id: true },
    });

    if (!profile) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Seller profile not found' },
      });
    }

    const updated = await prisma.sellerProfile.update({
      where: { id: profile.id },
      data: { bioEnabled: !profile.bioEnabled },
      select: { bioEnabled: true },
    });

    res.json({ success: true, data: { bioEnabled: updated.bioEnabled } });
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
            id: true,
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
            // BioLink fields
            bioHeadline: true,
            bioCoverImage: true,
            bioThemeColor: true,
            bioBackgroundColor: true,
            bioTextColor: true,
            bioButtonStyle: true,
            bioFont: true,
            bioSocialLinks: true,
            bioFeaturedItems: true,
            bioCtaText: true,
            bioEnabled: true,
            // Courses from this seller
            courses: {
              where: { status: 'PUBLISHED' },
              select: {
                id: true,
                title: true,
                slug: true,
                thumbnail: true,
                price: true,
                rating: true,
                reviewCount: true,
                enrollCount: true,
                level: true,
              },
              take: 10,
            },
            // Subscription status (for BioLink display logic)
            subscription: {
              select: { status: true },
            },
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
