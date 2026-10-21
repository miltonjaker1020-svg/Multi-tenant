import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { env } from '../env';
import { Tenant } from '../entities/public/Tenant';
import { User } from '../entities/public/User';
import { Paciente } from '../entities/tenant/Paciente';
import { Medico } from '../entities/tenant/Medico';
import { CitaMedica } from '../entities/tenant/CitaMedica';
import { IdempotencyKey } from '../entities/tenant/IdempotencyKey';

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: env.DATABASE_URL,
  schema: 'public',
  entities: [Tenant, User],
  migrations: ['lib/migrations/*.ts'],
  synchronize: false,
  logging: env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  ssl: env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  poolSize: 10,
});

export const TenantDataSource = new DataSource({
  type: 'postgres',
  url: env.DATABASE_URL,
  schema: 'public',
  entities: [Paciente, Medico, CitaMedica, IdempotencyKey],
  migrations: ['lib/migrations/*.ts'],
  synchronize: false,
  logging: env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  ssl: env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  poolSize: 10,
});

let publicDataSourceInitialized = false;
let tenantDataSourceInitialized = false;

export async function initializePublicDataSource(): Promise<DataSource> {
  if (!publicDataSourceInitialized) {
    await AppDataSource.initialize();
    publicDataSourceInitialized = true;
  }
  return AppDataSource;
}

export async function initializeTenantDataSource(): Promise<DataSource> {
  if (!tenantDataSourceInitialized) {
    await TenantDataSource.initialize();
    tenantDataSourceInitialized = true;
  }
  return TenantDataSource;
}

export async function closeDataSources(): Promise<void> {
  if (publicDataSourceInitialized) {
    await AppDataSource.destroy();
    publicDataSourceInitialized = false;
  }
  if (tenantDataSourceInitialized) {
    await TenantDataSource.destroy();
    tenantDataSourceInitialized = false;
  }
}