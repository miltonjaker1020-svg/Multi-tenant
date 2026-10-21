import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity({ name: 'idempotency_keys' })
@Index(['tenantId'])
@Index(['expiresAt'])
export class IdempotencyKey {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255, unique: true })
  key: string;

  @Column({ name: 'tenant_id', length: 60 })
  tenantId: string;

  @Column({ length: 200 })
  endpoint: string;

  @Column({ length: 10 })
  method: string;

  @Column({ name: 'response_body', type: 'jsonb', nullable: true })
  responseBody: Record<string, unknown> | null;

  @Column({ name: 'status_code', nullable: true })
  statusCode: number | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt: Date;
}