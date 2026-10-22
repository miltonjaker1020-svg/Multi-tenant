import 'reflect-metadata';
import { QueryRunner } from 'typeorm';
import { initializePublicDataSource } from './config/data-source';
import { CreateTenantTemplate1700000000001 } from './migrations/1700000000001-CreateTenantTemplate';
import { Tenant } from './entities/public/Tenant';
import { ConflictError, TenantError, ValidationError } from './errors';
import { logger } from './logger';

export const TENANT_SCHEMA_PREFIX = 'tenant_';
export const MAX_SLUG_LENGTH = 50;
export const MAX_SCHEMA_NAME_LENGTH = 60;

const DEFAULT_TENANT_SETTINGS = {
  timezone: 'America/Mexico_City',
  currency: 'MXN',
  language: 'es',
};

export interface CreatedTenant {
  id: string;
  slug: string;
  schemaName: string;
  nombre: string;
}

export function isValidSlug(slug: string): boolean {
  return (
    typeof slug === 'string' &&
    slug.length >= 2 &&
    slug.length <= MAX_SLUG_LENGTH &&
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)
  );
}

export function buildSchemaName(slug: string): string {
  const normalized = slug.replace(/-/g, '_');
  return `${TENANT_SCHEMA_PREFIX}${normalized}`.slice(0, MAX_SCHEMA_NAME_LENGTH);
}

export function quoteIdentifier(name: string): string {
  if (typeof name !== 'string' || !/^[a-z0-9_]+$/.test(name)) {
    throw new ValidationError(`Identificador de SQL inválido: ${name}`);
  }
  return `"${name}"`;
}

function quoteRole(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}

export async function createTenantSchema(slug: string, nombre: string): Promise<CreatedTenant> {
  if (!isValidSlug(slug)) {
    throw new ValidationError(
      `Slug inválido: debe tener entre 2 y ${MAX_SLUG_LENGTH} caracteres en minúsculas, números y guiones`
    );
  }

  if (typeof nombre !== 'string' || nombre.trim().length < 2 || nombre.trim().length > 100) {
    throw new ValidationError('Nombre de la clínica inválido: debe tener entre 2 y 100 caracteres');
  }

  const tenantNombre = nombre.trim();
  const schemaName = buildSchemaName(slug);

  const dataSource = await initializePublicDataSource();
  const queryRunner = dataSource.createQueryRunner();
  await queryRunner.connect();

  try {
    await assertSlugAvailable(queryRunner, slug, schemaName);

    await queryRunner.startTransaction();

    try {
      await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS ${quoteIdentifier(schemaName)}`);
      await grantSchemaUsage(queryRunner, schemaName);

      await queryRunner.query(
        `SET LOCAL search_path TO ${quoteIdentifier(schemaName)}, public, extensions`
      );

      await new CreateTenantTemplate1700000000001().up(queryRunner);

      const repository = queryRunner.manager.getRepository(Tenant);
      const tenant = await repository.save(
        repository.create({
          nombre: tenantNombre,
          slug,
          schemaName,
          isActive: true,
          settings: DEFAULT_TENANT_SETTINGS,
        })
      );

      await queryRunner.commitTransaction();

      logger.info({ slug, schemaName, tenantId: tenant.id }, 'Tenant schema created');

      return {
        id: tenant.id,
        slug: tenant.slug,
        schemaName: tenant.schemaName,
        nombre: tenant.nombre,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      logger.error({ slug, schemaName, error }, 'Tenant schema creation failed, transaction rolled back');
      throw error;
    }
  } finally {
    await queryRunner.release();
  }
}

export async function dropTenantSchema(schemaName: string): Promise<void> {
  if (!/^[a-z0-9_]+$/.test(schemaName)) {
    throw new ValidationError(`Nombre de schema inválido: ${schemaName}`);
  }

  const dataSource = await initializePublicDataSource();
  await dataSource.query(`DROP SCHEMA IF EXISTS ${quoteIdentifier(schemaName)} CASCADE`);
  logger.warn({ schemaName }, 'Tenant schema dropped');
}

async function assertSlugAvailable(
  queryRunner: QueryRunner,
  slug: string,
  schemaName: string
): Promise<void> {
  let existing: Array<{ id: string }>;

  try {
    existing = await queryRunner.query(
      `SELECT "id" FROM "public"."tenants" WHERE "slug" = $1 OR "schema_name" = $2 LIMIT 1`,
      [slug, schemaName]
    );
  } catch (error) {
    if (error instanceof Error && /does not exist|no existe/i.test(error.message)) {
      throw new TenantError(
        'El esquema public no está inicializado. Ejecuta las migraciones (npm run db:migrate:prod).',
        'PUBLIC_SCHEMA_NOT_INITIALIZED'
      );
    }
    throw error;
  }

  if (existing.length > 0) {
    throw new ConflictError(`El tenant "${slug}" ya está registrado`);
  }
}

async function grantSchemaUsage(queryRunner: QueryRunner, schemaName: string): Promise<void> {
  try {
    const result = await queryRunner.query('SELECT current_user AS role');
    const role: string | undefined = result[0]?.role;

    if (!role) return;

    await queryRunner.query(
      `GRANT USAGE ON SCHEMA ${quoteIdentifier(schemaName)} TO ${quoteRole(role)}`
    );
    await queryRunner.query(
      `GRANT CREATE ON SCHEMA ${quoteIdentifier(schemaName)} TO ${quoteRole(role)}`
    );
  } catch (error) {
    logger.warn({ schemaName, error }, 'No se pudieron asignar permisos sobre el schema (no crítico)');
  }
}
