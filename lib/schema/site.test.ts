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
    expect(site.footerGroups).toEqual([]);
    expect(site.capabilities).toEqual([]);
    expect(site.agent.facts).toEqual([]);
  });

  it('parses footer link groups', () => {
    const site = parseSiteDocument({
      name: 'Test',
      brand: 'Test',
      footerGroups: [
        {
          title: 'Explore',
          links: [{ label: 'About', href: '/about' }]
        }
      ]
    });
    expect(site.footerGroups[0]?.links[0]?.href).toBe('/about');
  });

  it('rejects missing brand', () => {
    expect(() => parseSiteDocument({ name: 'X' })).toThrow();
  });
});
