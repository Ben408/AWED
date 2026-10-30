import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { readConstantsNav, writeConstantsNav } from '@/lib/store/nav-sync';

describe('nav-sync', () => {
  let root: string;

  beforeEach(async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), 'awed-nav-'));
    await fs.mkdir(path.join(root, 'lib'), { recursive: true });
    await fs.writeFile(
      path.join(root, 'lib', 'constants.ts'),
      `export type NavItem = { label: string; href: string };

export const navItems: NavItem[] = [
  { label: 'Services', href: '/services' },
  { label: 'About', href: '/about' }
];
`,
      'utf8'
    );
  });

  afterEach(async () => {
    await fs.rm(root, { recursive: true, force: true });
  });

  it('reads nav items from constants.ts', async () => {
    const nav = await readConstantsNav(root);
    expect(nav).toEqual([
      { label: 'Services', href: '/services', listed: true },
      { label: 'About', href: '/about', listed: true }
    ]);
  });

  it('writes nav items back into constants.ts', async () => {
    const ok = await writeConstantsNav(root, [
      { label: 'Contact', href: '/contact', listed: true },
      { label: 'Hidden', href: '/x', listed: false }
    ]);
    expect(ok).toBe(true);
    const source = await fs.readFile(path.join(root, 'lib', 'constants.ts'), 'utf8');
    expect(source).toContain("label: 'Contact'");
    expect(source).toContain("href: '/contact'");
    expect(source).not.toContain('/x');
    const nav = await readConstantsNav(root);
    expect(nav?.map((n) => n.href)).toEqual(['/contact']);
  });

  it('writes footerNavGroups into constants.ts', async () => {
    const { writeConstantsFooterGroups } = await import('@/lib/store/nav-sync');
    const ok = await writeConstantsFooterGroups(root, [
      {
        title: 'Explore',
        links: [{ label: 'About', href: '/about', listed: true }]
      }
    ]);
    expect(ok).toBe(true);
    const source = await fs.readFile(path.join(root, 'lib', 'constants.ts'), 'utf8');
    expect(source).toContain('footerNavGroups');
    expect(source).toContain("title: 'Explore'");
    expect(source).toContain("href: '/about'");
  });
});
