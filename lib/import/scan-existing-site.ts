import fs from 'fs/promises';
import path from 'path';
import type { ManifestFile } from '@/lib/schema/manifest';

const SKIP_APP_SEGMENTS = new Set([
  'api',
  'admin',
  'client',
  'partner',
  'login',
  'preview',
  'unavailable',
  'articles'
]);

const IMAGE_EXT = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.avif', '.ico']);

export type ScannedAppPage = {
  id: string;
  route: string;
  sourcePath: string;
  absolutePath: string;
};

export type ExistingSiteScan = {
  root: string;
  kind: 'next-app-router' | 'unknown';
  hasAppDir: boolean;
  hasContentArticles: boolean;
  hasContentDrafts: boolean;
  hasSiteYaml: boolean;
  hasPagesDir: boolean;
  hasManifest: boolean;
  packageName?: string;
  /** Display name from package.json name or folder — not parsed from page copy. */
  siteName: string;
  appPages: ScannedAppPage[];
  files: ManifestFile[];
  articleCount: number;
  draftCount: number;
  mediaCount: number;
  warnings: string[];
};

/**
 * Index an existing site by file paths only.
 * Does not read page copy, metadata exports, or invent stub content.
 */
export async function scanExistingSite(rootPath: string): Promise<ExistingSiteScan> {
  const root = path.resolve(rootPath);
  const warnings: string[] = [];
  const appDir = path.join(root, 'app');
  const contentArticles = path.join(root, 'content', 'articles');
  const contentDrafts = path.join(root, 'content', 'drafts');
  const siteYaml = path.join(root, 'site.yaml');
  const pagesDir = path.join(root, 'content', 'pages');
  const manifestPath = path.join(root, '.awed', 'manifest.yaml');
  const publicDir = path.join(root, 'public');

  const hasAppDir = await isDir(appDir);
  const hasContentArticles = await isDir(contentArticles);
  const hasContentDrafts = await isDir(contentDrafts);
  const hasSiteYaml = await isFile(siteYaml);
  const hasPagesDir = await isDir(pagesDir);
  const hasManifest = await isFile(manifestPath);

  let packageName: string | undefined;
  try {
    const pkg = JSON.parse(await fs.readFile(path.join(root, 'package.json'), 'utf8')) as {
      name?: string;
      dependencies?: Record<string, string>;
    };
    packageName = pkg.name;
    if (!pkg.dependencies?.next) {
      warnings.push('package.json does not list next; import still proceeds if app/ exists.');
    }
  } catch {
    warnings.push('package.json not found or unreadable.');
  }

  const siteName = packageName || path.basename(root);
  const files: ManifestFile[] = [];

  const appPages = hasAppDir ? await discoverAppPages(appDir, root) : [];
  for (const page of appPages) {
    files.push({
      path: page.sourcePath,
      absolutePath: page.absolutePath,
      role: 'page',
      route: page.route
    });
  }

  if (hasContentArticles) {
    for (const file of await listFiles(contentArticles, '.mdx')) {
      const rel = path.relative(root, file).replace(/\\/g, '/');
      files.push({
        path: rel,
        absolutePath: file,
        role: 'article',
        slug: path.basename(file, '.mdx')
      });
    }
  }

  if (hasContentDrafts) {
    for (const file of await listFiles(contentDrafts, '.mdx')) {
      const rel = path.relative(root, file).replace(/\\/g, '/');
      files.push({
        path: rel,
        absolutePath: file,
        role: 'draft',
        slug: path.basename(file, '.mdx')
      });
    }
  }

  if (await isDir(publicDir)) {
    for (const file of await listFilesRecursive(publicDir)) {
      const ext = path.extname(file).toLowerCase();
      if (!IMAGE_EXT.has(ext)) continue;
      const rel = path.relative(root, file).replace(/\\/g, '/');
      const urlPath = '/' + path.relative(publicDir, file).replace(/\\/g, '/');
      files.push({
        path: rel,
        absolutePath: file,
        role: 'media',
        urlPath,
        mediaKind: 'image'
      });
    }
  }

  for (const candidate of [
    { rel: 'lib/constants.ts', role: 'constants' as const },
    { rel: 'app/layout.tsx', role: 'layout' as const },
    { rel: 'content/allowlists.yaml', role: 'config' as const }
  ]) {
    const abs = path.join(root, candidate.rel);
    if (await isFile(abs)) {
      files.push({
        path: candidate.rel,
        absolutePath: abs,
        role: candidate.role
      });
    }
  }

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
    hasManifest,
    packageName,
    siteName,
    appPages,
    files,
    articleCount: files.filter((f) => f.role === 'article').length,
    draftCount: files.filter((f) => f.role === 'draft').length,
    mediaCount: files.filter((f) => f.role === 'media').length,
    warnings
  };
}

async function discoverAppPages(appDir: string, root: string): Promise<ScannedAppPage[]> {
  const pages: ScannedAppPage[] = [];

  async function walk(dir: string, segments: string[]) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith('.') || entry.name.startsWith('_')) continue;
      if (entry.name.includes('[')) continue;

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
      pages.push({
        id,
        route,
        sourcePath: path.relative(root, full).replace(/\\/g, '/'),
        absolutePath: full
      });
    }
  }

  await walk(appDir, []);
  return pages.sort((a, b) => a.route.localeCompare(b.route));
}

async function listFiles(dir: string, ext: string): Promise<string[]> {
  try {
    const names = await fs.readdir(dir);
    return names.filter((n) => n.endsWith(ext)).map((n) => path.join(dir, n));
  } catch {
    return [];
  }
}

async function listFilesRecursive(dir: string): Promise<string[]> {
  const out: string[] = [];
  async function walk(current: string) {
    const entries = await fs.readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) await walk(full);
      else out.push(full);
    }
  }
  try {
    await walk(dir);
  } catch {
    return [];
  }
  return out;
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
