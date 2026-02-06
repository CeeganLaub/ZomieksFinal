import { Router } from 'express';
import { authenticate, optionalAuth, requireSeller } from '@/middleware/auth.js';
import { prisma } from '@/lib/prisma.js';
import { validate } from '@/middleware/validate.js';
import { createServiceSchema, servicePackageSchema, subscriptionTierSchema, slugify } from '@zomieks/shared';
import { z } from 'zod';

const router = Router();

// List services with filters
router.get('/', optionalAuth, async (req, res, next) => {
  try {
    const {
      category,
      search,
      minPrice,
      maxPrice,
      deliveryTime,
      sellerLevel,
      sortBy = 'recommended',
      page = '1',
      limit = '20',
    } = req.query;

    const where: any = {
      isActive: true,
      status: 'ACTIVE',
    };

    if (category) {
      where.category = { slug: category };
    }

    if (search) {
      where.OR = [
        { title: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } },
        { tags: { hasSome: [(search as string).toLowerCase()] } },
      ];
    }

    if (minPrice || maxPrice) {
      where.packages = {
        some: {
          tier: 'BASIC',
          price: {
            ...(minPrice && { gte: parseFloat(minPrice as string) }),
            ...(maxPrice && { lte: parseFloat(maxPrice as string) }),
          },
        },
      };
    }

    if (deliveryTime) {
      where.packages = {
        some: {
          tier: 'BASIC',
          deliveryDays: { lte: parseInt(deliveryTime as string) },
        },
      };
    }

    if (sellerLevel) {
      where.seller = {
        sellerProfile: { level: { gte: parseInt(sellerLevel as string) } },
      };
    }

    const orderBy: any = (() => {
      switch (sortBy) {
        case 'newest':
          return { createdAt: 'desc' };
        case 'rating':
          return { rating: 'desc' };
        case 'orders':
          return { orderCount: 'desc' };
        case 'price_low':
          return { packages: { _min: { price: 'asc' } } };
        case 'price_high':
          return { packages: { _max: { price: 'desc' } } };
        default:
          return [{ rating: 'desc' }, { orderCount: 'desc' }];
      }
    })();

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const take = parseInt(limit as string);

    const [services, total] = await Promise.all([
      prisma.service.findMany({
        where,
        orderBy,
        skip,
        take,
        select: {
          id: true,
          title: true,
          slug: true,
          images: true,
          rating: true,
          reviewCount: true,
          orderCount: true,
          pricingType: true,
          seller: {
            select: {
              username: true,
              avatar: true,
              sellerProfile: {
                select: { level: true, displayName: true },
              },
            },
          },
          packages: {
            where: { tier: 'BASIC' },
            select: { price: true, deliveryDays: true },
          },
          subscriptionTiers: {
            where: { isActive: true },
            select: { price: true, interval: true },
            orderBy: { price: 'asc' },
            take: 1,
          },
        },
      }),
      prisma.service.count({ where }),
    ]);

    res.json({
      success: true,
      data: { services },
      meta: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        totalPages: Math.ceil(total / parseInt(limit as string)),
      },
    });
  } catch (error) {
    next(error);
  }
});

// Get categories (MUST be before /:username/:slug to avoid route conflict)
router.get('/meta/stats', async (_req, res, next) => {
  try {
    const [totalServices, totalSellers, totalCategories] = await Promise.all([
      prisma.service.count({ where: { isActive: true, status: 'ACTIVE' } }),
      prisma.sellerProfile.count(),
      prisma.category.count(),
    ]);

    res.json({
      success: true,
      data: { totalServices, totalSellers, totalCategories },
    });
  } catch (error) {
    next(error);
  }
});

router.get('/meta/categories', async (_req, res, next) => {
  try {
    const categories = await prisma.category.findMany({
      where: { isActive: true, parentId: null },
      include: {
        children: {
          where: { isActive: true },
          orderBy: { order: 'asc' },
        },
      },
      orderBy: { order: 'asc' },
    });

    res.json({ success: true, data: { categories } });
  } catch (error) {
    next(error);
  }
});

