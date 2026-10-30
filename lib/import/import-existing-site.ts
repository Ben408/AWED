import path from 'path';
import { scanExistingSite, type ExistingSiteScan } from '@/lib/import/scan-existing-site';
import {
  loadProjectsFile,
  saveProjectsFile,
  type ProjectEntry
} from '@/lib/projects/registry';
import { parseSiteManifest, type SiteManifest } from '@/lib/schema/manifest';
import { parsePageDocument, type PageDocument } from '@/lib/schema/page';
import { parseSiteDocument, type SiteDocument } from '@/lib/schema/site';
import { FsSiteStore } from '@/lib/store/fs-site-store';
import { writeYamlFile } from '@/lib/store/yaml-io';

export type ImportOptions = {
  rootPath: string;
  projectId?: string;
  projectName?: string;
  publicUrl?: string;
  previewBaseUrl?: string;
  overwrite?: boolean;
  attach?: boolean;
};

export type ImportResult = {
  scan: ExistingSiteScan;
  project: ProjectEntry;
  wroteManifest: boolean;
  wroteSiteYaml: boolean;
  pagesWritten: number;
  pagesSkipped: number;
  attached: boolean;
};

/**
 * Attach an existing site by registering full file paths.
 * Does not extract page copy into AWED blocks.
 */
export async function importExistingSite(options: ImportOptions): Promise<ImportResult> {
  const scan = await scanExistingSite(options.rootPath);
  if (scan.kind !== 'next-app-router') {
    throw new Error(`Cannot import: expected Next.js App Router site at ${scan.root}`);
  }

  const store = new FsSiteStore(scan.root);
  await store.ensureLayout();
  const overwrite = options.overwrite === true;
  const importedAt = new Date().toISOString();

  const manifest: SiteManifest = parseSiteManifest({
    version: 1,
    importedAt,
    rootPath: scan.root.replace(/\\/g, '/'),
    files: scan.files
  });
  await writeYamlFile(store.layout.manifestFile, manifest);
  const wroteManifest = true;

  let wroteSiteYaml = false;
  if (!scan.hasSiteYaml || overwrite) {
    await store.saveSite(buildMinimalSite(scan));
    wroteSiteYaml = true;
  }

  let pagesWritten = 0;
  let pagesSkipped = 0;
  for (const appPage of scan.appPages) {
    const existing = await store.getPage(appPage.id);
    if (existing && !overwrite) {
      pagesSkipped += 1;
      continue;
    }
    await store.savePage(buildPathOnlyPage(appPage, importedAt));
    pagesWritten += 1;
  }

  const projectId =
    options.projectId ||
    slugify(scan.siteName || path.basename(scan.root));
  const project: ProjectEntry = {
    id: projectId,
    name: options.projectName || scan.siteName || projectId,
    rootPath: scan.root.replace(/\\/g, '/'),
    kind: 'local',
    publicUrl: options.publicUrl,
    previewBaseUrl: options.previewBaseUrl
  };

  let attached = false;
  if (options.attach !== false) {
    const registry = await loadProjectsFile();
    const others = registry.projects.filter((p) => p.id !== project.id);
    await saveProjectsFile({
      version: 1,
      activeProjectId: project.id,
      projects: [...others, project]
    });
    attached = true;
  }

  return {
    scan,
    project,
    wroteManifest,
    wroteSiteYaml,
    pagesWritten,
    pagesSkipped,
    attached
  };
}

function buildMinimalSite(scan: ExistingSiteScan): SiteDocument {
  const nav = scan.appPages
    .filter((p) => p.route !== '/')
    .map((p) => ({
      label: labelFromRoute(p.route),
      href: p.route,
      listed: true
    }));

  return parseSiteDocument({
    version: 1,
    name: scan.siteName,
    brand: scan.siteName,
    description: '',
    defaultLocale: 'en',
    nav,
    capabilities: [],
    seo: { titleTemplate: '%s', defaultDescription: '' },
    agent: {
      summary: '',
      facts: [
        `Root: ${scan.root.replace(/\\/g, '/')}`,
        `${scan.files.length} files registered in .awed/manifest.yaml`
      ]
    }
  });
}

/** Page record = route + full source path. No extracted body content. */
function buildPathOnlyPage(
  appPage: ExistingSiteScan['appPages'][number],
  importedAt: string
): PageDocument {
  return parsePageDocument({
    version: 1,
    id: appPage.id,
    route: appPage.route,
    template: 'file-path',
    metadata: {
      title: labelFromRoute(appPage.route),
      description: '',
      listed: true,
      robots: 'index'
    },
    agent: { tldr: '', facts: [], capabilities: [] },
    blocks: [],
    source: {
      kind: 'tsx',
      path: appPage.sourcePath,
      importedAt
    }
  });
}

function labelFromRoute(route: string): string {
  if (route === '/') return 'Home';
  return route
    .split('/')
    .filter(Boolean)
    .map((part) => part.replace(/-/g, ' '))
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' · ');
}

function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 48) || 'imported-site'
  );
}
