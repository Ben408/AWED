import type { ArticleDocument } from '@/lib/schema/article';
import type { PageDocument } from '@/lib/schema/page';
import type { NavItem } from '@/lib/schema/site';

export type SoftIssue = {
  severity: 'info' | 'warn';
  message: string;
};

export function validateNav(nav: NavItem[], pageRoutes: string[]): SoftIssue[] {
  const issues: SoftIssue[] = [];
  const routes = new Set(pageRoutes);
  for (const item of nav) {
    if (!item.label.trim()) issues.push({ severity: 'warn', message: `Nav item missing label (${item.href})` });
    if (!item.href.startsWith('/')) {
      issues.push({ severity: 'warn', message: `Nav “${item.label}” should start with /` });
    } else if (!routes.has(item.href) && item.href !== '/') {
      issues.push({
        severity: 'info',
        message: `Nav “${item.label}” points to ${item.href}, which is not a known page route`
      });
    }
  }
  return issues;
}

export function validateArticle(doc: ArticleDocument): SoftIssue[] {
  const issues: SoftIssue[] = [];
  if (!doc.frontmatter.title.trim()) {
    issues.push({ severity: 'warn', message: 'Article needs a title' });
  }
  if (!doc.frontmatter.summary.trim()) {
    issues.push({ severity: 'info', message: 'Add a summary for indexes and SEO' });
  }
  if (!doc.frontmatter.image) {
    issues.push({ severity: 'info', message: 'No cover image yet' });
  }
  if (!doc.body.trim()) {
    issues.push({ severity: 'warn', message: 'Article body is empty' });
  }
  return issues;
}

export function validatePage(doc: PageDocument): SoftIssue[] {
  const issues: SoftIssue[] = [];
  if (!doc.metadata.title.trim()) {
    issues.push({ severity: 'warn', message: 'Page needs a title' });
  }
  if (!doc.metadata.description.trim()) {
    issues.push({ severity: 'info', message: 'Add a meta description for agents and SEO' });
  }
  if (doc.source?.kind !== 'tsx' && !doc.blocks.length) {
    issues.push({ severity: 'info', message: 'No blocks yet — add a hero or prose block to get started' });
  }
  return issues;
}
