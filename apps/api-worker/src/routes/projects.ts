import { Hono } from 'hono';
import { z } from 'zod';
import { eq, and, desc, sql, count } from 'drizzle-orm';
import { projects, projectBids, projectUpgrades, projectFiles, projectPayments, projectReviews, users, categories, sellerProfiles } from '@zomieks/db';
import { createId } from '@paralleldrive/cuid2';
import type { Env } from '../types';
import { authMiddleware, requireAuth, requireSeller } from '../middleware/auth';

const app = new Hono<{ Bindings: Env }>();

app.use('*', authMiddleware);

// Schemas
const createProjectSchema = z.object({
  title: z.string().min(10).max(200),
  description: z.string().min(30).max(5000),
  categoryId: z.string().optional(),
  budgetMin: z.number().min(50).optional(),
  budgetMax: z.number().max(1000000).optional(),
  deadline: z.string().optional(),
  skills: z.array(z.string()).max(10).optional(),
  upgrades: z.array(z.enum(['FEATURED', 'URGENT'])).optional(),
});

const createBidSchema = z.object({
  amount: z.number().min(50).max(1000000),
  deliveryDays: z.number().min(1).max(365),
  proposal: z.string().min(20).max(3000),
});

const createReviewSchema = z.object({
  revieweeId: z.string(),
  rating: z.number().min(1).max(5),
  comment: z.string().max(2000).optional(),
});

const createPaymentSchema = z.object({
  amount: z.number().min(50),
  milestoneLabel: z.string().max(200).optional(),
});

const UPGRADE_PRICE_CENTS = 10000; // R100

// ─── LIST OPEN PROJECTS (public, for sellers to browse) ───
app.get('/', async (c) => {
  const db = c.get('db');
  const page = parseInt(c.req.query('page') || '1');
  const limit = Math.min(parseInt(c.req.query('limit') || '20'), 50);
  const offset = (page - 1) * limit;
  const categoryId = c.req.query('category');
  const status = c.req.query('status') || 'OPEN';

  const conditions = [eq(projects.status, status as any)];
  if (categoryId) conditions.push(eq(projects.categoryId, categoryId));

  const [items, [{ total }]] = await Promise.all([
    db.select({
      id: projects.id,
      title: projects.title,
      description: projects.description,
      budgetMin: projects.budgetMin,
      budgetMax: projects.budgetMax,
      deadline: projects.deadline,
      skills: projects.skills,
      status: projects.status,
      bidCount: projects.bidCount,
      isFeatured: projects.isFeatured,
      isUrgent: projects.isUrgent,
      createdAt: projects.createdAt,
      buyerUsername: users.username,
      buyerAvatar: users.avatar,
      categoryName: categories.name,
    })
      .from(projects)
      .leftJoin(users, eq(projects.buyerId, users.id))
      .leftJoin(categories, eq(projects.categoryId, categories.id))
      .where(and(...conditions))
      .orderBy(desc(projects.isFeatured), desc(projects.createdAt))
      .limit(limit)
      .offset(offset),
    db.select({ total: count() }).from(projects).where(and(...conditions)),
  ]);

  return c.json({ success: true, data: items, meta: { page, limit, total } });
});

// ─── GET MY PROJECTS (buyer) ───
app.get('/mine', requireAuth, async (c) => {
  const user = c.get('user')!;
  const db = c.get('db');

  const items = await db.select({
    id: projects.id,
    title: projects.title,
    description: projects.description,
    budgetMin: projects.budgetMin,
    budgetMax: projects.budgetMax,
    deadline: projects.deadline,
    skills: projects.skills,
    status: projects.status,
    bidCount: projects.bidCount,
    isFeatured: projects.isFeatured,
    isUrgent: projects.isUrgent,
    createdAt: projects.createdAt,
  })
    .from(projects)
    .where(eq(projects.buyerId, user.id))
    .orderBy(desc(projects.createdAt));

  return c.json({ success: true, data: items });
});

