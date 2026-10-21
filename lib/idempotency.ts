import { typeOrmTenantClient } from './services/TypeOrmTenantClient';
import { IdempotencyKey } from './entities/tenant/IdempotencyKey';
import { env } from './env';
import { logger } from './logger';
import { IdempotencyError } from './errors';

export interface IdempotencyRecord {
  key: string;
  tenantId: string;
  endpoint: string;
  method: string;
  response?: unknown;
  statusCode?: number;
  createdAt: Date;
  expiresAt: Date;
}

export interface IdempotencyResult {
  isNew: boolean;
  record?: IdempotencyRecord;
}

const TTL_MS = env.IDEMPOTENCY_TTL_HOURS * 60 * 60 * 1000;

export async function checkIdempotencyKey(
  tenantSchema: string,
  key: string,
  endpoint: string,
  method: string
): Promise<IdempotencyResult> {
  const repo = await typeOrmTenantClient.getRepository(tenantSchema, IdempotencyKey);

  const existing = await repo.findOne({ where: { key } });

  if (existing) {
    if (existing.expiresAt < new Date()) {
      await repo.delete({ key });
      logger.debug({ key, tenantSchema }, 'Expired idempotency key deleted');
      return { isNew: true };
    }

    logger.warn({ key, tenantSchema, endpoint }, 'Idempotency key already used');
    throw new IdempotencyError(`Idempotency key "${key}" already processed`);
  }

  const expiresAt = new Date(Date.now() + TTL_MS);
  const record = repo.create({
    key,
    tenantId: tenantSchema,
    endpoint,
    method,
    expiresAt,
  });
  await repo.save(record);

  return {
    isNew: true,
    record: {
      key: record.key,
      tenantId: record.tenantId,
      endpoint: record.endpoint,
      method: record.method,
      statusCode: record.statusCode ?? undefined,
      response: record.responseBody ?? undefined,
      createdAt: record.createdAt,
      expiresAt: record.expiresAt,
    },
  };
}

export async function saveIdempotencyResponse(
  tenantSchema: string,
  key: string,
  response: unknown,
  statusCode: number
): Promise<void> {
  const repo = await typeOrmTenantClient.getRepository(tenantSchema, IdempotencyKey);

  await repo.update({ key }, {
    responseBody: response as any,
    statusCode,
  });
}

export async function deleteIdempotencyKey(tenantSchema: string, key: string): Promise<void> {
  const repo = await typeOrmTenantClient.getRepository(tenantSchema, IdempotencyKey);
  await repo.delete({ key }).catch(() => {});
}

export async function cleanupExpiredIdempotencyKeys(tenantSchema: string): Promise<number> {
  const repo = await typeOrmTenantClient.getRepository(tenantSchema, IdempotencyKey);

  const result = await repo.delete({
    expiresAt: { $lt: new Date() } as any,
  });

  if (result.affected && result.affected > 0) {
    logger.info({ tenantSchema, count: result.affected }, 'Cleaned up expired idempotency keys');
  }

  return result.affected ?? 0;
}

export function generateIdempotencyKey(): string {
  return `idem_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}

export function extractIdempotencyKey(headers: Headers): string | null {
  return headers.get('Idempotency-Key') || headers.get('idempotency-key');
}