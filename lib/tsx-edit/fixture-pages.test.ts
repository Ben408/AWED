import fs from 'fs/promises';
import path from 'path';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  applyTsxRegions,
  clearTsxSpanMemory,
  extractTsxRegions
} from '@/lib/tsx-edit/regions';

/** Fixture-only — never reads or writes the live bencornelius.com tree. */
const FIXTURES = path.join(process.cwd(), 'fixtures', 'tsx-pages');

describe('fixture TSX page editability (isolated)', () => {
  beforeEach(() => clearTsxSpanMemory());

  it('extracts case studies list, featured, metrics, and CTA', async () => {
    const rel = 'fixtures/case-studies.page.tsx';
    const source = await fs.readFile(path.join(FIXTURES, 'case-studies.page.tsx'), 'utf8');
    const model = extractTsxRegions(source, rel);
    expect(model.regions.some((r) => r.id === 'const.caseStudies')).toBe(true);
    expect(model.regions.some((r) => r.id === 'jsx.cta.heading')).toBe(true);
    const list = model.regions.find((r) => r.id === 'const.caseStudies');
    expect(list?.kind).toBe('objectList');
    if (!list || list.kind !== 'objectList') throw new Error('missing caseStudies');
    expect(list.booleanFields).toContain('featured');
    expect(list.recordListFields).toContain('metrics');
    expect(list.rows).toHaveLength(2);
    expect(list.rows[0].featured).toBe('true');
  });

  it('round-trips featured flag without writing disk', async () => {
    const rel = 'fixtures/case-studies-rt.page.tsx';
    const source = await fs.readFile(path.join(FIXTURES, 'case-studies.page.tsx'), 'utf8');
    const model = extractTsxRegions(source, rel);
    const list = model.regions.find((r) => r.id === 'const.caseStudies');
    if (!list || list.kind !== 'objectList') throw new Error('missing');
    const flipped = {
      ...list,
      rows: list.rows.map((row, i) => ({
        ...row,
        featured: i === 1 ? 'true' : 'false'
      }))
    };
    const next = applyTsxRegions(source, rel, [flipped]);
    expect(next).toContain("slug: 'fintech-european-expansion'");
    expect(next).toMatch(/slug: 'fintech-european-expansion'[\s\S]*?featured:\s*true/);
    clearTsxSpanMemory();
    const again = extractTsxRegions(next, rel);
    const againList = again.regions.find((r) => r.id === 'const.caseStudies');
    if (!againList || againList.kind !== 'objectList') throw new Error('missing after');
    expect(againList.rows[1].featured).toBe('true');
    expect(againList.rows[0].featured).toBe('false');
  });

  it('skips categories with code expressions but keeps resources', async () => {
    const rel = 'fixtures/resources.page.tsx';
    const source = await fs.readFile(path.join(FIXTURES, 'resources.page.tsx'), 'utf8');
    const model = extractTsxRegions(source, rel);
    expect(model.regions.some((r) => r.id === 'const.categories')).toBe(false);
    expect(model.regions.some((r) => r.id === 'const.resources')).toBe(true);
  });
});
