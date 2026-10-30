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
      footerGroups: [],
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

  it('dedupes list when draft and published share a slug', async () => {
    await store.saveArticle({
      slug: 'dupe',
      location: 'articles',
      frontmatter: {
        title: 'Published',
        date: '2026-10-02',
        summary: 'Sum',
        status: 'published'
      },
      body: '# Pub\n'
    });
    // Simulate orphan draft left on disk
    await fs.writeFile(
      path.join(store.layout.draftsDir, 'dupe.mdx'),
      `---\ntitle: Draft\ndate: "2026-10-01"\nsummary: Sum\nstatus: draft\n---\n\n# Draft\n`,
      'utf8'
    );
    const list = await store.listArticles();
    expect(list.filter((a) => a.slug === 'dupe')).toHaveLength(1);
    expect(list.find((a) => a.slug === 'dupe')?.location).toBe('articles');
    const removed = await store.reconcileArticleDuplicates();
    expect(removed).toContain('dupe');
    expect(await store.getArticle('dupe', 'drafts')).toBeNull();
  });

  it('reorders by swapping dates', async () => {
    await store.saveArticle({
      slug: 'older',
      location: 'articles',
      frontmatter: { title: 'Older', date: '2026-01-01', summary: 's', status: 'published' },
      body: 'a'
    });
    await store.saveArticle({
      slug: 'newer',
      location: 'articles',
      frontmatter: { title: 'Newer', date: '2026-06-01', summary: 's', status: 'published' },
      body: 'b'
    });
    await store.reorderArticles(['older', 'newer']);
    const list = await store.listArticles();
    expect(list.map((a) => a.slug)).toEqual(['older', 'newer']);
  });

  it('records publish status', async () => {
    const result = await store.recordPublish('Committed locally');
    expect(result.ok).toBe(true);
    const status = await store.getPublishStatus();
    expect(status.message).toBe('Committed locally');
  });

  it('creates a real TSX page + path record in the temp project only', async () => {
    const page = await store.createTsxPage({
      id: 'speaking',
      route: '/speaking',
      title: 'Speaking',
      description: 'Talks',
      lead: 'Book a talk.',
      addToNav: true
    });
    expect(page.source?.kind).toBe('tsx');
    expect(page.source?.path).toBe('app/speaking/page.tsx');
    const abs = path.join(root, 'app', 'speaking', 'page.tsx');
    const text = await fs.readFile(abs, 'utf8');
    expect(text).toContain('Speaking');
    expect(text).toContain('Book a talk.');
    const site = await store.getSite();
    expect(site.nav.some((n) => n.href === '/speaking')).toBe(true);
  });

  it('duplicates a TSX page into a new route without touching originals incorrectly', async () => {
    await store.createTsxPage({
      id: 'alpha',
      route: '/alpha',
      title: 'Alpha',
      lead: 'Original'
    });
    const copy = await store.duplicatePage('alpha', 'alpha-copy', '/alpha-copy');
    expect(copy.id).toBe('alpha-copy');
    expect(copy.route).toBe('/alpha-copy');
    expect(copy.metadata.title).toContain('(copy)');
    const original = await fs.readFile(path.join(root, 'app', 'alpha', 'page.tsx'), 'utf8');
    const duplicated = await fs.readFile(path.join(root, 'app', 'alpha-copy', 'page.tsx'), 'utf8');
    expect(original).toContain('function AlphaPage');
    expect(duplicated).toContain('function AlphaCopyPage');
  });

  it('deletePageDeep removes yaml, optional tsx, and nav entry', async () => {
    await store.createTsxPage({
      id: 'temp-page',
      route: '/temp-page',
      title: 'Temp',
      addToNav: true
    });
    const result = await store.deletePageDeep('temp-page', { deleteTsx: true });
    expect(result.deletedYaml).toBe(true);
    expect(result.deletedTsx).toBe(true);
    expect(result.removedNav).toBe(1);
    expect(await store.getPage('temp-page')).toBeNull();
    await expect(fs.access(path.join(root, 'app', 'temp-page', 'page.tsx'))).rejects.toBeTruthy();
  });

  it('duplicates articles into drafts only', async () => {
    await store.saveArticle({
      slug: 'live-post',
      location: 'articles',
      frontmatter: {
        title: 'Live',
        date: '2026-03-01',
        summary: 'Sum',
        status: 'published'
      },
      body: '# Live\n'
    });
    const copy = await store.duplicateArticle('live-post', 'live-post-copy');
    expect(copy.location).toBe('drafts');
    expect(copy.frontmatter.status).toBe('draft');
    expect(await store.getArticle('live-post', 'articles')).not.toBeNull();
    expect(await store.getArticle('live-post-copy', 'drafts')).not.toBeNull();
  });

  it('saves footer groups into site.yaml', async () => {
    const site = await store.saveFooterGroups([
      {
        title: 'Explore',
        links: [{ label: 'About', href: '/about', listed: true }]
      }
    ]);
    expect(site.footerGroups).toHaveLength(1);
    const reloaded = await store.getSite();
    expect(reloaded.footerGroups[0]?.title).toBe('Explore');
  });
});