// ─── GET PROJECT DETAIL ───
app.get('/:id', async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');
  const user = c.get('user');

  const project = await db.select({
    id: projects.id,
    buyerId: projects.buyerId,
    title: projects.title,
    description: projects.description,
    categoryId: projects.categoryId,
    budgetMin: projects.budgetMin,
    budgetMax: projects.budgetMax,
    deadline: projects.deadline,
    attachments: projects.attachments,
    skills: projects.skills,
    status: projects.status,
    selectedBidId: projects.selectedBidId,
    bidCount: projects.bidCount,
    isFeatured: projects.isFeatured,
    isUrgent: projects.isUrgent,
    awardedSellerId: projects.awardedSellerId,
    completedAt: projects.completedAt,
    createdAt: projects.createdAt,
    buyerUsername: users.username,
    buyerAvatar: users.avatar,
    categoryName: categories.name,
  })
    .from(projects)
    .leftJoin(users, eq(projects.buyerId, users.id))
    .leftJoin(categories, eq(projects.categoryId, categories.id))
    .where(eq(projects.id, id))
    .get();

  if (!project) return c.json({ success: false, error: { message: 'Project not found' } }, 404);

  // Get bids
  let bids: any[] = [];
  if (user && project.buyerId === user.id) {
    bids = await db.select({
      id: projectBids.id,
      amount: projectBids.amount,
      deliveryDays: projectBids.deliveryDays,
      proposal: projectBids.proposal,
      status: projectBids.status,
      createdAt: projectBids.createdAt,
      sellerId: projectBids.sellerId,
      sellerUsername: users.username,
      sellerAvatar: users.avatar,
      sellerDisplayName: sellerProfiles.displayName,
      sellerTitle: sellerProfiles.professionalTitle,
    })
      .from(projectBids)
      .leftJoin(users, eq(projectBids.sellerId, users.id))
      .leftJoin(sellerProfiles, eq(users.id, sellerProfiles.userId))
      .where(eq(projectBids.projectId, id))
      .orderBy(desc(projectBids.createdAt));
  } else if (user?.isSeller) {
    bids = await db.select({
      id: projectBids.id,
      amount: projectBids.amount,
      deliveryDays: projectBids.deliveryDays,
      proposal: projectBids.proposal,
      status: projectBids.status,
      createdAt: projectBids.createdAt,
      sellerId: projectBids.sellerId,
      sellerUsername: users.username,
      sellerAvatar: users.avatar,
      sellerDisplayName: sellerProfiles.displayName,
      sellerTitle: sellerProfiles.professionalTitle,
    })
      .from(projectBids)
      .leftJoin(users, eq(projectBids.sellerId, users.id))
      .leftJoin(sellerProfiles, eq(users.id, sellerProfiles.userId))
      .where(and(eq(projectBids.projectId, id), eq(projectBids.sellerId, user.id)))
      .orderBy(desc(projectBids.createdAt));
  }

  // Get upgrades, files, payments, reviews (visible to participants)
  const isParticipant = user && (project.buyerId === user.id || project.awardedSellerId === user.id ||
    bids.some((b: any) => b.sellerId === user.id));

  let upgrades: any[] = [];
  let files: any[] = [];
  let payments: any[] = [];
  let reviews: any[] = [];

  if (isParticipant || (user && project.buyerId === user.id)) {
    [upgrades, files, payments, reviews] = await Promise.all([
      db.select().from(projectUpgrades).where(eq(projectUpgrades.projectId, id)).orderBy(desc(projectUpgrades.createdAt)),
      db.select({
        id: projectFiles.id,
        fileName: projectFiles.fileName,
        fileUrl: projectFiles.fileUrl,
        fileSize: projectFiles.fileSize,
        fileType: projectFiles.fileType,
        createdAt: projectFiles.createdAt,
        uploadedByUsername: users.username,
      })
        .from(projectFiles)
        .leftJoin(users, eq(projectFiles.uploadedBy, users.id))
        .where(eq(projectFiles.projectId, id))
        .orderBy(desc(projectFiles.createdAt)),
      db.select().from(projectPayments).where(eq(projectPayments.projectId, id)).orderBy(desc(projectPayments.createdAt)),
      db.select({
        id: projectReviews.id,
        rating: projectReviews.rating,
        comment: projectReviews.comment,
        createdAt: projectReviews.createdAt,
        reviewerUsername: users.username,
      })
        .from(projectReviews)
        .leftJoin(users, eq(projectReviews.reviewerId, users.id))
        .where(eq(projectReviews.projectId, id)),
    ]);
  } else {
    // Non-participants can only see reviews
    reviews = await db.select({
      id: projectReviews.id,
      rating: projectReviews.rating,
      comment: projectReviews.comment,
      createdAt: projectReviews.createdAt,
      reviewerUsername: users.username,
    })
      .from(projectReviews)
      .leftJoin(users, eq(projectReviews.reviewerId, users.id))
      .where(eq(projectReviews.projectId, id));
  }

  return c.json({ success: true, data: { ...project, bids, upgrades, files, payments, reviews } });
});

