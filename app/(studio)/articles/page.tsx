import Link from 'next/link';
import { ArticlesManager } from '@/components/studio/ArticlesManager';
import { getActiveStore } from '@/lib/server/get-store';

export default async function ArticlesIndexPage() {
  const { store } = await getActiveStore();
  await store.reconcileArticleDuplicates();
  const articles = await store.listArticles();
  const allowlists = await store.getAllowlists();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold">Articles</h1>
          <p className="mt-1 text-sm text-ink-700">
            Full CRUD for MDX posts — publish, unpublish, delete, and reorder.
          </p>
        </div>
        <Link
          href="/articles/new"
          className="rounded-md bg-accent px-3 py-2 text-sm font-semibold text-white no-underline hover:bg-accent-dark"
        >
          New article
        </Link>
      </div>

      <ArticlesManager initialArticles={articles} initialAllowlists={allowlists} />
    </div>
  );
}
