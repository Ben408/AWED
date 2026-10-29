import { z } from 'zod';
import { blockInstanceSchema } from '@/lib/catalog/blocks';

export const pageAgentSchema = z.object({
  tldr: z.string().default(''),
  facts: z.array(z.string()).default([]),
  capabilities: z.array(z.string()).default([])
});

export const pageMetadataSchema = z.object({
  title: z.string().min(1),
  description: z.string().default(''),
  ogImage: z.string().optional(),
  listed: z.boolean().default(true),
  robots: z.enum(['index', 'noindex']).default('index')
});

export const pageSourceSchema = z.object({
  kind: z.enum(['document', 'tsx']).default('document'),
  /** Repo-relative path to the Next.js page module, when imported from an existing site. */
  path: z.string().optional(),
  importedAt: z.string().optional()
});

export const pageDocumentSchema = z.object({
  version: z.literal(1).default(1),
  id: z.string().min(1),
  route: z
    .string()
    .regex(/^\/[a-z0-9\-\/]*$/, 'Route must start with / and use kebab segments'),
  template: z.string().default('blank'),
  metadata: pageMetadataSchema,
  agent: pageAgentSchema.default({}),
  blocks: z.array(blockInstanceSchema).default([]),
  source: pageSourceSchema.optional()
});

export type PageDocument = z.infer<typeof pageDocumentSchema>;
export type PageMetadata = z.infer<typeof pageMetadataSchema>;

export function parsePageDocument(input: unknown): PageDocument {
  return pageDocumentSchema.parse(input);
}

export function createBlankPage(input: {
  id: string;
  route: string;
  title: string;
  template?: string;
}): PageDocument {
  return parsePageDocument({
    version: 1,
    id: input.id,
    route: input.route,
    template: input.template ?? 'blank',
    metadata: {
      title: input.title,
      description: '',
      listed: true,
      robots: 'index'
    },
    agent: { tldr: '', facts: [], capabilities: [] },
    blocks: []
  });
}
