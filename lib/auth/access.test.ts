import { afterEach, describe, expect, it } from 'vitest';
import { isAdminEmail, identityFromHeaders } from '@/lib/auth/access';

describe('access helpers', () => {
  const prev = { ...process.env };

  afterEach(() => {
    process.env = { ...prev };
  });

  it('recognizes admin emails from env list', () => {
    process.env.CF_ACCESS_ADMIN_EMAILS = 'a@example.com, b@example.com';
    expect(isAdminEmail('A@example.com')).toBe(true);
    expect(isAdminEmail('other@example.com')).toBe(false);
  });

  it('bypasses auth in development when Access is unset', async () => {
    delete process.env.CF_ACCESS_TEAM_DOMAIN;
    delete process.env.CF_ACCESS_AUD;
    process.env.DEV_BYPASS_AUTH = '1';
    process.env.DEV_BYPASS_EMAIL = 'dev@example.com';
    const identity = await identityFromHeaders(new Headers());
    expect(identity?.email).toBe('dev@example.com');
  });
});
