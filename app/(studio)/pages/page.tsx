import Link from 'next/link';
import { EmptyState } from '@/lib/studio/empty-state';
import { getActiveStore } from '@/lib/server/get-store';

export default async function PagesIndexPage() {
  const { store } = await getActiveStore();
  const pages = await store.listPages();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold">Pages</h1>
          <p className="mt-1 text-sm text-ink-700">
            Marketing routes on the live site. Create a real page file, then edit its content.
          </p>
        </div>
        <Link
          href="/pages/new"
          className="rounded-md bg-accent px-3 py-2 text-sm font-semibold text-white no-underline hover:bg-accent-dark"
        >
          Create page
        </Link>
      </div>

      {!pages.length ? (
        <EmptyState
          title="No pages yet"
          body="Create a page to add a real route on the site, or import an existing project."
          actionHref="/pages/new"
          actionLabel="Create page"
        />
      ) : (
        <ul className="divide-y divide-ink-100 overflow-hidden rounded-xl border border-ink-200 bg-white">
          {pages.map((page) => (
            <li key={page.id}>
              <Link
                href={`/pages/${page.id}`}
                className="flex items-center justify-between gap-3 px-4 py-3 no-underline hover:bg-ink-50"
              >
                <div>
                  <p className="font-medium text-ink-900">{page.metadata.title}</p>
                  <p className="font-mono text-xs text-ink-700">
                    {page.route}
                    {page.source?.kind === 'tsx'
                      ? ' · editable file'
                      : page.blocks.length
                        ? ` · ${page.blocks.length} blocks`
                        : ''}
                  </p>
                </div>
                <span className="text-sm text-accent">Edit</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
