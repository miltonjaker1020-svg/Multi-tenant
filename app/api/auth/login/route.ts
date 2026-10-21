import { NextRequest, NextResponse } from 'next/server';
import { publicUserRepository } from '@/lib/repositories/PublicUserRepository';
import { publicTenantRepository } from '@/lib/repositories/PublicTenantRepository';
import { verifyPassword, signToken, createAuthCookie, createTokenPayload, generateSessionId } from '@/lib/jwt';
import { loginSchema } from '@/lib/validators';
import { logger } from '@/lib/logger';
import { handleError, errorResponse } from '@/lib/errors';

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const requestLogger = logger.child({ requestId, path: '/api/auth/login' });

  try {
    const body = await request.json();
    const validation = loginSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Datos inválidos', details: validation.error.flatten() } },
        { status: 400 }
      );
    }

    const { email, password } = validation.data;

    const user = await publicUserRepository.findByEmail(email);
    if (!user || !user.isActive) {
      requestLogger.warn({ email }, 'Login failed: user not found or inactive');
      return NextResponse.json(
        { error: { code: 'AUTHENTICATION_ERROR', message: 'Credenciales inválidas' } },
        { status: 401 }
      );
    }

    const validPassword = await verifyPassword(password, user.passwordHash);
    if (!validPassword) {
      requestLogger.warn({ email, userId: user.id }, 'Login failed: invalid password');
      return NextResponse.json(
        { error: { code: 'AUTHENTICATION_ERROR', message: 'Credenciales inválidas' } },
        { status: 401 }
      );
    }

    let tenant = null;
    if (user.tenantId) {
      tenant = await publicTenantRepository.findById(user.tenantId);
    }

    const sessionId = generateSessionId();
    const payload = createTokenPayload({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      tenantId: user.tenantId || undefined,
      tenantSlug: tenant?.slug,
      tenantSchema: tenant?.schemaName,
    }, sessionId);

    const token = await signToken(payload);
    const isProduction = process.env.NODE_ENV === 'production';
    const cookie = createAuthCookie(token, isProduction);

    await publicUserRepository.updateLastLogin(user.id);

    requestLogger.info({ userId: user.id, tenantId: user.tenantId }, 'User logged in');

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        tenant: tenant ? { id: tenant.id, name: tenant.nombre, slug: tenant.slug } : null,
      },
    });

    response.headers.set('Set-Cookie', cookie);
    return response;
  } catch (error) {
    const appError = handleError(error);
    requestLogger.error({ error: appError.message }, 'Login error');
    return NextResponse.json(errorResponse(appError), { status: appError.statusCode });
  }
}