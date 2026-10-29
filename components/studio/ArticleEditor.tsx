'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import type { ArticleDocument } from '@/lib/schema/article';

type ArticleEditorProps = {
  initial: ArticleDocument;
  isNew?: boolean;
};

export function ArticleEditor({ initial, isNew }: ArticleEditorProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [doc, setDoc] = useState(initial);
  const [mode, setMode] = useState<'edit' | 'preview' | 'document'>('edit');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  function updateFrontmatter(patch: Partial<ArticleDocument['frontmatter']>) {
    setDoc((prev) => ({ ...prev, frontmatter: { ...prev.frontmatter, ...patch } }));
  }

  async function save() {
    setError(null);
    setMessage(null);
    const res = await fetch('/api/articles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(doc)
    });
    const data = await res.json();
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

  async function publish() {
    setError(null);
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

  return (
    <div className="space-y-4">
      <ModeTabs mode={mode} onChange={setMode} />

      {error ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p> : null}
      {message ? (
        <p className="rounded-md bg-accent-soft px-3 py-2 text-sm text-accent-dark">{message}</p>
      ) : null}

      {mode === 'edit' ? (
        <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
          <div className="space-y-3 rounded-xl border border-ink-200 bg-white p-4">
            <Field label="Title">
              <input
                className="w-full rounded-md border border-ink-200 px-3 py-2"
                value={doc.frontmatter.title}
                onChange={(e) => updateFrontmatter({ title: e.target.value })}
              />
            </Field>
            <Field label="Body (MDX)">
              <textarea
                className="min-h-[320px] w-full rounded-md border border-ink-200 px-3 py-2 font-mono text-sm"
                value={doc.body}
                onChange={(e) => setDoc((prev) => ({ ...prev, body: e.target.value }))}
              />
            </Field>
          </div>
          <aside className="space-y-3 rounded-xl border border-ink-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-700/70">Inspector</p>
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
                onChange={(e) => updateFrontmatter({ date: e.target.value })}
              />
            </Field>
            <Field label="Summary / TL;DR seed">
              <textarea
                className="min-h-[96px] w-full rounded-md border border-ink-200 px-3 py-2 text-sm"
                value={doc.frontmatter.summary}
                onChange={(e) => updateFrontmatter({ summary: e.target.value })}
              />
            </Field>
            <Field label="Tags (comma-separated)">
              <input
                className="w-full rounded-md border border-ink-200 px-3 py-2"
                value={(doc.frontmatter.tags || []).join(', ')}
                onChange={(e) =>
                  updateFrontmatter({
                    tags: e.target.value
                      .split(',')
                      .map((t) => t.trim())
                      .filter(Boolean)
                  })
                }
              />
            </Field>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={doc.frontmatter.listed !== false}
                onChange={(e) => updateFrontmatter({ listed: e.target.checked })}
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
          <h2 className="mt-2 font-display text-2xl font-semibold">{doc.frontmatter.title}</h2>
          <p className="mt-2 text-sm text-ink-700">{doc.frontmatter.summary}</p>
          <pre className="mt-6 whitespace-pre-wrap font-sans text-sm leading-relaxed text-ink-800">
            {doc.body}
          </pre>
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
          <button
            type="button"
            onClick={remove}
            className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-800"
          >
            Delete
          </button>
        ) : null}
      </div>
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
