import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createBlankPage } from '@/lib/schema/page';
import { FsSiteStore } from '@/lib/store/fs-site-store';

describe('FsSiteStore', () => {
  let root: string;
  let store: FsSiteStore;

  beforeEach(async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), 'fwp-store-'));
    store = new FsSiteStore(root);
    await store.ensureLayout();
    await store.saveSite({
      version: 1,
      name: 'Tmp',
      brand: 'Tmp',
      description: '',
      defaultLocale: 'en',
      nav: [],
      capabilities: [],
      seo: { titleTemplate: '%s', defaultDescription: '' },
      agent: { summary: '', facts: [] }
    });
  });

  afterEach(async () => {
    await fs.rm(root, { recursive: true, force: true });
  });

  it('CRUD pages', async () => {
    const page = createBlankPage({ id: 'about', route: '/about', title: 'About' });
    await store.savePage(page);
    const loaded = await store.getPage('about');
    expect(loaded?.metadata.title).toBe('About');
    const list = await store.listPages();
    expect(list).toHaveLength(1);
    expect(await store.deletePage('about')).toBe(true);
    expect(await store.getPage('about')).toBeNull();
  });

  it('publishes draft articles into articles/', async () => {
    await store.saveArticle({
      slug: 'first-post',
      location: 'drafts',
      frontmatter: {
        title: 'First',
        date: '2026-10-01',
        summary: 'Sum',
        status: 'draft'
      },
      body: '# First\n'
    });
    const published = await store.publishArticle('first-post');
    expect(published.location).toBe('articles');
    expect(await store.getArticle('first-post', 'drafts')).toBeNull();
    expect((await store.getArticle('first-post', 'articles'))?.frontmatter.title).toBe('First');
  });

  it('records publish status', async () => {
    const result = await store.recordPublish('Committed locally');
    expect(result.ok).toBe(true);
    const status = await store.getPublishStatus();
    expect(status.message).toBe('Committed locally');
  });
});
