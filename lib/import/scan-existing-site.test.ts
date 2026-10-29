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
    await fs.mkdir(path.join(root, 'lib'), { recursive: true });
    await fs.writeFile(
      path.join(root, 'package.json'),
      JSON.stringify({ name: 'sample-site', dependencies: { next: '14.0.0' } })
    );
    await fs.writeFile(
      path.join(root, 'lib', 'constants.ts'),
      `export const siteConfig = { name: 'Sample Co', description: 'Desc', url: 'https://sample.test' };
export const navItems = [
  { label: 'About', href: '/about' },
  { label: 'Contact', href: '/contact' }
];
`
    );
    await fs.writeFile(
      path.join(root, 'app', 'page.tsx'),
      `export const metadata = { title: 'Home Title', description: 'Home desc' };
export default function Page() { return null }`
    );
    await fs.writeFile(
      path.join(root, 'app', 'about', 'page.tsx'),
      `export const metadata = { title: 'About Title', description: 'About desc' };
export default function Page() { return null }`
    );
    await fs.writeFile(path.join(root, 'content', 'articles', 'hello.mdx'), '---\ntitle: Hi\n---\n');
  });

  afterEach(async () => {
    await fs.rm(root, { recursive: true, force: true });
  });

  it('detects app pages, nav, and articles', async () => {
    const scan = await scanExistingSite(root);
    expect(scan.kind).toBe('next-app-router');
    expect(scan.siteName).toBe('Sample Co');
    expect(scan.nav).toEqual([
      { label: 'About', href: '/about' },
      { label: 'Contact', href: '/contact' }
    ]);
    expect(scan.appPages.map((p) => p.route).sort()).toEqual(['/', '/about']);
    expect(scan.articleCount).toBe(1);
  });
});
