import fs from 'fs/promises';
import path from 'path';
import matter from 'gray-matter';
import {
  parseArticleDocument,
  serializeArticleMdx,
  type ArticleDocument
} from '@/lib/schema/article';
import { parsePageDocument, type PageDocument } from '@/lib/schema/page';
import { parseSiteDocument, type SiteDocument } from '@/lib/schema/site';
import { resolveSiteLayout, type SiteLayout } from '@/lib/store/paths';
import { readYamlFile, writeYamlFile } from '@/lib/store/yaml-io';

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
    return parseSiteDocument(data);
  }

  async saveSite(site: SiteDocument): Promise<void> {
    const parsed = parseSiteDocument(site);
    await writeYamlFile(this.layout.siteYaml, parsed);
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

  async listArticles(): Promise<ArticleDocument[]> {
    await this.ensureLayout();
    const drafts = await this.readArticlesFromDir(this.layout.draftsDir, 'drafts');
    const published = await this.readArticlesFromDir(this.layout.articlesDir, 'articles');
    return [...drafts, ...published].sort((a, b) =>
      b.frontmatter.date.localeCompare(a.frontmatter.date)
    );
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
