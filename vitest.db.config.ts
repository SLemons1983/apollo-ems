import path from 'node:path';
import { defineConfig } from 'vitest/config';

// Database tests: real PostgreSQL, local only, synthetic data.
// Run with: TEST_DATABASE_URL=postgresql://postgres@127.0.0.1:54329/postgres npm run test:db
// (scripts/local-test-db.sh starts a throwaway local server.)
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  test: {
    environment: 'node',
    include: ['src/db-tests/**/*.dbtest.ts'],
    testTimeout: 30_000,
    hookTimeout: 60_000,
    fileParallelism: false,
  },
});
