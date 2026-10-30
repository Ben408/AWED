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
    await fs.writeFile(
      path.join(root, 'site', 'package.json'),
      JSON.stringify({ name: 'import-me', dependencies: { next: '14.0.0' } })
    );
    await fs.writeFile(
      path.join(root, 'site', 'app', 'page.tsx'),
      'export default function P(){return null}'
    );
  });

  afterEach(async () => {
    delete process.env.FWP_PROJECTS_FILE;
    await fs.rm(root, { recursive: true, force: true });
  });

  it('writes path-only manifest and page pointers without stub blocks', async () => {
    const result = await importExistingSite({
      rootPath: path.join(root, 'site'),
      projectId: 'import-me',
      overwrite: true
    });
    expect(result.wroteManifest).toBe(true);
    expect(result.attached).toBe(true);

    const store = new FsSiteStore(path.join(root, 'site'));
    const manifest = await store.getManifest();
    expect(manifest?.files.some((f) => f.path === 'app/page.tsx')).toBe(true);

    const home = await store.getPage('home');
    expect(home?.source?.path).toBe('app/page.tsx');
    expect(home?.blocks).toEqual([]);
    expect(home?.metadata.description).toBe('');
  });
});
