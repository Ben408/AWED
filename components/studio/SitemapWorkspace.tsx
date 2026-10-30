'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import type { ArticleDocument } from '@/lib/schema/article';
import type { PageDocument } from '@/lib/schema/page';
import type { FooterGroup, NavItem } from '@/lib/schema/site';
import { EmptyState } from '@/lib/studio/empty-state';
import { validateNav } from '@/lib/studio/validation';

type SitemapWorkspaceProps = {
  projectName: string;
  initialNav: NavItem[];
  initialFooterGroups?: FooterGroup[];
  pages: PageDocument[];
  articles: ArticleDocument[];
};

const FOOTER_SEED_LIMIT = 6;

const primaryButton =
  'rounded-md bg-accent px-3 py-2 text-sm font-semibold text-white no-underline hover:bg-accent-dark disabled:opacity-60';
const secondaryButton =
  'rounded-md border border-ink-200 bg-white px-3 py-2 text-sm font-semibold text-ink-900 no-underline hover:bg-ink-50 disabled:opacity-60';
const iconButton =
  'rounded border border-ink-200 bg-white px-2 text-xs disabled:opacity-40';
const inputClass = 'mt-1 w-full rounded-md border border-ink-200 bg-white px-3 py-2';

function Chip({
  children,
  tone = 'neutral'
}: {
  children: React.ReactNode;
  tone?: 'neutral' | 'good' | 'warn' | 'accent';
}) {
  const tones = {
    neutral: 'bg-ink-100 text-ink-700',
    good: 'bg-green-50 text-green-800',
    warn: 'bg-amber-50 text-amber-800',
    accent: 'bg-accent-soft text-accent-dark'
  } as const;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

function reorder<T>(list: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) return list;
  const next = [...list];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

export function SitemapWorkspace({
  projectName,
  initialNav,
  initialFooterGroups = [],
  pages,
  articles
}: SitemapWorkspaceProps) {
  const router = useRouter();
  const [nav, setNav] = useState<NavItem[]>(initialNav);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  // Footer state — seeded client-side only when the site has no footer groups yet.
  const [seeded] = useState(() => initialFooterGroups.length === 0 && initialNav.length > 0);
  const [footerGroups, setFooterGroups] = useState<FooterGroup[]>(() => {
    if (initialFooterGroups.length > 0) return initialFooterGroups;
    if (!initialNav.length) return [];
    const links = initialNav
      .filter((item) => item.listed !== false)
      .slice(0, FOOTER_SEED_LIMIT)
      .map((item) => ({ label: item.label, href: item.href, listed: true }));
    return links.length ? [{ title: 'Explore', links }] : [];
  });
  const [footerBusy, setFooterBusy] = useState(false);
  const [footerError, setFooterError] = useState<string | null>(null);
  const [footerMessage, setFooterMessage] = useState<string | null>(null);

  const pageOptions = useMemo(() => {
    const routes = pages
      .map((p) => ({ href: p.route, title: p.metadata.title || p.id }))
      .sort((a, b) => a.href.localeCompare(b.href));
    return [{ href: '/', title: 'Home' }, ...routes.filter((r) => r.href !== '/')];
  }, [pages]);

  const pageRoutes = useMemo(() => pages.map((p) => p.route), [pages]);
  const issues = useMemo(() => validateNav(nav, pageRoutes), [nav, pageRoutes]);

  async function save(nextNav: NavItem[]) {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch('/api/site/nav', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nav: nextNav })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      setNav(data.nav);
      setMessage('Navigation saved — header & footer will use this list.');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  }

  async function saveFooter() {
    const invalid = footerGroups.some(
      (g) => !g.title.trim() || g.links.some((l) => !l.label.trim() || !l.href.trim())
    );
    if (invalid) {
      setFooterError('Every group needs a title, and every link needs a label and a URL.');
      setFooterMessage(null);
      return;
    }
    setFooterBusy(true);
    setFooterError(null);
    setFooterMessage(null);
    try {
      const res = await fetch('/api/site/footer', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ footerGroups })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Footer save failed');
      setFooterGroups(data.footerGroups);
      setFooterMessage('Footer saved — your link groups are live.');
      router.refresh();
    } catch (err) {
      setFooterError(err instanceof Error ? err.message : 'Footer save failed');
    } finally {
      setFooterBusy(false);
    }
  }

  /* ---------- navigation editing ---------- */

  function updateItem(index: number, patch: Partial<NavItem>) {
    setNav((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  function move(index: number, direction: -1 | 1) {
    setNav((prev) => reorder(prev, index, index + direction));
  }

  function remove(index: number) {
    const item = nav[index];
    if (!confirm(`Remove “${item.label}” from navigation?`)) return;
    setNav((prev) => prev.filter((_, i) => i !== index));
  }

  function addItem() {
    const unused = pageOptions.find((p) => !nav.some((n) => n.href === p.href));
    setNav((prev) => [
      ...prev,
      {
        label: unused?.title || 'New link',
        href: unused?.href || '/',
        listed: true
      }
    ]);
  }

  function endDrag() {
    setDragIndex(null);
    setOverIndex(null);
  }

  function dropOn(target: number) {
    if (dragIndex !== null) setNav((prev) => reorder(prev, dragIndex, target));
    endDrag();
  }

  /* ---------- pages: menu membership ---------- */

  function navFor(route: string) {
    return nav.find((n) => n.href === route);
  }

  function isInMenu(route: string) {
    const item = navFor(route);
    return Boolean(item && item.listed !== false);
  }

  function setPageInMenu(page: PageDocument, inMenu: boolean) {
    setMessage(null);
    setNav((prev) => {
      const existing = prev.findIndex((n) => n.href === page.route);
      if (inMenu) {
        if (existing >= 0) {
          return prev.map((n, i) => (i === existing ? { ...n, listed: true } : n));
        }
        return [
          ...prev,
          {
            label: page.metadata.title || page.id,
            href: page.route,
            listed: true
          }
        ];
      }
      if (existing < 0) return prev;
      return prev.map((n, i) => (i === existing ? { ...n, listed: false } : n));
    });
  }

  /* ---------- footer editing ---------- */

  function updateGroup(index: number, patch: Partial<FooterGroup>) {
    setFooterGroups((prev) => prev.map((g, i) => (i === index ? { ...g, ...patch } : g)));
  }

  function addGroup() {
    setFooterGroups((prev) => [...prev, { title: 'New group', links: [] }]);
  }

  function removeGroup(index: number) {
    const group = footerGroups[index];
    if (!confirm(`Remove the “${group.title}” group and its links?`)) return;
    setFooterGroups((prev) => prev.filter((_, i) => i !== index));
  }

  function updateLink(groupIndex: number, linkIndex: number, patch: Partial<NavItem>) {
    setFooterGroups((prev) =>
      prev.map((g, gi) =>
        gi === groupIndex
          ? { ...g, links: g.links.map((l, li) => (li === linkIndex ? { ...l, ...patch } : l)) }
          : g
      )
    );
  }

  function addLink(groupIndex: number) {
    setFooterGroups((prev) =>
      prev.map((g, gi) =>
        gi === groupIndex
          ? { ...g, links: [...g.links, { label: 'New link', href: '/', listed: true }] }
          : g
      )
    );
  }

  function removeLink(groupIndex: number, linkIndex: number) {
    setFooterGroups((prev) =>
      prev.map((g, gi) =>
        gi === groupIndex ? { ...g, links: g.links.filter((_, li) => li !== linkIndex) } : g
      )
    );
  }

  function moveLink(groupIndex: number, linkIndex: number, direction: -1 | 1) {
    setFooterGroups((prev) =>
      prev.map((g, gi) =>
        gi === groupIndex ? { ...g, links: reorder(g.links, linkIndex, linkIndex + direction) } : g
      )
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-semibold">Site map</h1>
        <p className="mt-1 text-sm text-ink-700">
          Structure of <strong>{projectName}</strong> — shape the menu, see what&apos;s published,
          then open any page or article to change its content.
        </p>
      </header>

      {error ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p> : null}
      {message ? (
        <p className="rounded-md bg-accent-soft px-3 py-2 text-sm text-accent-dark">{message}</p>
      ) : null}

      {issues.length ? (
        <div
          className="flex flex-wrap items-center gap-2 rounded-xl border border-ink-200 bg-white px-4 py-3"
          aria-label="Navigation suggestions"
        >
          <span className="text-xs font-semibold uppercase tracking-wide text-ink-700">
            Gentle nudges
          </span>
          {issues.map((issue, i) => (
            <Chip key={`${issue.message}-${i}`} tone={issue.severity === 'warn' ? 'warn' : 'neutral'}>
              {issue.severity === 'warn' ? '⚠ ' : 'ℹ '}
              {issue.message}
            </Chip>
          ))}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* ---------------- Navigation ---------------- */}
        <section className="rounded-xl border border-ink-200 bg-white p-5 lg:col-span-1">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-semibold">Navigation</h2>
              <p className="mt-1 text-sm text-ink-700">
                Drag rows or use the arrows to reorder. Unchecked items stay here but are hidden
                from the live menu.
              </p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" disabled={busy} onClick={addItem} className={secondaryButton}>
              Add item
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => save(nav)}
              className={primaryButton}
            >
              {busy ? 'Saving…' : 'Save navigation'}
            </button>
          </div>

          {nav.length ? (
            <ul className="mt-4 space-y-3">
              {nav.map((item, index) => (
                <li
                  key={`${item.href}-${index}`}
                  draggable
                  onDragStart={(e) => {
                    setDragIndex(index);
                    e.dataTransfer.effectAllowed = 'move';
                    e.dataTransfer.setData('text/plain', String(index));
                  }}
                  onDragOver={(e) => {
                    if (dragIndex === null) return;
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                    if (overIndex !== index) setOverIndex(index);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    dropOn(index);
                  }}
                  onDragEnd={endDrag}
                  className={`space-y-2 rounded-lg border p-3 ${
                    overIndex === index && dragIndex !== null && dragIndex !== index
                      ? 'border-accent bg-accent-soft/40'
                      : 'border-ink-100 bg-ink-50/40'
                  } ${dragIndex === index ? 'opacity-50' : ''} ${
                    item.listed === false ? 'opacity-80' : ''
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1">
                      <span
                        className="cursor-grab select-none px-1 text-ink-700"
                        title="Drag to reorder"
                        aria-hidden
                      >
                        ⠿
                      </span>
                      <button
                        type="button"
                        className={iconButton}
                        disabled={index === 0}
                        onClick={() => move(index, -1)}
                        aria-label="Move up"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        className={iconButton}
                        disabled={index === nav.length - 1}
                        onClick={() => move(index, 1)}
                        aria-label="Move down"
                      >
                        ↓
                      </button>
                    </div>
                    <label className="flex items-center gap-2 text-sm text-ink-800">
                      <input
                        type="checkbox"
                        checked={item.listed !== false}
                        onChange={(e) => updateItem(index, { listed: e.target.checked })}
                      />
                      In menu
                    </label>
                  </div>

                  <label className="block text-sm">
                    <span className="font-medium text-ink-800">Label</span>
                    <input
                      className={inputClass}
                      value={item.label}
                      onChange={(e) => updateItem(index, { label: e.target.value })}
                    />
                  </label>

                  <label className="block text-sm">
                    <span className="font-medium text-ink-800">Links to</span>
                    <select
                      className={inputClass}
                      value={
                        pageOptions.some((p) => p.href === item.href) ? item.href : '__custom__'
                      }
                      onChange={(e) => {
                        if (e.target.value === '__custom__') return;
                        const page = pageOptions.find((p) => p.href === e.target.value);
                        updateItem(index, {
                          href: e.target.value,
                          label: item.label || page?.title || e.target.value
                        });
                      }}
                    >
                      {pageOptions.map((page) => (
                        <option key={page.href} value={page.href}>
                          {page.title} ({page.href})
                        </option>
                      ))}
                      {!pageOptions.some((p) => p.href === item.href) ? (
                        <option value="__custom__">Custom: {item.href}</option>
                      ) : null}
                    </select>
                    <input
                      className="mt-2 w-full rounded-md border border-ink-200 bg-white px-3 py-1.5 font-mono text-xs"
                      value={item.href}
                      onChange={(e) => updateItem(index, { href: e.target.value })}
                      placeholder="/path"
                    />
                  </label>

                  <button
                    type="button"
                    className="rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-semibold text-red-800"
                    onClick={() => remove(index)}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-4">
              <EmptyState
                title="Your menu is empty"
                body="Add your first link so visitors know where to go."
              />
              <div className="mt-3 text-center">
                <button type="button" onClick={addItem} className={primaryButton}>
                  Add item
                </button>
              </div>
            </div>
          )}
        </section>

        {/* ---------------- Pages ---------------- */}
        <section className="rounded-xl border border-ink-200 bg-white p-5 lg:col-span-1">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-semibold">Pages</h2>
              <p className="mt-1 text-sm text-ink-700">
                Toggle “In menu”, then save navigation to publish the change.
              </p>
            </div>
            <Link href="/pages/new" className={primaryButton}>
              Create page
            </Link>
          </div>

          {pages.length ? (
            <ul className="mt-3 divide-y divide-ink-100">
              {pages.map((page) => {
                const isTsx = page.source?.kind === 'tsx';
                const inMenu = isInMenu(page.route);
                const inNav = Boolean(navFor(page.route));
                const blockCount = page.blocks.length;
                return (
                  <li key={page.id} className="space-y-2 py-3 text-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <Link
                          href={`/pages/${page.id}`}
                          className="font-medium no-underline hover:underline"
                        >
                          {page.metadata.title || page.id}
                        </Link>
                        <p className="truncate font-mono text-xs text-ink-700">{page.route}</p>
                        {isTsx ? (
                          <p className="text-xs text-ink-700">Editable file</p>
                        ) : blockCount > 0 ? (
                          <p className="text-xs text-ink-700">
                            {blockCount} {blockCount === 1 ? 'block' : 'blocks'}
                          </p>
                        ) : null}
                      </div>
                      <Link
                        href={`/pages/${page.id}`}
                        className="shrink-0 text-sm text-accent no-underline hover:underline"
                      >
                        Edit
                      </Link>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Chip tone={isTsx ? 'accent' : 'neutral'}>{isTsx ? 'tsx' : 'document'}</Chip>
                      <Chip tone={page.metadata.listed ? 'good' : 'warn'}>
                        {page.metadata.listed ? 'listed' : 'unlisted'}
                      </Chip>
                      {inMenu ? <Chip tone="good">in menu</Chip> : null}
                      {!inNav ? <Chip tone="warn">orphan</Chip> : null}
                    </div>
                    <label className="flex items-center gap-2 text-xs text-ink-800">
                      <input
                        type="checkbox"
                        checked={inMenu}
                        onChange={(e) => setPageInMenu(page, e.target.checked)}
                      />
                      In menu
                    </label>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="mt-4">
              <EmptyState
                title="No pages yet"
                body="Pages are the building blocks of your site. Start with a home page or an about page."
                actionHref="/pages/new"
                actionLabel="Create your first page"
              />
            </div>
          )}
        </section>

        {/* ---------------- Articles ---------------- */}
        <section className="rounded-xl border border-ink-200 bg-white p-5 lg:col-span-1">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-semibold">Articles</h2>
              <p className="mt-1 text-sm text-ink-700">Posts, updates, and long-form writing.</p>
            </div>
            <Link href="/articles/new" className={primaryButton}>
              Create article
            </Link>
          </div>

          {articles.length ? (
            <ul className="mt-3 divide-y divide-ink-100">
              {articles.map((article) => {
                const published = article.location === 'articles';
                return (
                  <li
                    key={`${article.location}-${article.slug}`}
                    className="flex items-center justify-between gap-2 py-3 text-sm"
                  >
                    <div className="min-w-0">
                      <Link
                        href={`/articles/${article.slug}`}
                        className="font-medium no-underline hover:underline"
                      >
                        {article.frontmatter.title || article.slug}
                      </Link>
                      <p className="truncate font-mono text-xs text-ink-700">{article.slug}</p>
                    </div>
                    <Chip tone={published ? 'good' : 'warn'}>{published ? 'published' : 'draft'}</Chip>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="mt-4">
              <EmptyState
                title="No articles yet"
                body="Share news, guides, or stories. Drafts stay private until you publish."
                actionHref="/articles/new"
                actionLabel="Write your first article"
              />
            </div>
          )}
        </section>
      </div>

      {/* ---------------- Footer ---------------- */}
      <section className="rounded-xl border border-ink-200 bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-semibold">Footer links</h2>
            <p className="mt-1 text-sm text-ink-700">
              Group links into columns at the bottom of every page.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={footerBusy}
              onClick={addGroup}
              className={secondaryButton}
            >
              Add group
            </button>
            <button
              type="button"
              disabled={footerBusy}
              onClick={saveFooter}
              className={primaryButton}
            >
              {footerBusy ? 'Saving…' : 'Save footer'}
            </button>
          </div>
        </div>

        {seeded && footerGroups.length ? (
          <p className="mt-3 rounded-md bg-ink-50 px-3 py-2 text-xs text-ink-700">
            ✨ We started you off with an “Explore” group from your menu. Nothing is saved until you
            press <strong>Save footer</strong>.
          </p>
        ) : null}
        {footerError ? (
          <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">{footerError}</p>
        ) : null}
        {footerMessage ? (
          <p className="mt-3 rounded-md bg-accent-soft px-3 py-2 text-sm text-accent-dark">
            {footerMessage}
          </p>
        ) : null}

        {footerGroups.length ? (
          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {footerGroups.map((group, gi) => (
              <div key={gi} className="space-y-3 rounded-lg border border-ink-100 bg-ink-50/40 p-3">
                <div className="flex items-end gap-2">
                  <label className="block flex-1 text-sm">
                    <span className="font-medium text-ink-800">Group title</span>
                    <input
                      className={inputClass}
                      value={group.title}
                      onChange={(e) => updateGroup(gi, { title: e.target.value })}
                    />
                  </label>
                  <button
                    type="button"
                    className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-800"
                    onClick={() => removeGroup(gi)}
                  >
                    Remove
                  </button>
                </div>

                <ul className="space-y-2">
                  {group.links.map((link, li) => (
                    <li
                      key={li}
                      className="flex items-center gap-1.5 rounded-md border border-ink-100 bg-white p-2"
                    >
                      <div className="flex flex-col gap-1">
                        <button
                          type="button"
                          className={iconButton}
                          disabled={li === 0}
                          onClick={() => moveLink(gi, li, -1)}
                          aria-label="Move link up"
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          className={iconButton}
                          disabled={li === group.links.length - 1}
                          onClick={() => moveLink(gi, li, 1)}
                          aria-label="Move link down"
                        >
                          ↓
                        </button>
                      </div>
                      <div className="grid min-w-0 flex-1 gap-1.5">
                        <input
                          className="w-full rounded-md border border-ink-200 px-2 py-1 text-sm"
                          value={link.label}
                          onChange={(e) => updateLink(gi, li, { label: e.target.value })}
                          placeholder="Label"
                          aria-label="Link label"
                        />
                        <input
                          className="w-full rounded-md border border-ink-200 px-2 py-1 font-mono text-xs"
                          value={link.href}
                          onChange={(e) => updateLink(gi, li, { href: e.target.value })}
                          placeholder="/path or https://…"
                          aria-label="Link URL"
                        />
                      </div>
                      <button
                        type="button"
                        className="rounded border border-red-200 bg-red-50 px-2 py-1 text-xs font-semibold text-red-800"
                        onClick={() => removeLink(gi, li)}
                        aria-label="Remove link"
                      >
                        ✕
                      </button>
                    </li>
                  ))}
                  {!group.links.length ? (
                    <li className="text-xs text-ink-700">No links in this group yet.</li>
                  ) : null}
                </ul>

                <button type="button" className={secondaryButton} onClick={() => addLink(gi)}>
                  Add link
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-4">
            <EmptyState
              title="No footer groups yet"
              body="Add a group like “Explore” or “Company” to organize footer links."
            />
            <div className="mt-3 text-center">
              <button type="button" onClick={addGroup} className={primaryButton}>
                Add group
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
