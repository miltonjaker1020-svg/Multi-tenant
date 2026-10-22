import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  buildSchemaName,
  createTenantSchema,
  isValidSlug,
  quoteIdentifier,
  type CreatedTenant,
} from '../../lib/tenant-manager';
import { ConflictError, ValidationError } from '../../lib/errors';
import { initializePublicDataSource, closeDataSources } from '../../lib/config/data-source';

const runIntegration = Boolean(process.env.TEST_DATABASE_URL);

describe('tenant-manager (helpers)', () => {
  describe('isValidSlug', () => {
    it('acepta slugs en minúsculas con guiones', () => {
      expect(isValidSlug('clinica')).toBe(true);
      expect(isValidSlug('clinica-norte')).toBe(true);
      expect(isValidSlug('clinica-norte-2')).toBe(true);
    });

    it('rechaza slugs inválidos', () => {
      expect(isValidSlug('')).toBe(false);
      expect(isValidSlug('a')).toBe(false);
      expect(isValidSlug('Clinica')).toBe(false);
      expect(isValidSlug('clinica norte')).toBe(false);
      expect(isValidSlug('clinica--norte')).toBe(false);
      expect(isValidSlug('clinica_norte')).toBe(false);
      expect(isValidSlug('a'.repeat(51))).toBe(false);
    });
  });

  describe('buildSchemaName', () => {
    it('deriva el nombre del schema a partir del slug', () => {
      expect(buildSchemaName('clinica-norte')).toBe('tenant_clinica_norte');
      expect(buildSchemaName('clinica')).toBe('tenant_clinica');
    });

    it('nunca supera el límite de la columna schema_name', () => {
      const schemaName = buildSchemaName('a'.repeat(50));

      expect(schemaName.length).toBeLessThanOrEqual(60);
      expect(schemaName.startsWith('tenant_')).toBe(true);
    });
  });

  describe('quoteIdentifier', () => {
    it('entrecomilla identificadores seguros', () => {
      expect(quoteIdentifier('tenant_clinica')).toBe('"tenant_clinica"');
    });

    it('rechaza identificadores con inyección', () => {
      expect(() => quoteIdentifier('x"; DROP TABLE tenants;--')).toThrow(ValidationError);
      expect(() => quoteIdentifier('tenant; DROP')).toThrow(ValidationError);
      expect(() => quoteIdentifier('MAYUSCULAS')).toThrow(ValidationError);
    });
  });
});

describe.skipIf(!runIntegration)('tenant-manager (integración)', () => {
  const slug = `test-${Date.now().toString(36)}`;
  let created: CreatedTenant | undefined;

  beforeAll(async () => {
    created = await createTenantSchema(slug, 'Clínica de Prueba');
  });

  afterAll(async () => {
    const dataSource = await initializePublicDataSource();

    if (created?.schemaName) {
      await dataSource.query(`DROP SCHEMA IF EXISTS "${created.schemaName}" CASCADE`);
    }

    await dataSource.query('DELETE FROM public.tenants WHERE slug = $1', [slug]);
    await closeDataSources();
  });

  it('deriva el schema del tenant a partir del slug', () => {
    expect(created!.schemaName).toBe(buildSchemaName(slug));
    expect(created!.slug).toBe(slug);
    expect(created!.nombre).toBe('Clínica de Prueba');
  });

  it('crea las cuatro tablas de la plantilla dentro del schema del tenant', async () => {
    const dataSource = await initializePublicDataSource();
    const tables = await dataSource.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = $1 ORDER BY table_name`,
      [created!.schemaName]
    );

    expect(tables.map((row: { table_name: string }) => row.table_name)).toEqual([
      'citas_medicas',
      'idempotency_keys',
      'medicos',
      'pacientes',
    ]);
  });

  it('no crea las tablas de la plantilla en el schema public', async () => {
    const dataSource = await initializePublicDataSource();
    const leaked = await dataSource.query(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = 'public'
         AND table_name IN ('pacientes', 'medicos', 'citas_medicas', 'idempotency_keys')`
    );

    expect(leaked).toHaveLength(0);
  });

  it('registra el tenant en public.tenants', async () => {
    const dataSource = await initializePublicDataSource();
    const rows = await dataSource.query(
      'SELECT nombre, slug, schema_name, is_active FROM public.tenants WHERE slug = $1',
      [slug]
    );

    expect(rows).toHaveLength(1);
    expect(rows[0].nombre).toBe('Clínica de Prueba');
    expect(rows[0].schema_name).toBe(created!.schemaName);
    expect(rows[0].is_active).toBe(true);
  });

  it('rechaza un slug ya registrado', async () => {
    await expect(createTenantSchema(slug, 'Otra clínica')).rejects.toBeInstanceOf(ConflictError);
  });

  it('rechaza un slug inválido sin tocar la base de datos', async () => {
    await expect(createTenantSchema('Clinica Invalida', 'Otra')).rejects.toBeInstanceOf(
      ValidationError
    );
  });
});
