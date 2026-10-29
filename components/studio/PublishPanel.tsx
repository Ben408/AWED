'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { PublishResult } from '@/lib/store/fs-site-store';

export function PublishPanel({ initial }: { initial: PublishResult }) {
  const router = useRouter();
  const [status, setStatus] = useState(initial);
  const [message, setMessage] = useState('Publish checkpoint from FWP');
  const [error, setError] = useState<string | null>(null);

  async function publish() {
    setError(null);
    const res = await fetch('/api/publish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message })
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Publish failed');
      return;
    }
    setStatus(data.status);
    router.refresh();
  }

  return (
    <div className="space-y-4 rounded-xl border border-ink-200 bg-white p-5">
      <div>
        <p className="text-xs uppercase tracking-wide text-ink-700/70">Last status</p>
        <p className="mt-1 text-ink-900">{status.message}</p>
        {status.at && status.at !== new Date(0).toISOString() ? (
          <p className="mt-1 text-xs text-ink-700/70">{new Date(status.at).toLocaleString()}</p>
        ) : null}
      </div>
      <label className="block text-sm">
        <span className="font-medium">Checkpoint note</span>
        <input
          className="mt-1 w-full rounded-md border border-ink-200 px-3 py-2"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
      </label>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      <button
        type="button"
        onClick={publish}
        className="rounded-md bg-accent px-3 py-2 text-sm font-semibold text-white hover:bg-accent-dark"
      >
        Record publish checkpoint
      </button>
    </div>
  );
}
