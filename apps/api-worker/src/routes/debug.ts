import { Hono } from 'hono';
import type { Env } from '../types';
import { getRecentErrors, clearErrors } from '../middleware/dev-logger';

const app = new Hono<{ Bindings: Env }>();

// Only allow in development
app.use('*', async (c, next) => {
  if (c.env.ENVIRONMENT !== 'development') {
    return c.json({ error: 'Debug routes only available in development' }, 403);
  }
  return next();
});

// View recent errors
app.get('/errors', (c) => {
  const errors = getRecentErrors();
  return c.json({
    count: errors.length,
    errors,
  });
});

// Clear error log
app.delete('/errors', (c) => {
  clearErrors();
  return c.json({ success: true, message: 'Error log cleared' });
});

// Database health check
app.get('/db', async (c) => {
  try {
    const result = await c.env.DB.prepare('SELECT 1 as test').first();
    return c.json({
      status: 'ok',
      result,
    });
  } catch (err) {
    return c.json({
      status: 'error',
      error: (err as Error).message,
    }, 500);
  }
});

// List all tables
app.get('/db/tables', async (c) => {
  try {
    const result = await c.env.DB.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
    ).all();
    return c.json({
      tables: result.results?.map((r: any) => r.name) || [],
    });
  } catch (err) {
    return c.json({ error: (err as Error).message }, 500);
  }
});

// Query table (limited)
app.get('/db/query/:table', async (c) => {
  const table = c.req.param('table');
  const limit = parseInt(c.req.query('limit') || '10');
  
  // Whitelist tables
  const allowedTables = ['users', 'services', 'orders', 'categories', 'conversations', 'site_config', 'fee_policy'];
  if (!allowedTables.includes(table)) {
    return c.json({ error: 'Table not allowed' }, 400);
  }
  
  try {
    const result = await c.env.DB.prepare(
      `SELECT * FROM ${table} LIMIT ?`
    ).bind(Math.min(limit, 100)).all();
    
    return c.json({
      table,
      count: result.results?.length || 0,
      data: result.results,
    });
  } catch (err) {
    return c.json({ error: (err as Error).message }, 500);
  }
});

// Environment info
app.get('/env', (c) => {
  return c.json({
    environment: c.env.ENVIRONMENT,
    appUrl: c.env.APP_URL,
    payfastSandbox: c.env.PAYFAST_SANDBOX,
    ozowTestMode: c.env.OZOW_TEST_MODE,
    hasJwtSecret: !!c.env.JWT_SECRET,
    hasPayfastCredentials: !!c.env.PAYFAST_MERCHANT_ID,
    hasOzowCredentials: !!c.env.OZOW_SITE_CODE,
  });
});

// Test rate limiting
app.get('/rate-limit-test', async (c) => {
  const key = 'test:debug';
  const current = await c.env.RATE_LIMIT.get(key);
  return c.json({
    key,
    currentValue: current,
    timestamp: new Date().toISOString(),
  });
});

// List KV keys (for debugging)
app.get('/kv/:namespace', async (c) => {
  const namespace = c.req.param('namespace');
  const prefix = c.req.query('prefix') || '';
  
  let kv;
  switch (namespace) {
    case 'cache':
      kv = c.env.CACHE;
      break;
    case 'sessions':
      kv = c.env.SESSIONS;
      break;
    case 'rate-limit':
      kv = c.env.RATE_LIMIT;
      break;
    default:
      return c.json({ error: 'Unknown namespace' }, 400);
  }
  
  try {
    const list = await kv.list({ prefix, limit: 50 });
    return c.json({
      namespace,
      prefix,
      keys: list.keys,
    });
  } catch (err) {
    return c.json({ error: (err as Error).message }, 500);
  }
});

export default app;
