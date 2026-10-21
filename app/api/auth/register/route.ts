import { NextRequest, NextResponse } from 'next/server';
import { publicUserRepository } from '@/lib/repositories/PublicUserRepository';
import { publicTenantRepository } from '@/lib/repositories/PublicTenantRepository';
import { tenantManager } from '@/lib/services/TenantManager';
import { hashPassword, signToken, createAuthCookie, createTokenPayload, generateSessionId } from '@/lib/jwt';
import { registerSchema } from '@/lib/validators';
import { logger } from '@/lib/logger';
import { handleError, errorResponse } from '@/lib/errors';
import { v4 as uuidv4 } from 'crypto';

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const requestLogger = logger.child({ requestId, path: '/api/auth/register' });

  try {
    const body = await request.json();
    const validation = registerSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Datos inválidos', details: validation.error.flatten() } },
        { status: 400 }
      );
    }

    const { clinicName, clinicSlug, adminName, adminEmail, adminPassword } = validation.data;

    const existingTenant = await publicTenantRepository.findBySlug(clinicSlug);
    if (existingTenant) {
      return NextResponse.json(
        { error: { code: 'CONFLICT', message: 'El subdominio ya está en uso' } },
        { status: 409 }
      );
    }

    const existingUser = await publicUserRepository.findByEmail(adminEmail);
    if (existingUser) {
      return NextResponse.json(
        { error: { code: 'CONFLICT', message: 'El email ya está registrado' } },
        { status: 409 }
      );
    }

    const schemaName = `tenant_${uuidv4().replace(/-/g, '').substring(0, 12)}`;

    const tenant = await publicTenantRepository.create({
      nombre: clinicName,
      slug: clinicSlug,
      schemaName,
      isActive: true,
      settings: { timezone: 'America/Mexico_City', currency: 'MXN', language: 'es' },
    });

    await tenantManager.setupNewTenant(schemaName, { runMigrations: true, seedData: true });

    const passwordHash = await hashPassword(adminPassword);
    const user = await publicUserRepository.create({
      email: adminEmail,
      passwordHash,
      name: adminName,
      role: 'ADMIN',
      isActive: true,
      tenantId: tenant.id,
    });

    const sessionId = generateSessionId();
    const payload = createTokenPayload({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
      tenantSchema: tenant.schemaName,
    }, sessionId);

    const token = await signToken(payload);
    const isProduction = process.env.NODE_ENV === 'production';
    const cookie = createAuthCookie(token, isProduction);

    requestLogger.info({ tenantId: tenant.id, userId: user.id }, 'Tenant and admin user created');

    const response = NextResponse.json({
      success: true,
      tenant: { id: tenant.id, name: tenant.nombre, slug: tenant.slug },
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    });

    response.headers.set('Set-Cookie', cookie);
    return response;
  } catch (error) {
    const appError = handleError(error);
    requestLogger.error({ error: appError.message }, 'Register error');
    return NextResponse.json(errorResponse(appError), { status: appError.statusCode });
  }
}