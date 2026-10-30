import { describe, expect, it } from 'vitest';
import {
  validateArticle,
  validateNav,
  validatePage
} from '@/lib/studio/validation';

describe('soft validation', () => {
  it('flags nav hrefs missing from page routes', () => {
    const issues = validateNav(
      [
        { label: 'Home', href: '/', listed: true },
        { label: 'Ghost', href: '/missing', listed: true },
        { label: 'Bad', href: 'no-slash', listed: true }
      ],
      ['/']
    );
    expect(issues.some((i) => i.message.includes('/missing'))).toBe(true);
    expect(issues.some((i) => i.message.includes('start with /'))).toBe(true);
  });

  it('flags empty article fields', () => {
    const issues = validateArticle({
      slug: 'x',
      location: 'drafts',
      frontmatter: { title: '', date: '2026-01-01', summary: '' },
      body: ''
    });
    expect(issues.some((i) => i.severity === 'warn' && i.message.includes('title'))).toBe(true);
    expect(issues.some((i) => i.message.includes('body'))).toBe(true);
  });

  it('flags empty document pages', () => {
    const issues = validatePage({
      version: 1,
      id: 'x',
      route: '/x',
      template: 'blank',
      metadata: { title: 'X', description: '', listed: true, robots: 'index' },
      agent: { tldr: '', facts: [], capabilities: [] },
      blocks: []
    });
    expect(issues.some((i) => i.message.includes('No blocks'))).toBe(true);
  });
});
