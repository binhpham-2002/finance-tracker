import { Request, Response, NextFunction } from "express";

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const store = new Map<string, RateLimitEntry>();

interface RateLimitOptions {
  windowMs: number;
  maxRequests: number;
}

export function rateLimit(options: RateLimitOptions = { windowMs: 60000, maxRequests: 100 }) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const key = req.user?.userId || req.ip || "unknown";
    const now = Date.now();

    const entry = store.get(key);

    if (!entry || now > entry.resetTime) {
      store.set(key, { count: 1, resetTime: now + options.windowMs });
      next();
      return;
    }

    entry.count++;

    if (entry.count > options.maxRequests) {
      const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
      res.status(429).json({
        error: "Too many requests",
        retryAfterSeconds: retryAfter,
      });
      return;
    }

    next();
  };
}
