import { Hono } from 'hono';
import { z } from 'zod';
import { createId } from '@paralleldrive/cuid2';
import type { Env } from '../types';
import { authMiddleware, requireAuth } from '../middleware/auth';
import { uploadRateLimit } from '../middleware/rate-limit';

const app = new Hono<{ Bindings: Env }>();

app.use('*', authMiddleware);
app.use('*', requireAuth);
app.use('*', uploadRateLimit);

// Allowed MIME types and max sizes
const ALLOWED_IMAGES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const ALLOWED_DOCUMENTS = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/zip',
  'application/x-zip-compressed',
  'text/plain',
];
const ALLOWED_VIDEOS = ['video/mp4', 'video/webm', 'video/quicktime'];

const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_DOCUMENT_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB

// Schemas
const uploadInitSchema = z.object({
  filename: z.string().min(1).max(255),
  contentType: z.string(),
  size: z.number().positive(),
  category: z.enum(['avatar', 'service', 'portfolio', 'delivery', 'message', 'document']),
});

// Helper: Get upload constraints by category
function getUploadConstraints(category: string, contentType: string) {
  const isImage = ALLOWED_IMAGES.includes(contentType);
  const isDocument = ALLOWED_DOCUMENTS.includes(contentType);
  const isVideo = ALLOWED_VIDEOS.includes(contentType);
  
  switch (category) {
    case 'avatar':
      if (!isImage) return { allowed: false, reason: 'Avatars must be images' };
      return { allowed: true, maxSize: 5 * 1024 * 1024 };
    
    case 'service':
    case 'portfolio':
      if (!isImage && !isVideo) return { allowed: false, reason: 'Only images and videos allowed' };
      return { allowed: true, maxSize: isVideo ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE };
    
    case 'delivery':
    case 'document':
      if (!isImage && !isDocument) return { allowed: false, reason: 'Unsupported file type' };
      return { allowed: true, maxSize: MAX_DOCUMENT_SIZE };
    
    case 'message':
      if (!isImage && !isDocument) return { allowed: false, reason: 'Unsupported file type' };
      return { allowed: true, maxSize: 25 * 1024 * 1024 };
    
    default:
      return { allowed: false, reason: 'Invalid category' };
  }
}

// POST /init - Get signed upload URL
app.post('/init', async (c) => {
  const body = await c.req.json();
  const parsed = uploadInitSchema.safeParse(body);
  
  if (!parsed.success) {
    return c.json({
      success: false,
      error: { message: 'Invalid request', details: parsed.error.issues },
    }, 400);
  }
  
  const { filename, contentType, size, category } = parsed.data;
  const user = c.get('user')!;
  
  // Validate file type and size
  const constraints = getUploadConstraints(category, contentType);
  
  if (!constraints.allowed) {
    return c.json({
      success: false,
      error: { message: constraints.reason },
    }, 400);
  }
  
  if (size > constraints.maxSize!) {
    return c.json({
      success: false,
      error: { message: `File too large. Max size: ${constraints.maxSize! / 1024 / 1024}MB` },
    }, 400);
  }
  
  // Generate unique key
  const ext = filename.split('.').pop() || '';
  const fileId = createId();
  const key = `${category}/${user.id}/${fileId}${ext ? `.${ext}` : ''}`;
  
  // Store upload intent in KV for validation
  await c.env.CACHE.put(
    `upload:${fileId}`,
    JSON.stringify({
      userId: user.id,
      key,
      contentType,
      size,
      category,
      filename,
      createdAt: Date.now(),
    }),
    { expirationTtl: 3600 } // 1 hour
  );
  
  return c.json({
    success: true,
    data: {
      uploadId: fileId,
      key,
      uploadUrl: `/api/v1/uploads/${fileId}`,
      maxSize: constraints.maxSize,
    },
  });
});

