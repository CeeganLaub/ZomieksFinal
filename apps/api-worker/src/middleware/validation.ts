import { Context, Next, MiddlewareHandler } from 'hono';
import { z, ZodSchema } from 'zod';
import type { Env } from '../types';

export function validate<T extends ZodSchema>(schema: T): MiddlewareHandler {
  return async (c: Context<{ Bindings: Env }>, next: Next) => {
    const contentType = c.req.header('Content-Type');
    
    let body: unknown;
    if (contentType?.includes('application/json')) {
      try {
        body = await c.req.json();
      } catch {
        return c.json({
          success: false,
          error: { message: 'Invalid JSON body' },
        }, 400);
      }
    } else if (contentType?.includes('multipart/form-data')) {
      body = await c.req.parseBody();
    } else {
      body = {};
    }
    
    const result = schema.safeParse(body);
    
    if (!result.success) {
      return c.json({
        success: false,
        error: {
          message: 'Validation error',
          details: result.error.errors.map((e) => ({
            path: e.path.join('.'),
            message: e.message,
          })),
        },
      }, 400);
    }
    
    // Attach validated data to context
    c.set('validatedBody' as any, result.data);
    
    return next();
  };
}

// Helper to get validated body from context
export function getValidatedBody<T>(c: Context): T {
  return c.get('validatedBody' as any) as T;
}

// Common validation schemas
export const paginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});

export const idParamSchema = z.object({
  id: z.string().min(1),
});
