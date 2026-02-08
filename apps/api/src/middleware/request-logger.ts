import { Request, Response, NextFunction } from 'express';
import { logger } from '@/lib/logger.js';

const SLOW_REQUEST_THRESHOLD_MS = 3000;

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const log = `${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`;
    
    if (res.statusCode >= 500) {
      logger.error(log);
    } else if (res.statusCode >= 400) {
      logger.warn(log);
    } else if (duration > SLOW_REQUEST_THRESHOLD_MS) {
      logger.warn(`[SLOW] ${log}`);
    } else {
      logger.info(log);
    }
  });
  
  next();
};
