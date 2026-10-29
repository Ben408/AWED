import fs from 'fs/promises';
import path from 'path';

const SKIP_APP_SEGMENTS = new Set([
  'api',
  'admin',
  'client',
  'partner',
  'login',
  'preview',
  'unavailable',
  'articles' // dynamic MDX route; articles come from content/
]);

export type ScannedAppPage = {
  id: string;
  route: string;
  sourcePath: string;
  title: string;
  description: string;
};

export type ExistingSiteScan = {
  root: string;
  kind: 'next-app-router' | 'unknown';
  hasAppDir: boolean;
  hasContentArticles: boolean;
  hasContentDrafts: boolean;
  hasSiteYaml: boolean;
  hasPagesDir: boolean;
  packageName?: string;
  siteName?: string;
  siteDescription?: string;
  siteUrl?: string;
  nav: { label: string; href: string }[];
  appPages: ScannedAppPage[];
  articleCount: number;
  draftCount: number;
  businessSlugs: string[];
  backyardSlugs: string[];
  warnings: string[];
};

export async function scanExistingSite(rootPath: string): Promise<ExistingSiteScan> {
  const root = path.resolve(rootPath);
  const warnings: string[] = [];
  const appDir = path.join(root, 'app');
  const contentArticles = path.join(root, 'content', 'articles');
  const contentDrafts = path.join(root, 'content', 'drafts');
  const siteYaml = path.join(root, 'site.yaml');
  const pagesDir = path.join(root, 'content', 'pages');

  const hasAppDir = await isDir(appDir);
  const hasContentArticles = await isDir(contentArticles);
  const hasContentDrafts = await isDir(contentDrafts);
  const hasSiteYaml = await isFile(siteYaml);
  const hasPagesDir = await isDir(pagesDir);

  let packageName: string | undefined;
  try {
    const pkg = JSON.parse(await fs.readFile(path.join(root, 'package.json'), 'utf8')) as {
      name?: string;
      dependencies?: Record<string, string>;
    };
    packageName = pkg.name;
    if (!pkg.dependencies?.next && !pkg.dependencies?.['next']) {
      warnings.push('package.json does not list next; import still proceeds if app/ exists.');
    }
  } catch {
    warnings.push('package.json not found or unreadable.');
  }

  const constants = await readOptional(path.join(root, 'lib', 'constants.ts'));
  const siteName = constants ? extractStringProp(constants, 'name') : undefined;
  const siteDescription = constants ? extractStringProp(constants, 'description') : undefined;
  const siteUrl = constants ? extractStringProp(constants, 'url') : undefined;
  const nav = constants ? extractNavItems(constants) : [];

  const appPages = hasAppDir ? await discoverAppPages(appDir, root) : [];
  const articleCount = hasContentArticles ? await countMdx(contentArticles) : 0;
  const draftCount = hasContentDrafts ? await countMdx(contentDrafts) : 0;

  const insightsSrc = await readOptional(path.join(root, 'app', 'insights', 'page.tsx'));
  const backyardSrc = await readOptional(
    path.join(root, 'app', 'backyard-globalization', 'page.tsx')
  );
  const businessSlugs = insightsSrc
    ? extractStringArray(insightsSrc, 'businessArticleSlugs')
    : [];
  const backyardSlugs = backyardSrc
    ? extractStringArray(backyardSrc, 'backyardArticleSlugs')
    : [];

  const kind = hasAppDir ? 'next-app-router' : 'unknown';
  if (kind === 'unknown') {
    warnings.push('No app/ directory found. Expected a Next.js App Router site.');
  }

  return {
    root,
    kind,
    hasAppDir,
    hasContentArticles,
    hasContentDrafts,
    hasSiteYaml,
    hasPagesDir,
    packageName,
    siteName,
    siteDescription,
    siteUrl,
    nav,
    appPages,
    articleCount,
    draftCount,
    businessSlugs,
    backyardSlugs,
    warnings
  };
}

async function discoverAppPages(appDir: string, root: string): Promise<ScannedAppPage[]> {
  const pages: ScannedAppPage[] = [];

  async function walk(dir: string, segments: string[]) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith('.') || entry.name.startsWith('_')) continue;
      if (entry.name.includes('[')) continue; // dynamic segments skipped for Alpha import

      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (segments.length === 0 && SKIP_APP_SEGMENTS.has(entry.name)) continue;
        await walk(full, [...segments, entry.name]);
        continue;
      }

      if (entry.name !== 'page.tsx' && entry.name !== 'page.jsx' && entry.name !== 'page.ts') {
        continue;
      }

      const route = segments.length === 0 ? '/' : `/${segments.join('/')}`;
      const id = segments.length === 0 ? 'home' : segments.join('-');
      const source = await fs.readFile(full, 'utf8');
      const title =
        extractMetadataString(source, 'title') ||
        titleFromRoute(route) ||
        id;
      const description = extractMetadataString(source, 'description') || '';

      pages.push({
        id,
        route,
        sourcePath: path.relative(root, full).replace(/\\/g, '/'),
        title,
        description
      });
    }
  }

  await walk(appDir, []);
  return pages.sort((a, b) => a.route.localeCompare(b.route));
}

function titleFromRoute(route: string): string {
  if (route === '/') return 'Home';
  return route
    .split('/')
    .filter(Boolean)
    .map((part) => part.replace(/-/g, ' '))
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' · ');
}

function extractStringProp(source: string, key: string): string | undefined {
  const re = new RegExp(`${key}\\s*:\\s*(['\`"])([\\s\\S]*?)\\1`, 'm');
  const match = source.match(re);
  return match?.[2]?.replace(/\\n/g, ' ').trim();
}

function extractMetadataString(source: string, key: string): string | undefined {
  const re = new RegExp(`${key}\\s*:\\s*(['\`"])([\\s\\S]*?)\\1`, 'm');
  const match = source.match(re);
  return match?.[2]?.replace(/\\n/g, ' ').trim();
}

function extractNavItems(source: string): { label: string; href: string }[] {
  const block = source.match(/export const navItems[^=]*=\s*\[([\s\S]*?)\];/);
  if (!block) return [];
  const items: { label: string; href: string }[] = [];
  const itemRe = /\{\s*label:\s*['"]([^'"]+)['"]\s*,\s*href:\s*['"]([^'"]+)['"]\s*\}/g;
  let match: RegExpExecArray | null;
  while ((match = itemRe.exec(block[1]))) {
    items.push({ label: match[1], href: match[2] });
  }
  return items;
}

function extractStringArray(source: string, name: string): string[] {
  const re = new RegExp(`(?:const|let|var)\\s+${name}\\s*=\\s*\\[([\\s\\S]*?)\\];`);
  const match = source.match(re);
  if (!match) return [];
  const values: string[] = [];
  const strRe = /['"]([a-z0-9]+(?:-[a-z0-9]+)*)['"]/g;
  let m: RegExpExecArray | null;
  while ((m = strRe.exec(match[1]))) {
    values.push(m[1]);
  }
  return values;
}

async function countMdx(dir: string): Promise<number> {
  try {
    const files = await fs.readdir(dir);
    return files.filter((f) => f.endsWith('.mdx')).length;
  } catch {
    return 0;
  }
}

async function isDir(p: string): Promise<boolean> {
  try {
    return (await fs.stat(p)).isDirectory();
  } catch {
    return false;
  }
}

async function isFile(p: string): Promise<boolean> {
  try {
    return (await fs.stat(p)).isFile();
  } catch {
    return false;
  }
}

async function readOptional(p: string): Promise<string | null> {
  try {
    return await fs.readFile(p, 'utf8');
  } catch {
    return null;
  }
}
