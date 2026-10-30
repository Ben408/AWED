'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState, useTransition } from 'react';
import type { ArticleDocument } from '@/lib/schema/article';
import { EmptyState } from '@/lib/studio/empty-state';

type Allowlists = { business: string[]; backyard: string[] };

type ArticlesManagerProps = {
  initialArticles: ArticleDocument[];
  initialAllowlists: Allowlists;
};

function moveItem<T>(list: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) return list;
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

export function ArticlesManager({ initialArticles, initialAllowlists }: ArticlesManagerProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [articles, setArticles] = useState(initialArticles);
  const [allowlists, setAllowlists] = useState(initialAllowlists);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [tab, setTab] = useState<'all' | 'business' | 'backyard'>('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  const ordered = useMemo(
    () => [...articles].sort((a, b) => b.frontmatter.date.localeCompare(a.frontmatter.date)),
    [articles]
  );

  const selectedArticles = ordered.filter((a) => selected.has(a.slug));
  const allSelected = ordered.length > 0 && selectedArticles.length === ordered.length;

  async function refreshFromServer() {
    const res = await fetch('/api/articles');
    const data = await res.json();
    if (res.ok) {
      setArticles(data.articles);
      setSelected((prev) => {
        const slugs = new Set<string>(data.articles.map((a: ArticleDocument) => a.slug));
        return new Set([...prev].filter((s) => slugs.has(s)));
      });
    }
    startTransition(() => router.refresh());
  }

  async function publish(slug: string) {
    setError(null);
    setMessage(null);
    const res = await fetch(`/api/articles/${slug}/publish`, { method: 'POST' });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Publish failed');
      return;
    }
    setMessage(`Published ${slug}`);
    await refreshFromServer();
  }

  async function unpublish(slug: string) {
    setError(null);
    setMessage(null);
    const res = await fetch(`/api/articles/${slug}/unpublish`, { method: 'POST' });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Unpublish failed');
      return;
    }
    setMessage(`Moved ${slug} to drafts`);
    await refreshFromServer();
  }

  async function remove(slug: string) {
    if (!confirm(`Delete article "${slug}" from disk? This cannot be undone.`)) return;
    setError(null);
    const res = await fetch(`/api/articles/${slug}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Delete failed');
      return;
    }
    setMessage(`Deleted ${slug}`);
    dropLocally([slug]);
    startTransition(() => router.refresh());
  }

  function dropLocally(slugs: string[]) {
    const gone = new Set(slugs);
    setArticles((prev) => prev.filter((a) => !gone.has(a.slug)));
    setAllowlists((prev) => ({
      business: prev.business.filter((s) => !gone.has(s)),
      backyard: prev.backyard.filter((s) => !gone.has(s))
    }));
    setSelected((prev) => new Set([...prev].filter((s) => !gone.has(s))));
  }

  async function duplicate(slug: string) {
    setError(null);
    setMessage(null);
    const res = await fetch(`/api/articles/${slug}/duplicate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Duplicate failed');
      return;
    }
    setMessage(`Duplicated ${slug} → ${data.article?.slug ?? `${slug}-copy`}`);
    await refreshFromServer();
  }

  async function reorderTo(from: number, to: number) {
    const slugs = moveItem(
      ordered.map((a) => a.slug),
      from,
      to
    );
    if (slugs.every((s, i) => s === ordered[i].slug)) return;
    setError(null);
    setMessage(null);
    const res = await fetch('/api/articles/reorder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slugs })
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Reorder failed');
      return;
    }
    setArticles(data.articles);
    setMessage('Updated article order (via dates)');
    startTransition(() => router.refresh());
  }

  function move(index: number, direction: -1 | 1) {
    return reorderTo(index, index + direction);
  }

  async function saveAllowlist(list: 'business' | 'backyard', current: string[]) {
    const next = { ...allowlists, [list]: current };
    setError(null);
    const res = await fetch('/api/allowlists', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ allowlists: next })
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Allowlist save failed');
      return;
    }
    setAllowlists(data.allowlists);
    setMessage(`Saved ${list} order`);
  }

  function moveAllowlist(list: 'business' | 'backyard', from: number, to: number) {
    return saveAllowlist(list, moveItem(allowlists[list], from, to));
  }

  function toggleOne(slug: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  }

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(ordered.map((a) => a.slug)));
  }

  async function bulk(action: 'publish' | 'unpublish' | 'delete') {
    const targets =
      action === 'publish'
        ? selectedArticles.filter((a) => a.location === 'drafts')
        : action === 'unpublish'
          ? selectedArticles.filter((a) => a.location === 'articles')
          : selectedArticles;
    if (!targets.length) {
      setError(`No selected articles can be ${action === 'delete' ? 'deleted' : `${action}ed`}`);
      return;
    }
    if (
      action === 'delete' &&
      !confirm(`Delete ${targets.length} article(s) from disk? This cannot be undone.`)
    ) {
      return;
    }
    setBusy(true);
    setError(null);
    setMessage(null);
    const done: string[] = [];
    const failed: string[] = [];
    for (const article of targets) {
      const url =
        action === 'delete'
          ? `/api/articles/${article.slug}`
          : `/api/articles/${article.slug}/${action}`;
      try {
        const res = await fetch(url, { method: action === 'delete' ? 'DELETE' : 'POST' });
        if (res.ok) done.push(article.slug);
        else failed.push(article.slug);
      } catch {
        failed.push(article.slug);
      }
    }
    const verb = action === 'delete' ? 'Deleted' : action === 'publish' ? 'Published' : 'Unpublished';
    if (done.length) setMessage(`${verb} ${done.length} article(s)`);
    if (failed.length) setError(`${action} failed for: ${failed.join(', ')}`);
    if (action === 'delete') dropLocally(done);
    await refreshFromServer();
    if (!failed.length) setSelected(new Set());
    setBusy(false);
  }

  return (
    <div className="space-y-4">
      {error ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p> : null}
      {message ? (
        <p className="rounded-md bg-accent-soft px-3 py-2 text-sm text-accent-dark">{message}</p>
      ) : null}

      <div className="inline-flex rounded-lg border border-ink-200 bg-white p-1 text-sm">
        {(
          [
            ['all', 'All articles'],
            ['business', 'Insights order'],
            ['backyard', 'Backyard order']
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            disabled={pending}
            onClick={() => setTab(id)}
            className={
              tab === id
                ? 'rounded-md bg-ink-900 px-3 py-1.5 font-semibold text-white'
                : 'rounded-md px-3 py-1.5 text-ink-700'
            }
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'all' ? (
        !ordered.length ? (
          <EmptyState
            title="No articles yet"
            body="Create your first article to see it here. Drafts live in content/drafts until you publish."
            actionHref="/articles/new"
            actionLabel="New article"
          />
        ) : (
          <div className="overflow-hidden rounded-xl border border-ink-200 bg-white">
            {selected.size ? (
              <div className="flex flex-wrap items-center gap-2 border-b border-ink-200 bg-ink-50 px-4 py-2 text-sm">
                <span className="font-medium">{selected.size} selected</span>
                <button
                  type="button"
                  disabled={busy}
                  className="rounded border border-ink-200 bg-white px-2 py-1 text-xs font-semibold disabled:opacity-50"
                  onClick={() => bulk('publish')}
                >
                  Publish
                </button>
                <button
                  type="button"
                  disabled={busy}
                  className="rounded border border-ink-200 bg-white px-2 py-1 text-xs font-semibold disabled:opacity-50"
                  onClick={() => bulk('unpublish')}
                >
                  Unpublish
                </button>
                <button
                  type="button"
                  disabled={busy}
                  className="rounded border border-red-200 bg-red-50 px-2 py-1 text-xs font-semibold text-red-800 disabled:opacity-50"
                  onClick={() => bulk('delete')}
                >
                  Delete
                </button>
                <button
                  type="button"
                  disabled={busy}
                  className="ml-auto text-xs text-ink-700 underline"
                  onClick={() => setSelected(new Set())}
                >
                  Clear
                </button>
              </div>
            ) : null}
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-ink-200 bg-ink-50 text-xs uppercase tracking-wide text-ink-700">
                <tr>
                  <th className="px-3 py-3">
                    <input
                      type="checkbox"
                      aria-label="Select all articles"
                      checked={allSelected}
                      onChange={toggleAll}
                    />
                  </th>
                  <th className="px-3 py-3">Order</th>
                  <th className="px-4 py-3">Title</th>
                  <th className="px-4 py-3">Slug</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {ordered.map((article, index) => (
                  <tr
                    key={article.slug}
                    draggable={!pending && !busy}
                    onDragStart={(e) => {
                      setDragIndex(index);
                      e.dataTransfer.effectAllowed = 'move';
                      e.dataTransfer.setData('text/plain', article.slug);
                    }}
                    onDragOver={(e) => {
                      if (dragIndex === null) return;
                      e.preventDefault();
                      e.dataTransfer.dropEffect = 'move';
                      setOverIndex(index);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      const from = dragIndex;
                      setDragIndex(null);
                      setOverIndex(null);
                      if (from !== null) void reorderTo(from, index);
                    }}
                    onDragEnd={() => {
                      setDragIndex(null);
                      setOverIndex(null);
                    }}
                    className={`border-b border-ink-100 ${
                      dragIndex === index ? 'opacity-50' : ''
                    } ${overIndex === index && dragIndex !== index ? 'bg-accent-soft/40' : ''}`}
                  >
                    <td className="px-3 py-3">
                      <input
                        type="checkbox"
                        aria-label={`Select ${article.slug}`}
                        checked={selected.has(article.slug)}
                        onChange={() => toggleOne(article.slug)}
                      />
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <span className="cursor-grab select-none text-ink-700" title="Drag to reorder">
                          ⋮⋮
                        </span>
                        <div className="flex flex-col gap-1">
                          <button
                            type="button"
                            className="rounded border border-ink-200 px-1.5 text-xs disabled:opacity-40"
                            disabled={index === 0 || pending}
                            onClick={() => move(index, -1)}
                            aria-label="Move up"
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            className="rounded border border-ink-200 px-1.5 text-xs disabled:opacity-40"
                            disabled={index === ordered.length - 1 || pending}
                            onClick={() => move(index, 1)}
                            aria-label="Move down"
                          >
                            ↓
                          </button>
                        </div>
                      </div>
                    </td>
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
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <Link
                          href={`/articles/${article.slug}`}
                          className="rounded border border-ink-200 px-2 py-1 text-xs font-semibold no-underline"
                        >
                          Edit
                        </Link>
                        {article.location === 'drafts' ? (
                          <button
                            type="button"
                            className="rounded border border-ink-200 px-2 py-1 text-xs font-semibold"
                            onClick={() => publish(article.slug)}
                          >
                            Publish
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="rounded border border-ink-200 px-2 py-1 text-xs font-semibold"
                            onClick={() => unpublish(article.slug)}
                          >
                            Unpublish
                          </button>
                        )}
                        <button
                          type="button"
                          className="rounded border border-ink-200 px-2 py-1 text-xs font-semibold"
                          onClick={() => duplicate(article.slug)}
                        >
                          Duplicate
                        </button>
                        <button
                          type="button"
                          className="rounded border border-red-200 bg-red-50 px-2 py-1 text-xs font-semibold text-red-800"
                          onClick={() => remove(article.slug)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="border-t border-ink-100 px-4 py-3 text-xs text-ink-700">
              Drag rows (or use arrows) to reorder — this swaps article dates (site indexes sort
              newest-first). Publish moves the MDX file from{' '}
              <code className="font-mono">content/drafts</code> to{' '}
              <code className="font-mono">content/articles</code>.
            </p>
          </div>
        )
      ) : (
        <AllowlistOrder
          list={tab}
          slugs={allowlists[tab]}
          titles={Object.fromEntries(articles.map((a) => [a.slug, a.frontmatter.title]))}
          onMove={(from, to) => moveAllowlist(tab, from, to)}
        />
      )}
    </div>
  );
}

function AllowlistOrder({
  list,
  slugs,
  titles,
  onMove
}: {
  list: 'business' | 'backyard';
  slugs: string[];
  titles: Record<string, string>;
  onMove: (from: number, to: number) => void;
}) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  return (
    <div className="space-y-3 rounded-xl border border-ink-200 bg-white p-4">
      <p className="text-sm text-ink-700">
        Order for the {list === 'business' ? 'Business Insights' : 'Backyard'} allowlist (
        <code className="font-mono text-xs">content/allowlists.yaml</code>). Drag items or use the
        arrows. Membership here controls which posts appear on those indexes once the site reads this
        file.
      </p>
      {!slugs.length ? (
        <EmptyState
          title="Nothing in this allowlist"
          body="Add slugs to content/allowlists.yaml to feature articles on this index."
        />
      ) : (
        <ul className="divide-y divide-ink-100 rounded-lg border border-ink-100">
          {slugs.map((slug, index) => (
            <li
              key={slug}
              draggable
              onDragStart={(e) => {
                setDragIndex(index);
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', slug);
              }}
              onDragOver={(e) => {
                if (dragIndex === null) return;
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                setOverIndex(index);
              }}
              onDrop={(e) => {
                e.preventDefault();
                const from = dragIndex;
                setDragIndex(null);
                setOverIndex(null);
                if (from !== null) onMove(from, index);
              }}
              onDragEnd={() => {
                setDragIndex(null);
                setOverIndex(null);
              }}
              className={`flex cursor-grab items-center justify-between gap-3 px-3 py-2 text-sm ${
                dragIndex === index ? 'opacity-50' : ''
              } ${overIndex === index && dragIndex !== index ? 'bg-accent-soft/40' : ''}`}
            >
              <div className="flex items-center gap-3">
                <span className="select-none text-ink-700" aria-hidden>
                  ⋮⋮
                </span>
                <div>
                  <p className="font-medium">{titles[slug] || slug}</p>
                  <p className="font-mono text-xs text-ink-700">{slug}</p>
                </div>
              </div>
              <div className="flex gap-1">
                <button
                  type="button"
                  className="rounded border border-ink-200 px-2 text-xs disabled:opacity-40"
                  disabled={index === 0}
                  onClick={() => onMove(index, index - 1)}
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="rounded border border-ink-200 px-2 text-xs disabled:opacity-40"
                  disabled={index === slugs.length - 1}
                  onClick={() => onMove(index, index + 1)}
                >
                  ↓
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
