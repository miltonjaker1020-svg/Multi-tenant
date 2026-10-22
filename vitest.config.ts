import { defineConfig } from 'vitest/config';
import swc from 'unplugin-swc';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  plugins: [
    swc.vite({
      module: { type: 'es6' },
      jsc: {
        target: 'es2022',
        parser: { syntax: 'typescript', decorators: true },
        transform: { legacyDecorator: true, decoratorMetadata: true },
      },
    }),
  ],
  resolve: {
    alias: {
      '@/': `${fileURLToPath(new URL('./', import.meta.url))}`,
    },
  },
  test: {
    environment: 'node',
    globals: false,
    include: ['__tests__/**/*.test.ts'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '__tests__/api/citas.test.ts',
      '__tests__/api/auth.test.ts',
      '__tests__/lib/gemini.test.ts',
      '__tests__/lib/idempotency.test.ts',
      '__tests__/lib/jwt.test.ts',
      '__tests__/lib/validators.test.ts',
    ],
    setupFiles: ['./__tests__/setup.ts'],
    testTimeout: 30000,
    hookTimeout: 60000,
  },
});
