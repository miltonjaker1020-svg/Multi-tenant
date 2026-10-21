import { EntityManager, QueryRunner, DataSource } from 'typeorm';
import { tenantRepositoryFactory } from '../repositories/TenantRepositoryFactory';
import { initializeTenantDataSource } from '../config/data-source';
import { logger } from '../logger';

export interface TypeOrmTenantClient {
  getRepositories(schemaName: string): Promise<{
    paciente: any;
    medico: any;
    citaMedica: any;
    idempotencyKey: any;
  }>;
  getRepository<T>(schemaName: string, entity: any): Promise<any>;
  transaction<T>(schemaName: string, callback: (manager: EntityManager) => Promise<T>): Promise<T>;
  query<T>(schemaName: string, sql: string, parameters?: any[]): Promise<T[]>;
  release(schemaName: string): Promise<void>;
}

export class TypeOrmTenantClientImpl implements TypeOrmTenantClient {
  private queryRunners: Map<string, QueryRunner> = new Map();
  private dataSource: DataSource | null = null;

  private async getDataSource(): Promise<DataSource> {
    if (!this.dataSource) {
      this.dataSource = await initializeTenantDataSource();
    }
    return this.dataSource;
  }

  async getRepositories(schemaName: string) {
    return tenantRepositoryFactory.getRepositories(schemaName);
  }

  async getRepository<T>(schemaName: string, entity: any): Promise<any> {
    return tenantRepositoryFactory.getRepository(schemaName, entity);
  }

  async transaction<T>(schemaName: string, callback: (manager: EntityManager) => Promise<T>): Promise<T> {
    return tenantRepositoryFactory.transaction(schemaName, callback);
  }

  async query<T>(schemaName: string, sql: string, parameters?: any[]): Promise<T[]> {
    return tenantRepositoryFactory.query<T>(schemaName, sql, parameters);
  }

  async getQueryRunner(schemaName: string): Promise<QueryRunner> {
    let queryRunner = this.queryRunners.get(schemaName);
    if (!queryRunner || queryRunner.isReleased) {
      const dataSource = await this.getDataSource();
      queryRunner = dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.query(`SET search_path TO "${schemaName}", public`);
      this.queryRunners.set(schemaName, queryRunner);
    }
    return queryRunner;
  }

  async release(schemaName: string): Promise<void> {
    const queryRunner = this.queryRunners.get(schemaName);
    if (queryRunner && !queryRunner.isReleased) {
      await queryRunner.release();
      this.queryRunners.delete(schemaName);
    }
  }

  async releaseAll(): Promise<void> {
    for (const [schemaName, queryRunner] of this.queryRunners.entries()) {
      if (!queryRunner.isReleased) {
        await queryRunner.release();
      }
    }
    this.queryRunners.clear();
  }
}

export const typeOrmTenantClient = new TypeOrmTenantClientImpl();

if (typeof process !== 'undefined') {
  process.on('beforeExit', async () => {
    await typeOrmTenantClient.releaseAll();
  });
}