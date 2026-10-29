import { describe, expect, it } from 'vitest';
import {
  parseArticleDocument,
  serializeArticleMdx
} from '@/lib/schema/article';

describe('article schema', () => {
  it('round-trips serialization fields', () => {
    const doc = parseArticleDocument({
      slug: 'hello-world',
      location: 'drafts',
      frontmatter: {
        title: 'Hello',
        date: '2026-10-29',
        summary: 'A summary',
        tags: ['a', 'b'],
        listed: false
      },
      body: '# Hello\n\nBody text.\n'
    });
    const mdx = serializeArticleMdx(doc);
    expect(mdx).toContain('title: Hello');
    expect(mdx).toContain('listed: false');
    expect(mdx).toContain('# Hello');
  });

  it('rejects invalid slugs', () => {
    expect(() =>
      parseArticleDocument({
        slug: 'Bad Slug',
        location: 'articles',
        frontmatter: { title: 't', date: '2026-01-01', summary: 's' },
        body: 'x'
      })
    ).toThrow();
  });

  it('coerces YAML Date objects to ISO date strings', () => {
    const doc = parseArticleDocument({
      slug: 'dated',
      location: 'drafts',
      frontmatter: {
        title: 'Dated',
        date: new Date('2026-10-01T12:00:00Z'),
        summary: 'Sum'
      },
      body: 'x'
    });
    expect(doc.frontmatter.date).toBe('2026-10-01');
  });
});
