import { Hono } from 'hono';
import { z } from 'zod';
import { eq, and, desc } from 'drizzle-orm';
import { users, sellerProfiles, services, favorites, userRoles } from '@zomieks/db';
import { createId } from '@paralleldrive/cuid2';
import type { Env } from '../types';
import { authMiddleware, requireAuth } from '../middleware/auth';
import { validate, getValidatedBody } from '../middleware/validation';

const app = new Hono<{ Bindings: Env }>();

app.use('*', authMiddleware);

// Schemas
const updateProfileSchema = z.object({
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().min(1).max(50).optional(),
  bio: z.string().max(1000).optional(),
  country: z.string().max(50).optional(),
  timezone: z.string().max(50).optional(),
  phone: z.string().max(20).optional(),
});

const sellerOnboardingSchema = z.object({
  displayName: z.string().min(3).max(50),
  professionalTitle: z.string().min(5).max(100),
  description: z.string().min(100).max(2000),
  skills: z.array(z.string()).min(1).max(15),
  languages: z.array(z.object({
    language: z.string(),
    proficiency: z.enum(['BASIC', 'CONVERSATIONAL', 'FLUENT', 'NATIVE']),
  })).min(1).max(5),
});

// Helper: Format public user profile
function formatPublicProfile(user: any) {
  return {
    id: user.id,
    username: user.username,
    firstName: user.firstName,
    lastName: user.lastName,
    avatar: user.avatar,
    bio: user.bio,
    country: user.country,
    isSeller: user.isSeller,
    createdAt: user.createdAt,
    sellerProfile: user.sellerProfile ? {
      displayName: user.sellerProfile.displayName,
      professionalTitle: user.sellerProfile.professionalTitle,
      description: user.sellerProfile.description,
      skills: user.sellerProfile.skills,
      languages: user.sellerProfile.languages,
      rating: user.sellerProfile.rating / 100,
      reviewCount: user.sellerProfile.reviewCount,
      completedOrders: user.sellerProfile.completedOrders,
      level: user.sellerProfile.level,
      isVerified: user.sellerProfile.isVerified,
      responseTimeMinutes: user.sellerProfile.responseTimeMinutes,
      onTimeDeliveryRate: user.sellerProfile.onTimeDeliveryRate / 100,
      isAvailable: user.sellerProfile.isAvailable,
    } : null,
  };
}

// GET /:username - Get public profile
app.get('/:username', async (c) => {
  const { username } = c.req.param();
  const db = c.get('db');
  
  const user = await db.query.users.findFirst({
    where: eq(users.username, username.toLowerCase()),
    with: {
      sellerProfile: true,
      services: {
        where: and(
          eq(services.status, 'ACTIVE'),
          eq(services.isActive, true)
        ),
        with: {
          packages: true,
          category: true,
        },
        limit: 6,
      },
    },
  });
  
  if (!user || user.isSuspended) {
    return c.json({
      success: false,
      error: { message: 'User not found' },
    }, 404);
  }
  
  return c.json({
    success: true,
    data: {
      ...formatPublicProfile(user),
      services: user.services.map((service: any) => ({
        id: service.id,
        title: service.title,
        slug: service.slug,
        images: service.images,
        rating: service.rating / 100,
        reviewCount: service.reviewCount,
        startingPrice: service.packages.length > 0 
          ? Math.min(...service.packages.map((p: any) => p.price)) / 100
          : null,
        category: service.category ? {
          name: service.category.name,
          slug: service.category.slug,
        } : null,
      })),
    },
  });
});

// PATCH /profile - Update own profile
app.patch('/profile', requireAuth, validate(updateProfileSchema), async (c) => {
  const body = getValidatedBody<z.infer<typeof updateProfileSchema>>(c);
  const user = c.get('user')!;
  const db = c.get('db');
  
  const updates: Partial<typeof users.$inferInsert> = {
    updatedAt: new Date().toISOString(),
  };
  
  if (body.firstName) updates.firstName = body.firstName;
  if (body.lastName) updates.lastName = body.lastName;
  if (body.bio !== undefined) updates.bio = body.bio;
  if (body.country !== undefined) updates.country = body.country;
  if (body.timezone !== undefined) updates.timezone = body.timezone;
  if (body.phone !== undefined) updates.phone = body.phone;
  
  await db.update(users)
    .set(updates)
    .where(eq(users.id, user.id));
  
  const updated = await db.query.users.findFirst({
    where: eq(users.id, user.id),
    with: { sellerProfile: true },
  });
  
  return c.json({
    success: true,
    data: { user: formatPublicProfile(updated) },
  });
});

