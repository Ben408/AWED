'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export type MediaItem = {
  path: string;
  urlPath: string;
  fileName: string;
};

export function MediaLibrary({
  initial,
  previewBaseUrl
}: {
  initial: MediaItem[];
  previewBaseUrl?: string;
}) {
  const router = useRouter();
  const [items, setItems] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onUpload(fileList: FileList | null) {
    if (!fileList?.length) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const form = new FormData();
      form.append('file', fileList[0]);
      const res = await fetch('/api/media', { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      setItems((prev) => [data.asset, ...prev]);
      setMessage(`Added ${data.asset.fileName} → ${data.asset.urlPath}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setBusy(false);
    }
  }

  function copyPath(urlPath: string) {
    void navigator.clipboard.writeText(urlPath);
    setMessage(`Copied ${urlPath}`);
  }

  return (
    <div className="space-y-4">
      {error ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p> : null}
      {message ? (
        <p className="rounded-md bg-accent-soft px-3 py-2 text-sm text-accent-dark">{message}</p>
      ) : null}

      <label className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-accent px-3 py-2 text-sm font-semibold text-white hover:bg-accent-dark">
        {busy ? 'Uploading…' : 'Add art file'}
        <input
          type="file"
          accept="image/*"
          className="hidden"
          disabled={busy}
          onChange={(e) => onUpload(e.target.files)}
        />
      </label>
      <p className="text-xs text-ink-700">
        Files save under <code className="font-mono">public/images/library/</code> on the attached
        site. Use <strong>Copy path</strong>, then place an <strong>Image</strong> block on a page
        (or paste the path into an image field).
      </p>

      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => {
          const previewSrc = previewBaseUrl
            ? `${previewBaseUrl.replace(/\/$/, '')}${item.urlPath}`
            : item.urlPath;
          return (
            <li
              key={item.path}
              className="overflow-hidden rounded-xl border border-ink-200 bg-white"
            >
              <div className="flex h-36 items-center justify-center bg-ink-50">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={previewSrc} alt={item.fileName} className="max-h-full max-w-full object-contain" />
              </div>
              <div className="space-y-2 p-3 text-sm">
                <p className="truncate font-medium">{item.fileName}</p>
                <p className="truncate font-mono text-xs text-ink-700">{item.path}</p>
                <p className="truncate font-mono text-xs text-ink-700">{item.urlPath}</p>
                <button
                  type="button"
                  className="rounded border border-ink-200 px-2 py-1 text-xs font-semibold"
                  onClick={() => copyPath(item.urlPath)}
                >
                  Copy path
                </button>
              </div>
            </li>
          );
        })}
        {!items.length ? (
          <li className="rounded-xl border border-dashed border-ink-200 p-6 text-sm text-ink-700 sm:col-span-2 lg:col-span-3">
            No art files found under <code className="font-mono">public/</code> yet.
          </li>
        ) : null}
      </ul>
    </div>
  );
}
