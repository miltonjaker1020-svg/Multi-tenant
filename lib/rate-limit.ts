import { env } from './env';
import { logger } from './logger';
import { RateLimitError } from './errors';

export interface RateLimitEntry {
  count: number;
  resetTime: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  resetTime: number;
  retryAfter?: number;
}

export interface RateLimitPolicy {
  limit: number;
  windowMs: number;
  bucket: string;
}

export interface RateLimiter {
  check(key: string, limit: number, windowMs: number): Promise<RateLimitResult>;
  reset(key: string): Promise<void>;
}

export interface RateLimitResponse {
  status: number;
  headers: Record<string, string>;
  body: {
    success: false;
    error: {
      code: string;
      message: string;
      details?: Record<string, unknown>;
    };
  };
}

export interface RateLimitIdentifier {
  ip?: string | null;
  userId?: string | null;
  pathname?: string | null;
}

export const CRITICAL_RATE_LIMIT = { limit: 10, windowMs: 60_000 };

export const CRITICAL_ENDPOINTS: Array<{ pattern: RegExp; bucket: string }> = [
  { pattern: /^\/api\/auth\/login\/?$/, bucket: 'auth-login' },
  { pattern: /^\/api\/auth\/register\/?$/, bucket: 'auth-register' },
  { pattern: /^\/api\/citas\/[^/]+\/ia-report\/?$/, bucket: 'ia-report' },
];

class InMemoryRateLimiter implements RateLimiter {
  private store = new Map<string, RateLimitEntry>();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
    this.cleanupInterval.unref();
  }

  async check(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
    const now = Date.now();
    const entry = this.store.get(key);

    if (!entry || now > entry.resetTime) {
      const resetTime = now + windowMs;
      this.store.set(key, { count: 1, resetTime });
      return { allowed: true, remaining: limit - 1, limit, resetTime };
    }

    if (entry.count >= limit) {
      const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
      return { allowed: false, remaining: 0, limit, resetTime: entry.resetTime, retryAfter };
    }

    entry.count++;
    return { allowed: true, remaining: limit - entry.count, limit, resetTime: entry.resetTime };
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

export function createRateLimiter(): RateLimiter {
  return new InMemoryRateLimiter();
}

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

export async function resetRateLimit(key: string): Promise<void> {
  await getRateLimiter().reset(key);
}

export function getRateLimitPolicy(pathname?: string): RateLimitPolicy {
  if (pathname) {
    for (const { pattern, bucket } of CRITICAL_ENDPOINTS) {
      if (pattern.test(pathname)) {
        return { limit: CRITICAL_RATE_LIMIT.limit, windowMs: CRITICAL_RATE_LIMIT.windowMs, bucket };
      }
    }
  }

  return {
    limit: env.RATE_LIMIT_MAX_REQUESTS,
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    bucket: pathname ? normalizeBucket(pathname) : 'global',
  };
}

export function buildRateLimitKey(identifier: RateLimitIdentifier): string {
  const policy = getRateLimitPolicy(identifier.pathname ?? undefined);
  const subject = identifier.userId
    ? `user:${identifier.userId}`
    : `ip:${identifier.ip ?? 'unknown'}`;

  return `ratelimit:${subject}:${policy.bucket}`;
}

export async function checkRateLimit(
  identifier: string,
  options: { limit?: number; windowMs?: number; pathname?: string } = {}
): Promise<RateLimitResult> {
  const limiter = getRateLimiter();
  const policy = getRateLimitPolicy(options.pathname);
  const limit = options.limit ?? policy.limit;
  const windowMs = options.windowMs ?? policy.windowMs;

  return limiter.check(identifier, limit, windowMs);
}

export function createRateLimitHeaders(result: {
  limit?: number;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
}): Record<string, string> {
  const limit = result.limit ?? env.RATE_LIMIT_MAX_REQUESTS;

  return {
    'X-RateLimit-Limit': limit.toString(),
    'X-RateLimit-Remaining': Math.max(0, result.remaining).toString(),
    'X-RateLimit-Reset': Math.ceil(result.resetTime / 1000).toString(),
    ...(result.retryAfter !== undefined ? { 'Retry-After': result.retryAfter.toString() } : {}),
  };
}

export function buildRateLimitResponse(result: RateLimitResult): RateLimitResponse {
  const retryAfter =
    result.retryAfter ?? Math.max(1, Math.ceil((result.resetTime - Date.now()) / 1000));

  return {
    status: 429,
    headers: {
      ...createRateLimitHeaders({ ...result, retryAfter }),
      'Retry-After': retryAfter.toString(),
    },
    body: {
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests',
        details: {
          retryAfter,
          limit: result.limit,
          remaining: 0,
          resetTime: result.resetTime,
        },
      },
    },
  };
}

export async function enforceRateLimit(
  identifier: string,
  options?: { limit?: number; windowMs?: number; pathname?: string }
): Promise<void> {
  const result = await checkRateLimit(identifier, options);

  if (!result.allowed) {
    logger.warn(
      { identifier, limit: result.limit, retryAfter: result.retryAfter },
      'Rate limit exceeded'
    );
    throw new RateLimitError('Too many requests', result.retryAfter ?? 60);
  }
}

function normalizeBucket(pathname: string): string {
  return pathname.replace(/[^a-z0-9/_-]/gi, '') || 'global';
}