// POST /become-seller - Become a seller
app.post('/become-seller', requireAuth, validate(sellerOnboardingSchema), async (c) => {
  const body = getValidatedBody<z.infer<typeof sellerOnboardingSchema>>(c);
  const user = c.get('user')!;
  const db = c.get('db');
  
  // Check if already a seller
  const existing = await db.query.sellerProfiles.findFirst({
    where: eq(sellerProfiles.userId, user.id),
  });
  
  if (existing) {
    return c.json({
      success: false,
      error: { message: 'Already a seller' },
    }, 400);
  }
  
  // Create seller profile
  await db.insert(sellerProfiles).values({
    userId: user.id,
    displayName: body.displayName,
    professionalTitle: body.professionalTitle,
    description: body.description,
    skills: body.skills,
    languages: body.languages,
  });
  
  // Update user
  await db.update(users)
    .set({ isSeller: true, updatedAt: new Date().toISOString() })
    .where(eq(users.id, user.id));
  
  // Add seller role
  await db.insert(userRoles).values({
    userId: user.id,
    role: 'SELLER',
  });
  
  const updated = await db.query.users.findFirst({
    where: eq(users.id, user.id),
    with: { sellerProfile: true },
  });
  
  return c.json({
    success: true,
    data: { user: formatPublicProfile(updated) },
  });
});

// GET /favorites - Get user's favorites
app.get('/favorites', requireAuth, async (c) => {
  const user = c.get('user')!;
  const db = c.get('db');
  
  const userFavorites = await db.query.favorites.findMany({
    where: eq(favorites.userId, user.id),
    with: {
      service: {
        with: {
          seller: { with: { sellerProfile: true } },
          packages: true,
          category: true,
        },
      },
    },
    orderBy: desc(favorites.createdAt),
  });
  
  return c.json({
    success: true,
    data: userFavorites.map(fav => ({
      id: fav.id,
      serviceId: fav.serviceId,
      createdAt: fav.createdAt,
      service: {
        id: fav.service.id,
        title: fav.service.title,
        slug: fav.service.slug,
        images: fav.service.images,
        rating: fav.service.rating / 100,
        reviewCount: fav.service.reviewCount,
        startingPrice: fav.service.packages.length > 0
          ? Math.min(...fav.service.packages.map(p => p.price)) / 100
          : null,
        seller: fav.service.seller ? {
          username: fav.service.seller.username,
          sellerProfile: fav.service.seller.sellerProfile ? {
            displayName: fav.service.seller.sellerProfile.displayName,
            level: fav.service.seller.sellerProfile.level,
          } : null,
        } : null,
      },
    })),
  });
});

// POST /favorites/:serviceId - Add to favorites
app.post('/favorites/:serviceId', requireAuth, async (c) => {
  const { serviceId } = c.req.param();
  const user = c.get('user')!;
  const db = c.get('db');
  
  // Check service exists
  const service = await db.query.services.findFirst({
    where: eq(services.id, serviceId),
  });
  
  if (!service) {
    return c.json({
      success: false,
      error: { message: 'Service not found' },
    }, 404);
  }
  
  // Check if already favorited
  const existing = await db.query.favorites.findFirst({
    where: and(
      eq(favorites.userId, user.id),
      eq(favorites.serviceId, serviceId)
    ),
  });
  
  if (existing) {
    return c.json({
      success: true,
      message: 'Already in favorites',
    });
  }
  
  // Add to favorites
  await db.insert(favorites).values({
    userId: user.id,
    serviceId,
  });
  
  // Increment favorite count
  await db.update(services)
    .set({ favoriteCount: service.favoriteCount + 1 })
    .where(eq(services.id, serviceId));
  
  return c.json({
    success: true,
    message: 'Added to favorites',
  });
});

// DELETE /favorites/:serviceId - Remove from favorites
app.delete('/favorites/:serviceId', requireAuth, async (c) => {
  const { serviceId } = c.req.param();
  const user = c.get('user')!;
  const db = c.get('db');
  
  const existing = await db.query.favorites.findFirst({
    where: and(
      eq(favorites.userId, user.id),
      eq(favorites.serviceId, serviceId)
    ),
  });
  
  if (!existing) {
    return c.json({
      success: true,
      message: 'Not in favorites',
    });
  }
  
  // Remove from favorites
  await db.delete(favorites)
    .where(and(
      eq(favorites.userId, user.id),
      eq(favorites.serviceId, serviceId)
    ));
  
  // Decrement favorite count
  const service = await db.query.services.findFirst({
    where: eq(services.id, serviceId),
  });
  
  if (service && service.favoriteCount > 0) {
    await db.update(services)
      .set({ favoriteCount: service.favoriteCount - 1 })
      .where(eq(services.id, serviceId));
  }
  
  return c.json({
    success: true,
    message: 'Removed from favorites',
  });
});

export default app;
