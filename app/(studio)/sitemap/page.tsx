import { SitemapWorkspace } from '@/components/studio/SitemapWorkspace';
import { getActiveStore } from '@/lib/server/get-store';

/** Site map — edit navigation, then open pages and articles. */
export default async function SiteMapPage() {
  const { store, projectName } = await getActiveStore();
  const [site, pages, articles] = await Promise.all([
    store.getSite(),
    store.listPages(),
    store.listArticles()
  ]);

  return (
    <SitemapWorkspace
      projectName={projectName}
      initialNav={site.nav}
      initialFooterGroups={site.footerGroups}
      pages={pages}
      articles={articles}
    />
  );
}
