import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  buildRateLimitKey,
  buildRateLimitResponse,
  checkRateLimit,
  createRateLimitHeaders,
  createRateLimiter,
  enforceRateLimit,
  getRateLimitPolicy,
  resetRateLimit,
  setRateLimiter,
} from '../../lib/rate-limit';
import { RateLimitError } from '../../lib/errors';

describe('rate-limit', () => {
  beforeEach(() => {
    setRateLimiter(createRateLimiter());
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('checkRateLimit', () => {
    it('permite las peticiones hasta agotar el límite', async () => {
      const first = await checkRateLimit('key', { limit: 3, windowMs: 60000 });
      const second = await checkRateLimit('key', { limit: 3, windowMs: 60000 });
      const third = await checkRateLimit('key', { limit: 3, windowMs: 60000 });

      expect(first.allowed).toBe(true);
      expect(first.remaining).toBe(2);
      expect(first.limit).toBe(3);

      expect(second.allowed).toBe(true);
      expect(second.remaining).toBe(1);

      expect(third.allowed).toBe(true);
      expect(third.remaining).toBe(0);
    });

    it('bloquea la petición que excede el límite', async () => {
      await checkRateLimit('key', { limit: 2, windowMs: 60000 });
      await checkRateLimit('key', { limit: 2, windowMs: 60000 });

      const blocked = await checkRateLimit('key', { limit: 2, windowMs: 60000 });

      expect(blocked.allowed).toBe(false);
      expect(blocked.remaining).toBe(0);
      expect(blocked.limit).toBe(2);
      expect(blocked.retryAfter).toBeGreaterThan(0);
    });

    it('mantiene contadores independientes por clave', async () => {
      await checkRateLimit('a', { limit: 1, windowMs: 60000 });

      const other = await checkRateLimit('b', { limit: 1, windowMs: 60000 });
      const blocked = await checkRateLimit('a', { limit: 1, windowMs: 60000 });

      expect(other.allowed).toBe(true);
      expect(blocked.allowed).toBe(false);
    });

    it('reinicia la ventana al vencer el tiempo', async () => {
      vi.useFakeTimers();

      await checkRateLimit('key', { limit: 1, windowMs: 1000 });
      const blocked = await checkRateLimit('key', { limit: 1, windowMs: 1000 });
      expect(blocked.allowed).toBe(false);

      vi.advanceTimersByTime(1001);

      const afterWindow = await checkRateLimit('key', { limit: 1, windowMs: 1000 });
      expect(afterWindow.allowed).toBe(true);
      expect(afterWindow.remaining).toBe(0);
    });
  });

  describe('resetRateLimit', () => {
    it('libera el contador de una clave', async () => {
      await checkRateLimit('key', { limit: 1, windowMs: 60000 });
      const blocked = await checkRateLimit('key', { limit: 1, windowMs: 60000 });
      expect(blocked.allowed).toBe(false);

      await resetRateLimit('key');

      const afterReset = await checkRateLimit('key', { limit: 1, windowMs: 60000 });
      expect(afterReset.allowed).toBe(true);
    });
  });

  describe('getRateLimitPolicy', () => {
    it('aplica 10 peticiones por minuto a los endpoints críticos', () => {
      for (const pathname of [
        '/api/auth/login',
        '/api/auth/register',
        '/api/citas/6f1b2c3d-1111-2222-3333-444455556666/ia-report',
      ]) {
        const policy = getRateLimitPolicy(pathname);

        expect(policy.limit).toBe(10);
        expect(policy.windowMs).toBe(60000);
      }
    });

    it('usa el límite global para el resto de endpoints', () => {
      const policy = getRateLimitPolicy('/api/pacientes');

      expect(policy.limit).toBe(100);
      expect(policy.windowMs).toBe(60000);
    });

    it('devuelve el límite global sin pathname', () => {
      const policy = getRateLimitPolicy();

      expect(policy.limit).toBe(100);
      expect(policy.bucket).toBe('global');
    });
  });

  describe('buildRateLimitKey', () => {
    it('usa el usuario cuando está autenticado', () => {
      const key = buildRateLimitKey({ ip: '1.2.3.4', userId: 'user-1', pathname: '/api/pacientes' });

      expect(key).toContain('user:user-1');
      expect(key).not.toContain('1.2.3.4');
    });

    it('usa la IP cuando no hay usuario', () => {
      const key = buildRateLimitKey({ ip: '1.2.3.4', pathname: '/api/pacientes' });

      expect(key).toContain('ip:1.2.3.4');
    });

    it('separa los buckets de los endpoints críticos', () => {
      const login = buildRateLimitKey({ ip: '1.2.3.4', pathname: '/api/auth/login' });
      const register = buildRateLimitKey({ ip: '1.2.3.4', pathname: '/api/auth/register' });

      expect(login).not.toBe(register);
    });
  });

  describe('createRateLimitHeaders', () => {
    it('refleja el límite efectivo y no el valor global', () => {
      const headers = createRateLimitHeaders({
        limit: 10,
        remaining: 4,
        resetTime: 1_700_000_000_000,
      });

      expect(headers['X-RateLimit-Limit']).toBe('10');
      expect(headers['X-RateLimit-Remaining']).toBe('4');
      expect(headers['X-RateLimit-Reset']).toBe('1700000000');
      expect(headers['Retry-After']).toBeUndefined();
    });

    it('incluye Retry-After cuando la ventana está bloqueada', () => {
      const headers = createRateLimitHeaders({
        limit: 10,
        remaining: 0,
        resetTime: 1_700_000_000_000,
        retryAfter: 42,
      });

      expect(headers['Retry-After']).toBe('42');
    });
  });

  describe('buildRateLimitResponse', () => {
    it('devuelve 429 con la cabecera Retry-After', async () => {
      await checkRateLimit('key', { limit: 1, windowMs: 60000 });
      const blocked = await checkRateLimit('key', { limit: 1, windowMs: 60000 });

      const response = buildRateLimitResponse(blocked);

      expect(response.status).toBe(429);
      expect(response.headers['Retry-After']).toBeDefined();
      expect(Number(response.headers['Retry-After'])).toBeGreaterThan(0);
      expect(response.headers['X-RateLimit-Remaining']).toBe('0');
      expect(response.headers['X-RateLimit-Limit']).toBe('1');
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('RATE_LIMIT_EXCEEDED');
    });
  });

  describe('enforceRateLimit', () => {
    it('lanza RateLimitError con retryAfter cuando se excede el límite', async () => {
      await enforceRateLimit('key', { limit: 1, windowMs: 60000 });

      await expect(enforceRateLimit('key', { limit: 1, windowMs: 60000 })).rejects.toBeInstanceOf(
        RateLimitError
      );

      await enforceRateLimit('key', { limit: 1, windowMs: 60000 }).catch((error: RateLimitError) => {
        expect(error.retryAfter).toBeGreaterThan(0);
        expect(error.statusCode).toBe(429);
      });
    });
  });
});
