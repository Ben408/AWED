import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { importExistingSite } from '@/lib/import/import-existing-site';
import { FsSiteStore } from '@/lib/store/fs-site-store';

describe('importExistingSite', () => {
  let root: string;
  let projectsFile: string;

  beforeEach(async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), 'awed-import-'));
    projectsFile = path.join(root, 'projects.json');
    process.env.FWP_PROJECTS_FILE = projectsFile;

    await fs.mkdir(path.join(root, 'site', 'app'), { recursive: true });
    await fs.mkdir(path.join(root, 'site', 'content', 'articles'), { recursive: true });
    await fs.mkdir(path.join(root, 'site', 'lib'), { recursive: true });
    await fs.writeFile(
      path.join(root, 'site', 'package.json'),
      JSON.stringify({ name: 'import-me', dependencies: { next: '14.0.0' } })
    );
    await fs.writeFile(
      path.join(root, 'site', 'lib', 'constants.ts'),
      `export const siteConfig = { name: 'Import Me', description: 'Imported', url: 'https://import.test' };
export const navItems = [{ label: 'Home', href: '/' }];
`
    );
    await fs.writeFile(
      path.join(root, 'site', 'app', 'page.tsx'),
      `export const metadata = { title: 'Home', description: 'Hi' }; export default function P(){return null}`
    );
  });

  afterEach(async () => {
    delete process.env.FWP_PROJECTS_FILE;
    await fs.rm(root, { recursive: true, force: true });
  });

  it('writes site.yaml, page docs, and attaches the project', async () => {
    const result = await importExistingSite({
      rootPath: path.join(root, 'site'),
      projectId: 'import-me',
      overwrite: true
    });
    expect(result.attached).toBe(true);
    expect(result.wroteSiteYaml).toBe(true);
    expect(result.pagesWritten).toBeGreaterThanOrEqual(1);

    const store = new FsSiteStore(path.join(root, 'site'));
    const site = await store.getSite();
    expect(site.name).toBe('Import Me');
    const home = await store.getPage('home');
    expect(home?.source?.kind).toBe('tsx');
    expect(home?.source?.path).toContain('app/page.tsx');
  });
});
