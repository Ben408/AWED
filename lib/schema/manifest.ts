import { z } from 'zod';

export const manifestFileSchema = z.object({
  path: z.string().min(1),
  /** Absolute path on disk when imported on this machine */
  absolutePath: z.string().optional(),
  role: z.enum([
    'page',
    'article',
    'draft',
    'media',
    'constants',
    'layout',
    'config',
    'other'
  ]),
  route: z.string().optional(),
  slug: z.string().optional(),
  urlPath: z.string().optional(),
  mediaKind: z.enum(['image', 'other']).optional()
});

export const siteManifestSchema = z.object({
  version: z.literal(1),
  importedAt: z.string(),
  rootPath: z.string(),
  files: z.array(manifestFileSchema)
});

export type ManifestFile = z.infer<typeof manifestFileSchema>;
export type SiteManifest = z.infer<typeof siteManifestSchema>;

export function parseSiteManifest(input: unknown): SiteManifest {
  return siteManifestSchema.parse(input);
}
