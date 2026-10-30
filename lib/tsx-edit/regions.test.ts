import { describe, expect, it, beforeEach } from 'vitest';
import {
  applyTsxRegions,
  clearTsxSpanMemory,
  extractTsxRegions
} from '@/lib/tsx-edit/regions';

const SAMPLE = `import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About Us',
  description: 'We help globally.'
};

const credentials = [
  'First credential',
  'Second credential'
];

const resources = [
  {
    title: 'Guide',
    description: 'A useful guide',
    href: '/a.pdf'
  }
];

export default function Page() { return null }
`;

describe('tsx region extract/apply', () => {
  beforeEach(() => clearTsxSpanMemory());

  it('extracts metadata and const lists from real-style TSX', () => {
    const model = extractTsxRegions(SAMPLE, 'app/about/page.tsx');
    expect(model.regions.some((r) => r.id === 'metadata.title')).toBe(true);
    expect(model.regions.some((r) => r.id === 'const.credentials')).toBe(true);
    expect(model.regions.some((r) => r.id === 'const.resources')).toBe(true);
  });

  it('round-trips edits back into the same file text', () => {
    const model = extractTsxRegions(SAMPLE, 'app/about/page.tsx');
    const regions = model.regions.map((region) => {
      if (region.id === 'metadata.title' && region.kind === 'string') {
        return { ...region, value: 'About Cornelius' };
      }
      if (region.id === 'const.credentials' && region.kind === 'stringList') {
        return { ...region, values: ['Only one'] };
      }
      return region;
    });
    const next = applyTsxRegions(SAMPLE, 'app/about/page.tsx', regions);
    expect(next).toContain("title: 'About Cornelius'");
    expect(next).toContain("'Only one'");
    expect(next).not.toContain('First credential');
  });

  it('skips object arrays that contain code expressions', () => {
    const src = `const categories = [
  { name: 'All', count: resources.length },
  { name: 'Strategy', count: 1 }
];
`;
    clearTsxSpanMemory();
    const model = extractTsxRegions(src, 'app/x.tsx');
    expect(model.regions.some((r) => r.id === 'const.categories')).toBe(false);
  });

  it('parses object arrays that use escaped apostrophes', () => {
    const src = `const resources = [
  {
    title: 'Cultural Dimensions Guide',
    description: 'Standalone guide to Geert Hofstede\\'s six cultural dimensions.',
    href: '/resources/cultural-dimensions-guide.pdf'
  }
];
`;
    clearTsxSpanMemory();
    const model = extractTsxRegions(src, 'app/resources.tsx');
    const list = model.regions.find((r) => r.id === 'const.resources');
    expect(list?.kind).toBe('objectList');
    if (!list || list.kind !== 'objectList') throw new Error('missing resources');
    expect(list.rows[0].description).toContain("Hofstede's");
  });

  it('parses case-studies style data with booleans and nested metrics', () => {
    const src = `const caseStudies = [
  {
    title: 'Enterprise SaaS',
    slug: 'enterprise-saas',
    featured: true,
    tags: ['a', 'b'],
    metrics: [
      { label: 'Markets Launched', value: '60' },
      { label: 'Time to Market', value: '70 days' }
    ]
  },
  {
    title: 'FinTech',
    slug: 'fintech',
    featured: false,
    tags: ['c'],
    metrics: [
      { label: 'Markets Added', value: '5' }
    ]
  }
];
`;
    clearTsxSpanMemory();
    const model = extractTsxRegions(src, 'app/case-studies/page.tsx');
    const list = model.regions.find((r) => r.id === 'const.caseStudies');
    if (!list || list.kind !== 'objectList') throw new Error('missing caseStudies');
    expect(list.booleanFields).toEqual(['featured']);
    expect(list.listFields).toEqual(['tags']);
    expect(list.recordListFields).toEqual(['metrics']);
    expect(list.rows[0].featured).toBe('true');
    expect(list.rows[1].featured).toBe('false');
    expect(list.rows[0].tags).toBe('a\nb');
    expect(JSON.parse(list.rows[0].metrics)).toEqual([
      { label: 'Markets Launched', value: '60' },
      { label: 'Time to Market', value: '70 days' }
    ]);

    // Write back with edits and re-parse: structure must survive.
    const regions = model.regions.map((r) => {
      if (r.id !== 'const.caseStudies' || r.kind !== 'objectList') return r;
      const rows = r.rows.map((row, idx) =>
        idx === 1
          ? {
              ...row,
              featured: 'true',
              metrics: JSON.stringify([{ label: 'New', value: "9'" }])
            }
          : row
      );
      return { ...r, rows };
    });
    const next = applyTsxRegions(src, 'app/case-studies/page.tsx', regions);
    expect(next).toContain('featured: true');
    expect(next).not.toContain('featured: false');
    expect(next).toContain("{ label: 'New', value: '9\\'' }");

    clearTsxSpanMemory();
    const again = extractTsxRegions(next, 'app/case-studies/page.tsx');
    const list2 = again.regions.find((r) => r.id === 'const.caseStudies');
    if (!list2 || list2.kind !== 'objectList') throw new Error('missing after write');
    expect(list2.rows[1].featured).toBe('true');
    expect(JSON.parse(list2.rows[1].metrics)).toEqual([{ label: 'New', value: "9'" }]);
    expect(list2.rows[0].tags).toBe('a\nb');
  });

  it('rejects mixed-type fields and non-string nested props', () => {
    clearTsxSpanMemory();
    const nested = `const xs = [
  { name: 'a', metrics: [{ label: 'x', value: 1 }] }
];
`;
    expect(
      extractTsxRegions(nested, 'app/n.tsx').regions.some((r) => r.id === 'const.xs')
    ).toBe(false);
    clearTsxSpanMemory();
    const mixed = `const ys = [
  { name: 'a', on: true },
  { name: 'b', on: 'yes' }
];
`;
    expect(
      extractTsxRegions(mixed, 'app/m.tsx').regions.some((r) => r.id === 'const.ys')
    ).toBe(false);
  });

  it('extracts and writes back a CTA band', () => {
    const src = `export default function Page() {
  return (
    <div className="rounded-2xl border p-8 text-center">
      <h3 className="text-xl font-semibold mb-4">
        Ready to Create Your Success Story?
      </h3>
      <p className="text-base text-zinc-600 mb-6">
        Let&apos;s discuss how we can help.
      </p>
      <div className="flex gap-4">
        <Link
          href="/contact"
          className="inline-flex rounded-full bg-brand"
        >
          Start Your Project
        </Link>
        <Link
          href="/services"
          className="inline-flex rounded-full border"
        >
          View Our Services
        </Link>
      </div>
    </div>
  );
}
`;
    clearTsxSpanMemory();
    const model = extractTsxRegions(src, 'app/cta.tsx');
    const val = (id: string) => {
      const r = model.regions.find((x) => x.id === id);
      return r?.kind === 'string' ? r.value : undefined;
    };
    expect(val('jsx.cta.heading')).toBe('Ready to Create Your Success Story?');
    expect(val('jsx.cta.body')).toBe("Let's discuss how we can help.");
    expect(val('jsx.cta.primaryLabel')).toBe('Start Your Project');
    expect(val('jsx.cta.secondaryLabel')).toBe('View Our Services');
    expect(val('jsx.cta.primaryHref')).toBe('/contact');
    expect(val('jsx.cta.secondaryHref')).toBe('/services');

    const regions = model.regions.map((r) => {
      if (r.kind !== 'string') return r;
      if (r.id === 'jsx.cta.body') return { ...r, value: "We're here to help." };
      if (r.id === 'jsx.cta.primaryLabel') return { ...r, value: 'Book a Call' };
      if (r.id === 'jsx.cta.secondaryHref') return { ...r, value: '/work' };
      return r;
    });
    const next = applyTsxRegions(src, 'app/cta.tsx', regions);
    expect(next).toContain("We&apos;re here to help.");
    expect(next).toContain('Book a Call');
    expect(next).toContain('href="/work"');
    expect(next).toContain('href="/contact"');
    expect(next).toContain('View Our Services');
    expect(next).not.toContain('Start Your Project');
  });

  it('extracts simple JSX heading text', () => {
    const src = `export default function Page() {
  return (
    <h1 className="text-4xl">
      Hello World
    </h1>
  );
}
`;
    clearTsxSpanMemory();
    const model = extractTsxRegions(src, 'app/y.tsx');
    const h1 = model.regions.find((r) => r.id === 'jsx.h1');
    expect(h1?.kind === 'string' && h1.value).toBe('Hello World');
  });
});