// ─── CREATE PROJECT (buyer) ───
app.post('/', requireAuth, async (c) => {
  const user = c.get('user')!;
  const db = c.get('db');
  const body = await c.req.json();
  const data = createProjectSchema.parse(body);

  const now = new Date().toISOString();
  const id = createId();

  const isFeatured = data.upgrades?.includes('FEATURED') || false;
  const isUrgent = data.upgrades?.includes('URGENT') || false;

  await db.insert(projects).values({
    id,
    buyerId: user.id,
    title: data.title,
    description: data.description,
    categoryId: data.categoryId || null,
    budgetMin: data.budgetMin ? Math.round(data.budgetMin * 100) : null,
    budgetMax: data.budgetMax ? Math.round(data.budgetMax * 100) : null,
    deadline: data.deadline || null,
    skills: data.skills || [],
    status: 'OPEN',
    bidCount: 0,
    isFeatured,
    isUrgent,
    createdAt: now,
    updatedAt: now,
  });

  // Create upgrade records
  if (data.upgrades?.length) {
    for (const type of data.upgrades) {
      await db.insert(projectUpgrades).values({
        id: createId(),
        projectId: id,
        type,
        amount: UPGRADE_PRICE_CENTS,
        status: 'PAID', // For now, mark as paid (payment handled client-side or bundled)
        createdAt: now,
        updatedAt: now,
      });
    }
  }

  return c.json({ success: true, data: { id } }, 201);
});

// ─── UPDATE PROJECT (buyer, own project only) ───
app.patch('/:id', requireAuth, async (c) => {
  const user = c.get('user')!;
  const db = c.get('db');
  const id = c.req.param('id');
  const body = await c.req.json();

  const project = await db.select().from(projects).where(eq(projects.id, id)).get();
  if (!project) return c.json({ success: false, error: { message: 'Project not found' } }, 404);
  if (project.buyerId !== user.id) return c.json({ success: false, error: { message: 'Not your project' } }, 403);

  const allowed = createProjectSchema.partial().parse(body);
  const update: Record<string, any> = { updatedAt: new Date().toISOString() };
  if (allowed.title) update.title = allowed.title;
  if (allowed.description) update.description = allowed.description;
  if (allowed.categoryId !== undefined) update.categoryId = allowed.categoryId || null;
  if (allowed.budgetMin !== undefined) update.budgetMin = allowed.budgetMin ? Math.round(allowed.budgetMin * 100) : null;
  if (allowed.budgetMax !== undefined) update.budgetMax = allowed.budgetMax ? Math.round(allowed.budgetMax * 100) : null;
  if (allowed.deadline !== undefined) update.deadline = allowed.deadline || null;
  if (allowed.skills) update.skills = allowed.skills;

  await db.update(projects).set(update).where(eq(projects.id, id));
  return c.json({ success: true });
});

// ─── DELETE PROJECT (buyer, only OPEN projects) ───
app.delete('/:id', requireAuth, async (c) => {
  const user = c.get('user')!;
  const db = c.get('db');
  const id = c.req.param('id');

  const project = await db.select().from(projects).where(eq(projects.id, id)).get();
  if (!project) return c.json({ success: false, error: { message: 'Project not found' } }, 404);
  if (project.buyerId !== user.id) return c.json({ success: false, error: { message: 'Not your project' } }, 403);
  if (project.status !== 'OPEN') return c.json({ success: false, error: { message: 'Can only delete open projects' } }, 400);

  await db.delete(projects).where(eq(projects.id, id));
  return c.json({ success: true });
});

