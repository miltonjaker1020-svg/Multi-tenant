import { env } from './env';
import { logger } from './logger';
import { RateLimitError } from './errors';

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

interface RateLimiter {
  check(key: string, limit: number, windowMs: number): Promise<{ allowed: boolean; remaining: number; resetTime: number; retryAfter?: number }>;
  reset(key: string): Promise<void>;
}

class InMemoryRateLimiter implements RateLimiter {
  private store = new Map<string, RateLimitEntry>();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
    this.cleanupInterval.unref();
  }

  async check(key: string, limit: number, windowMs: number): Promise<{ allowed: boolean; remaining: number; resetTime: number; retryAfter?: number }> {
    const now = Date.now();
    const entry = this.store.get(key);

    if (!entry || now > entry.resetTime) {
      const resetTime = now + windowMs;
      this.store.set(key, { count: 1, resetTime });
      return { allowed: true, remaining: limit - 1, resetTime };
    }

    if (entry.count >= limit) {
      const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
      return { allowed: false, remaining: 0, resetTime: entry.resetTime, retryAfter };
    }

    entry.count++;
    return { allowed: true, remaining: limit - entry.count, resetTime: entry.resetTime };
  }

  async reset(key: string): Promise<void> {
    this.store.delete(key);
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.resetTime) {
        this.store.delete(key);
      }
    }
  }

  destroy(): void {
    clearInterval(this.cleanupInterval);
    this.store.clear();
  }
}

let rateLimiterInstance: RateLimiter | null = null;

export function getRateLimiter(): RateLimiter {
  if (!rateLimiterInstance) {
    rateLimiterInstance = new InMemoryRateLimiter();
  }
  return rateLimiterInstance;
}

export function setRateLimiter(limiter: RateLimiter): void {
  if (rateLimiterInstance && 'destroy' in rateLimiterInstance) {
    (rateLimiterInstance as InMemoryRateLimiter).destroy();
  }
  rateLimiterInstance = limiter;
}

export async function checkRateLimit(
  identifier: string,
  options: { limit?: number; windowMs?: number } = {}
): Promise<{ allowed: boolean; remaining: number; resetTime: number; retryAfter?: number }> {
  const limiter = getRateLimiter();
  const limit = options.limit ?? env.RATE_LIMIT_MAX_REQUESTS;
  const windowMs = options.windowMs ?? env.RATE_LIMIT_WINDOW_MS;

  return limiter.check(identifier, limit, windowMs);
}

export function createRateLimitHeaders(result: { remaining: number; resetTime: number; retryAfter?: number }) {
  return {
    'X-RateLimit-Limit': env.RATE_LIMIT_MAX_REQUESTS.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': Math.ceil(result.resetTime / 1000).toString(),
    ...(result.retryAfter ? { 'Retry-After': result.retryAfter.toString() } : {}),
  };
}

export async function enforceRateLimit(
  identifier: string,
  options?: { limit?: number; windowMs?: number }
): Promise<void> {
  const result = await checkRateLimit(identifier, options);

  if (!result.allowed) {
    const headers = createRateLimitHeaders(result);
    throw new RateLimitError('Too many requests', result.retryAfter ?? 60);
  }
}