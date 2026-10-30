import path from 'path';

export type SiteLayout = {
  root: string;
  siteYaml: string;
  pagesDir: string;
  articlesDir: string;
  draftsDir: string;
  mediaDir: string;
  publicDir: string;
  allowlistsFile: string;
  /** Path-only registry of site files (no content extraction). */
  manifestFile: string;
};

/** Resolve conventional Site Project paths under a project root. */
export function resolveSiteLayout(root: string): SiteLayout {
  const normalized = path.resolve(root);
  return {
    root: normalized,
    siteYaml: path.join(normalized, 'site.yaml'),
    pagesDir: path.join(normalized, 'content', 'pages'),
    articlesDir: path.join(normalized, 'content', 'articles'),
    draftsDir: path.join(normalized, 'content', 'drafts'),
    mediaDir: path.join(normalized, 'public', 'images'),
    publicDir: path.join(normalized, 'public'),
    allowlistsFile: path.join(normalized, 'content', 'allowlists.yaml'),
    manifestFile: path.join(normalized, '.awed', 'manifest.yaml')
  };
}