// ─── CANCEL PROJECT (buyer) ───
app.post('/:id/cancel', requireAuth, async (c) => {
  const user = c.get('user')!;
  const db = c.get('db');
  const id = c.req.param('id');

  const project = await db.select().from(projects).where(eq(projects.id, id)).get();
  if (!project) return c.json({ success: false, error: { message: 'Project not found' } }, 404);
  if (project.buyerId !== user.id) return c.json({ success: false, error: { message: 'Not your project' } }, 403);
  if (project.status !== 'OPEN') return c.json({ success: false, error: { message: 'Can only cancel open projects' } }, 400);

  await db.update(projects).set({ status: 'CANCELLED', updatedAt: new Date().toISOString() }).where(eq(projects.id, id));
  return c.json({ success: true });
});

// ─── COMPLETE PROJECT (buyer) ───
app.post('/:id/complete', requireAuth, async (c) => {
  const user = c.get('user')!;
  const db = c.get('db');
  const id = c.req.param('id');

  const project = await db.select().from(projects).where(eq(projects.id, id)).get();
  if (!project) return c.json({ success: false, error: { message: 'Project not found' } }, 404);
  if (project.buyerId !== user.id) return c.json({ success: false, error: { message: 'Not your project' } }, 403);
  if (project.status !== 'IN_PROGRESS') return c.json({ success: false, error: { message: 'Project must be in progress' } }, 400);

  const now = new Date().toISOString();
  await db.update(projects).set({ status: 'COMPLETED', completedAt: now, updatedAt: now }).where(eq(projects.id, id));
  return c.json({ success: true });
});

// ─── PLACE BID (seller) ───
app.post('/:id/bids', requireSeller, async (c) => {
  const user = c.get('user')!;
  const db = c.get('db');
  const projectId = c.req.param('id');
  const body = await c.req.json();
  const data = createBidSchema.parse(body);

  const project = await db.select().from(projects).where(eq(projects.id, projectId)).get();
  if (!project) return c.json({ success: false, error: { message: 'Project not found' } }, 404);
  if (project.status !== 'OPEN') return c.json({ success: false, error: { message: 'Project is not accepting bids' } }, 400);
  if (project.buyerId === user.id) return c.json({ success: false, error: { message: 'Cannot bid on your own project' } }, 400);

  const existing = await db.select().from(projectBids)
    .where(and(eq(projectBids.projectId, projectId), eq(projectBids.sellerId, user.id)))
    .get();
  if (existing) return c.json({ success: false, error: { message: 'You already placed a bid on this project' } }, 409);

  const now = new Date().toISOString();
  const bidId = createId();

  await db.insert(projectBids).values({
    id: bidId,
    projectId,
    sellerId: user.id,
    amount: Math.round(data.amount * 100),
    deliveryDays: data.deliveryDays,
    proposal: data.proposal,
    status: 'PENDING',
    createdAt: now,
    updatedAt: now,
  });

  await db.update(projects)
    .set({ bidCount: sql`${projects.bidCount} + 1`, updatedAt: now })
    .where(eq(projects.id, projectId));

  return c.json({ success: true, data: { id: bidId } }, 201);
});

// ─── ACCEPT BID / AWARD PROJECT (buyer) ───
app.post('/:id/bids/:bidId/accept', requireAuth, async (c) => {
  const user = c.get('user')!;
  const db = c.get('db');
  const projectId = c.req.param('id');
  const bidId = c.req.param('bidId');

  const project = await db.select().from(projects).where(eq(projects.id, projectId)).get();
  if (!project) return c.json({ success: false, error: { message: 'Project not found' } }, 404);
  if (project.buyerId !== user.id) return c.json({ success: false, error: { message: 'Not your project' } }, 403);
  if (project.status !== 'OPEN') return c.json({ success: false, error: { message: 'Project is not open' } }, 400);

  const bid = await db.select().from(projectBids).where(eq(projectBids.id, bidId)).get();
  if (!bid || bid.projectId !== projectId) return c.json({ success: false, error: { message: 'Bid not found' } }, 404);

  const now = new Date().toISOString();

  await db.update(projectBids).set({ status: 'ACCEPTED', updatedAt: now }).where(eq(projectBids.id, bidId));
  await db.update(projectBids).set({ status: 'REJECTED', updatedAt: now })
    .where(and(eq(projectBids.projectId, projectId), sql`${projectBids.id} != ${bidId}`));
  await db.update(projects).set({
    status: 'IN_PROGRESS',
    selectedBidId: bidId,
    awardedSellerId: bid.sellerId,
    updatedAt: now,
  }).where(eq(projects.id, projectId));

  return c.json({ success: true });
});

