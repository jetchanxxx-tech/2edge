import type { Context, Next } from 'hono';

interface RateLimitConfig {
  prefix: string;
  maxRequests: number;
  windowSeconds: number;
}

export function rateLimit(config: RateLimitConfig) {
  return async function rateLimitMiddleware(c: Context, next: Next): Promise<Response | void> {
    const ip = c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For') || 'unknown';
    const key = `ratelimit:${config.prefix}:${ip}:${Math.floor(Date.now() / 1000 / config.windowSeconds)}`;

    try {
      const current = await c.env.KV.get(key);
      const count = current ? parseInt(current) + 1 : 1;

      if (count > config.maxRequests) {
        return c.json({
          error: {
            code: 'RATE_LIMITED',
            message: '请求过于频繁，请稍后再试。'
          }
        }, 429);
      }

      await c.env.KV.put(key, count.toString(), { expirationTtl: config.windowSeconds });
    } catch {
      // If KV fails, allow the request through (fail open)
    }

    return next();
  };
}

// Pre-configured rate limiters
export const registerRateLimit = rateLimit({ prefix: 'register', maxRequests: 5, windowSeconds: 3600 });
export const loginRateLimit = rateLimit({ prefix: 'login', maxRequests: 10, windowSeconds: 3600 });
export const subscriptionRateLimit = rateLimit({ prefix: 'sub', maxRequests: 2, windowSeconds: 30 });
