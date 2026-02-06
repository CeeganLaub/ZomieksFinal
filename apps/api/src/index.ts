import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { createServer } from 'http';
import { Server as SocketServer } from 'socket.io';

import { env } from '@/config/env.js';
import { logger } from '@/lib/logger.js';
import { prisma } from '@/lib/prisma.js';
import { redis } from '@/lib/redis.js';
import { errorHandler } from '@/middleware/error-handler.js';
import { requestLogger } from '@/middleware/request-logger.js';
import { rateLimiter } from '@/middleware/rate-limiter.js';
import { setupSocketHandlers } from '@/socket/index.js';

// Routes
import authRoutes from '@/routes/auth.routes.js';
import userRoutes from '@/routes/user.routes.js';
import serviceRoutes from '@/routes/service.routes.js';
import orderRoutes from '@/routes/order.routes.js';
import subscriptionRoutes from '@/routes/subscription.routes.js';
import conversationRoutes from '@/routes/conversation.routes.js';
import paymentRoutes from '@/routes/payment.routes.js';
import webhookRoutes from '@/routes/webhook.routes.js';
import uploadRoutes from '@/routes/upload.routes.js';
import adminRoutes from '@/routes/admin.routes.js';
import courseRoutes from '@/routes/course.routes.js';

const app = express();
const httpServer = createServer(app);

// Socket.io setup with Redis adapter for scaling
const io = new SocketServer(httpServer, {
  cors: {
    origin: env.APP_URL,
    credentials: true,
  },
});

// Security middleware
app.use(helmet({
  contentSecurityPolicy: env.NODE_ENV === 'production' ? undefined : false,
}));

// CORS - allow multiple origins in development
const allowedOrigins = [
  env.APP_URL,
  'http://localhost:5173',
  'http://localhost:3000',
];
// Add Codespaces pattern
if (env.NODE_ENV === 'development') {
  app.use(cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl)
      if (!origin) return callback(null, true);
      // Allow Codespaces URLs
      if (origin.includes('.app.github.dev') || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      callback(null, false);
    },
    credentials: true,
  }));
} else {
  app.use(cors({
    origin: env.APP_URL,
    credentials: true,
  }));
}

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(compression());

// Request logging
app.use(requestLogger);

// Serve uploaded files statically
app.use('/uploads', express.static('uploads'));

// Rate limiting
app.use('/api', rateLimiter);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Root endpoint
app.get('/', (_req, res) => {
  res.json({ 
    name: 'Zomieks API', 
    version: '1.0.0',
    docs: '/api/v1',
    health: '/health'
  });
});

// API Routes (versioned)
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/services', serviceRoutes);
app.use('/api/v1/orders', orderRoutes);
app.use('/api/v1/subscriptions', subscriptionRoutes);
app.use('/api/v1/conversations', conversationRoutes);
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1/uploads', uploadRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/courses', courseRoutes);

// Webhooks (no auth, signature validation instead)
app.use('/webhooks', webhookRoutes);

// Error handling
app.use(errorHandler);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ 
    success: false, 
    error: { code: 'NOT_FOUND', message: 'Route not found' } 
  });
});

// Socket.io handlers
setupSocketHandlers(io);

// Schedule recurring jobs
import('@/services/payout.service.js').then(({ schedulePayoutProcessing }) => {
  schedulePayoutProcessing().catch(err => logger.error('Failed to schedule payouts:', err));
});

// Schedule CRM inactivity check (every hour)
import('@/lib/queue.js').then(({ notificationQueue }) => {
  notificationQueue.add(
    'crm-inactivity-check',
    {},
    {
      repeat: { pattern: '0 * * * *' }, // Every hour
    }
  ).catch(err => logger.error('Failed to schedule CRM inactivity check:', err));
});

// Graceful shutdown
const shutdown = async () => {
  logger.info('Shutting down gracefully...');
  
  httpServer.close(() => {
    logger.info('HTTP server closed');
  });
  
  await prisma.$disconnect();
  await redis.quit();
  
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Start server
httpServer.listen(env.PORT, () => {
  logger.info(`🚀 Server running on port ${env.PORT}`);
  logger.info(`📡 Environment: ${env.NODE_ENV}`);
});

export { app, io };
