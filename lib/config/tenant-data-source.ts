import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { env } from '../env';
import { Paciente } from '../entities/tenant/Paciente';
import { Medico } from '../entities/tenant/Medico';
import { CitaMedica } from '../entities/tenant/CitaMedica';
import { IdempotencyKey } from '../entities/tenant/IdempotencyKey';

export const TenantDataSource = new DataSource({
  type: 'postgres',
  url: env.DATABASE_URL,
  schema: 'public',
  entities: [Paciente, Medico, CitaMedica, IdempotencyKey],
  migrations: [],
  synchronize: false,
  logging: env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  ssl: env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  poolSize: 10,
});