// ─── AWARD PROJECT TO SELLER (buyer, from chat - auto-creates bid if needed) ───
app.post('/:id/award', requireAuth, async (c) => {
  const user = c.get('user')!;
  const db = c.get('db');
  const projectId = c.req.param('id');
  const body = await c.req.json();
  const { sellerId, amount, deliveryDays } = z.object({
    sellerId: z.string(),
    amount: z.number().min(50),
    deliveryDays: z.number().min(1).max(365),
  }).parse(body);

  const project = await db.select().from(projects).where(eq(projects.id, projectId)).get();
  if (!project) return c.json({ success: false, error: { message: 'Project not found' } }, 404);
  if (project.buyerId !== user.id) return c.json({ success: false, error: { message: 'Not your project' } }, 403);
  if (project.status !== 'OPEN') return c.json({ success: false, error: { message: 'Project is not open' } }, 400);

  const now = new Date().toISOString();

  // Check if seller already has a bid
  let bid = await db.select().from(projectBids)
    .where(and(eq(projectBids.projectId, projectId), eq(projectBids.sellerId, sellerId)))
    .get();

  if (!bid) {
    // Auto-create bid for the awarded seller
    const bidId = createId();
    await db.insert(projectBids).values({
      id: bidId,
      projectId,
      sellerId,
      amount: Math.round(amount * 100),
      deliveryDays,
      proposal: 'Awarded directly by project owner',
      status: 'ACCEPTED',
      createdAt: now,
      updatedAt: now,
    });
    await db.update(projects)
      .set({ bidCount: sql`${projects.bidCount} + 1` })
      .where(eq(projects.id, projectId));
    bid = { id: bidId } as any;
  } else {
    // Accept existing bid
    await db.update(projectBids).set({ status: 'ACCEPTED', updatedAt: now }).where(eq(projectBids.id, bid.id));
  }

  // Reject all other bids
  await db.update(projectBids).set({ status: 'REJECTED', updatedAt: now })
    .where(and(eq(projectBids.projectId, projectId), sql`${projectBids.id} != ${bid.id}`));

  // Update project
  await db.update(projects).set({
    status: 'IN_PROGRESS',
    selectedBidId: bid.id,
    awardedSellerId: sellerId,
    updatedAt: now,
  }).where(eq(projects.id, projectId));

  return c.json({ success: true, data: { bidId: bid.id } });
});

// ─── WITHDRAW BID (seller) ───
app.delete('/:id/bids', requireSeller, async (c) => {
  const user = c.get('user')!;
  const db = c.get('db');
  const projectId = c.req.param('id');

  const bid = await db.select().from(projectBids)
    .where(and(eq(projectBids.projectId, projectId), eq(projectBids.sellerId, user.id)))
    .get();
  if (!bid) return c.json({ success: false, error: { message: 'Bid not found' } }, 404);
  if (bid.status !== 'PENDING') return c.json({ success: false, error: { message: 'Cannot withdraw a non-pending bid' } }, 400);

  await db.delete(projectBids).where(eq(projectBids.id, bid.id));
  await db.update(projects)
    .set({ bidCount: sql`MAX(${projects.bidCount} - 1, 0)`, updatedAt: new Date().toISOString() })
    .where(eq(projects.id, projectId));

  return c.json({ success: true });
});

// ─── UPGRADE PROJECT (buyer) ───
app.post('/:id/upgrade', requireAuth, async (c) => {
  const user = c.get('user')!;
  const db = c.get('db');
  const id = c.req.param('id');
  const body = await c.req.json();
  const { type } = z.object({ type: z.enum(['FEATURED', 'URGENT']) }).parse(body);

  const project = await db.select().from(projects).where(eq(projects.id, id)).get();
  if (!project) return c.json({ success: false, error: { message: 'Project not found' } }, 404);
  if (project.buyerId !== user.id) return c.json({ success: false, error: { message: 'Not your project' } }, 403);

  // Check if already upgraded with this type
  const existing = await db.select().from(projectUpgrades)
    .where(and(eq(projectUpgrades.projectId, id), eq(projectUpgrades.type, type), eq(projectUpgrades.status, 'PAID')))
    .get();
  if (existing) return c.json({ success: false, error: { message: `Already upgraded as ${type}` } }, 409);

  const now = new Date().toISOString();
  const upgradeId = createId();

  await db.insert(projectUpgrades).values({
    id: upgradeId,
    projectId: id,
    type,
    amount: UPGRADE_PRICE_CENTS,
    status: 'PAID',
    createdAt: now,
    updatedAt: now,
  });

  // Update project flags
  const update: Record<string, any> = { updatedAt: now };
  if (type === 'FEATURED') update.isFeatured = true;
  if (type === 'URGENT') update.isUrgent = true;
  await db.update(projects).set(update).where(eq(projects.id, id));

  return c.json({ success: true, data: { id: upgradeId, amount: UPGRADE_PRICE_CENTS } });
});

