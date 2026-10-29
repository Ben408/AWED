'use client';

import { useEffect, useMemo, useState } from 'react';
import type { PageDocument } from '@/lib/schema/page';

type AgentSurface = {
  url: string;
  title?: string;
  metaDescription?: string;
  jsonLd: unknown[];
  warnings: string[];
};

type PageLivePreviewProps = {
  page: PageDocument;
  previewBaseUrl?: string;
};

/**
 * Human view = live site iframe (real TSX render).
 * Agent view = labeled machine surfaces from page doc + JSON-LD scraped from that HTML.
 */
export function PageLivePreview({ page, previewBaseUrl }: PageLivePreviewProps) {
  const liveUrl = useMemo(() => {
    if (!previewBaseUrl) return null;
    const base = previewBaseUrl.replace(/\/$/, '');
    const route = page.route === '/' ? '' : page.route;
    return `${base}${route}`;
  }, [previewBaseUrl, page.route]);

  const [surface, setSurface] = useState<AgentSurface | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    if (!liveUrl) return;
    let cancelled = false;
    setFetchError(null);
    fetch(`/api/preview/agent-surface?url=${encodeURIComponent(liveUrl)}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to load agent surface');
        if (!cancelled) setSurface(data.surface);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setSurface(null);
          setFetchError(err instanceof Error ? err.message : 'Failed to load agent surface');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [liveUrl]);

  return (
    <div className="space-y-4">
      <p className="text-sm text-ink-700">
        Preview shows the <strong>live site render</strong> (human HTML) plus a marked{' '}
        <strong>agent / machine</strong> panel. Edit mode still uses AWED page documents—which for
        imported TSX pages are metadata + stubs until content is migrated into blocks.
      </p>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.8fr)]">
        <section className="overflow-hidden rounded-xl border-2 border-sky-600 bg-white">
          <header className="flex items-center justify-between gap-2 border-b border-sky-200 bg-sky-50 px-3 py-2">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-sky-900">
                Human view
              </p>
              <p className="text-xs text-sky-900/80">As rendered in the browser for people</p>
            </div>
            {liveUrl ? (
              <a
                href={liveUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-semibold text-sky-900"
              >
                Open tab
              </a>
            ) : null}
          </header>
          {liveUrl ? (
            <iframe
              title={`Human preview ${page.route}`}
              src={liveUrl}
              className="h-[70vh] w-full bg-white"
            />
          ) : (
            <div className="p-6 text-sm text-ink-700">
              No preview base URL configured for this project. Set{' '}
              <code className="font-mono">previewBaseUrl</code> in{' '}
              <code className="font-mono">data/projects.json</code> (e.g.{' '}
              <code className="font-mono">http://localhost:3001</code>).
            </div>
          )}
        </section>

        <section className="overflow-hidden rounded-xl border-2 border-violet-700 bg-white">
          <header className="border-b border-violet-200 bg-violet-50 px-3 py-2">
            <p className="text-[11px] font-bold uppercase tracking-wide text-violet-950">
              Agent / machine view
            </p>
            <p className="text-xs text-violet-950/80">
              Not the layout people see—structured facts bots and agents can use
            </p>
          </header>
          <div className="max-h-[70vh] space-y-4 overflow-auto p-3 text-sm">
            <AgentBlock title="AWED page document">
              <Field label="Route" value={page.route} />
              <Field label="Title" value={page.metadata.title} />
              <Field label="Description" value={page.metadata.description} />
              <Field label="TL;DR" value={page.agent.tldr || '—'} />
              <Field
                label="Facts"
                value={page.agent.facts.length ? page.agent.facts.join('\n') : '—'}
              />
              {page.source?.path ? (
                <Field label="Source TSX" value={page.source.path} />
              ) : null}
            </AgentBlock>

            <AgentBlock title="From live HTML">
              {fetchError ? <p className="text-red-800">{fetchError}</p> : null}
              {!fetchError && !surface ? (
                <p className="text-ink-700">Loading machine signals…</p>
              ) : null}
              {surface ? (
                <>
                  <Field label="Document title" value={surface.title || '—'} />
                  <Field label="Meta description" value={surface.metaDescription || '—'} />
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-violet-900/70">
                      JSON-LD
                    </p>
                    <pre className="mt-1 overflow-auto rounded-md bg-ink-950 p-2 text-[11px] text-ink-50">
                      {surface.jsonLd.length
                        ? JSON.stringify(surface.jsonLd, null, 2)
                        : 'None found'}
                    </pre>
                  </div>
                  {surface.warnings.length ? (
                    <ul className="list-disc pl-4 text-xs text-amber-900">
                      {surface.warnings.map((w) => (
                        <li key={w}>{w}</li>
                      ))}
                    </ul>
                  ) : null}
                </>
              ) : null}
            </AgentBlock>
          </div>
        </section>
      </div>
    </div>
  );
}

function AgentBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-violet-100 bg-violet-50/50 p-3">
      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-violet-950">{title}</p>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold text-violet-900/70">{label}</p>
      <p className="whitespace-pre-wrap text-ink-900">{value}</p>
    </div>
  );
}
