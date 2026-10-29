import Link from 'next/link';
import { getActiveStore } from '@/lib/server/get-store';

/** Site map — PageMill treated a site as related pages you browse and open. */
export default async function SiteMapPage() {
  const { store, projectName } = await getActiveStore();
  const [site, pages, articles] = await Promise.all([
    store.getSite(),
    store.listPages(),
    store.listArticles()
  ]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-semibold">Site map</h1>
        <p className="mt-1 text-sm text-ink-700">
          Everything in <strong>{projectName}</strong> that AWED can open—pages, articles, and nav.
        </p>
      </header>

      <section className="rounded-xl border border-ink-200 bg-white p-5">
        <h2 className="font-display text-lg font-semibold">Navigation</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {site.nav.map((item) => (
            <li key={`${item.href}-${item.label}`} className="flex justify-between gap-3">
              <span>{item.label}</span>
              <span className="font-mono text-xs text-ink-700">{item.href}</span>
            </li>
          ))}
          {!site.nav.length ? <li className="text-ink-700">No nav entries in site.yaml yet.</li> : null}
        </ul>
      </section>

      <section className="rounded-xl border border-ink-200 bg-white p-5">
        <h2 className="font-display text-lg font-semibold">Pages</h2>
        <ul className="mt-3 divide-y divide-ink-100">
          {pages.map((page) => (
            <li key={page.id} className="flex items-center justify-between py-2 text-sm">
              <div>
                <Link href={`/pages/${page.id}`} className="font-medium no-underline">
                  {page.metadata.title}
                </Link>
                <p className="font-mono text-xs text-ink-700">{page.route}</p>
              </div>
              <span className="text-xs text-ink-700">{page.blocks.length} blocks</span>
            </li>
          ))}
          {!pages.length ? (
            <li className="py-2 text-sm text-ink-700">No page documents yet.</li>
          ) : null}
        </ul>
      </section>

      <section className="rounded-xl border border-ink-200 bg-white p-5">
        <h2 className="font-display text-lg font-semibold">Articles</h2>
        <ul className="mt-3 divide-y divide-ink-100">
          {articles.map((article) => (
            <li key={`${article.location}-${article.slug}`} className="flex items-center justify-between py-2 text-sm">
              <Link href={`/articles/${article.slug}`} className="font-medium no-underline">
                {article.frontmatter.title}
              </Link>
              <span className="text-xs text-ink-700">{article.location}</span>
            </li>
          ))}
          {!articles.length ? (
            <li className="py-2 text-sm text-ink-700">No articles yet.</li>
          ) : null}
        </ul>
      </section>
    </div>
  );
}
