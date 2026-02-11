import { Hono } from 'hono';
import { z } from 'zod';
import { eq, and, like, desc, asc, gte, lte, or, sql, isNull, count } from 'drizzle-orm';
import { services, servicePackages, categories, users, sellerProfiles, reviews, favorites, orders } from '@zomieks/db';
import { createId } from '@paralleldrive/cuid2';
import type { Env } from '../types';
import { authMiddleware, requireAuth, requireSeller } from '../middleware/auth';
import { validate, getValidatedBody } from '../middleware/validation';

const app = new Hono<{ Bindings: Env }>();

// Apply auth middleware to all routes (optional auth)
app.use('*', authMiddleware);

// Schemas
const createServiceSchema = z.object({
  title: z.string().min(10).max(100),
  description: z.string().min(100).max(5000),
  categoryId: z.string(),
  pricingType: z.enum(['ONE_TIME', 'SUBSCRIPTION', 'BOTH']),
  tags: z.array(z.string()).max(5).optional(),
  requirements: z.string().max(2000).optional(),
  faqs: z.array(z.object({
    question: z.string(),
    answer: z.string(),
  })).max(10).optional(),
});

const createPackageSchema = z.object({
  tier: z.enum(['BASIC', 'STANDARD', 'PREMIUM']),
  name: z.string().min(1).max(50),
  description: z.string().min(10).max(500),
  price: z.number().min(50).max(1000000), // In ZAR (will convert to cents)
  deliveryDays: z.number().min(1).max(90),
  revisions: z.number().min(0).max(99),
  features: z.array(z.string()).max(10),
});

// Helper: Generate slug
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 50);
}

// Helper: Format service for response
function formatService(service: any) {
  return {
    id: service.id,
    title: service.title,
    slug: service.slug,
    description: service.description,
    pricingType: service.pricingType,
    images: service.images || [],
    video: service.video,
    tags: service.tags || [],
    faqs: service.faqs,
    requirements: service.requirements,
    rating: service.rating / 100,
    reviewCount: service.reviewCount,
    orderCount: service.orderCount,
    status: service.status,
    isActive: service.isActive,
    createdAt: service.createdAt,
    category: service.category ? {
      id: service.category.id,
      name: service.category.name,
      slug: service.category.slug,
    } : null,
    seller: service.seller ? {
      id: service.seller.id,
      username: service.seller.username,
      firstName: service.seller.firstName,
      lastName: service.seller.lastName,
      avatar: service.seller.avatar,
      sellerProfile: service.seller.sellerProfile ? {
        displayName: service.seller.sellerProfile.displayName,
        level: service.seller.sellerProfile.level,
        rating: service.seller.sellerProfile.rating / 100,
        reviewCount: service.seller.sellerProfile.reviewCount,
        isVerified: service.seller.sellerProfile.isVerified,
      } : null,
    } : null,
    packages: (service.packages || []).map((pkg: any) => ({
      id: pkg.id,
      tier: pkg.tier,
      name: pkg.name,
      description: pkg.description,
      price: pkg.price / 100, // Convert cents to ZAR
      deliveryDays: pkg.deliveryDays,
      revisions: pkg.revisions,
      features: pkg.features || [],
    })),
  };
}

// GET /meta/categories - Get all categories
app.get('/meta/categories', async (c) => {
  const db = c.get('db');
  
  const allCategories = await db.query.categories.findMany({
    where: eq(categories.isActive, true),
    orderBy: [asc(categories.order), asc(categories.name)],
  });
  
  // Build tree structure
  const parentCategories = allCategories.filter(cat => !cat.parentId);
  const result = parentCategories.map(parent => ({
    id: parent.id,
    name: parent.name,
    slug: parent.slug,
    icon: parent.icon,
    image: parent.image,
    subcategories: allCategories
      .filter(sub => sub.parentId === parent.id)
      .map(sub => ({
        id: sub.id,
        name: sub.name,
        slug: sub.slug,
      })),
  }));
  
  return c.json({
    success: true,
    data: result,
  });
});

