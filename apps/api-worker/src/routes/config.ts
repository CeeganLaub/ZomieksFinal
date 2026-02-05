/**
 * Admin Configuration Routes
 * Manages platform configuration including payment gateways, SMTP, and other settings
 */

import { Hono } from 'hono';
import { z } from 'zod';
import { eq, and, like } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';
import { siteConfig, feePolicy } from '@zomieks/db';
import type { Env } from '../types';
import { authMiddleware, requireAuth, requireAdmin } from '../middleware/auth';
import { validate, getValidatedBody } from '../middleware/validation';

const app = new Hono<{ Bindings: Env }>();

// All routes require admin
app.use('*', authMiddleware);
app.use('*', requireAuth);
app.use('*', requireAdmin);

// ============ SITE CONFIGURATION ============

const configSchema = z.object({
  category: z.string().min(1).max(50),
  key: z.string().min(1).max(100),
  value: z.string().optional(),
  description: z.string().optional(),
  isSecret: z.boolean().default(false),
});

const configUpdateSchema = z.object({
  value: z.string().optional(),
  description: z.string().optional(),
});

// Get all configuration by category
app.get('/config', async (c) => {
  const db = c.get('db');
  const category = c.req.query('category');
  
  let configs;
  if (category) {
    configs = await db.query.siteConfig.findMany({
      where: eq(siteConfig.category, category),
      orderBy: [siteConfig.key],
    });
  } else {
    configs = await db.query.siteConfig.findMany({
      orderBy: [siteConfig.category, siteConfig.key],
    });
  }
  
  // Mask secret values
  const maskedConfigs = configs.map(cfg => ({
    ...cfg,
    value: cfg.isSecret ? (cfg.value ? '••••••••' : null) : cfg.value,
    encryptedValue: undefined, // Never expose
  }));
  
  return c.json({
    success: true,
    data: maskedConfigs,
  });
});

// Get configuration categories
app.get('/config/categories', async (c) => {
  const db = c.get('db');
  
  const configs = await db.query.siteConfig.findMany({
    columns: { category: true },
  });
  
  const categories = [...new Set(configs.map(c => c.category))];
  
  return c.json({
    success: true,
    data: categories,
  });
});

// Create or update configuration
app.post('/config', validate(configSchema), async (c) => {
  const body = getValidatedBody<z.infer<typeof configSchema>>(c);
  const admin = c.get('user')!;
  const db = c.get('db');
  const now = new Date().toISOString();
  
  // Check if exists
  const existing = await db.query.siteConfig.findFirst({
    where: and(
      eq(siteConfig.category, body.category),
      eq(siteConfig.key, body.key)
    ),
  });
  
  if (existing) {
    // Update
    await db.update(siteConfig)
      .set({
        value: body.isSecret ? null : body.value,
        encryptedValue: body.isSecret ? body.value : null, // In production, encrypt this
        description: body.description,
        isSecret: body.isSecret,
        updatedBy: admin.id,
        updatedAt: now,
      })
      .where(eq(siteConfig.id, existing.id));
    
    return c.json({
      success: true,
      message: 'Configuration updated',
    });
  }
  
  // Create new
  await db.insert(siteConfig).values({
    id: createId(),
    category: body.category,
    key: body.key,
    value: body.isSecret ? null : body.value,
    encryptedValue: body.isSecret ? body.value : null,
    description: body.description,
    isSecret: body.isSecret,
    updatedBy: admin.id,
    createdAt: now,
    updatedAt: now,
  });
  
  return c.json({
    success: true,
    message: 'Configuration created',
  });
});

// Update configuration value
app.patch('/config/:category/:key', validate(configUpdateSchema), async (c) => {
  const { category, key } = c.req.param();
  const body = getValidatedBody<z.infer<typeof configUpdateSchema>>(c);
  const admin = c.get('user')!;
  const db = c.get('db');
  
  const existing = await db.query.siteConfig.findFirst({
    where: and(
      eq(siteConfig.category, category),
      eq(siteConfig.key, key)
    ),
  });
  
  if (!existing) {
    return c.json({
      success: false,
      error: { message: 'Configuration not found' },
    }, 404);
  }
  
  const now = new Date().toISOString();
  
  await db.update(siteConfig)
    .set({
      value: existing.isSecret ? null : body.value,
      encryptedValue: existing.isSecret ? body.value : null,
      description: body.description ?? existing.description,
      updatedBy: admin.id,
      updatedAt: now,
    })
    .where(eq(siteConfig.id, existing.id));
  
  return c.json({
    success: true,
    message: 'Configuration updated',
  });
});

// Delete configuration
app.delete('/config/:category/:key', async (c) => {
  const { category, key } = c.req.param();
  const db = c.get('db');
  
  await db.delete(siteConfig)
    .where(and(
      eq(siteConfig.category, category),
      eq(siteConfig.key, key)
    ));
  
  return c.json({
    success: true,
    message: 'Configuration deleted',
  });
});

