import { Request, Response, NextFunction } from 'express';

// Simple in-memory rate limiter
const requests = new Map<string, { count: number; resetTime: number }>();

export const rateLimiter = (options: {
  windowMs: number;
  max: number;
  message?: string;
}) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = req.ip || 'unknown';
    const now = Date.now();
    
    const record = requests.get(key);
    
    if (!record || now > record.resetTime) {
      // Reset or new entry
      requests.set(key, {
        count: 1,
        resetTime: now + options.windowMs
      });
      return next();
    }
    
    if (record.count >= options.max) {
      return res.status(429).json({
        success: false,
        error: options.message || 'Too many requests'
      });
    }
    
    record.count++;
    next();
  };
};

// Clean up old entries every hour
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of requests.entries()) {
    if (now > record.resetTime) {
      requests.delete(key);
    }
  }
}, 60 * 60 * 1000);
