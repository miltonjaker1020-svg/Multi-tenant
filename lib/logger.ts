import pino from 'pino';
import { env } from './env';

const isDevelopment = env.NODE_ENV === 'development';

export const logger = pino({
  level: isDevelopment ? 'debug' : 'info',
  transport: isDevelopment
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss Z',
          ignore: 'pid,hostname',
        },
      }
    : undefined,
  formatters: {
    level: (label) => ({ level: label }),
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  base: {
    service: 'meditenant-ai',
    env: env.NODE_ENV,
  },
});

export function createChildLogger(bindings: Record<string, unknown>) {
  return logger.child(bindings);
}

export function createRequestLogger(requestId: string, tenantId?: string) {
  return logger.child({
    requestId,
    tenantId,
  });
}