// GET /meta/stats - Public stats
app.get('/meta/stats', async (c) => {
  const db = c.get('db');
  
  // Get counts (in production, cache these in KV)
  const [userCount] = await db.select({ count: count() }).from(users);
  const [serviceCount] = await db.select({ count: count() }).from(services).where(eq(services.status, 'ACTIVE'));
  const [orderCount] = await db.select({ count: count() }).from(orders).where(eq(orders.status, 'COMPLETED'));
  
  // Get average rating from reviews
  const avgRatingResult = await db.select({
    avg: sql<number>`COALESCE(AVG(rating), 0)`,
  }).from(reviews);
  
  return c.json({
    success: true,
    data: {
      totalUsers: userCount?.count || 0,
      totalServices: serviceCount?.count || 0,
      averageRating: Number((avgRatingResult[0]?.avg || 0).toFixed(1)),
      completedOrders: orderCount?.count || 0,
    },
  });
});

// GET / - List services with filters
app.get('/', async (c) => {
  const db = c.get('db');
  
  // Query params
  const page = parseInt(c.req.query('page') || '1');
  const limit = Math.min(parseInt(c.req.query('limit') || '20'), 50);
  const search = c.req.query('search');
  const category = c.req.query('category');
  const minPrice = c.req.query('minPrice');
  const maxPrice = c.req.query('maxPrice');
  const deliveryDays = c.req.query('deliveryDays');
  const sortBy = c.req.query('sortBy') || 'createdAt';
  const sortOrder = c.req.query('sortOrder') || 'desc';
  
  // Build where conditions
  const conditions = [
    eq(services.status, 'ACTIVE'),
    eq(services.isActive, true),
  ];
  
  if (search) {
    conditions.push(or(
      like(services.title, `%${search}%`),
      like(services.description, `%${search}%`)
    )!);
  }
  
  if (category) {
    // Find category by slug
    const cat = await db.query.categories.findFirst({
      where: eq(categories.slug, category),
    });
    if (cat) {
      conditions.push(eq(services.categoryId, cat.id));
    }
  }
  
  // Get services
  const offset = (page - 1) * limit;
  
  // Build order by clause based on sortBy param
  const getOrderBy = () => {
    const direction = sortOrder === 'desc' ? desc : asc;
    switch (sortBy) {
      case 'rating':
        return direction(services.rating);
      case 'reviewCount':
        return direction(services.reviewCount);
      case 'orderCount':
        return direction(services.orderCount);
      case 'price':
        return direction(services.createdAt); // Price sorting done post-query
      default:
        return direction(services.createdAt);
    }
  };
  
  const allServices = await db.query.services.findMany({
    where: and(...conditions),
    with: {
      category: true,
      seller: {
        with: {
          sellerProfile: true,
        },
      },
      packages: {
        where: eq(servicePackages.isActive, true),
      },
    },
    orderBy: getOrderBy(),
    limit,
    offset,
  });
  
  // Get total count
  const [totalResult] = await db.select({ count: count() })
    .from(services)
    .where(and(...conditions));
  
  const total = totalResult?.count || 0;
  
  // Filter by price if specified (after fetch since price is in packages)
  let filtered = allServices;
  if (minPrice || maxPrice) {
    filtered = allServices.filter(service => {
      const prices = service.packages.map(p => p.price);
      if (prices.length === 0) return false;
      const min = Math.min(...prices);
      if (minPrice && min < parseInt(minPrice) * 100) return false;
      if (maxPrice && min > parseInt(maxPrice) * 100) return false;
      return true;
    });
  }
  
  // Filter by delivery days
  if (deliveryDays) {
    filtered = filtered.filter(service => {
      const days = service.packages.map(p => p.deliveryDays);
      if (days.length === 0) return false;
      return Math.min(...days) <= parseInt(deliveryDays);
    });
  }
  
  return c.json({
    success: true,
    data: {
      services: filtered.map(formatService),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    },
  });
});

