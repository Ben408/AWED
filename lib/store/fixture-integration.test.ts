import path from 'path';
import { describe, expect, it } from 'vitest';
import { FsSiteStore } from '@/lib/store/fs-site-store';

describe('demo fixture site integration', () => {
  const root = path.resolve(__dirname, '../../fixtures/demo-site');
  const store = new FsSiteStore(root);

  it('loads site.yaml and home page document', async () => {
    const site = await store.getSite();
    expect(site.brand).toBe('Demo Communications');
    const pages = await store.listPages();
    expect(pages.some((p) => p.id === 'home')).toBe(true);
  });

  it('lists the welcome article as published', async () => {
    const articles = await store.listArticles();
    const welcome = articles.find((a) => a.slug === 'welcome-to-fwp');
    expect(welcome?.location).toBe('articles');
    expect(welcome?.frontmatter.title).toMatch(/FWP/);
  });
});
