import fs from 'fs/promises';
import path from 'path';
import matter from 'gray-matter';
import {
  parseArticleDocument,
  serializeArticleMdx,
  type ArticleDocument
} from '@/lib/schema/article';
import { parseSiteManifest, type SiteManifest } from '@/lib/schema/manifest';
import { parsePageDocument, type PageDocument } from '@/lib/schema/page';
import { parseSiteDocument, type NavItem, type SiteDocument } from '@/lib/schema/site';
import {
  readConstantsNav,
  writeConstantsFooterGroups,
  writeConstantsNav
} from '@/lib/store/nav-sync';
import { resolveSiteLayout, type SiteLayout } from '@/lib/store/paths';
import { readYamlFile, writeYamlFile } from '@/lib/store/yaml-io';

export type MediaAsset = {
  path: string;
  absolutePath: string;
  urlPath: string;
  fileName: string;
};

export type Allowlists = {
  business: string[];
  backyard: string[];
};

export type PublishResult = {
  ok: boolean;
  message: string;
  at: string;
};

export class FsSiteStore {
  readonly layout: SiteLayout;

  constructor(root: string) {
    this.layout = resolveSiteLayout(root);
  }

  async ensureLayout(): Promise<void> {
    await fs.mkdir(this.layout.pagesDir, { recursive: true });
    await fs.mkdir(this.layout.articlesDir, { recursive: true });
    await fs.mkdir(this.layout.draftsDir, { recursive: true });
    await fs.mkdir(this.layout.mediaDir, { recursive: true });
    await fs.mkdir(path.join(this.layout.mediaDir, 'library'), { recursive: true });
    await fs.mkdir(path.dirname(this.layout.manifestFile), { recursive: true });
  }

  async getManifest(): Promise<SiteManifest | null> {
    const raw = await readYamlFile<unknown>(this.layout.manifestFile);
    return raw ? parseSiteManifest(raw) : null;
  }