// GET /:username/:slug - Get single service
app.get('/:username/:slug', async (c) => {
  const { username, slug } = c.req.param();
  const db = c.get('db');
  const user = c.get('user');
  
  // Find seller by username
  const seller = await db.query.users.findFirst({
    where: eq(users.username, username.toLowerCase()),
  });
  
  if (!seller) {
    return c.json({
      success: false,
      error: { message: 'Service not found' },
    }, 404);
  }
  
  // Find service
  const service = await db.query.services.findFirst({
    where: and(
      eq(services.sellerId, seller.id),
      eq(services.slug, slug)
    ),
    with: {
      category: {
        with: {
          parent: true,
        },
      },
      seller: {
        with: {
          sellerProfile: true,
        },
      },
      packages: {
        where: eq(servicePackages.isActive, true),
        orderBy: asc(servicePackages.price),
      },
      reviews: {
        with: {
          author: true,
        },
        orderBy: desc(reviews.createdAt),
        limit: 10,
      },
    },
  });
  
  if (!service) {
    return c.json({
      success: false,
      error: { message: 'Service not found' },
    }, 404);
  }
  
  // Check if user has favorited
  let isFavorited = false;
  if (user) {
    const fav = await db.query.favorites.findFirst({
      where: and(
        eq(favorites.userId, user.id),
        eq(favorites.serviceId, service.id)
      ),
    });
    isFavorited = !!fav;
  }
  
  // Increment view count
  await db.update(services)
    .set({ viewCount: service.viewCount + 1 })
    .where(eq(services.id, service.id));
  
  const formatted = formatService(service);
  
  return c.json({
    success: true,
    data: {
      ...formatted,
      isFavorited,
      reviews: service.reviews.map(review => ({
        id: review.id,
        rating: review.rating,
        comment: review.comment,
        communicationRating: review.communicationRating,
        qualityRating: review.qualityRating,
        valueRating: review.valueRating,
        sellerResponse: review.sellerResponse,
        createdAt: review.createdAt,
        author: {
          id: review.author.id,
          username: review.author.username,
          firstName: review.author.firstName,
          avatar: review.author.avatar,
        },
      })),
    },
  });
});

// POST / - Create service (seller only)
app.post('/', requireAuth, requireSeller, validate(createServiceSchema), async (c) => {
  const body = getValidatedBody<z.infer<typeof createServiceSchema>>(c);
  const user = c.get('user')!;
  const db = c.get('db');
  
  // Verify category exists
  const category = await db.query.categories.findFirst({
    where: eq(categories.id, body.categoryId),
  });
  
  if (!category) {
    return c.json({
      success: false,
      error: { message: 'Invalid category' },
    }, 400);
  }
  
  // Generate unique slug
  let slug = slugify(body.title);
  const existing = await db.query.services.findFirst({
    where: and(
      eq(services.sellerId, user.id),
      eq(services.slug, slug)
    ),
  });
  
  if (existing) {
    slug = `${slug}-${createId().substring(0, 6)}`;
  }
  
  // Create service
  const serviceId = createId();
  await db.insert(services).values({
    id: serviceId,
    sellerId: user.id,
    categoryId: body.categoryId,
    title: body.title,
    slug,
    description: body.description,
    pricingType: body.pricingType,
    tags: body.tags || [],
    faqs: body.faqs,
    requirements: body.requirements,
    status: 'DRAFT',
  });
  
  const service = await db.query.services.findFirst({
    where: eq(services.id, serviceId),
    with: {
      category: true,
      seller: {
        with: { sellerProfile: true },
      },
      packages: true,
    },
  });
  
  return c.json({
    success: true,
    data: formatService(service),
  }, 201);
});

