import type { PageDocument } from '@/lib/schema/page';
import type { SiteDocument } from '@/lib/schema/site';

export type LinkIssue = {
  href: string;
  where: string;
  severity: 'error' | 'warning';
  message: string;
};

function collectHrefs(page: PageDocument): { href: string; where: string }[] {
  const found: { href: string; where: string }[] = [];
  for (const block of page.blocks) {
    const props = block.props as Record<string, unknown>;
    for (const [key, value] of Object.entries(props)) {
      if (typeof value === 'string' && (key.toLowerCase().includes('href') || key === 'buttonHref')) {
        found.push({ href: value, where: `${page.route} · ${block.type}.${key}` });
      }
      if (Array.isArray(value)) {
        value.forEach((row, index) => {
          if (row && typeof row === 'object' && 'href' in row && typeof (row as { href: unknown }).href === 'string') {
            found.push({
              href: (row as { href: string }).href,
              where: `${page.route} · ${block.type}[${index}].href`
            });
          }
        });
      }
    }
  }
  return found;
}

/**
 * PageMill emphasized testing links in Preview.
 * AWED checks internal routes against known page routes + site nav.
 */
export function checkInternalLinks(
  pages: PageDocument[],
  site: SiteDocument,
  extraRoutes: string[] = ['/articles', '/insights', '/contact']
): LinkIssue[] {
  const known = new Set<string>([
    ...pages.map((p) => p.route),
    ...site.nav.map((n) => n.href),
    ...extraRoutes
  ]);

  const issues: LinkIssue[] = [];
  for (const page of pages) {
    for (const { href, where } of collectHrefs(page)) {
      if (!href.trim()) {
        issues.push({
          href,
          where,
          severity: 'warning',
          message: 'Empty link'
        });
        continue;
      }
      if (href.startsWith('http://') || href.startsWith('https://') || href.startsWith('mailto:')) {
        continue;
      }
      if (!href.startsWith('/')) {
        issues.push({
          href,
          where,
          severity: 'warning',
          message: 'Relative path may break depending on publish layout'
        });
        continue;
      }
      const path = href.split('#')[0].split('?')[0] || '/';
      if (!known.has(path)) {
        issues.push({
          href,
          where,
          severity: 'error',
          message: `No matching page route or nav entry for ${path}`
        });
      }
    }
  }
  return issues;
}
