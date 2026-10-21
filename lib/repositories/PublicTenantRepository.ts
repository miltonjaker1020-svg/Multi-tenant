import { Repository, DataSource } from 'typeorm';
import { Tenant } from '../entities/public/Tenant';
import { initializePublicDataSource } from '../config/data-source';

export class PublicTenantRepository {
  private repository: Repository<Tenant> | null = null;

  private async getRepository(): Promise<Repository<Tenant>> {
    if (!this.repository) {
      const dataSource = await initializePublicDataSource();
      this.repository = dataSource.getRepository(Tenant);
    }
    return this.repository;
  }

  async findBySlug(slug: string): Promise<Tenant | null> {
    const repo = await this.getRepository();
    return repo.findOne({ where: { slug } });
  }

  async findBySchemaName(schemaName: string): Promise<Tenant | null> {
    const repo = await this.getRepository();
    return repo.findOne({ where: { schemaName } });
  }

  async findById(id: string): Promise<Tenant | null> {
    const repo = await this.getRepository();
    return repo.findOne({ where: { id } });
  }

  async create(data: Partial<Tenant>): Promise<Tenant> {
    const repo = await this.getRepository();
    const tenant = repo.create(data);
    return repo.save(tenant);
  }

  async findAllActive(): Promise<Tenant[]> {
    const repo = await this.getRepository();
    return repo.find({ where: { isActive: true } });
  }
}

export const publicTenantRepository = new PublicTenantRepository();