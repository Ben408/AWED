'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { slugifyTitle } from '@/lib/studio/tsx-scaffold';

export function CreateArticleWizard() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [summary, setSummary] = useState('');
  const [tags, setTags] = useState('');
  const [image, setImage] = useState('');
  const [media, setMedia] = useState<{ urlPath: string; fileName: string }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const suggestedSlug = useMemo(() => slugifyTitle(title || 'new-article'), [title]);

  async function loadMedia() {
    const res = await fetch('/api/media');
    const data = await res.json();
    if (res.ok) setMedia(data.media || []);
  }

  async function create() {
    setBusy(true);
    setError(null);
    try {
      const finalSlug = (slug || suggestedSlug).trim();
      const today = new Date().toISOString().slice(0, 10);
      const doc = {
        slug: finalSlug,
        location: 'drafts',
        frontmatter: {
          title: title.trim(),
          date: today,
          summary: summary.trim() || 'Draft summary',
          tags: tags
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean),
          image: image || undefined,
          status: 'draft',
          listed: true
        },
        body: `# ${title.trim()}\n\n## TL;DR\n\n${summary.trim() || ''}\n\n`
      };
      const res = await fetch('/api/articles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(doc)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Create failed');
      router.push(`/articles/${finalSlug}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Create failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div className="flex gap-2 text-xs font-semibold uppercase tracking-wide text-ink-700">
        <span className={step === 1 ? 'text-accent' : ''}>1 · Title</span>
        <span>→</span>
        <span className={step === 2 ? 'text-accent' : ''}>2 · Meta</span>
        <span>→</span>
        <span className={step === 3 ? 'text-accent' : ''}>3 · Cover</span>
      </div>

      {error ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p> : null}

      {step === 1 ? (
        <div className="space-y-4 rounded-xl border border-ink-200 bg-white p-5">
          <h2 className="font-display text-xl font-semibold">Name the article</h2>
          <label className="block text-sm">
            <span className="font-medium">Title</span>
            <input
              className="mt-1 w-full rounded-md border border-ink-200 px-3 py-2"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium">Slug</span>
            <input
              className="mt-1 w-full rounded-md border border-ink-200 px-3 py-2 font-mono text-sm"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder={suggestedSlug}
            />
          </label>
          <button
            type="button"
            disabled={!title.trim()}
            className="rounded-md bg-accent px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
            onClick={() => {
              if (!slug) setSlug(suggestedSlug);
              setStep(2);
            }}
          >
            Continue
          </button>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="space-y-4 rounded-xl border border-ink-200 bg-white p-5">
          <h2 className="font-display text-xl font-semibold">Summary & tags</h2>
          <label className="block text-sm">
            <span className="font-medium">Summary</span>
            <textarea
              className="mt-1 min-h-[96px] w-full rounded-md border border-ink-200 px-3 py-2"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium">Tags (comma-separated)</span>
            <input
              className="mt-1 w-full rounded-md border border-ink-200 px-3 py-2"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
            />
          </label>
          <div className="flex gap-2">
            <button type="button" className="rounded-md border border-ink-200 px-3 py-2 text-sm" onClick={() => setStep(1)}>
              Back
            </button>
            <button
              type="button"
              className="rounded-md bg-accent px-3 py-2 text-sm font-semibold text-white"
              onClick={() => {
                void loadMedia();
                setStep(3);
              }}
            >
              Continue
            </button>
          </div>
        </div>
      ) : null}

      {step === 3 ? (
        <div className="space-y-4 rounded-xl border border-ink-200 bg-white p-5">
          <h2 className="font-display text-xl font-semibold">Cover image (optional)</h2>
          <select
            className="w-full rounded-md border border-ink-200 px-3 py-2 text-sm"
            value={image}
            onChange={(e) => setImage(e.target.value)}
          >
            <option value="">No cover yet</option>
            {media.map((m) => (
              <option key={m.urlPath} value={m.urlPath}>
                {m.fileName}
              </option>
            ))}
          </select>
          <p className="text-xs text-ink-700">You can also drag an image onto the article editor later.</p>
          <div className="flex gap-2">
            <button type="button" className="rounded-md border border-ink-200 px-3 py-2 text-sm" onClick={() => setStep(2)}>
              Back
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={create}
              className="rounded-md bg-accent px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {busy ? 'Creating…' : 'Create draft'}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
