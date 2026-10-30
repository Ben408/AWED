import path from 'path';
import { describe, expect, it } from 'vitest';

/**
 * Guardrail: routine unit tests must not target the live bencornelius.com checkout.
 */
describe('live site isolation guardrails', () => {
  it('does not enable live reads unless explicitly opted in', () => {
    expect(process.env.AWED_ALLOW_LIVE_READ === '1').toBe(false);
  });

  it('fixture pages live under the AWED repo, not Desktop/website', () => {
    const fixtures = path.join(process.cwd(), 'fixtures', 'tsx-pages');
    expect(fixtures.replace(/\\/g, '/')).toContain('/fixtures/tsx-pages');
    expect(fixtures.toLowerCase()).not.toContain('desktop\\website');
    expect(fixtures.toLowerCase()).not.toContain('desktop/website');
  });
});
