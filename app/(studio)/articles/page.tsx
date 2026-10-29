import Link from 'next/link';
import { getActiveStore } from '@/lib/server/get-store';

export default async function ArticlesIndexPage() {
  const { store } = await getActiveStore();
  const articles = await store.listArticles();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold">Articles</h1>
          <p className="mt-1 text-sm text-ink-700">MDX posts with structured frontmatter.</p>
        </div>
        <Link
          href="/articles/new"
          className="rounded-md bg-accent px-3 py-2 text-sm font-semibold text-white no-underline hover:bg-accent-dark"
        >
          New article
        </Link>
      </div>

      <div className="overflow-hidden rounded-xl border border-ink-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-ink-200 bg-ink-50 text-xs uppercase tracking-wide text-ink-700">
            <tr>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Slug</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {articles.map((article) => (
              <tr key={`${article.location}-${article.slug}`} className="border-b border-ink-100">
                <td className="px-4 py-3">
                  <Link href={`/articles/${article.slug}`} className="font-medium no-underline">
                    {article.frontmatter.title}
                  </Link>
                </td>
                <td className="px-4 py-3 font-mono text-xs">{article.slug}</td>
                <td className="px-4 py-3">{article.frontmatter.date}</td>
                <td className="px-4 py-3">
                  <span
                    className={
                      article.location === 'articles'
                        ? 'rounded bg-accent-soft px-2 py-0.5 text-xs font-semibold text-accent-dark'
                        : 'rounded bg-ink-100 px-2 py-0.5 text-xs font-semibold text-ink-700'
                    }
                  >
                    {article.location === 'articles' ? 'published' : 'draft'}
                  </span>
                </td>
              </tr>
            ))}
            {!articles.length ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-ink-700">
                  No articles yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