// Bulk upsert configuration
app.post('/config/bulk', async (c) => {
  const body = await c.req.json() as { configs: z.infer<typeof configSchema>[] };
  const admin = c.get('user')!;
  const db = c.get('db');
  const now = new Date().toISOString();
  
  for (const cfg of body.configs) {
    const existing = await db.query.siteConfig.findFirst({
      where: and(
        eq(siteConfig.category, cfg.category),
        eq(siteConfig.key, cfg.key)
      ),
    });
    
    if (existing) {
      await db.update(siteConfig)
        .set({
          value: cfg.isSecret ? null : cfg.value,
          encryptedValue: cfg.isSecret ? cfg.value : null,
          description: cfg.description,
          isSecret: cfg.isSecret,
          updatedBy: admin.id,
          updatedAt: now,
        })
        .where(eq(siteConfig.id, existing.id));
    } else {
      await db.insert(siteConfig).values({
        id: createId(),
        category: cfg.category,
        key: cfg.key,
        value: cfg.isSecret ? null : cfg.value,
        encryptedValue: cfg.isSecret ? cfg.value : null,
        description: cfg.description,
        isSecret: cfg.isSecret ?? false,
        updatedBy: admin.id,
        createdAt: now,
        updatedAt: now,
      });
    }
  }
  
  return c.json({
    success: true,
    message: `${body.configs.length} configurations saved`,
  });
});

// ============ FEE POLICY ============

const feePolicySchema = z.object({
  name: z.string().min(1).max(100),
  buyerPlatformPct: z.number().min(0).max(10000), // basis points
  buyerPlatformMin: z.number().min(0), // cents
  buyerProcessingMin: z.number().min(0), // cents
  sellerTiers: z.array(z.object({
    maxAmount: z.number().nullable(), // null = no limit
    pct: z.number().min(0).max(10000), // basis points
    min: z.number().min(0), // cents
  })),
  bufferPct: z.number().min(0).max(1000), // basis points
  bufferFixed: z.number().min(0), // cents
  vatPct: z.number().min(0).max(10000), // basis points
  reserveDays: z.number().min(0).max(90),
  payoutMinimum: z.number().min(0), // cents
});

// Get all fee policies
app.get('/fees', async (c) => {
  const db = c.get('db');
  
  const policies = await db.query.feePolicy.findMany({
    orderBy: [feePolicy.createdAt],
  });
  
  // Format for display
  const formatted = policies.map(p => ({
    ...p,
    // Convert to percentages for display
    buyerPlatformPctDisplay: (p.buyerPlatformPct / 100).toFixed(2) + '%',
    buyerPlatformMinDisplay: (p.buyerPlatformMin / 100).toFixed(2),
    buyerProcessingMinDisplay: (p.buyerProcessingMin / 100).toFixed(2),
    bufferPctDisplay: (p.bufferPct / 100).toFixed(2) + '%',
    vatPctDisplay: (p.vatPct / 100).toFixed(2) + '%',
    payoutMinimumDisplay: (p.payoutMinimum / 100).toFixed(2),
  }));
  
  return c.json({
    success: true,
    data: formatted,
  });
});

// Get active fee policy
app.get('/fees/active', async (c) => {
  const db = c.get('db');
  
  const policy = await db.query.feePolicy.findFirst({
    where: eq(feePolicy.isActive, true),
  });
  
  if (!policy) {
    // Return default policy from fee-engine
    const { DEFAULT_FEE_POLICY } = await import('../services/fee-engine');
    return c.json({
      success: true,
      data: {
        id: 'default',
        name: 'Default Policy',
        isActive: true,
        ...DEFAULT_FEE_POLICY,
        sellerTiers: DEFAULT_FEE_POLICY.sellerTiers.map(t => ({
          maxAmount: t.upTo === Infinity ? null : t.upTo,
          pct: t.pct * 10000,
          min: t.min,
        })),
        buyerPlatformPct: DEFAULT_FEE_POLICY.buyerPlatformPct * 10000,
        bufferPct: DEFAULT_FEE_POLICY.bufferPct * 10000,
        vatPct: DEFAULT_FEE_POLICY.vatPct * 10000,
      },
      isDefault: true,
    });
  }
  
  return c.json({
    success: true,
    data: policy,
  });
});

// Create fee policy
app.post('/fees', validate(feePolicySchema), async (c) => {
  const body = getValidatedBody<z.infer<typeof feePolicySchema>>(c);
  const admin = c.get('user')!;
  const db = c.get('db');
  const now = new Date().toISOString();
  
  const id = createId();
  
  await db.insert(feePolicy).values({
    id,
    name: body.name,
    isActive: false,
    buyerPlatformPct: body.buyerPlatformPct,
    buyerPlatformMin: body.buyerPlatformMin,
    buyerProcessingMin: body.buyerProcessingMin,
    sellerTiers: body.sellerTiers,
    bufferPct: body.bufferPct,
    bufferFixed: body.bufferFixed,
    vatPct: body.vatPct,
    reserveDays: body.reserveDays,
    payoutMinimum: body.payoutMinimum,
    createdBy: admin.id,
    createdAt: now,
    updatedAt: now,
  });
  
  return c.json({
    success: true,
    data: { id },
    message: 'Fee policy created',
  });
});

