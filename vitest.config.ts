import path from 'node:path';
import { defineConfig } from 'vitest/config';

// Tests run against synthetic data only. Pay-period math uses local time, so
// tests run in ApolloEMS's operating timezone (including DST transitions).
process.env.TZ = 'America/Los_Angeles';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    setupFiles: ['src/test/setup.ts'],
    env: {
      TZ: 'America/Los_Angeles',
    },
  },
});
