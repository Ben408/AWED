import path from 'path';
import { createBlockInstance } from '@/lib/catalog/blocks';
import { scanExistingSite, type ExistingSiteScan } from '@/lib/import/scan-existing-site';
import {
  loadProjectsFile,
  saveProjectsFile,
  type ProjectEntry
} from '@/lib/projects/registry';
import { parsePageDocument, type PageDocument } from '@/lib/schema/page';
import { parseSiteDocument, type SiteDocument } from '@/lib/schema/site';
import { FsSiteStore } from '@/lib/store/fs-site-store';

export type ImportOptions = {
  rootPath: string;
  projectId?: string;
  projectName?: string;
  publicUrl?: string;
  /** When true, rewrite site.yaml / page docs even if they already exist. */
  overwrite?: boolean;
  /** Register/update AWED projects.json and set active. Default true. */
  attach?: boolean;
};

export type ImportResult = {
  scan: ExistingSiteScan;
  project: ProjectEntry;
  wroteSiteYaml: boolean;
  pagesWritten: number;
  pagesSkipped: number;
  allowlistsWritten: boolean;
  attached: boolean;
};

export async function importExistingSite(options: ImportOptions): Promise<ImportResult> {
  const scan = await scanExistingSite(options.rootPath);
  if (scan.kind !== 'next-app-router') {
    throw new Error(`Cannot import: expected Next.js App Router site at ${scan.root}`);
  }

  const store = new FsSiteStore(scan.root);
  await store.ensureLayout();

  const overwrite = options.overwrite === true;
  let wroteSiteYaml = false;
  if (!scan.hasSiteYaml || overwrite) {
    await store.saveSite(buildSiteDocument(scan));
    wroteSiteYaml = true;
  }

  let pagesWritten = 0;
  let pagesSkipped = 0;
  const importedAt = new Date().toISOString();

  for (const appPage of scan.appPages) {
    const existing = await store.getPage(appPage.id);
    if (existing && !overwrite) {
      pagesSkipped += 1;
      continue;
    }
    await store.savePage(buildPageDocument(appPage, importedAt));
    pagesWritten += 1;
  }

  let allowlistsWritten = false;
  if (scan.businessSlugs.length || scan.backyardSlugs.length) {
    const current = await store.getAllowlists();
    if (
      overwrite ||
      (!current.business.length && !current.backyard.length)
    ) {
      await store.saveAllowlists({
        business: scan.businessSlugs.length ? scan.businessSlugs : current.business,
        backyard: scan.backyardSlugs.length ? scan.backyardSlugs : current.backyard
      });
      allowlistsWritten = true;
    }
  }

  const projectId =
    options.projectId ||
    slugify(scan.siteName || scan.packageName || path.basename(scan.root));
  const project: ProjectEntry = {
    id: projectId,
    name: options.projectName || scan.siteName || scan.packageName || projectId,
    rootPath: scan.root.replace(/\\/g, '/'),
    kind: 'local',
    publicUrl: options.publicUrl || scan.siteUrl
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
    wroteSiteYaml,
    pagesWritten,
    pagesSkipped,
    allowlistsWritten,
    attached
  };
}

function buildSiteDocument(scan: ExistingSiteScan): SiteDocument {
  const nav =
    scan.nav.length > 0
      ? scan.nav.map((item) => ({ ...item, listed: true }))
      : scan.appPages
          .filter((p) => p.route !== '/')
          .slice(0, 12)
          .map((p) => ({ label: p.title, href: p.route, listed: true }));

  return parseSiteDocument({
    version: 1,
    name: scan.siteName || scan.packageName || path.basename(scan.root),
    brand: scan.siteName || 'Imported site',
    domain: scan.siteUrl?.replace(/^https?:\/\//, ''),
    description: scan.siteDescription || '',
    defaultLocale: 'en',
    nav,
    capabilities: [],
    seo: {
      titleTemplate: '%s',
      defaultDescription: scan.siteDescription || ''
    },
    agent: {
      summary: scan.siteDescription || '',
      facts: [
        `${scan.articleCount} published articles detected`,
        `${scan.appPages.length} App Router pages mapped`
      ]
    }
  });
}

function buildPageDocument(
  appPage: ExistingSiteScan['appPages'][number],
  importedAt: string
): PageDocument {
  const hero = createBlockInstance('hero', `hero-${appPage.id}`);
  if (hero.type === 'hero') {
    hero.props.headline = appPage.title;
    hero.props.support = appPage.description;
    hero.props.eyebrow = appPage.route === '/' ? 'Home' : appPage.route;
  }

  const prose = createBlockInstance('prose', `prose-${appPage.id}`);
  if (prose.type === 'prose') {
    prose.props.heading = 'Imported from existing TSX';
    prose.props.body =
      'This page document was mapped from the live Next.js route. Edit metadata and blocks here; the original TSX remains the runtime source until the site renders AWED page documents.';
  }

  return parsePageDocument({
    version: 1,
    id: appPage.id,
    route: appPage.route,
    template: 'imported-tsx',
    metadata: {
      title: appPage.title,
      description: appPage.description,
      listed: true,
      robots: 'index'
    },
    agent: {
      tldr: appPage.description,
      facts: [`Source: ${appPage.sourcePath}`],
      capabilities: []
    },
    blocks: [hero, prose],
    source: {
      kind: 'tsx',
      path: appPage.sourcePath,
      importedAt
    }
  });
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48) || 'imported-site';
}
