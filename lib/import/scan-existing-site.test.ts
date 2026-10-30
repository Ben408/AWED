import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { scanExistingSite } from '@/lib/import/scan-existing-site';

describe('scanExistingSite', () => {
  let root: string;

  beforeEach(async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), 'awed-scan-'));
    await fs.mkdir(path.join(root, 'app', 'about'), { recursive: true });
    await fs.mkdir(path.join(root, 'content', 'articles'), { recursive: true });
    await fs.mkdir(path.join(root, 'public', 'images'), { recursive: true });
    await fs.writeFile(
      path.join(root, 'package.json'),
      JSON.stringify({ name: 'sample-site', dependencies: { next: '14.0.0' } })
    );
    await fs.writeFile(path.join(root, 'app', 'page.tsx'), 'export default function Page() { return null }');
    await fs.writeFile(
      path.join(root, 'app', 'about', 'page.tsx'),
      'export default function Page() { return null }'
    );
    await fs.writeFile(path.join(root, 'content', 'articles', 'hello.mdx'), '---\ntitle: Hi\ndate: "2026-01-01"\nsummary: s\n---\n');
    await fs.writeFile(path.join(root, 'public', 'images', 'logo.png'), Buffer.from([1, 2, 3]));
  });

  afterEach(async () => {
    await fs.rm(root, { recursive: true, force: true });
  });

  it('indexes pages, articles, and media by path only', async () => {
    const scan = await scanExistingSite(root);
    expect(scan.kind).toBe('next-app-router');
    expect(scan.siteName).toBe('sample-site');
    expect(scan.appPages.map((p) => p.sourcePath).sort()).toEqual([
      'app/about/page.tsx',
      'app/page.tsx'
    ]);
    expect(scan.articleCount).toBe(1);
    expect(scan.mediaCount).toBe(1);
    expect(scan.files.some((f) => f.role === 'media' && f.urlPath === '/images/logo.png')).toBe(
      true
    );
    // No extracted marketing copy fields
    expect(scan).not.toHaveProperty('siteDescription');
  });
});
