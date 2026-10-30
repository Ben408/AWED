import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { FsSiteStore } from '@/lib/store/fs-site-store';

describe('media library', () => {
  let root: string;
  let store: FsSiteStore;

  beforeEach(async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), 'awed-media-'));
    store = new FsSiteStore(root);
    await store.ensureLayout();
    await fs.writeFile(path.join(store.layout.mediaDir, 'hero.png'), Buffer.from('img'));
  });

  afterEach(async () => {
    await fs.rm(root, { recursive: true, force: true });
  });

  it('lists public images and saves uploads into library/', async () => {
    const listed = await store.listMedia();
    expect(listed.some((m) => m.urlPath === '/images/hero.png')).toBe(true);

    const saved = await store.saveMediaFile('shot.jpg', Buffer.from('jpeg'));
    expect(saved.urlPath).toBe('/images/library/shot.jpg');
    expect(await fs.readFile(saved.absolutePath)).toEqual(Buffer.from('jpeg'));
  });
});