// ─── UPLOAD FILE ───
app.post('/:id/files', requireAuth, async (c) => {
  const user = c.get('user')!;
  const db = c.get('db');
  const projectId = c.req.param('id');

  const project = await db.select().from(projects).where(eq(projects.id, projectId)).get();
  if (!project) return c.json({ success: false, error: { message: 'Project not found' } }, 404);

  // Only buyer or awarded seller can upload files
  const isAuthorized = project.buyerId === user.id || project.awardedSellerId === user.id;
  if (!isAuthorized) return c.json({ success: false, error: { message: 'Not authorized' } }, 403);

  const body = await c.req.json();
  const { fileName, fileUrl, fileSize, fileType } = z.object({
    fileName: z.string().min(1).max(255),
    fileUrl: z.string().min(1),
    fileSize: z.number().min(0).default(0),
    fileType: z.string().optional(),
  }).parse(body);

  const fileId = createId();
  await db.insert(projectFiles).values({
    id: fileId,
    projectId,
    uploadedBy: user.id,
    fileName,
    fileUrl,
    fileSize,
    fileType: fileType || null,
    createdAt: new Date().toISOString(),
  });

  return c.json({ success: true, data: { id: fileId } }, 201);
});

// ─── LIST FILES ───
app.get('/:id/files', requireAuth, async (c) => {
  const db = c.get('db');
  const projectId = c.req.param('id');

  const files = await db.select({
    id: projectFiles.id,
    fileName: projectFiles.fileName,
    fileUrl: projectFiles.fileUrl,
    fileSize: projectFiles.fileSize,
    fileType: projectFiles.fileType,
    createdAt: projectFiles.createdAt,
    uploadedByUsername: users.username,
  })
    .from(projectFiles)
    .leftJoin(users, eq(projectFiles.uploadedBy, users.id))
    .where(eq(projectFiles.projectId, projectId))
    .orderBy(desc(projectFiles.createdAt));

  return c.json({ success: true, data: files });
});

// ─── DELETE FILE ───
app.delete('/:id/files/:fileId', requireAuth, async (c) => {
  const user = c.get('user')!;
  const db = c.get('db');
  const fileId = c.req.param('fileId');

  const file = await db.select().from(projectFiles).where(eq(projectFiles.id, fileId)).get();
  if (!file) return c.json({ success: false, error: { message: 'File not found' } }, 404);
  if (file.uploadedBy !== user.id) return c.json({ success: false, error: { message: 'Can only delete your own files' } }, 403);

  await db.delete(projectFiles).where(eq(projectFiles.id, fileId));
  return c.json({ success: true });
});

// ─── CREATE PAYMENT (buyer pays milestone) ───
app.post('/:id/payments', requireAuth, async (c) => {
  const user = c.get('user')!;
  const db = c.get('db');
  const projectId = c.req.param('id');
  const body = await c.req.json();
  const data = createPaymentSchema.parse(body);

  const project = await db.select().from(projects).where(eq(projects.id, projectId)).get();
  if (!project) return c.json({ success: false, error: { message: 'Project not found' } }, 404);
  if (project.buyerId !== user.id) return c.json({ success: false, error: { message: 'Not your project' } }, 403);
  if (!project.awardedSellerId) return c.json({ success: false, error: { message: 'No seller awarded yet' } }, 400);

  const amountCents = Math.round(data.amount * 100);
  const platformFee = Math.round(amountCents * 0.08); // 8% flat fee

  const now = new Date().toISOString();
  const paymentId = createId();

  await db.insert(projectPayments).values({
    id: paymentId,
    projectId,
    bidId: project.selectedBidId,
    payerId: user.id,
    payeeId: project.awardedSellerId,
    amount: amountCents,
    platformFee,
    status: 'HELD',
    milestoneLabel: data.milestoneLabel || null,
    createdAt: now,
    updatedAt: now,
  });

  return c.json({ success: true, data: { id: paymentId, amount: amountCents, platformFee } }, 201);
});

