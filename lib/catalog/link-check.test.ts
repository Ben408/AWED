import { describe, expect, it } from 'vitest';
import { checkInternalLinks } from '@/lib/catalog/link-check';
import { createBlankPage } from '@/lib/schema/page';
import { createBlockInstance } from '@/lib/catalog/blocks';
import { parseSiteDocument } from '@/lib/schema/site';

describe('checkInternalLinks', () => {
  it('flags unknown internal routes', () => {
    const page = createBlankPage({ id: 'home', route: '/', title: 'Home' });
    const cta = createBlockInstance('ctaBand', 'c1');
    if (cta.type !== 'ctaBand') throw new Error('expected ctaBand');
    cta.props.buttonHref = '/missing-page';
    page.blocks = [cta];
    const site = parseSiteDocument({ name: 'T', brand: 'T', nav: [{ label: 'Home', href: '/' }] });
    const issues = checkInternalLinks([page], site);
    expect(issues.some((i) => i.severity === 'error' && i.href === '/missing-page')).toBe(true);
  });

  it('allows known routes and external URLs', () => {
    const page = createBlankPage({ id: 'home', route: '/', title: 'Home' });
    const hero = createBlockInstance('hero', 'h1');
    if (hero.type !== 'hero') throw new Error('expected hero');
    hero.props.primaryCtaHref = '/contact';
    hero.props.secondaryCtaHref = 'https://example.com';
    page.blocks = [hero];
    const site = parseSiteDocument({ name: 'T', brand: 'T' });
    const issues = checkInternalLinks([page], site);
    expect(issues.filter((i) => i.severity === 'error')).toHaveLength(0);
  });
});
