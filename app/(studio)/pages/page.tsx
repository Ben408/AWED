import Link from 'next/link';
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
            Schema-backed page documents. Blocks come from the approved library only.
          </p>
        </div>
        <Link
          href="/pages/new"
          className="rounded-md bg-accent px-3 py-2 text-sm font-semibold text-white no-underline hover:bg-accent-dark"
        >
          New page
        </Link>
      </div>

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
                  {page.route} · {page.blocks.length} blocks
                </p>
              </div>
              <span className="text-sm text-accent">Edit</span>
            </Link>
          </li>
        ))}
        {!pages.length ? (
          <li className="px-4 py-8 text-center text-sm text-ink-700">
            No page documents yet. Create one, or switch to a project that includes{' '}
            <code className="font-mono">content/pages/*.page.yaml</code>.
          </li>
        ) : null}
      </ul>
    </div>
  );
}