// ─── RELEASE PAYMENT (buyer releases to seller) ───
app.post('/:id/payments/:paymentId/release', requireAuth, async (c) => {
  const user = c.get('user')!;
  const db = c.get('db');
  const projectId = c.req.param('id');
  const paymentId = c.req.param('paymentId');

  const payment = await db.select().from(projectPayments).where(eq(projectPayments.id, paymentId)).get();
  if (!payment || payment.projectId !== projectId) return c.json({ success: false, error: { message: 'Payment not found' } }, 404);
  if (payment.payerId !== user.id) return c.json({ success: false, error: { message: 'Not your payment' } }, 403);
  if (payment.status !== 'HELD') return c.json({ success: false, error: { message: 'Payment is not held' } }, 400);

  const now = new Date().toISOString();
  await db.update(projectPayments).set({ status: 'RELEASED', releasedAt: now, updatedAt: now }).where(eq(projectPayments.id, paymentId));
  return c.json({ success: true });
});

// ─── LIST PAYMENTS ───
app.get('/:id/payments', requireAuth, async (c) => {
  const db = c.get('db');
  const projectId = c.req.param('id');

  const payments = await db.select()
    .from(projectPayments)
    .where(eq(projectPayments.projectId, projectId))
    .orderBy(desc(projectPayments.createdAt));

  return c.json({ success: true, data: payments });
});

// ─── CREATE REVIEW ───
app.post('/:id/reviews', requireAuth, async (c) => {
  const user = c.get('user')!;
  const db = c.get('db');
  const projectId = c.req.param('id');
  const body = await c.req.json();
  const data = createReviewSchema.parse(body);

  const project = await db.select().from(projects).where(eq(projects.id, projectId)).get();
  if (!project) return c.json({ success: false, error: { message: 'Project not found' } }, 404);
  if (project.status !== 'COMPLETED') return c.json({ success: false, error: { message: 'Project must be completed' } }, 400);

  // Only buyer and awarded seller can review each other
  const isBuyer = project.buyerId === user.id;
  const isSeller = project.awardedSellerId === user.id;
  if (!isBuyer && !isSeller) return c.json({ success: false, error: { message: 'Not a participant' } }, 403);

  // Verify reviewee is the other party
  if (isBuyer && data.revieweeId !== project.awardedSellerId) return c.json({ success: false, error: { message: 'Invalid reviewee' } }, 400);
  if (isSeller && data.revieweeId !== project.buyerId) return c.json({ success: false, error: { message: 'Invalid reviewee' } }, 400);

  // Check for existing review
  const existing = await db.select().from(projectReviews)
    .where(and(eq(projectReviews.projectId, projectId), eq(projectReviews.reviewerId, user.id)))
    .get();
  if (existing) return c.json({ success: false, error: { message: 'You already reviewed this project' } }, 409);

  const reviewId = createId();
  await db.insert(projectReviews).values({
    id: reviewId,
    projectId,
    reviewerId: user.id,
    revieweeId: data.revieweeId,
    rating: data.rating,
    comment: data.comment || null,
    createdAt: new Date().toISOString(),
  });

  return c.json({ success: true, data: { id: reviewId } }, 201);
});

// ─── LIST REVIEWS ───
app.get('/:id/reviews', async (c) => {
  const db = c.get('db');
  const projectId = c.req.param('id');

  const reviews = await db.select({
    id: projectReviews.id,
    rating: projectReviews.rating,
    comment: projectReviews.comment,
    createdAt: projectReviews.createdAt,
    reviewerUsername: users.username,
  })
    .from(projectReviews)
    .leftJoin(users, eq(projectReviews.reviewerId, users.id))
    .where(eq(projectReviews.projectId, projectId));

  return c.json({ success: true, data: reviews });
});

export default app;
