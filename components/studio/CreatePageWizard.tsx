'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { slugifyTitle } from '@/lib/studio/tsx-scaffold';
import { EmptyState } from '@/lib/studio/empty-state';

export function CreatePageWizard() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [title, setTitle] = useState('');
  const [route, setRoute] = useState('');
  const [description, setDescription] = useState('');
  const [lead, setLead] = useState('');
  const [addToNav, setAddToNav] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const suggestedRoute = useMemo(() => `/${slugifyTitle(title || 'new-page')}`, [title]);

  async function create() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/pages/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          route: (route || suggestedRoute).trim(),
          description: description.trim(),
          lead: lead.trim(),
          addToNav
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Create failed');
      router.push(`/pages/${data.page.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Create failed');
    } finally {
      setBusy(false);
    }
  }

  if (!title && step === 1) {
    // keep form; empty state only before typing is unnecessary
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div className="flex gap-2 text-xs font-semibold uppercase tracking-wide text-ink-700">
        <span className={step === 1 ? 'text-accent' : ''}>1 · Name</span>
        <span>→</span>
        <span className={step === 2 ? 'text-accent' : ''}>2 · Details</span>
        <span>→</span>
        <span className={step === 3 ? 'text-accent' : ''}>3 · Create</span>
      </div>

      {error ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p> : null}

      {step === 1 ? (
        <div className="space-y-4 rounded-xl border border-ink-200 bg-white p-5">
          <h2 className="font-display text-xl font-semibold">What is this page called?</h2>
          <label className="block text-sm">
            <span className="font-medium">Title</span>
            <input
              className="mt-1 w-full rounded-md border border-ink-200 px-3 py-2"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Speaking"
              autoFocus
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium">URL path</span>
            <input
              className="mt-1 w-full rounded-md border border-ink-200 px-3 py-2 font-mono text-sm"
              value={route}
              onChange={(e) => setRoute(e.target.value)}
              placeholder={suggestedRoute}
            />
          </label>
          <button
            type="button"
            disabled={!title.trim()}
            onClick={() => {
              if (!route) setRoute(suggestedRoute);
              setStep(2);
            }}
            className="rounded-md bg-accent px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            Continue
          </button>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="space-y-4 rounded-xl border border-ink-200 bg-white p-5">
          <h2 className="font-display text-xl font-semibold">A few details</h2>
          <label className="block text-sm">
            <span className="font-medium">Meta description</span>
            <textarea
              className="mt-1 min-h-[72px] w-full rounded-md border border-ink-200 px-3 py-2"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium">Lead paragraph</span>
            <textarea
              className="mt-1 min-h-[96px] w-full rounded-md border border-ink-200 px-3 py-2"
              value={lead}
              onChange={(e) => setLead(e.target.value)}
              placeholder="Opening copy visitors see under the heading"
            />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={addToNav} onChange={(e) => setAddToNav(e.target.checked)} />
            Add to site navigation
          </label>
          <div className="flex gap-2">
            <button type="button" className="rounded-md border border-ink-200 px-3 py-2 text-sm" onClick={() => setStep(1)}>
              Back
            </button>
            <button
              type="button"
              className="rounded-md bg-accent px-3 py-2 text-sm font-semibold text-white"
              onClick={() => setStep(3)}
            >
              Continue
            </button>
          </div>
        </div>
      ) : null}

      {step === 3 ? (
        <div className="space-y-4 rounded-xl border border-ink-200 bg-white p-5">
          <h2 className="font-display text-xl font-semibold">Ready to create</h2>
          <EmptyState
            title={title}
            body={`Creates ${route || suggestedRoute}/page.tsx with editable heading and lead${
              addToNav ? ', and adds it to the menu' : ''
            }.`}
          />
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
              {busy ? 'Creating…' : 'Create page'}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
