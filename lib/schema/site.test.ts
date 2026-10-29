import { describe, expect, it } from 'vitest';
import { parseSiteDocument } from '@/lib/schema/site';

describe('siteDocumentSchema', () => {
  it('parses a minimal site document with defaults', () => {
    const site = parseSiteDocument({
      name: 'Test',
      brand: 'Test Brand'
    });
    expect(site.version).toBe(1);
    expect(site.nav).toEqual([]);
    expect(site.capabilities).toEqual([]);
    expect(site.agent.facts).toEqual([]);
  });

  it('rejects missing brand', () => {
    expect(() => parseSiteDocument({ name: 'X' })).toThrow();
  });
});
