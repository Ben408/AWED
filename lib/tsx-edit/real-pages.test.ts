import fs from 'fs/promises';
import path from 'path';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  applyTsxRegions,
  clearTsxSpanMemory,
  extractTsxRegions
} from '@/lib/tsx-edit/regions';

/**
 * Optional read-only smoke against a local site checkout.
 * Disabled by default so CI / routine `npm test` never touch bencornelius.com files.
 * Enable with: AWED_LIVE_SITE_ROOT=C:/path/to/website AWED_ALLOW_LIVE_READ=1
 * Never writes to disk.
 */
const ROOT = process.env.AWED_LIVE_SITE_ROOT?.trim();
const ALLOW = process.env.AWED_ALLOW_LIVE_READ === '1';
const enabled = Boolean(ROOT && ALLOW);

const SAMPLES = [
  'app/about/page.tsx',
  'app/resources/page.tsx',
  'app/case-studies/page.tsx',
  'app/page.tsx'
];

describe.skipIf(!enabled)('live site read-only smoke (opt-in)', () => {
  beforeEach(() => clearTsxSpanMemory());

  it.each(SAMPLES)('extracts editable regions from %s (read-only)', async (rel) => {
    const source = await fs.readFile(path.join(ROOT!, rel), 'utf8');
    const model = extractTsxRegions(source, rel);
    expect(model.regions.length).toBeGreaterThan(0);
    // In-memory apply only — never fs.writeFile
    const title = model.regions.find((r) => r.id === 'metadata.title');
    if (title && title.kind === 'string') {
      const next = applyTsxRegions(source, rel, [{ ...title, value: title.value }]);
      expect(next).toContain('export');
    }
  });
});
