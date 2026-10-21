import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
} from 'typeorm';
import { User } from './User';

@Entity({ schema: 'public', name: 'tenants' })
@Index(['slug'], { unique: true })
@Index(['schemaName'], { unique: true })
export class Tenant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  nombre: string;

  @Column({ length: 50 })
  slug: string;

  @Column({ name: 'schema_name', length: 60 })
  schemaName: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ type: 'jsonb', default: '{}' })
  settings: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => User, (user) => user.tenant)
  users: User[];
}