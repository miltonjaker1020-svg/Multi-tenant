import { NextRequest, NextResponse } from 'next/server';
import { createTenantSchema } from '@/lib/tenant-manager';
import { publicTenantRepository } from '@/lib/repositories/PublicTenantRepository';
import { ConflictError, ValidationError } from '@/lib/errors';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const requestLogger = logger.child({ requestId, path: '/api/tenants' });

  try {
    const body = await request.json();
    const nombre = body.nombre || body.name || body.clinicName;
    const slug = body.slug || body.clinicSlug;

    if (!nombre || !slug) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Nombre y slug son requeridos' } },
        { status: 400 }
      );
    }

    const existingTenant = await publicTenantRepository.findBySlug(slug);
    if (existingTenant) {
      return NextResponse.json(
        { error: { code: 'CONFLICT', message: 'El tenant ya existe' } },
        { status: 409 }
      );
    }

    const result = await createTenantSchema(slug, nombre);
    requestLogger.info({ tenantId: result.id, slug: result.slug }, 'Tenant created');

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof ConflictError) {
      return NextResponse.json({ error: { code: 'CONFLICT', message: error.message } }, { status: 409 });
    }
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: error.message } }, { status: 400 });
    }
    requestLogger.error({ error }, 'Error creating tenant');
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: 'Error interno' } }, { status: 500 });
  }
}