  async listMedia(): Promise<MediaAsset[]> {
    const publicRoot = this.layout.publicDir;
    const siteRoot = this.layout.root;
    const images: MediaAsset[] = [];
    const imageExt = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.avif', '.ico']);

    async function walk(dir: string) {
      let entries;
      try {
        entries = await fs.readdir(dir, { withFileTypes: true });
      } catch {
        return;
      }
      for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          await walk(full);
          continue;
        }
        const ext = path.extname(entry.name).toLowerCase();
        if (!imageExt.has(ext)) continue;
        const relPublic = path.relative(publicRoot, full).replace(/\\/g, '/');
        const relRoot = path.relative(siteRoot, full).replace(/\\/g, '/');
        images.push({
          path: relRoot,
          absolutePath: full,
          urlPath: '/' + relPublic,
          fileName: entry.name
        });
      }
    }

    await walk(publicRoot);
    return images.sort((a, b) => a.urlPath.localeCompare(b.urlPath));
  }

  async saveMediaFile(fileName: string, bytes: Buffer): Promise<MediaAsset> {
    const safe = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    if (!safe) throw new Error('Invalid file name');
    const destDir = path.join(this.layout.mediaDir, 'library');
    await fs.mkdir(destDir, { recursive: true });
    const dest = path.join(destDir, safe);
    await fs.writeFile(dest, bytes);
    const relRoot = path.relative(this.layout.root, dest).replace(/\\/g, '/');
    const relPublic = path.relative(this.layout.publicDir, dest).replace(/\\/g, '/');
    return {
      path: relRoot,
      absolutePath: dest,
      urlPath: '/' + relPublic,
      fileName: safe
    };
  }

  async getSite(): Promise<SiteDocument> {
    const data = await readYamlFile<unknown>(this.layout.siteYaml);
    if (!data) {
      return parseSiteDocument({
        version: 1,
        name: 'Untitled site',
        brand: 'Untitled',
        description: '',
        nav: [],
        capabilities: []
      });
    }
    const site = parseSiteDocument(data);
    // Prefer live header/footer nav when the site keeps it in lib/constants.ts.
    const liveNav = await readConstantsNav(this.layout.root);
    if (liveNav?.length) {
      return { ...site, nav: liveNav };
    }
    return site;
  }

  async saveSite(site: SiteDocument): Promise<void> {
    const parsed = parseSiteDocument(site);
    await writeYamlFile(this.layout.siteYaml, parsed);
    await writeConstantsNav(this.layout.root, parsed.nav);
    if (parsed.footerGroups?.length) {
      await writeConstantsFooterGroups(this.layout.root, parsed.footerGroups);
    }
  }

  async saveNav(nav: NavItem[]): Promise<SiteDocument> {
    const site = await this.getSite();
    const next = parseSiteDocument({ ...site, nav });
    await this.saveSite(next);
    return next;
  }

  async saveFooterGroups(footerGroups: SiteDocument['footerGroups']): Promise<SiteDocument> {
    const site = await this.getSite();
    const next = parseSiteDocument({ ...site, footerGroups });
    await this.saveSite(next);
    return next;
  }

  async listPages(): Promise<PageDocument[]> {
    await this.ensureLayout();
    const files = await fs.readdir(this.layout.pagesDir);
    const pages: PageDocument[] = [];
    for (const file of files) {
      if (!file.endsWith('.page.yaml') && !file.endsWith('.page.yml')) continue;
      const raw = await readYamlFile<unknown>(path.join(this.layout.pagesDir, file));
      if (raw) pages.push(parsePageDocument(raw));
    }
    return pages.sort((a, b) => a.route.localeCompare(b.route));
  }

  async getPage(id: string): Promise<PageDocument | null> {
    const filePath = this.pagePath(id);
    const raw = await readYamlFile<unknown>(filePath);
    return raw ? parsePageDocument(raw) : null;
  }

  async savePage(page: PageDocument): Promise<void> {
    const parsed = parsePageDocument(page);
    await writeYamlFile(this.pagePath(parsed.id), parsed);
  }

  async deletePage(id: string): Promise<boolean> {
    try {
      await fs.unlink(this.pagePath(id));
      return true;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false;
      throw error;
    }
  }

  /**
   * Create a real app/.../page.tsx + path record. Optionally add to nav.
   */
  async createTsxPage(input: {
    id: string;
    route: string;
    title: string;
    description?: string;
    lead?: string;
    addToNav?: boolean;
  }): Promise<PageDocument> {
    const { routeToAppPath, routeToComponentName, scaffoldMarketingPageTsx } = await import(
      '@/lib/studio/tsx-scaffold'
    );
    await this.ensureLayout();
    const existing = await this.getPage(input.id);
    if (existing) throw new Error(`Page id already exists: ${input.id}`);
    const relPath = routeToAppPath(input.route);
    const abs = path.join(this.layout.root, relPath);
    await fs.mkdir(path.dirname(abs), { recursive: true });
    try {
      await fs.access(abs);
      throw new Error(`TSX already exists at ${relPath}`);
    } catch (error) {
      if ((error as Error).message.startsWith('TSX already')) throw error;
    }
    const tsx = scaffoldMarketingPageTsx({
      title: input.title,
      description: input.description || '',
      heading: input.title,
      lead: input.lead || input.description || 'Add your page introduction here.',
      componentName: routeToComponentName(input.route)
    });
    await fs.writeFile(abs, tsx, 'utf8');
    const page = parsePageDocument({
      version: 1,
      id: input.id,
      route: input.route,
      template: 'file-path',
      metadata: {
        title: input.title,
        description: input.description || '',
        listed: true,
        robots: 'index'
      },
      agent: { tldr: '', facts: [], capabilities: [] },
      blocks: [],
      source: {
        kind: 'tsx',
        path: relPath.replace(/\\/g, '/'),
        importedAt: new Date().toISOString()
      }
    });
    await this.savePage(page);
    if (input.addToNav) {
      const site = await this.getSite();
      if (!site.nav.some((n) => n.href === input.route)) {
        await this.saveNav([
          ...site.nav,
          { label: input.title, href: input.route, listed: true }
        ]);
      }
    }
    return page;
  }

  async duplicatePage(id: string, newId: string, newRoute: string): Promise<PageDocument> {
    const source = await this.getPage(id);
    if (!source) throw new Error(`Page not found: ${id}`);
    if (await this.getPage(newId)) throw new Error(`Page id already exists: ${newId}`);

    if (source.source?.kind === 'tsx' && source.source.path) {
      const { routeToAppPath, routeToComponentName } = await import('@/lib/studio/tsx-scaffold');
      const fromAbs = path.join(this.layout.root, source.source.path);
      const toRel = routeToAppPath(newRoute);
      const toAbs = path.join(this.layout.root, toRel);
      await fs.mkdir(path.dirname(toAbs), { recursive: true });
      let text = await fs.readFile(fromAbs, 'utf8');
      const oldName = routeToComponentName(source.route);
      const newName = routeToComponentName(newRoute);
      text = text.replace(new RegExp(`function\\s+${oldName}\\b`), `function ${newName}`);
      await fs.writeFile(toAbs, text, 'utf8');
      const copy = parsePageDocument({
        ...source,
        id: newId,
        route: newRoute,
        metadata: {
          ...source.metadata,
          title: `${source.metadata.title} (copy)`
        },
        source: {
          kind: 'tsx',
          path: toRel.replace(/\\/g, '/'),
          importedAt: new Date().toISOString()
        }
      });
      await this.savePage(copy);
      return copy;
    }

    const copy = parsePageDocument({
      ...source,
      id: newId,
      route: newRoute,
      metadata: { ...source.metadata, title: `${source.metadata.title} (copy)` }
    });
    await this.savePage(copy);
    return copy;
  }

  /** Delete YAML record, optional TSX file, and nav entries pointing at the route. */
  async deletePageDeep(
    id: string,
    options?: { deleteTsx?: boolean }
  ): Promise<{ deletedYaml: boolean; deletedTsx: boolean; removedNav: number }> {
    const page = await this.getPage(id);
    const deletedYaml = await this.deletePage(id);
    let deletedTsx = false;
    let removedNav = 0;
    if (page?.source?.kind === 'tsx' && page.source.path && options?.deleteTsx) {
      try {
        await fs.unlink(path.join(this.layout.root, page.source.path));
        deletedTsx = true;
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      }
    }
    if (page) {
      const site = await this.getSite();
      const nextNav = site.nav.filter((n) => n.href !== page.route);
      removedNav = site.nav.length - nextNav.length;
      if (removedNav) await this.saveNav(nextNav);
    }
    return { deletedYaml, deletedTsx, removedNav };
  }

  async duplicateArticle(slug: string, newSlug: string): Promise<ArticleDocument> {
    const source = await this.getArticle(slug);
    if (!source) throw new Error(`Article not found: ${slug}`);
    if (await this.getArticle(newSlug)) throw new Error(`Slug already exists: ${newSlug}`);
    const copy: ArticleDocument = {
      ...source,
      slug: newSlug,
      location: 'drafts',
      frontmatter: {
        ...source.frontmatter,
        title: `${source.frontmatter.title} (copy)`,
        status: 'draft',
        date: new Date().toISOString().slice(0, 10)
      }
    };
    await this.saveArticle(copy);
    return copy;
  }

  async listArticles(): Promise<ArticleDocument[]> {
    await this.ensureLayout();
    const drafts = await this.readArticlesFromDir(this.layout.draftsDir, 'drafts');
    const published = await this.readArticlesFromDir(this.layout.articlesDir, 'articles');
    // Prefer published when the same slug exists in both folders (orphan draft leftover).
    const bySlug = new Map<string, ArticleDocument>();
    for (const draft of drafts) bySlug.set(draft.slug, draft);
    for (const article of published) bySlug.set(article.slug, article);
    return [...bySlug.values()].sort((a, b) =>
      b.frontmatter.date.localeCompare(a.frontmatter.date)
    );
  }

  /** Drop draft copies when a published file already exists for the same slug. */
  async reconcileArticleDuplicates(): Promise<string[]> {
    await this.ensureLayout();
    const removed: string[] = [];
    const drafts = await this.readArticlesFromDir(this.layout.draftsDir, 'drafts');
    for (const draft of drafts) {
      const published = await this.getArticle(draft.slug, 'articles');
      if (!published) continue;
      try {
        await fs.unlink(this.articlePath(draft.slug, 'drafts'));
        removed.push(draft.slug);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      }
    }
    return removed;
  }

  /** Swap frontmatter dates so list order (newest first) matches the given slug order. */
  async reorderArticles(orderedSlugs: string[]): Promise<ArticleDocument[]> {
    const unique = [...new Set(orderedSlugs)];
    const docs = await Promise.all(unique.map((slug) => this.getArticle(slug)));
    if (docs.some((d) => !d)) {
      throw new Error('One or more articles were not found for reorder');
    }
    const dates = docs
      .map((d) => d!.frontmatter.date)
      .sort((a, b) => b.localeCompare(a));
    const updated: ArticleDocument[] = [];
    for (let i = 0; i < docs.length; i += 1) {
      const doc = docs[i]!;
      const next: ArticleDocument = {
        ...doc,
        frontmatter: { ...doc.frontmatter, date: dates[i] ?? doc.frontmatter.date }
      };
      await this.saveArticle(next);
      updated.push(next);
    }
    return updated;
  }

  async getArticle(slug: string, location?: 'drafts' | 'articles'): Promise<ArticleDocument | null> {
    if (location) {
      return this.readArticleFile(this.articlePath(slug, location), location);
    }
    const published = await this.readArticleFile(this.articlePath(slug, 'articles'), 'articles');
    if (published) return published;
    return this.readArticleFile(this.articlePath(slug, 'drafts'), 'drafts');
  }

  async saveArticle(doc: ArticleDocument): Promise<void> {
    const parsed = parseArticleDocument(doc);
    await this.ensureLayout();
    const target = this.articlePath(parsed.slug, parsed.location);
    // Remove sibling location if moving
    const other: 'drafts' | 'articles' = parsed.location === 'drafts' ? 'articles' : 'drafts';
    try {
      await fs.unlink(this.articlePath(parsed.slug, other));
    } catch {
      /* ignore */
    }
    await fs.writeFile(target, serializeArticleMdx(parsed), 'utf8');
  }

  async deleteArticle(slug: string): Promise<boolean> {
    let deleted = false;
    for (const location of ['drafts', 'articles'] as const) {
      try {
        await fs.unlink(this.articlePath(slug, location));
        deleted = true;
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      }
    }
    return deleted;
  }

  async publishArticle(slug: string): Promise<ArticleDocument> {
    const draft = await this.getArticle(slug, 'drafts');
    if (!draft) {
      const existing = await this.getArticle(slug, 'articles');
      if (existing) return existing;
      throw new Error(`Draft not found: ${slug}`);
    }
    const published: ArticleDocument = {
      ...draft,
      location: 'articles',
      frontmatter: { ...draft.frontmatter, status: 'published', listed: draft.frontmatter.listed !== false }
    };
    await this.saveArticle(published);
    return published;
  }

  async unpublishArticle(slug: string): Promise<ArticleDocument> {
    const published = await this.getArticle(slug, 'articles');
    if (!published) {
      const draft = await this.getArticle(slug, 'drafts');
      if (draft) return draft;
      throw new Error(`Article not found: ${slug}`);
    }
    const draft: ArticleDocument = {
      ...published,
      location: 'drafts',
      frontmatter: { ...published.frontmatter, status: 'draft' }
    };
    await this.saveArticle(draft);
    return draft;
  }

  async getAllowlists(): Promise<Allowlists> {
    const data = await readYamlFile<Allowlists>(this.layout.allowlistsFile);
    return {
      business: data?.business ?? [],
      backyard: data?.backyard ?? []
    };
  }

  async saveAllowlists(lists: Allowlists): Promise<void> {
    await writeYamlFile(this.layout.allowlistsFile, lists);
  }

  async getPublishStatus(): Promise<PublishResult> {
    try {
      const stampPath = path.join(this.layout.root, '.fwp-publish.json');
      const raw = await fs.readFile(stampPath, 'utf8');
      return JSON.parse(raw) as PublishResult;
    } catch {
      return {
        ok: true,
        message: 'No publish recorded yet. Saves write to the local site project.',
        at: new Date(0).toISOString()
      };
    }
  }

  async recordPublish(message: string): Promise<PublishResult> {
    const result: PublishResult = {
      ok: true,
      message,
      at: new Date().toISOString()
    };
    await fs.writeFile(
      path.join(this.layout.root, '.fwp-publish.json'),
      JSON.stringify(result, null, 2),
      'utf8'
    );
    return result;
  }

  private pagePath(id: string): string {
    const safe = id.replace(/[^a-z0-9\-]/gi, '').toLowerCase();
    return path.join(this.layout.pagesDir, `${safe}.page.yaml`);
  }

  private articlePath(slug: string, location: 'drafts' | 'articles'): string {
    const dir = location === 'drafts' ? this.layout.draftsDir : this.layout.articlesDir;
    return path.join(dir, `${slug}.mdx`);
  }

  private async readArticlesFromDir(
    dir: string,
    location: 'drafts' | 'articles'
  ): Promise<ArticleDocument[]> {
    try {
      const files = await fs.readdir(dir);
      const articles: ArticleDocument[] = [];
      for (const file of files) {
        if (!file.endsWith('.mdx')) continue;
        const slug = file.replace(/\.mdx$/, '');
        try {
          const doc = await this.readArticleFile(path.join(dir, file), location, slug);
          if (doc) articles.push(doc);
        } catch {
          // Skip non-conforming MDX (e.g. editorial notes in drafts).
        }
      }
      return articles;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
      throw error;
    }
  }

  private async readArticleFile(
    filePath: string,
    location: 'drafts' | 'articles',
    slugFromName?: string
  ): Promise<ArticleDocument | null> {
    try {
      const raw = await fs.readFile(filePath, 'utf8');
      const { data, content } = matter(raw.replace(/^\uFEFF/, ''));
      const slug = slugFromName ?? path.basename(filePath, '.mdx');
      return parseArticleDocument({
        slug,
        frontmatter: data,
        body: content.trimStart(),
        location
      });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
      throw error;
    }
  }
}
