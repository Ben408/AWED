'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import type { ArticleDocument } from '@/lib/schema/article';
import { useAutosave } from '@/hooks/useAutosave';
import { useUndoStack } from '@/hooks/useUndoStack';
import { MDX_EMBED_CATALOG, insertMdxEmbed } from '@/lib/studio/embeds';
import { validateArticle } from '@/lib/studio/validation';
import type { MediaItem } from '@/components/studio/MediaLibrary';

type ArticleEditorProps = {
  initial: ArticleDocument;
  isNew?: boolean;
};

const MEDIA_MIME = 'application/x-awed-media';
/** Minimum gap between typing-driven undo checkpoints. */
const TYPING_CHECKPOINT_MS = 2000;

function readDroppedUrl(dt: DataTransfer): string | null {
  const raw = (dt.getData(MEDIA_MIME) || dt.getData('text/plain') || '').trim();
  if (!raw) return null;
  if (raw.startsWith('/') || /^https?:\/\//i.test(raw)) return raw;
  return null;
}

function altFromUrl(url: string): string {
  const name = url.split('?')[0].split('/').pop() || 'image';
  return name.replace(/\.[a-z0-9]+$/i, '').replace(/[-_]+/g, ' ').trim() || 'image';
}

export function ArticleEditor({ initial, isNew }: ArticleEditorProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [doc, setDoc] = useState(initial);
  const [mode, setMode] = useState<'edit' | 'preview' | 'document'>('edit');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [coverOver, setCoverOver] = useState(false);
  const [bodyOver, setBodyOver] = useState(false);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const lastTypingCheckpoint = useRef(0);
  const { stack, checkpoint, undo, canUndo } = useUndoStack<ArticleDocument>();

  const issues = useMemo(() => validateArticle(doc), [doc]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/media');
        const data = await res.json();
        if (res.ok && !cancelled) setMedia(data.media || []);
      } catch {
        /* media picker is optional */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /** Apply an edit, recording the pre-edit document for undo. */
  const edit = useCallback(
    (label: string, updater: (prev: ArticleDocument) => ArticleDocument, opts?: { typing?: boolean }) => {
      if (opts?.typing) {
        const now = Date.now();
        if (now - lastTypingCheckpoint.current > TYPING_CHECKPOINT_MS) {
          checkpoint(doc, label);
          lastTypingCheckpoint.current = now;
        }
      } else {
        checkpoint(doc, label);
        lastTypingCheckpoint.current = 0;
      }
      setDoc(updater);
    },
    [checkpoint, doc]
  );

  function updateFrontmatter(
    patch: Partial<ArticleDocument['frontmatter']>,
    label = 'Edit metadata',
    typing = true
  ) {
    edit(label, (prev) => ({ ...prev, frontmatter: { ...prev.frontmatter, ...patch } }), { typing });
  }

  function setCover(url: string | undefined) {
    updateFrontmatter({ image: url || undefined }, 'Change cover image', false);
  }

  function insertAtCursor(text: string) {
    const el = bodyRef.current;
    edit('Insert into body', (prev) => {
      const start = el ? el.selectionStart : prev.body.length;
      const end = el ? el.selectionEnd : prev.body.length;
      const before = prev.body.slice(0, start);
      const after = prev.body.slice(end);
      const pre = before && !before.endsWith('\n') ? '\n\n' : '';
      const post = after && !after.startsWith('\n') ? '\n\n' : '';
      return { ...prev, body: `${before}${pre}${text}${post}${after}` };
    });
  }

  function doUndo() {
    const top = stack[stack.length - 1];
    if (!top) return;
    undo();
    setDoc((prev) => ({
      ...top.snapshot,
      // never let an undo flip location/slug out from under the server
      slug: prev.slug,
      location: prev.location
    }));
    setMessage(`Undid: ${top.label}`);
    setError(null);
  }

  async function persist(target: ArticleDocument) {
    const res = await fetch('/api/articles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(target)
    });
    const data = await res.json();
    return { res, data };
  }

  async function save() {
    setError(null);
    setMessage(null);
    checkpoint(doc, 'Before save');
    const { res, data } = await persist(doc);
    if (!res.ok) {
      setError(data.error || 'Save failed');
      return;
    }
    setMessage('Saved');
    startTransition(() => {
      if (isNew) router.push(`/articles/${doc.slug}`);
      else router.refresh();
    });
  }

  const autosave = useCallback(
    async (value: ArticleDocument) => {
      try {
        const { res, data } = await persist(value);
        if (res.ok) {
          setError(null);
          setMessage('Autosaved');
        } else {
          setError(data.error || 'Autosave failed');
        }
      } catch {
        setError('Autosave failed');
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  useAutosave(doc, autosave, {
    delayMs: 1500,
    enabled: doc.location === 'drafts' && !isNew && Boolean(doc.slug)
  });

  async function publish() {
    setError(null);
    checkpoint(doc, 'Before publish');
    // flush latest edits so publish moves the current content
    if (!isNew) {
      const saved = await persist(doc);
      if (!saved.res.ok) {
        setError(saved.data.error || 'Save before publish failed');
        return;
      }
    }
    const res = await fetch(`/api/articles/${doc.slug}/publish`, { method: 'POST' });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Publish failed');
      return;
    }
    setDoc(data.article);
    setMessage('Published to articles/');
    router.refresh();
  }

  async function unpublish() {
    setError(null);
    const res = await fetch(`/api/articles/${doc.slug}/unpublish`, { method: 'POST' });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Unpublish failed');
      return;
    }
    setDoc(data.article);
    setMessage('Moved to drafts/');
    router.refresh();
  }

  async function duplicate() {
    setError(null);
    setMessage(null);
    const res = await fetch(`/api/articles/${doc.slug}/duplicate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Duplicate failed');
      return;
    }
    const newSlug: string = data.article?.slug ?? `${doc.slug}-copy`;
    setMessage(`Duplicated as ${newSlug}`);
    router.push(`/articles/${newSlug}`);
  }

  async function remove() {
    if (!confirm(`Delete article "${doc.slug}"?`)) return;
    const res = await fetch(`/api/articles/${doc.slug}`, { method: 'DELETE' });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || 'Delete failed');
      return;
    }
    router.push('/articles');
  }

  function onCoverDrop(e: React.DragEvent) {
    e.preventDefault();
    setCoverOver(false);
    const url = readDroppedUrl(e.dataTransfer);
    if (url) setCover(url);
  }

  function onBodyDrop(e: React.DragEvent) {
    e.preventDefault();
    setBodyOver(false);
    const url = readDroppedUrl(e.dataTransfer);
    if (!url) return;
    insertAtCursor(`![${altFromUrl(url)}](${url})`);
  }

  function hasDroppable(e: React.DragEvent) {
    const types = Array.from(e.dataTransfer.types || []);
    return types.includes(MEDIA_MIME) || types.includes('text/plain');
  }

  const coverUrl = doc.frontmatter.image;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <ModeTabs mode={mode} onChange={setMode} />
        <button
          type="button"
          onClick={doUndo}
          disabled={!canUndo}
          className="rounded-md border border-ink-200 bg-white px-3 py-1.5 text-sm font-semibold disabled:opacity-40"
          title={canUndo ? `Undo: ${stack[stack.length - 1]?.label}` : 'Nothing to undo'}
        >
          Undo
        </button>
      </div>

      {error ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p> : null}
      {message ? (
        <p className="rounded-md bg-accent-soft px-3 py-2 text-sm text-accent-dark">{message}</p>
      ) : null}

      {issues.length ? (
        <ul className="flex flex-wrap gap-2" aria-label="Validation">
          {issues.map((issue) => (
            <li
              key={issue.message}
              className={
                issue.severity === 'warn'
                  ? 'rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900'
                  : 'rounded-full bg-ink-100 px-3 py-1 text-xs font-semibold text-ink-700'
              }
            >
              {issue.severity === 'warn' ? 'Warn' : 'Info'}: {issue.message}
            </li>
          ))}
        </ul>
      ) : null}

      {mode === 'edit' ? (
        <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
          <div className="space-y-3 rounded-xl border border-ink-200 bg-white p-4">
            <Field label="Title">
              <input
                className="w-full rounded-md border border-ink-200 px-3 py-2"
                value={doc.frontmatter.title}
                onChange={(e) => updateFrontmatter({ title: e.target.value }, 'Edit title')}
              />
            </Field>

            <div className="space-y-1 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium text-ink-800">Body (MDX)</span>
                <div className="flex flex-wrap gap-1">
                  {MDX_EMBED_CATALOG.map((embed) => (
                    <button
                      key={embed.id}
                      type="button"
                      title={embed.description}
                      className="rounded border border-ink-200 bg-ink-50 px-2 py-1 text-xs font-semibold"
                      onClick={() =>
                        edit(`Insert ${embed.label}`, (prev) => ({
                          ...prev,
                          body: insertMdxEmbed(prev.body, embed.tag)
                        }))
                      }
                    >
                      Insert {embed.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid gap-3 xl:grid-cols-2">
                <textarea
                  ref={bodyRef}
                  className={`min-h-[360px] w-full rounded-md border px-3 py-2 font-mono text-sm ${
                    bodyOver ? 'border-accent bg-accent-soft/40' : 'border-ink-200'
                  }`}
                  value={doc.body}
                  onChange={(e) =>
                    edit('Edit body', (prev) => ({ ...prev, body: e.target.value }), { typing: true })
                  }
                  onDragOver={(e) => {
                    if (hasDroppable(e)) {
                      e.preventDefault();
                      setBodyOver(true);
                    }
                  }}
                  onDragLeave={() => setBodyOver(false)}
                  onDrop={onBodyDrop}
                />
                <div className="min-h-[360px] overflow-auto rounded-md border border-ink-100 bg-ink-50/50 p-4">
                  <ArticlePreview doc={doc} compact />
                </div>
              </div>
              <p className="text-xs text-ink-700">
                Drag an image from the Media library onto the body to insert{' '}
                <code className="font-mono">![alt](url)</code>. Interactive demos are MDX components
                registered on the site in{' '}
                <code className="font-mono">components/mdx/mdx-components.tsx</code>; AWED only places
                the MDX tag. The preview shows raw text — live MDX components need the site preview.
              </p>
            </div>
          </div>

          <aside className="space-y-3 rounded-xl border border-ink-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-700/70">Inspector</p>

            <div className="space-y-2 text-sm">
              <span className="font-medium text-ink-800">Cover image</span>
              <div
                onDragOver={(e) => {
                  if (hasDroppable(e)) {
                    e.preventDefault();
                    setCoverOver(true);
                  }
                }}
                onDragLeave={() => setCoverOver(false)}
                onDrop={onCoverDrop}
                className={`flex min-h-[96px] items-center justify-center rounded-md border border-dashed p-2 text-center text-xs ${
                  coverOver ? 'border-accent bg-accent-soft/40' : 'border-ink-200 bg-ink-50/50'
                }`}
              >
                {coverUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={coverUrl} alt="Cover" className="max-h-28 max-w-full object-contain" />
                ) : (
                  <span className="text-ink-700">Drop an image from the library here</span>
                )}
              </div>
              <select
                className="w-full rounded-md border border-ink-200 px-2 py-2 text-sm"
                value={coverUrl && media.some((m) => m.urlPath === coverUrl) ? coverUrl : ''}
                onChange={(e) => setCover(e.target.value || undefined)}
              >
                <option value="">{coverUrl && !media.some((m) => m.urlPath === coverUrl) ? coverUrl : 'Select from media…'}</option>
                {media.map((m) => (
                  <option key={m.path} value={m.urlPath}>
                    {m.fileName}
                  </option>
                ))}
              </select>
              {coverUrl ? (
                <button
                  type="button"
                  className="rounded border border-ink-200 px-2 py-1 text-xs font-semibold"
                  onClick={() => setCover(undefined)}
                >
                  Clear cover
                </button>
              ) : null}
            </div>

            <Field label="Slug">
              <input
                className="w-full rounded-md border border-ink-200 px-3 py-2 font-mono text-sm"
                value={doc.slug}
                disabled={!isNew}
                onChange={(e) => setDoc((prev) => ({ ...prev, slug: e.target.value }))}
              />
            </Field>
            <Field label="Date">
              <input
                className="w-full rounded-md border border-ink-200 px-3 py-2"
                value={doc.frontmatter.date}
                onChange={(e) => updateFrontmatter({ date: e.target.value }, 'Edit date')}
              />
            </Field>
            <Field label="Summary / TL;DR seed">
              <textarea
                className="min-h-[96px] w-full rounded-md border border-ink-200 px-3 py-2 text-sm"
                value={doc.frontmatter.summary}
                onChange={(e) => updateFrontmatter({ summary: e.target.value }, 'Edit summary')}
              />
            </Field>
            <Field label="Tags (comma-separated)">
              <input
                className="w-full rounded-md border border-ink-200 px-3 py-2"
                value={(doc.frontmatter.tags || []).join(', ')}
                onChange={(e) =>
                  updateFrontmatter(
                    {
                      tags: e.target.value
                        .split(',')
                        .map((t) => t.trim())
                        .filter(Boolean)
                    },
                    'Edit tags'
                  )
                }
              />
            </Field>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={doc.frontmatter.listed !== false}
                onChange={(e) => updateFrontmatter({ listed: e.target.checked }, 'Toggle listed', false)}
              />
              Listed in indexes
            </label>
            <p className="text-xs text-ink-700/70">Location: {doc.location}</p>
          </aside>
        </div>
      ) : null}

      {mode === 'preview' ? (
        <div className="rounded-xl border border-ink-200 bg-white p-6">
          <p className="text-xs uppercase tracking-wide text-ink-700/70">Preview</p>
          <ArticlePreview doc={doc} />
        </div>
      ) : null}

      {mode === 'document' ? (
        <pre className="overflow-auto rounded-xl border border-ink-200 bg-ink-900 p-4 text-xs text-ink-50">
          {JSON.stringify(doc, null, 2)}
        </pre>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={save}
          className="rounded-md bg-accent px-3 py-2 text-sm font-semibold text-white hover:bg-accent-dark disabled:opacity-60"
        >
          Save
        </button>
        {doc.location === 'drafts' ? (
          <button
            type="button"
            onClick={publish}
            className="rounded-md border border-ink-200 bg-white px-3 py-2 text-sm font-semibold"
          >
            Publish
          </button>
        ) : (
          <button
            type="button"
            onClick={unpublish}
            className="rounded-md border border-ink-200 bg-white px-3 py-2 text-sm font-semibold"
          >
            Unpublish
          </button>
        )}
        {!isNew ? (
          <>
            <button
              type="button"
              onClick={duplicate}
              className="rounded-md border border-ink-200 bg-white px-3 py-2 text-sm font-semibold"
            >
              Duplicate
            </button>
            <button
              type="button"
              onClick={remove}
              className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-800"
            >
              Delete
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
}

function ArticlePreview({ doc, compact }: { doc: ArticleDocument; compact?: boolean }) {
  return (
    <div>
      {doc.frontmatter.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={doc.frontmatter.image}
          alt=""
          className="mb-3 max-h-48 w-full rounded-md object-cover"
        />
      ) : null}
      <h2 className={`font-display font-semibold ${compact ? 'text-xl' : 'mt-2 text-2xl'}`}>
        {doc.frontmatter.title || 'Untitled'}
      </h2>
      {doc.frontmatter.summary ? (
        <p className="mt-2 text-sm text-ink-700">{doc.frontmatter.summary}</p>
      ) : null}
      <pre className="mt-4 whitespace-pre-wrap font-sans text-sm leading-relaxed text-ink-800">
        {doc.body}
      </pre>
      <p className="mt-4 text-xs italic text-ink-700/70">
        Plain-text preview. Live MDX components (e.g. demos) render only in the site preview.
      </p>
    </div>
  );
}

function ModeTabs({
  mode,
  onChange
}: {
  mode: 'edit' | 'preview' | 'document';
  onChange: (m: 'edit' | 'preview' | 'document') => void;
}) {
  const tabs = [
    { id: 'edit' as const, label: 'Edit' },
    { id: 'preview' as const, label: 'Preview' },
    { id: 'document' as const, label: 'Document' }
  ];
  return (
    <div className="inline-flex rounded-lg border border-ink-200 bg-white p-1 text-sm">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={
            mode === tab.id
              ? 'rounded-md bg-ink-900 px-3 py-1.5 font-semibold text-white'
              : 'rounded-md px-3 py-1.5 text-ink-700'
          }
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1 text-sm">
      <span className="font-medium text-ink-800">{label}</span>
      {children}
    </label>
  );
}
