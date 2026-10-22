process.env.NODE_ENV = process.env.NODE_ENV ?? 'test';

process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? 'postgresql://postgres:postgres@127.0.0.1:5432/meditenant_test';

process.env.JWT_SECRET =
  process.env.JWT_SECRET ?? 'test-jwt-secret-value-with-more-than-32-characters';

process.env.GEMINI_API_KEY = process.env.GEMINI_API_KEY ?? 'test-gemini-api-key';
