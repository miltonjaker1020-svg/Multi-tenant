import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { env } from '../env';
import { Tenant } from '../entities/public/Tenant';
import { User } from '../entities/public/User';
import { CreatePublicSchema1700000000000 } from '../migrations/1700000000000-CreatePublicSchema';
import { TenantDataSource } from './tenant-data-source';

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: env.DATABASE_URL,
  schema: 'public',
  entities: [Tenant, User],
  migrations: [CreatePublicSchema1700000000000],
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