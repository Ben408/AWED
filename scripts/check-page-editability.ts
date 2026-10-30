/**
 * Optional read-only report against a local site checkout.
 * Refuses to run unless AWED_ALLOW_LIVE_READ=1 and AWED_LIVE_SITE_ROOT is set.
 * Never writes files.
 *
 * Example:
 *   AWED_ALLOW_LIVE_READ=1 AWED_LIVE_SITE_ROOT=C:/Users/.../website npm run check:pages
 */
import fs from 'fs/promises';
import path from 'path';
import { extractTsxRegions, clearTsxSpanMemory } from '../lib/tsx-edit/regions';

const ROOT = process.env.AWED_LIVE_SITE_ROOT?.trim();
const ALLOW = process.env.AWED_ALLOW_LIVE_READ === '1';

const PAGES = [
  'app/page.tsx',
  'app/about/page.tsx',
  'app/resources/page.tsx',
  'app/services/page.tsx',
  'app/contact/page.tsx',
  'app/partners/page.tsx',
  'app/media/page.tsx',
  'app/insights/page.tsx',
  'app/case-studies/page.tsx',
  'app/open-source-tools/page.tsx'
];

async function main() {
  if (!ALLOW || !ROOT) {
    console.error(
      'Refusing to scan a live site. Set AWED_ALLOW_LIVE_READ=1 and AWED_LIVE_SITE_ROOT to a local checkout. This script never writes.'
    );
    process.exit(2);
  }

  for (const rel of PAGES) {
    clearTsxSpanMemory();
    const abs = path.join(ROOT, rel);
    const source = await fs.readFile(abs, 'utf8');
    const model = extractTsxRegions(source, rel);
    console.log(
      JSON.stringify(
        {
          path: rel,
          regionCount: model.regions.length,
          regions: model.regions.map((r) => ({
            id: r.id,
            kind: r.kind,
            audience: r.audience,
            label: r.label
          })),
          warnings: model.warnings
        },
        null,
        2
      )
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
