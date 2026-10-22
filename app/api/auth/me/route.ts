import { NextRequest, NextResponse } from 'next/server';
import { extractTokenFromCookie, verifyToken } from '@/lib/jwt';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const requestLogger = logger.child({ requestId, path: '/api/auth/me' });

  try {
    const token = extractTokenFromCookie(request.headers.get('cookie'));

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyToken(token);

    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    requestLogger.debug({ userId: payload.sub }, 'Session verified');

    return NextResponse.json({
      user: {
        id: payload.sub,
        email: payload.email,
        name: payload.name,
        role: payload.role,
        tenantId: payload.tenantId,
        tenantSlug: payload.tenantSlug,
        tenantSchema: payload.tenantSchema,
        sessionId: payload.sessionId,
      },
      authenticated: true,
    });
  } catch (error) {
    requestLogger.error({ error }, 'Error verifying session');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
