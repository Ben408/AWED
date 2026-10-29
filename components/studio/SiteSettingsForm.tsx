'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { SiteDocument } from '@/lib/schema/site';

export function SiteSettingsForm({ initial }: { initial: SiteDocument }) {
  const router = useRouter();
  const [site, setSite] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function save() {
    setError(null);
    setMessage(null);
    const res = await fetch('/api/site', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(site)
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Save failed');
      return;
    }
    setMessage('Site settings saved');
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {error ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p> : null}
      {message ? (
        <p className="rounded-md bg-accent-soft px-3 py-2 text-sm text-accent-dark">{message}</p>
      ) : null}

      <div className="grid gap-4 rounded-xl border border-ink-200 bg-white p-4 md:grid-cols-2">
        <label className="text-sm">
          <span className="font-medium">Site name</span>
          <input
            className="mt-1 w-full rounded-md border border-ink-200 px-3 py-2"
            value={site.name}
            onChange={(e) => setSite({ ...site, name: e.target.value })}
          />
        </label>
        <label className="text-sm">
          <span className="font-medium">Brand</span>
          <input
            className="mt-1 w-full rounded-md border border-ink-200 px-3 py-2"
            value={site.brand}
            onChange={(e) => setSite({ ...site, brand: e.target.value })}
          />
        </label>
        <label className="text-sm md:col-span-2">
          <span className="font-medium">Description</span>
          <textarea
            className="mt-1 min-h-[80px] w-full rounded-md border border-ink-200 px-3 py-2"
            value={site.description}
            onChange={(e) => setSite({ ...site, description: e.target.value })}
          />
        </label>
        <label className="text-sm md:col-span-2">
          <span className="font-medium">Agent summary</span>
          <textarea
            className="mt-1 min-h-[80px] w-full rounded-md border border-ink-200 px-3 py-2"
            value={site.agent.summary}
            onChange={(e) =>
              setSite({ ...site, agent: { ...site.agent, summary: e.target.value } })
            }
          />
        </label>
        <label className="text-sm md:col-span-2">
          <span className="font-medium">Agent facts (one per line)</span>
          <textarea
            className="mt-1 min-h-[100px] w-full rounded-md border border-ink-200 px-3 py-2"
            value={site.agent.facts.join('\n')}
            onChange={(e) =>
              setSite({
                ...site,
                agent: {
                  ...site.agent,
                  facts: e.target.value
                    .split('\n')
                    .map((line) => line.trim())
                    .filter(Boolean)
                }
              })
            }
          />
        </label>
      </div>

      <button
        type="button"
        onClick={save}
        className="rounded-md bg-accent px-3 py-2 text-sm font-semibold text-white hover:bg-accent-dark"
      >
        Save site settings
      </button>
    </div>
  );
}