// POST /:id/packages - Add package to service
app.post('/:id/packages', requireAuth, requireSeller, validate(createPackageSchema), async (c) => {
  const { id } = c.req.param();
  const body = getValidatedBody<z.infer<typeof createPackageSchema>>(c);
  const user = c.get('user')!;
  const db = c.get('db');
  
  // Verify service ownership
  const service = await db.query.services.findFirst({
    where: and(
      eq(services.id, id),
      eq(services.sellerId, user.id)
    ),
  });
  
  if (!service) {
    return c.json({
      success: false,
      error: { message: 'Service not found' },
    }, 404);
  }
  
  // Check if tier already exists
  const existingPackage = await db.query.servicePackages.findFirst({
    where: and(
      eq(servicePackages.serviceId, id),
      eq(servicePackages.tier, body.tier)
    ),
  });
  
  if (existingPackage) {
    // Update existing package
    await db.update(servicePackages)
      .set({
        name: body.name,
        description: body.description,
        price: Math.round(body.price * 100), // Convert to cents
        deliveryDays: body.deliveryDays,
        revisions: body.revisions,
        features: body.features,
        isActive: true,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(servicePackages.id, existingPackage.id));
  } else {
    // Create new package
    await db.insert(servicePackages).values({
      serviceId: id,
      tier: body.tier,
      name: body.name,
      description: body.description,
      price: Math.round(body.price * 100), // Convert to cents
      deliveryDays: body.deliveryDays,
      revisions: body.revisions,
      features: body.features,
    });
  }
  
  // Get updated service
  const updated = await db.query.services.findFirst({
    where: eq(services.id, id),
    with: {
      category: true,
      seller: { with: { sellerProfile: true } },
      packages: { orderBy: asc(servicePackages.price) },
    },
  });
  
  return c.json({
    success: true,
    data: formatService(updated),
  });
});

// PATCH /:id - Update service
app.patch('/:id', requireAuth, requireSeller, async (c) => {
  const { id } = c.req.param();
  const body = await c.req.json();
  const user = c.get('user')!;
  const db = c.get('db');
  
  // Verify ownership
  const service = await db.query.services.findFirst({
    where: and(
      eq(services.id, id),
      eq(services.sellerId, user.id)
    ),
  });
  
  if (!service) {
    return c.json({
      success: false,
      error: { message: 'Service not found' },
    }, 404);
  }
  
  // Build update object
  const updates: Partial<typeof services.$inferInsert> = {};
  
  if (body.title) updates.title = body.title;
  if (body.description) updates.description = body.description;
  if (body.tags) updates.tags = body.tags;
  if (body.faqs) updates.faqs = body.faqs;
  if (body.requirements) updates.requirements = body.requirements;
  if (body.images) updates.images = body.images;
  if (body.video !== undefined) updates.video = body.video;
  if (typeof body.isActive === 'boolean') updates.isActive = body.isActive;
  if (typeof body.isPaused === 'boolean') updates.isPaused = body.isPaused;
  
  updates.updatedAt = new Date().toISOString();
  
  await db.update(services)
    .set(updates)
    .where(eq(services.id, id));
  
  const updated = await db.query.services.findFirst({
    where: eq(services.id, id),
    with: {
      category: true,
      seller: { with: { sellerProfile: true } },
      packages: true,
    },
  });
  
  return c.json({
    success: true,
    data: formatService(updated),
  });
});

// POST /:id/publish - Publish service for review
app.post('/:id/publish', requireAuth, requireSeller, async (c) => {
  const { id } = c.req.param();
  const user = c.get('user')!;
  const db = c.get('db');
  
  const service = await db.query.services.findFirst({
    where: and(
      eq(services.id, id),
      eq(services.sellerId, user.id)
    ),
    with: {
      packages: true,
    },
  });
  
  if (!service) {
    return c.json({
      success: false,
      error: { message: 'Service not found' },
    }, 404);
  }
  
  // Validate service has at least one package
  if (service.packages.length === 0) {
    return c.json({
      success: false,
      error: { message: 'Service must have at least one package' },
    }, 400);
  }
  
  // Update status
  await db.update(services)
    .set({ 
      status: 'ACTIVE', // Auto-approve for now
      updatedAt: new Date().toISOString(),
    })
    .where(eq(services.id, id));
  
  return c.json({
    success: true,
    message: 'Service published successfully',
  });
});

// DELETE /:id - Delete service
app.delete('/:id', requireAuth, requireSeller, async (c) => {
  const { id } = c.req.param();
  const user = c.get('user')!;
  const db = c.get('db');
  
  const service = await db.query.services.findFirst({
    where: and(
      eq(services.id, id),
      eq(services.sellerId, user.id)
    ),
  });
  
  if (!service) {
    return c.json({
      success: false,
      error: { message: 'Service not found' },
    }, 404);
  }
  
  // Soft delete
  await db.update(services)
    .set({ 
      isActive: false,
      status: 'PAUSED',
      updatedAt: new Date().toISOString(),
    })
    .where(eq(services.id, id));
  
  return c.json({ success: true });
});

export default app;