// Update fee policy
app.patch('/fees/:id', validate(feePolicySchema.partial()), async (c) => {
  const { id } = c.req.param();
  const body = getValidatedBody<Partial<z.infer<typeof feePolicySchema>>>(c);
  const db = c.get('db');
  
  const existing = await db.query.feePolicy.findFirst({
    where: eq(feePolicy.id, id),
  });
  
  if (!existing) {
    return c.json({
      success: false,
      error: { message: 'Fee policy not found' },
    }, 404);
  }
  
  await db.update(feePolicy)
    .set({
      ...body,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(feePolicy.id, id));
  
  return c.json({
    success: true,
    message: 'Fee policy updated',
  });
});

// Activate fee policy
app.post('/fees/:id/activate', async (c) => {
  const { id } = c.req.param();
  const db = c.get('db');
  const now = new Date().toISOString();
  
  const policy = await db.query.feePolicy.findFirst({
    where: eq(feePolicy.id, id),
  });
  
  if (!policy) {
    return c.json({
      success: false,
      error: { message: 'Fee policy not found' },
    }, 404);
  }
  
  // Deactivate all other policies
  await db.update(feePolicy)
    .set({ isActive: false, updatedAt: now })
    .where(eq(feePolicy.isActive, true));
  
  // Activate this policy
  await db.update(feePolicy)
    .set({ isActive: true, updatedAt: now })
    .where(eq(feePolicy.id, id));
  
  return c.json({
    success: true,
    message: 'Fee policy activated',
  });
});

// Delete fee policy (only if not active)
app.delete('/fees/:id', async (c) => {
  const { id } = c.req.param();
  const db = c.get('db');
  
  const policy = await db.query.feePolicy.findFirst({
    where: eq(feePolicy.id, id),
  });
  
  if (!policy) {
    return c.json({
      success: false,
      error: { message: 'Fee policy not found' },
    }, 404);
  }
  
  if (policy.isActive) {
    return c.json({
      success: false,
      error: { message: 'Cannot delete active fee policy' },
    }, 400);
  }
  
  await db.delete(feePolicy)
    .where(eq(feePolicy.id, id));
  
  return c.json({
    success: true,
    message: 'Fee policy deleted',
  });
});

// Calculate fee preview
app.post('/fees/preview', async (c) => {
  const body = await c.req.json() as { 
    baseAmount: number; 
    gateway: 'PAYFAST' | 'OZOW'; 
    method: 'CARD' | 'EFT';
    policyId?: string;
  };
  const db = c.get('db');
  
  // Get policy to use
  let policy;
  if (body.policyId) {
    policy = await db.query.feePolicy.findFirst({
      where: eq(feePolicy.id, body.policyId),
    });
  } else {
    policy = await db.query.feePolicy.findFirst({
      where: eq(feePolicy.isActive, true),
    });
  }
  
  // Use fee engine with policy (if exists) or defaults
  const { calculateFees, DEFAULT_FEE_POLICY } = await import('../services/fee-engine');
  
  let feeInput;
  if (policy) {
    feeInput = {
      baseAmount: body.baseAmount,
      gateway: body.gateway,
      method: body.method,
      policy: {
        buyerPlatformPct: policy.buyerPlatformPct / 10000,
        buyerPlatformMin: policy.buyerPlatformMin,
        buyerProcessingMin: policy.buyerProcessingMin,
        sellerTiers: (policy.sellerTiers as { maxAmount: number | null; pct: number; min: number }[]).map(t => ({
          upTo: t.maxAmount ?? Infinity,
          pct: t.pct / 10000,
          min: t.min,
        })),
        bufferPct: policy.bufferPct / 10000,
        bufferFixed: policy.bufferFixed,
        vatPct: policy.vatPct / 10000,
        reserveDays: policy.reserveDays,
        payoutMin: policy.payoutMinimum,
      },
    };
  } else {
    feeInput = {
      baseAmount: body.baseAmount,
      gateway: body.gateway,
      method: body.method,
      policy: DEFAULT_FEE_POLICY,
    };
  }
  
  const fees = calculateFees(feeInput);
  
  return c.json({
    success: true,
    data: {
      ...fees,
      // Add display values
      baseAmountDisplay: (fees.baseAmount / 100).toFixed(2),
      buyerPlatformFeeDisplay: (fees.buyerPlatformFee / 100).toFixed(2),
      buyerProcessingFeeDisplay: (fees.buyerProcessingFee / 100).toFixed(2),
      sellerPlatformFeeDisplay: (fees.sellerPlatformFee / 100).toFixed(2),
      grossAmountDisplay: (fees.grossAmount / 100).toFixed(2),
      platformRevenueDisplay: (fees.platformRevenue / 100).toFixed(2),
      sellerPayoutAmountDisplay: (fees.sellerPayoutAmount / 100).toFixed(2),
    },
  });
});

export default app;
