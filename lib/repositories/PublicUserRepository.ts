import { Repository, DataSource } from 'typeorm';
import { User } from '../entities/public/User';
import { UserRole } from '../types';
import { initializePublicDataSource } from '../config/data-source';

export class PublicUserRepository {
  private repository: Repository<User> | null = null;

  private async getRepository(): Promise<Repository<User>> {
    if (!this.repository) {
      const dataSource = await initializePublicDataSource();
      this.repository = dataSource.getRepository(User);
    }
    return this.repository;
  }

  async findByEmail(email: string): Promise<User | null> {
    const repo = await this.getRepository();
    return repo.findOne({ where: { email } });
  }

  async findById(id: string): Promise<User | null> {
    const repo = await this.getRepository();
    return repo.findOne({ where: { id } });
  }

  async findByTenantId(tenantId: string): Promise<User[]> {
    const repo = await this.getRepository();
    return repo.find({ where: { tenantId } });
  }

  async create(data: Partial<User>): Promise<User> {
    const repo = await this.getRepository();
    const user = repo.create(data);
    return repo.save(user);
  }

  async updateLastLogin(id: string): Promise<void> {
    const repo = await this.getRepository();
    await repo.update(id, { lastLoginAt: new Date() });
  }

  async findSuperAdmins(): Promise<User[]> {
    const repo = await this.getRepository();
    return repo.find({ where: { role: UserRole.SUPERADMIN } });
  }
}

export const publicUserRepository = new PublicUserRepository();