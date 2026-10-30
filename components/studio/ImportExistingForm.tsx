'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

type ScanSummary = {
  root: string;
  kind: string;
  siteName?: string;
  articleCount: number;
  draftCount: number;
  mediaCount: number;
  appPages: { route: string; sourcePath: string; absolutePath?: string }[];
  files: { path: string; role: string; absolutePath?: string; urlPath?: string }[];
  warnings: string[];
  hasManifest: boolean;
};

const DEFAULT_BC_PATH = 'C:/Users/bjcor/Desktop/website/website';

export function ImportExistingForm() {
  const router = useRouter();
  const [rootPath, setRootPath] = useState(DEFAULT_BC_PATH);
  const [projectId, setProjectId] = useState('bencornelius');
  const [projectName, setProjectName] = useState('bencornelius.com');
  const [overwrite, setOverwrite] = useState(true);
  const [scan, setScan] = useState<ScanSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function dryRun() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch('/api/projects/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rootPath, dryRun: true })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Scan failed');
      setScan(data.scan);
      setMessage(
        `Scan OK — ${data.scan.appPages.length} page files, ${data.scan.articleCount} articles, ${data.scan.mediaCount} art files (paths only).`
      );
      if (data.scan.siteName) setProjectName(data.scan.siteName);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Scan failed');
    } finally {
      setBusy(false);
    }
  }

  async function runImport() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch('/api/projects/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rootPath,
          projectId,
          projectName,
          publicUrl: 'https://www.bencornelius.com',
          previewBaseUrl: 'http://localhost:3001',
          overwrite,
          dryRun: false
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Import failed');
      setMessage(
        `Attached ${data.result.project.name}: registered ${data.result.scan.files.length} files in .awed/manifest.yaml` +
          (data.result.wroteSiteYaml ? ', minimal site.yaml' : '') +
          `, ${data.result.pagesWritten} page path records.`
      );
      router.refresh();
      router.push('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      {error ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p> : null}
      {message ? (
        <p className="rounded-md bg-accent-soft px-3 py-2 text-sm text-accent-dark">{message}</p>
      ) : null}

      <div className="grid gap-4 rounded-xl border border-ink-200 bg-white p-4 md:grid-cols-2">
        <label className="text-sm md:col-span-2">
          <span className="font-medium">Local project root</span>
          <input
            className="mt-1 w-full rounded-md border border-ink-200 px-3 py-2 font-mono text-sm"
            value={rootPath}
            onChange={(e) => setRootPath(e.target.value)}
          />
          <span className="mt-1 block text-xs text-ink-700">
            Import registers <strong>full file paths</strong> (pages, articles, art). It does not
            extract page copy into AWED blocks.
          </span>
        </label>
        <label className="text-sm">
          <span className="font-medium">AWED project id</span>
          <input
            className="mt-1 w-full rounded-md border border-ink-200 px-3 py-2 font-mono text-sm"
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
          />
        </label>
        <label className="text-sm">
          <span className="font-medium">Display name</span>
          <input
            className="mt-1 w-full rounded-md border border-ink-200 px-3 py-2"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
          />
        </label>
        <label className="flex items-center gap-2 text-sm md:col-span-2">
          <input type="checkbox" checked={overwrite} onChange={(e) => setOverwrite(e.target.checked)} />
          Overwrite existing manifest / page path records
        </label>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={dryRun}
          className="rounded-md border border-ink-200 bg-white px-3 py-2 text-sm font-semibold disabled:opacity-60"
        >
          Scan project
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={runImport}
          className="rounded-md bg-accent px-3 py-2 text-sm font-semibold text-white hover:bg-accent-dark disabled:opacity-60"
        >
          Import &amp; attach
        </button>
      </div>

      {scan ? (
        <div className="rounded-xl border border-ink-200 bg-white p-4 text-sm">
          <h2 className="font-display text-lg font-semibold">Path registry preview</h2>
          <p className="mt-1 text-ink-700">
            {scan.siteName || 'Unnamed'} · {scan.kind} · {scan.root}
          </p>
          <p className="mt-2">
            Files: {scan.files.length} · Pages: {scan.appPages.length} · Articles:{' '}
            {scan.articleCount} · Drafts: {scan.draftCount} · Art: {scan.mediaCount}
          </p>
          <ul className="mt-3 max-h-72 overflow-auto divide-y divide-ink-100 font-mono text-xs">
            {scan.files.slice(0, 80).map((file) => (
              <li key={`${file.role}-${file.path}`} className="flex justify-between gap-3 py-1.5">
                <span className="text-ink-700">{file.role}</span>
                <span className="truncate text-right">{file.path}</span>
              </li>
            ))}
            {scan.files.length > 80 ? (
              <li className="py-2 text-ink-700">…and {scan.files.length - 80} more</li>
            ) : null}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
