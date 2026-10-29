import { z } from 'zod';

/** YAML/gray-matter may parse bare dates as Date objects. */
const dateStringSchema = z.preprocess((value) => {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return value;
}, z.string().min(1));

export const articleFrontmatterSchema = z.object({
  title: z.string().min(1),
  date: dateStringSchema,
  summary: z.string().min(1),
  tags: z.array(z.string()).optional(),
  image: z.string().optional(),
  authoredByBen: z.boolean().optional(),
  listed: z.boolean().optional(),
  status: z.enum(['draft', 'published']).optional()
});

export const articleDocumentSchema = z.object({
  slug: z
    .string()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be kebab-case'),
  frontmatter: articleFrontmatterSchema,
  body: z.string(),
  location: z.enum(['drafts', 'articles'])
});

export type ArticleFrontmatter = z.infer<typeof articleFrontmatterSchema>;
export type ArticleDocument = z.infer<typeof articleDocumentSchema>;

export function parseArticleFrontmatter(input: unknown): ArticleFrontmatter {
  return articleFrontmatterSchema.parse(input);
}

export function parseArticleDocument(input: unknown): ArticleDocument {
  return articleDocumentSchema.parse(input);
}

/** Serialize article to MDX file contents. */
export function serializeArticleMdx(doc: ArticleDocument): string {
  const fm = doc.frontmatter;
  const lines = ['---'];
  lines.push(`title: ${yamlQuote(fm.title)}`);
  // Always quote dates so YAML loaders do not revive them as Date objects.
  lines.push(`date: ${JSON.stringify(fm.date)}`);
  lines.push(`summary: ${yamlQuote(fm.summary)}`);
  if (fm.tags?.length) {
    lines.push(`tags: [${fm.tags.map(yamlQuote).join(', ')}]`);
  }
  if (fm.image) lines.push(`image: ${yamlQuote(fm.image)}`);
  if (fm.authoredByBen === false) lines.push('authoredByBen: false');
  if (fm.listed === false) lines.push('listed: false');
  if (fm.status) lines.push(`status: ${fm.status}`);
  lines.push('---', '', doc.body.trimEnd(), '');
  return lines.join('\n');
}

function yamlQuote(value: string): string {
  if (/[:#{}[\],&*?|>!%@`]/.test(value) || value.includes('\n') || value.includes('"')) {
    return JSON.stringify(value);
  }
  return value.includes(' ') ? JSON.stringify(value) : value;
}
