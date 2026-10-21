import { Repository, EntityManager, EntityTarget, QueryRunner, DataSource } from 'typeorm';
import { initializeTenantDataSource } from '../config/data-source';
import { Paciente } from '../entities/tenant/Paciente';
import { Medico } from '../entities/tenant/Medico';
import { CitaMedica } from '../entities/tenant/CitaMedica';
import { IdempotencyKey } from '../entities/tenant/IdempotencyKey';

type TenantEntity = Paciente | Medico | CitaMedica | IdempotencyKey;
type TenantEntityConstructor = EntityTarget<TenantEntity>;

interface TenantRepositories {
  paciente: Repository<Paciente>;
  medico: Repository<Medico>;
  citaMedica: Repository<CitaMedica>;
  idempotencyKey: Repository<IdempotencyKey>;
}

const entityMap: Record<string, TenantEntityConstructor> = {
  paciente: Paciente,
  medico: Medico,
  citaMedica: CitaMedica,
  idempotencyKey: IdempotencyKey,
};

export class TenantRepositoryFactory {
  private dataSource: DataSource | null = null;

  private async getDataSource(): Promise<DataSource> {
    if (!this.dataSource) {
      this.dataSource = await initializeTenantDataSource();
    }
    return this.dataSource;
  }

  async getRepositories(schemaName: string): Promise<TenantRepositories> {
    const dataSource = await this.getDataSource();
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.query(`SET search_path TO "${schemaName}", public`);

    const manager = queryRunner.manager;

    return {
      paciente: manager.getRepository(Paciente),
      medico: manager.getRepository(Medico),
      citaMedica: manager.getRepository(CitaMedica),
      idempotencyKey: manager.getRepository(IdempotencyKey),
    };
  }

  async getRepository<T extends TenantEntity>(
    schemaName: string,
    entity: TenantEntityConstructor
  ): Promise<Repository<T>> {
    const dataSource = await this.getDataSource();
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.query(`SET search_path TO "${schemaName}", public`);
    return queryRunner.manager.getRepository(entity) as Repository<T>;
  }

  async transaction<T>(
    schemaName: string,
    callback: (manager: EntityManager) => Promise<T>
  ): Promise<T> {
    const dataSource = await this.getDataSource();
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.query(`SET search_path TO "${schemaName}", public`);

    try {
      return await queryRunner.manager.transaction(callback);
    } finally {
      await queryRunner.release();
    }
  }

  async query<T = any>(
    schemaName: string,
    sql: string,
    parameters?: any[]
  ): Promise<T[]> {
    const dataSource = await this.getDataSource();
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.query(`SET search_path TO "${schemaName}", public`);
    return queryRunner.query(sql, parameters);
  }
}

export const tenantRepositoryFactory = new TenantRepositoryFactory();