'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState, useTransition } from 'react';
import {
  addRow,
  createBlankRow,
  removeRow,
  resolveArrayLayout,
  updateRowField
} from '@/lib/catalog/array-fields';
import { BLOCK_CATALOG, createBlockInstance, type BlockInstance } from '@/lib/catalog/blocks';
import {
  addToScrapboard,
  loadScrapboard,
  removeFromScrapboard,
  type ScrapItem
} from '@/lib/catalog/scrapboard';
import { PageLivePreview } from '@/components/studio/PageLivePreview';
import type { PageDocument } from '@/lib/schema/page';

type PageEditorProps = {
  initial: PageDocument;
  isNew?: boolean;
  previewBaseUrl?: string;
};

export function PageEditor({ initial, isNew, previewBaseUrl }: PageEditorProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [page, setPage] = useState(initial);
  const [selectedId, setSelectedId] = useState<string | null>(page.blocks[0]?.id ?? null);
  const [mode, setMode] = useState<'edit' | 'preview' | 'document'>('edit');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [scrap, setScrap] = useState<ScrapItem[]>([]);

  useEffect(() => {
    setScrap(loadScrapboard());
  }, []);

  const selected = useMemo(
    () => page.blocks.find((b) => b.id === selectedId) ?? null,
    [page.blocks, selectedId]
  );
  function updateBlock(id: string, props: BlockInstance['props']) {
    setPage((prev) => ({
      ...prev,
      blocks: prev.blocks.map((b) => (b.id === id ? ({ ...b, props } as BlockInstance) : b))
    }));
  }

  function addBlock(type: BlockInstance['type']) {
    const id = `${type}-${Math.random().toString(36).slice(2, 8)}`;
    const block = createBlockInstance(type, id);
    setPage((prev) => ({ ...prev, blocks: [...prev.blocks, block] }));
    setSelectedId(id);
  }

  function removeSelected() {
    if (!selectedId) return;
    setPage((prev) => ({ ...prev, blocks: prev.blocks.filter((b) => b.id !== selectedId) }));
    setSelectedId(null);
  }

  function moveSelected(dir: -1 | 1) {
    if (!selectedId) return;
    setPage((prev) => {
      const index = prev.blocks.findIndex((b) => b.id === selectedId);
      const next = index + dir;
      if (index < 0 || next < 0 || next >= prev.blocks.length) return prev;
      const blocks = [...prev.blocks];
      const [item] = blocks.splice(index, 1);
      blocks.splice(next, 0, item);
      return { ...prev, blocks };
    });
  }

  async function save() {
    setError(null);
    setMessage(null);
    const res = await fetch('/api/pages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(page)
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Save failed');
      return;
    }
    setMessage('Saved page document');
    startTransition(() => {
      if (isNew) router.push(`/pages/${page.id}`);
      else router.refresh();
    });
  }

  async function remove() {
    if (!confirm(`Delete page "${page.id}"?`)) return;
    const res = await fetch(`/api/pages/${page.id}`, { method: 'DELETE' });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || 'Delete failed');
      return;
    }
    router.push('/pages');
  }

  return (
    <div className="space-y-4">
      <div className="inline-flex rounded-lg border border-ink-200 bg-white p-1 text-sm">
        {(
          [
            ['edit', 'Edit'],
            ['preview', 'Preview'],
            ['document', 'Document']
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setMode(id)}
            className={
              mode === id
                ? 'rounded-md bg-ink-900 px-3 py-1.5 font-semibold text-white'
                : 'rounded-md px-3 py-1.5 text-ink-700'
            }
          >
            {label}
          </button>
        ))}
      </div>

      {error ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p> : null}
      {message ? (
        <p className="rounded-md bg-accent-soft px-3 py-2 text-sm text-accent-dark">{message}</p>
      ) : null}

      {mode === 'edit' ? (
        <div className="grid gap-4 xl:grid-cols-[200px_1fr_280px]">
          <aside className="space-y-4 rounded-xl border border-ink-200 bg-white p-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-700/70">Library</p>
              <ul className="mt-2 space-y-1">
                {BLOCK_CATALOG.map((entry) => (
                  <li key={entry.type}>
                    <button
                      type="button"
                      className="w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent-soft"
                      title={entry.description}
                      onClick={() => addBlock(entry.type)}
                    >
                      {entry.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-700/70">
                Scrapboard
              </p>
              <p className="mt-1 text-[11px] text-ink-700/80">
                Save a selected block to reuse on other pages (like a pasteboard, not Adobe&apos;s UI).
              </p>
              <ul className="mt-2 space-y-1">
                {scrap.map((item) => (
                  <li key={item.id} className="flex items-center gap-1">
                    <button
                      type="button"
                      className="flex-1 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent-soft"
                      onClick={() => {
                        const id = `${item.block.type}-${Math.random().toString(36).slice(2, 8)}`;
                        const block = { ...item.block, id };
                        setPage((prev) => ({ ...prev, blocks: [...prev.blocks, block] }));
                        setSelectedId(id);
                      }}
                    >
                      {item.label}
                    </button>
                    <button
                      type="button"
                      className="rounded px-1 text-xs text-red-700"
                      onClick={() => setScrap(removeFromScrapboard(item.id))}
                      aria-label="Remove scrap"
                    >
                      ×
                    </button>
                  </li>
                ))}
                {!scrap.length ? (
                  <li className="px-2 py-1 text-xs text-ink-700">Empty — select a block, then save.</li>
                ) : null}
              </ul>
            </div>
          </aside>

          <section className="space-y-3 rounded-xl border border-ink-200 bg-white p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm">
                <span className="font-medium">Route</span>
                <input
                  className="mt-1 w-full rounded-md border border-ink-200 px-3 py-2 font-mono text-sm"
                  value={page.route}
                  onChange={(e) => setPage((p) => ({ ...p, route: e.target.value }))}
                />
              </label>
              <label className="text-sm">
                <span className="font-medium">Page id</span>
                <input
                  className="mt-1 w-full rounded-md border border-ink-200 px-3 py-2 font-mono text-sm"
                  value={page.id}
                  disabled={!isNew}
                  onChange={(e) => setPage((p) => ({ ...p, id: e.target.value }))}
                />
              </label>
            </div>

            <div className="space-y-2">
              {page.blocks.map((block) => (
                <button
                  key={block.id}
                  type="button"
                  onClick={() => setSelectedId(block.id)}
                  className={`w-full rounded-lg border px-3 py-3 text-left text-sm ${
                    selectedId === block.id
                      ? 'border-accent bg-accent-soft'
                      : 'border-ink-200 bg-ink-50'
                  }`}
                >
                  <span className="font-semibold capitalize">{block.type}</span>
                  <span className="mt-1 block text-ink-700">{outlineFor(block)}</span>
                </button>
              ))}
              {!page.blocks.length ? (
                <p className="text-sm text-ink-700">Add blocks from the library.</p>
              ) : null}
            </div>
          </section>

          <aside className="space-y-3 rounded-xl border border-ink-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-700/70">Inspector</p>
            <label className="block text-sm">
              <span className="font-medium">Title</span>
              <input
                className="mt-1 w-full rounded-md border border-ink-200 px-3 py-2"
                value={page.metadata.title}
                onChange={(e) =>
                  setPage((p) => ({ ...p, metadata: { ...p.metadata, title: e.target.value } }))
                }
              />
            </label>
            <label className="block text-sm">
              <span className="font-medium">Description</span>
              <textarea
                className="mt-1 min-h-[72px] w-full rounded-md border border-ink-200 px-3 py-2"
                value={page.metadata.description}
                onChange={(e) =>
                  setPage((p) => ({
                    ...p,
                    metadata: { ...p.metadata, description: e.target.value }
                  }))
                }
              />
            </label>
            <label className="block text-sm">
              <span className="font-medium">Agent TL;DR</span>
              <textarea
                className="mt-1 min-h-[72px] w-full rounded-md border border-ink-200 px-3 py-2"
                value={page.agent.tldr}
                onChange={(e) =>
                  setPage((p) => ({ ...p, agent: { ...p.agent, tldr: e.target.value } }))
                }
              />
            </label>

            {selected ? (
              <BlockPropsEditor
                block={selected}
                onChange={(props) => updateBlock(selected.id, props)}
              />
            ) : (
              <p className="text-sm text-ink-700">Select a block to edit its fields.</p>
            )}

            <div className="flex flex-wrap gap-2 pt-2">
              <button
                type="button"
                className="rounded border border-ink-200 px-2 py-1 text-xs"
                onClick={() => moveSelected(-1)}
              >
                Move up
              </button>
              <button
                type="button"
                className="rounded border border-ink-200 px-2 py-1 text-xs"
                onClick={() => moveSelected(1)}
              >
                Move down
              </button>
              <button
                type="button"
                className="rounded border border-ink-200 px-2 py-1 text-xs"
                disabled={!selected}
                onClick={() => {
                  if (!selected) return;
                  setScrap(addToScrapboard(selected, `${selected.type} scrap`));
                  setMessage('Saved block to Scrapboard');
                }}
              >
                Save to Scrapboard
              </button>
              <button
                type="button"
                className="rounded border border-red-200 px-2 py-1 text-xs text-red-800"
                onClick={removeSelected}
              >
                Remove block
              </button>
            </div>
          </aside>
        </div>
      ) : null}

      {mode === 'preview' ? (
        <PageLivePreview page={page} previewBaseUrl={previewBaseUrl} />
      ) : null}

      {mode === 'document' ? (
        <pre className="overflow-auto rounded-xl border border-ink-200 bg-ink-900 p-4 text-xs text-ink-50">
          {JSON.stringify(page, null, 2)}
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

function outlineFor(block: BlockInstance): string {
  switch (block.type) {
    case 'hero':
      return block.props.headline;
    case 'prose':
      return block.props.heading || block.props.body.slice(0, 48);
    case 'ctaBand':
      return block.props.heading;
    default:
      return block.type;
  }
}

function BlockPropsEditor({
  block,
  onChange
}: {
  block: BlockInstance;
  onChange: (props: BlockInstance['props']) => void;
}) {
  const props = block.props as Record<string, unknown>;
  const scalarKeys = Object.keys(props).filter(
    (k) => typeof props[k] === 'string' || typeof props[k] === 'number'
  );
  const arrayKeys = Object.keys(props).filter((k) => Array.isArray(props[k]));

  return (
    <div className="space-y-2 border-t border-ink-100 pt-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-700/70">
        Block · {block.type}
      </p>
      {scalarKeys.map((key) => (
        <label key={key} className="block text-sm">
          <span className="font-medium capitalize">{key}</span>
          <input
            className="mt-1 w-full rounded-md border border-ink-200 px-2 py-1.5"
            value={String(props[key] ?? '')}
            onChange={(e) => {
              const next = { ...props, [key]: e.target.value };
              if (typeof props[key] === 'number') {
                next[key] = Number(e.target.value) || 0;
              }
              onChange(next as BlockInstance['props']);
            }}
          />
        </label>
      ))}
      {arrayKeys.map((key) => (
        <ArrayRowEditor
          key={key}
          arrayKey={key}
          rows={(props[key] as Record<string, unknown>[]) ?? []}
          onChange={(rows) => onChange({ ...props, [key]: rows } as BlockInstance['props'])}
        />
      ))}
    </div>
  );
}

function ArrayRowEditor({
  arrayKey,
  rows,
  onChange
}: {
  arrayKey: string;
  rows: Record<string, unknown>[];
  onChange: (rows: Record<string, unknown>[]) => void;
}) {
  const layout = resolveArrayLayout(arrayKey, rows);

  return (
    <div className="space-y-2 pt-1">
      <p className="text-sm font-medium capitalize text-ink-800">{arrayKey}</p>
      {rows.map((row, index) => (
        <div key={`${arrayKey}-${index}`} className="rounded-lg border border-ink-200 bg-ink-50 p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-ink-700/70">
              {layout.itemLabel} {index + 1}
            </span>
            <button
              type="button"
              className="rounded border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-800"
              onClick={() => onChange(removeRow(rows, index))}
            >
              Remove
            </button>
          </div>
          <div className="space-y-2">
            {layout.fields.map((field) => (
              <label key={field.key} className="block text-sm">
                <span className="font-medium">{field.label}</span>
                {field.multiline ? (
                  <textarea
                    className="mt-1 min-h-[64px] w-full rounded-md border border-ink-200 bg-white px-2 py-1.5"
                    value={String(row[field.key] ?? '')}
                    onChange={(e) =>
                      onChange(updateRowField(rows, index, field.key, e.target.value))
                    }
                  />
                ) : (
                  <input
                    className="mt-1 w-full rounded-md border border-ink-200 bg-white px-2 py-1.5"
                    value={String(row[field.key] ?? '')}
                    onChange={(e) =>
                      onChange(updateRowField(rows, index, field.key, e.target.value))
                    }
                  />
                )}
              </label>
            ))}
          </div>
        </div>
      ))}
      {!rows.length ? (
        <p className="text-xs text-ink-700">No {layout.itemLabel.toLowerCase()}s yet.</p>
      ) : null}
      <button
        type="button"
        className="rounded-md bg-accent px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-accent-dark"
        onClick={() => onChange(addRow(rows, createBlankRow(arrayKey, rows)))}
      >
        Add {layout.itemLabel.toLowerCase()}
      </button>
    </div>
  );
}