// Get single service (PDP)
router.get('/:username/:slug', optionalAuth, async (req, res, next) => {
  try {
    const { username, slug } = req.params;

    const service = await prisma.service.findFirst({
      where: {
        slug: slug as string,
        seller: { username: (username as string).toLowerCase() },
        isActive: true,
      },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        seller: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            avatar: true,
            country: true,
            createdAt: true,
            sellerProfile: true,
          },
        },
        packages: {
          where: { isActive: true },
          orderBy: { tier: 'asc' },
        },
        subscriptionTiers: {
          where: { isActive: true },
          orderBy: { order: 'asc' },
        },
        reviews: {
          where: { isPublic: true },
          select: {
            id: true,
            rating: true,
            comment: true,
            communicationRating: true,
            qualityRating: true,
            valueRating: true,
            sellerResponse: true,
            createdAt: true,
            author: {
              select: {
                username: true,
                firstName: true,
                avatar: true,
                country: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!service) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Service not found' },
      });
    }

    // Increment view count
    await prisma.service.update({
      where: { id: service.id },
      data: { viewCount: { increment: 1 } },
    });

    res.json({ success: true, data: { service } });
  } catch (error) {
    next(error);
  }
});

// Create service (seller only)
router.post(
  '/',
  authenticate,
  requireSeller,
  validate(createServiceSchema),
  async (req, res, next) => {
    try {
      const { title, categoryId, subcategoryId, description, pricingType, tags, images, video, faqs } = req.body;

      // Generate unique slug
      let slug = slugify(title);
      const existing = await prisma.service.findFirst({
        where: { sellerId: req.user!.id, slug },
      });
      if (existing) {
        slug = `${slug}-${Date.now()}`;
      }

      const service = await prisma.service.create({
        data: {
          sellerId: req.user!.id,
          categoryId: subcategoryId || categoryId,
          title,
          slug,
          description,
          pricingType,
          tags: tags.map((t: string) => t.toLowerCase()),
          images,
          video,
          faqs,
          status: 'PENDING_REVIEW',
        },
        include: {
          category: true,
        },
      });

      res.status(201).json({ success: true, data: { service } });
    } catch (error) {
      next(error);
    }
  }
);

// Add package to service
router.post(
  '/:serviceId/packages',
  authenticate,
  requireSeller,
  validate(servicePackageSchema),
  async (req, res, next) => {
    try {
      const serviceId = req.params.serviceId as string;

      // Verify ownership
      const service = await prisma.service.findFirst({
        where: { id: serviceId, sellerId: req.user!.id },
      });

      if (!service) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Service not found' },
        });
      }

      const servicePackage = await prisma.servicePackage.upsert({
        where: {
          serviceId_tier: { serviceId, tier: req.body.tier },
        },
        create: {
          serviceId,
          ...req.body,
        },
        update: req.body,
      });

      res.status(201).json({ success: true, data: { package: servicePackage } });
    } catch (error) {
      next(error);
    }
  }
);

// Add subscription tier to service
router.post(
  '/:serviceId/subscription-tiers',
  authenticate,
  requireSeller,
  validate(subscriptionTierSchema),
  async (req, res, next) => {
    try {
      const serviceId = req.params.serviceId as string;

      const service = await prisma.service.findFirst({
        where: { id: serviceId, sellerId: req.user!.id },
      });

      if (!service) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Service not found' },
        });
      }

      // Map interval to PayFast frequency
      const payFastFrequency = ({
        MONTHLY: 3,
        QUARTERLY: 4,
        YEARLY: 6,
      } as Record<string, number>)[req.body.interval];

      const tier = await prisma.subscriptionTier.create({
        data: {
          serviceId,
          ...req.body,
          payFastFrequency,
        },
      });

      res.status(201).json({ success: true, data: { tier } });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
