import { QueryRunner, DataSource } from 'typeorm';
import { initializePublicDataSource, initializeTenantDataSource } from '../config/data-source';
import { Tenant } from '../entities/public/Tenant';
import { logger } from '../logger';
import { env } from '../env';

export class TenantManager {
  private publicDataSource: DataSource | null = null;

  private async getPublicDataSource(): Promise<DataSource> {
    if (!this.publicDataSource) {
      this.publicDataSource = await initializePublicDataSource();
    }
    return this.publicDataSource;
  }

  async createTenantSchema(schemaName: string): Promise<void> {
    logger.info({ schemaName }, 'Creating tenant schema');

    const dataSource = await this.getPublicDataSource();
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`);
      await queryRunner.query(`GRANT USAGE ON SCHEMA "${schemaName}" TO postgres`);
      await queryRunner.query(`GRANT CREATE ON SCHEMA "${schemaName}" TO postgres`);
      logger.info({ schemaName }, 'Schema created successfully');
    } finally {
      await queryRunner.release();
    }
  }

  async runTenantMigrations(schemaName: string): Promise<void> {
    logger.info({ schemaName }, 'Running tenant migrations');

    const tenantDataSource = new DataSource({
      type: 'postgres',
      url: env.DATABASE_URL_UNPOOLED || env.DATABASE_URL,
      schema: schemaName,
      entities: [
        (await import('../entities/tenant/Paciente')).Paciente,
        (await import('../entities/tenant/Medico')).Medico,
        (await import('../entities/tenant/CitaMedica')).CitaMedica,
        (await import('../entities/tenant/IdempotencyKey')).IdempotencyKey,
      ],
      migrations: ['lib/migrations/*.ts'],
      synchronize: false,
      logging: env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
      ssl: env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    });

    try {
      await tenantDataSource.initialize();
      await tenantDataSource.runMigrations();
      logger.info({ schemaName }, 'Tenant migrations completed');
    } catch (error) {
      logger.error({ schemaName, error }, 'Failed to run tenant migrations');
      throw error;
    } finally {
      await tenantDataSource.destroy();
    }
  }

  async seedTenantData(schemaName: string): Promise<void> {
    logger.info({ schemaName }, 'Seeding tenant data');

    const tenantDataSource = new DataSource({
      type: 'postgres',
      url: env.DATABASE_URL_UNPOOLED || env.DATABASE_URL,
      schema: schemaName,
      entities: [
        (await import('../entities/tenant/Paciente')).Paciente,
        (await import('../entities/tenant/Medico')).Medico,
        (await import('../entities/tenant/CitaMedica')).CitaMedica,
        (await import('../entities/tenant/IdempotencyKey')).IdempotencyKey,
      ],
      synchronize: false,
      logging: false,
    });

    try {
      await tenantDataSource.initialize();
      const queryRunner = tenantDataSource.createQueryRunner();
      await queryRunner.connect();

      // Create sample data
      const medicoId = await this.createSampleMedico(queryRunner);
      const pacientes = await this.createSamplePacientes(queryRunner);
      await this.createSampleCitas(queryRunner, medicoId, pacientes);

      logger.info({ schemaName }, 'Tenant data seeded');
    } catch (error) {
      logger.warn({ schemaName, error }, 'Failed to seed tenant data (non-critical)');
    } finally {
      await tenantDataSource.destroy();
    }
  }

  private async createSampleMedico(queryRunner: QueryRunner): Promise<string> {
    const result = await queryRunner.query(`
      INSERT INTO "medicos" ("dni", "nombre", "apellidos", "especialidad", "colegiado", "telefono", "email", "horario")
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING "id"
    `, [
      '12345678A',
      'Carlos',
      'García Pérez',
      'Medicina General',
      'COLEG-001',
      '555-123-4567',
      'dr.garcia@demo.com',
      JSON.stringify({
        lunes: ['09:00-14:00'],
        martes: ['09:00-14:00'],
        miercoles: ['09:00-14:00'],
        jueves: ['09:00-14:00'],
        viernes: ['09:00-13:00'],
      }),
    ]);
    return result[0].id;
  }

  private async createSamplePacientes(queryRunner: QueryRunner): Promise<string[]> {
    const pacientes = [
      { dni: '11111111X', nombre: 'Juan', apellidos: 'Pérez García', fecha: '1980-05-15', sexo: 'MASCULINO', telefono: '555-111-2222', email: 'juan.perez@email.com' },
      { dni: '22222222Y', nombre: 'María', apellidos: 'González López', fecha: '1995-08-22', sexo: 'FEMENINO', telefono: '555-333-4444', email: 'maria.gonzalez@email.com' },
      { dni: '33333333Z', nombre: 'Pedro', apellidos: 'Rodríguez Martín', fecha: '1972-12-03', sexo: 'MASCULINO', telefono: '555-555-6666', email: 'pedro.rodriguez@email.com' },
    ];

    const ids: string[] = [];
    for (const p of pacientes) {
      const result = await queryRunner.query(`
        INSERT INTO "pacientes" ("dni", "nombre", "apellidos", "fecha_nacimiento", "sexo", "telefono", "email")
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING "id"
      `, [p.dni, p.nombre, p.apellidos, p.fecha, p.sexo, p.telefono, p.email]);
      ids.push(result[0].id);
    }
    return ids;
  }

  private async createSampleCitas(queryRunner: QueryRunner, medicoId: string, pacienteIds: string[]): Promise<void> {
    const now = new Date();
    for (let day = 0; day < 7; day++) {
      const date = new Date(now);
      date.setDate(now.getDate() + day);
      if (date.getDay() === 0 || date.getDay() === 6) continue;

      for (let i = 0; i < 3; i++) {
        const hour = 9 + i;
        const citaDate = new Date(date);
        citaDate.setHours(hour, 0, 0, 0);
        const pacienteId = pacienteIds[Math.floor(Math.random() * pacienteIds.length)];

        await queryRunner.query(`
          INSERT INTO "citas_medicas" ("paciente_id", "medico_id", "fecha_hora", "duracion", "estado", "sintomas_paciente", "idempotency_key")
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [
          pacienteId,
          medicoId,
          citaDate,
          30,
          'PENDIENTE',
          'Consulta de rutina',
          `seed-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        ]);
      }
    }
  }

  async setupNewTenant(schemaName: string, options: { runMigrations?: boolean; seedData?: boolean } = {}): Promise<void> {
    const { runMigrations = true, seedData = false } = options;

    await this.createTenantSchema(schemaName);

    if (runMigrations) {
      await this.runTenantMigrations(schemaName);
    }

    if (seedData) {
      await this.seedTenantData(schemaName);
    }
  }

  async checkTenantSchemaExists(schemaName: string): Promise<boolean> {
    const dataSource = await this.getPublicDataSource();
    const result = await dataSource.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.schemata WHERE schema_name = $1
      ) as exists
    `, [schemaName]);
    return result[0]?.exists ?? false;
  }

  async dropTenantSchema(schemaName: string): Promise<void> {
    logger.warn({ schemaName }, 'Dropping tenant schema');
    const dataSource = await this.getPublicDataSource();
    await dataSource.query(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`);
    logger.info({ schemaName }, 'Tenant schema dropped');
  }

  async listTenantSchemas(): Promise<string[]> {
    const dataSource = await this.getPublicDataSource();
    const result = await dataSource.query(`
      SELECT schema_name FROM information_schema.schemata
      WHERE schema_name LIKE 'tenant_%'
      ORDER BY schema_name
    `);
    return result.map((r: any) => r.schema_name);
  }
}

export const tenantManager = new TenantManager();