import { beforeEach, vi } from 'vitest';

// Safety guard: automated tests must never reach Supabase or any other
// network service. Any attempt fails the test immediately.
const blockNetwork = () => {
  throw new Error('Network access is disabled in automated tests. Use synthetic data only.');
};

beforeEach(() => {
  vi.stubGlobal('fetch', blockNetwork);
  vi.stubGlobal('WebSocket', blockNetwork);
});

vi.mock('@/lib/supabase', () => {
  throw new Error('Automated tests must not import the Supabase client. Use synthetic data only.');
});
