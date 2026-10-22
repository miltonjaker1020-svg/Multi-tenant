import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { extractTokenFromCookie, verifyToken } from './lib/jwt';
import { enforceRateLimit, createRateLimitHeaders } from './lib/rate-limit';
import { logger } from './lib/logger';
import { generateId } from './lib/utils';

export const runtime = 'nodejs';

const PUBLIC_PATHS = ['/login', '/register', '/api/auth/login', '/api/auth/register', '/api/tenants'];

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const requestId = generateId();
  const startTime = Date.now();

  const requestLogger = logger.child({ requestId, path: pathname, method: request.method });

  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.includes('.') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }

  if (pathname.startsWith('/api/')) {
    const ip = request.ip ?? request.headers.get('x-forwarded-for') ?? 'unknown';
    const rateLimitKey = `ratelimit:${ip}:${pathname}`;

    try {
      await enforceRateLimit(rateLimitKey);
    } catch (error) {
      if (error instanceof Error && error.name === 'RateLimitError') {
        const retryAfter = (error as any).retryAfter ?? 60;
        return new NextResponse(JSON.stringify({ error: 'Too many requests' }), {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': retryAfter.toString(),
            'X-RateLimit-Limit': '100',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': Math.ceil((Date.now() + retryAfter * 1000) / 1000).toString(),
          },
        });
      }
      throw error;
    }
  }

  const isProtectedApi = pathname.startsWith('/api/dashboard');
  const isProtectedPage = pathname.startsWith('/dashboard');
  const isProtected = isProtectedApi || isProtectedPage;

  if (!isProtected && PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
    return NextResponse.next();
  }

  if (!isProtected && pathname === '/') {
    return NextResponse.next();
  }

  if (!isProtected && !pathname.startsWith('/api/dashboard') && !pathname.startsWith('/dashboard')) {
    if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/')) || pathname === '/') {
      return NextResponse.next();
    }
  }

  const token = extractTokenFromCookie(request.headers.get('cookie'));

  if (!token) {
    requestLogger.warn('No auth token found');
    if (isProtectedApi) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (isProtectedPage || pathname.startsWith('/dashboard') || pathname.startsWith('/api/dashboard')) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      return redirectToLogin(request);
    }
    return redirectToLogin(request);
  }

  const payload = await verifyToken(token);

  if (!payload) {
    requestLogger.warn('Invalid or expired token');
    if (isProtectedApi || pathname.startsWith('/api/dashboard')) {
      const response = NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      response.cookies.delete('auth_token');
      return response;
    }
    if (isProtectedPage || pathname.startsWith('/dashboard')) {
      const response = redirectToLogin(request);
      response.cookies.delete('auth_token');
      return response;
    }
    const response = redirectToLogin(request);
    response.cookies.delete('auth_token');
    return response;
  }

  const requestHeaders = new Headers(request.headers);
  if (payload.tenantSchema) {
    requestHeaders.set('x-tenant-schema', payload.tenantSchema);
  }
  if (payload.tenantId) {
    requestHeaders.set('x-tenant-id', payload.tenantId);
  }
  if (payload.tenantSlug) {
    requestHeaders.set('x-tenant-slug', payload.tenantSlug);
  }
  requestHeaders.set('x-user-id', payload.sub);
  requestHeaders.set('x-user-email', payload.email);
  requestHeaders.set('x-user-role', payload.role);
  requestHeaders.set('x-session-id', payload.sessionId);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  if (payload.tenantSchema) {
    response.headers.set('x-tenant-schema', payload.tenantSchema);
  }
  if (payload.tenantId) {
    response.headers.set('x-tenant-id', payload.tenantId);
  }
  if (payload.tenantSlug) {
    response.headers.set('x-tenant-slug', payload.tenantSlug);
  }

  response.headers.set('x-user-id', payload.sub);
  response.headers.set('x-user-email', payload.email);
  response.headers.set('x-user-role', payload.role);
  response.headers.set('x-session-id', payload.sessionId);

  const rateLimitHeaders = createRateLimitHeaders({ remaining: 99, resetTime: Date.now() + 60000 });
  Object.entries(rateLimitHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  response.headers.set('x-request-id', requestId);

  const duration = Date.now() - startTime;
  requestLogger.info({ duration, userId: payload.sub, tenantId: payload.tenantId }, 'Request processed');

  return response;
}

function redirectToLogin(request: NextRequest) {
  const loginUrl = new URL('/login', request.url);
  loginUrl.searchParams.set('redirect', request.nextUrl.pathname + request.nextUrl.search);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)',
  ],
};