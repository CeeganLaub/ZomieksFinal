import { Hono } from 'hono';
import { z } from 'zod';
import { eq, and, desc, sql, count } from 'drizzle-orm';
import { projects, projectBids, users, categories, sellerProfiles } from '@zomieks/db';
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
});

const createBidSchema = z.object({
  amount: z.number().min(50).max(1000000),
  deliveryDays: z.number().min(1).max(365),
  proposal: z.string().min(20).max(3000),
});

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
      createdAt: projects.createdAt,
      buyerUsername: users.username,
      buyerAvatar: users.avatar,
      categoryName: categories.name,
    })
      .from(projects)
      .leftJoin(users, eq(projects.buyerId, users.id))
      .leftJoin(categories, eq(projects.categoryId, categories.id))
      .where(and(...conditions))
      .orderBy(desc(projects.createdAt))
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

  // Get bids - visible to project owner always, sellers only see their own
  let bids: any[] = [];
  if (user && project.buyerId === user.id) {
    // Owner sees all bids
    bids = await db.select({
      id: projectBids.id,
      amount: projectBids.amount,
      deliveryDays: projectBids.deliveryDays,
      proposal: projectBids.proposal,
      status: projectBids.status,
      createdAt: projectBids.createdAt,
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
    // Seller sees only their own bid
    bids = await db.select({
      id: projectBids.id,
      amount: projectBids.amount,
      deliveryDays: projectBids.deliveryDays,
      proposal: projectBids.proposal,
      status: projectBids.status,
      createdAt: projectBids.createdAt,
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

  return c.json({ success: true, data: { ...project, bids } });
});

// ─── CREATE PROJECT (buyer) ───
app.post('/', requireAuth, async (c) => {
  const user = c.get('user')!;
  const db = c.get('db');
  const body = await c.req.json();
  const data = createProjectSchema.parse(body);

  const now = new Date().toISOString();
  const id = createId();

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
    createdAt: now,
    updatedAt: now,
  });

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

  // Check existing bid
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

  // Increment bid count
  await db.update(projects)
    .set({ bidCount: sql`${projects.bidCount} + 1`, updatedAt: now })
    .where(eq(projects.id, projectId));

  return c.json({ success: true, data: { id: bidId } }, 201);
});

// ─── ACCEPT BID (buyer) ───
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

  // Accept the bid, reject all others, mark project in progress
  await db.update(projectBids).set({ status: 'ACCEPTED', updatedAt: now }).where(eq(projectBids.id, bidId));
  await db.update(projectBids).set({ status: 'REJECTED', updatedAt: now })
    .where(and(eq(projectBids.projectId, projectId), sql`${projectBids.id} != ${bidId}`));
  await db.update(projects).set({ status: 'IN_PROGRESS', selectedBidId: bidId, updatedAt: now }).where(eq(projects.id, projectId));

  return c.json({ success: true });
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

export default app;