// PUT /:id - Upload file directly
app.put('/:id', async (c) => {
  const { id } = c.req.param();
  const user = c.get('user')!;
  
  // Get upload intent from KV
  const intentData = await c.env.CACHE.get(`upload:${id}`);
  
  if (!intentData) {
    return c.json({
      success: false,
      error: { message: 'Upload session expired or invalid' },
    }, 400);
  }
  
  const intent = JSON.parse(intentData);
  
  // Verify user
  if (intent.userId !== user.id) {
    return c.json({
      success: false,
      error: { message: 'Unauthorized' },
    }, 403);
  }
  
  // Get file body
  const body = await c.req.arrayBuffer();
  
  if (body.byteLength > intent.size * 1.1) { // Allow 10% buffer
    return c.json({
      success: false,
      error: { message: 'File size exceeds declared size' },
    }, 400);
  }
  
  // Upload to R2
  if (!c.env.UPLOADS) return c.json({ success: false, error: { message: 'File storage not configured' } }, 503);
  await c.env.UPLOADS.put(intent.key, body, {
    httpMetadata: {
      contentType: intent.contentType,
    },
    customMetadata: {
      userId: user.id,
      originalFilename: intent.filename,
      category: intent.category,
      uploadedAt: new Date().toISOString(),
    },
  });
  
  // Delete upload intent
  await c.env.CACHE.delete(`upload:${id}`);
  
  // Generate public URL
  const publicUrl = `${c.env.CDN_URL || c.env.APP_URL}/uploads/${intent.key}`;
  
  return c.json({
    success: true,
    data: {
      key: intent.key,
      url: publicUrl,
      filename: intent.filename,
      contentType: intent.contentType,
      size: body.byteLength,
    },
  });
});

// GET /:key+ - Serve file from R2
app.get('/:key{.+}', async (c) => {
  const key = c.req.param('key');
  
  if (!c.env.UPLOADS) return c.json({ success: false, error: { message: 'File storage not configured' } }, 503);
  // Try to get from R2
  const object = await c.env.UPLOADS.get(key);
  
  if (!object) {
    return c.json({
      success: false,
      error: { message: 'File not found' },
    }, 404);
  }
  
  const headers = new Headers();
  headers.set('Content-Type', object.httpMetadata?.contentType || 'application/octet-stream');
  headers.set('Cache-Control', 'public, max-age=31536000'); // 1 year
  headers.set('ETag', object.etag);
  
  // Check If-None-Match for caching
  const ifNoneMatch = c.req.header('If-None-Match');
  if (ifNoneMatch === object.etag) {
    return new Response(null, { status: 304 });
  }
  
  return new Response(object.body, { headers });
});

// DELETE /:key+ - Delete file from R2
app.delete('/:key{.+}', async (c) => {
  const key = c.req.param('key');
  const user = c.get('user')!;
  
  // Get object to check ownership
  const object = await c.env.UPLOADS.get(key);
  
  if (!object) {
    return c.json({
      success: false,
      error: { message: 'File not found' },
    }, 404);
  }
  
  // Check ownership
  const ownerId = object.customMetadata?.userId;
  if (ownerId !== user.id) {
    return c.json({
      success: false,
      error: { message: 'Unauthorized' },
    }, 403);
  }
  
  await c.env.UPLOADS?.delete(key);
  
  return c.json({
    success: true,
    message: 'File deleted',
  });
});

// POST /avatar - Quick avatar upload
app.post('/avatar', async (c) => {
  const user = c.get('user')!;
  const contentType = c.req.header('Content-Type') || '';
  
  if (!ALLOWED_IMAGES.includes(contentType)) {
    return c.json({
      success: false,
      error: { message: 'Invalid image type' },
    }, 400);
  }
  
  const body = await c.req.arrayBuffer();
  
  if (body.byteLength > 5 * 1024 * 1024) {
    return c.json({
      success: false,
      error: { message: 'Avatar must be under 5MB' },
    }, 400);
  }
  
  const ext = contentType.split('/')[1] || 'jpg';
  const key = `avatar/${user.id}/${createId()}.${ext}`;
  
  if (!c.env.UPLOADS) return c.json({ success: false, error: { message: 'File storage not configured' } }, 503);
  await c.env.UPLOADS.put(key, body, {
    httpMetadata: { contentType },
    customMetadata: {
      userId: user.id,
      category: 'avatar',
      uploadedAt: new Date().toISOString(),
    },
  });
  
  const publicUrl = `${c.env.CDN_URL || c.env.APP_URL}/uploads/${key}`;
  
  // Update user avatar (would need db access)
  const db = c.get('db');
  const { users } = await import('@zomieks/db');
  const { eq } = await import('drizzle-orm');
  
  await db.update(users)
    .set({ avatar: publicUrl, updatedAt: new Date().toISOString() })
    .where(eq(users.id, user.id));
  
  return c.json({
    success: true,
    data: {
      key,
      url: publicUrl,
    },
  });
});

export default app;
