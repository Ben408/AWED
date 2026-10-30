'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useUndoStack } from '@/hooks/useUndoStack';
import { lineDiff, type DiffLine } from '@/lib/tsx-edit/line-diff';
import {
  applyTsxRegions,
  extractTsxRegions,
  type EditableRegion
} from '@/lib/tsx-edit/regions';

type SourcePayload = {
  path: string;
  absolutePath: string;
  source: string;
  model: {
    regions: EditableRegion[];
    warnings: string[];
  };
};

export type EditTarget = { id: string; label: string };

type TsxSourceEditorProps = {
  pageId: string;
  /** When set, the editor scrolls to and focuses this region, then calls onFocusHandled. */
  focusRegionId?: string | null;
  onFocusHandled?: () => void;
  /** Reports human-facing regions (for the preview's click-to-edit outline). */
  onTargetsChange?: (targets: EditTarget[]) => void;
};

type ReviewState = {
  next: string;
  diff: DiffLine[];
  changed: { id: string; label: string; before: EditableRegion | null; after: EditableRegion }[];
};

const MEDIA_MIME = 'application/x-awed-media';
const IMAGE_PATH_RE = /\.(png|jpe?g|gif|webp|svg|avif)(\?.*)?$/i;
const IMAGE_FIELD_RE = /image|img|photo|picture|logo|avatar|icon|thumbnail|src/i;
const DIFF_LINE_LIMIT = 80;
const DRAFT_PREFIX = 'awed:tsx-draft:';

function regionDomId(id: string) {
  return `region-${id}`;
}

function isHumanGroup(region: EditableRegion) {
  return region.audience === 'human';
}

function humanRank(region: EditableRegion) {
  if (region.kind === 'objectList') return 0;
  if (region.kind === 'string') return 1; // jsx.*
  return 2; // stringList
}

function looksLikeImagePath(value: string) {
  return IMAGE_PATH_RE.test(value.trim());
}

function readMediaPath(dt: DataTransfer): string | null {
  const raw = dt.getData(MEDIA_MIME);
  if (!raw) return null;
  try {
    const data: unknown = JSON.parse(raw);
    if (typeof data === 'string') return data;
    if (data && typeof data === 'object') {
      const rec = data as Record<string, unknown>;
      for (const key of ['path', 'url', 'src', 'publicPath']) {
        if (typeof rec[key] === 'string' && rec[key]) return rec[key] as string;
      }
    }
    return null;
  } catch {
    return raw.trim() || null;
  }
}

function hasMedia(dt: DataTransfer) {
  return Array.from(dt.types ?? []).includes(MEDIA_MIME);
}

function mediaDropProps(apply: (path: string) => void) {
  return {
    onDragOver: (e: React.DragEvent) => {
      if (hasMedia(e.dataTransfer)) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
      }
    },
    onDrop: (e: React.DragEvent) => {
      const path = readMediaPath(e.dataTransfer);
      if (!path) return;
      e.preventDefault();
      e.stopPropagation();
      apply(path);
    }
  };
}

export function TsxSourceEditor({
  pageId,
  focusRegionId,
  onFocusHandled,
  onTargetsChange
}: TsxSourceEditorProps) {
  const router = useRouter();
  const [payload, setPayload] = useState<SourcePayload | null>(null);
  const [regions, setRegions] = useState<EditableRegion[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [review, setReview] = useState<ReviewState | null>(null);
  const [showDelete, setShowDelete] = useState(false);
  const [deleteTsx, setDeleteTsx] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [dropActive, setDropActive] = useState(false);

  const { stack, checkpoint, undo, canUndo } = useUndoStack<EditableRegion[]>(50);
  const lastCheckpoint = useRef<{ key: string; at: number } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const targetsCb = useRef(onTargetsChange);
  targetsCb.current = onTargetsChange;

  const showToast = useCallback((text: string) => {
    setToast(text);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3500);
  }, []);

  useEffect(
    () => () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    },
    []
  );

  // ── Load (+ restore autosaved draft) ───────────────────────────────────────
  useEffect(() => {
    setBusy(true);
    fetch(`/api/pages/${pageId}/source`)
      .then(async (res) => {
        const data = (await res.json()) as SourcePayload & { error?: string };
        if (!res.ok) throw new Error(data.error || 'Failed to load source');
        setPayload(data);
        let initial = data.model.regions;
        try {
          const raw = window.localStorage.getItem(DRAFT_PREFIX + pageId);
          if (raw) {
            const draft = JSON.parse(raw) as { source: string; regions: EditableRegion[] };
            if (
              draft.source === data.source &&
              Array.isArray(draft.regions) &&
              JSON.stringify(draft.regions) !== JSON.stringify(data.model.regions)
            ) {
              initial = draft.regions;
              setMessage('Restored your unsaved draft from this browser.');
            } else if (draft.source !== data.source) {
              window.localStorage.removeItem(DRAFT_PREFIX + pageId);
            }
          }
        } catch {
          /* ignore corrupt drafts */
        }
        setRegions(initial);
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Load failed'))
      .finally(() => setBusy(false));
  }, [pageId]);

  const baselineJson = useMemo(
    () => (payload ? JSON.stringify(payload.model.regions) : ''),
    [payload]
  );
  const dirty = Boolean(payload) && JSON.stringify(regions) !== baselineJson;

  // ── Autosave draft (localStorage only — never touches the TSX file) ────────
  useEffect(() => {
    if (!payload) return;
    const key = DRAFT_PREFIX + pageId;
    if (!dirty) {
      window.localStorage.removeItem(key);
      return;
    }
    const t = setTimeout(() => {
      try {
        window.localStorage.setItem(key, JSON.stringify({ source: payload.source, regions }));
      } catch {
        /* quota / private mode */
      }
    }, 700);
    return () => clearTimeout(t);
  }, [regions, dirty, payload, pageId]);

  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  // ── Ordering / outline ─────────────────────────────────────────────────────
  const { humanRegions, agentRegions } = useMemo(() => {
    const human = regions
      .filter(isHumanGroup)
      .map((r, i) => ({ r, i }))
      .sort((a, b) => humanRank(a.r) - humanRank(b.r) || a.i - b.i)
      .map((x) => x.r);
    const agent = regions.filter((r) => !isHumanGroup(r));
    return { humanRegions: human, agentRegions: agent };
  }, [regions]);

  const targets = useMemo<EditTarget[]>(
    () =>
      (payload?.model.regions ?? [])
        .filter(isHumanGroup)
        .map((r) => ({ id: r.id, label: r.label })),
    [payload]
  );
  useEffect(() => {
    targetsCb.current?.(targets);
  }, [targets]);

  const focusRegion = useCallback((id: string) => {
    const el = document.getElementById(regionDomId(id));
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    const field = el.querySelector<HTMLElement>('textarea, input, button');
    field?.focus({ preventScroll: true });
    setActiveId(id);
    window.setTimeout(() => setActiveId((cur) => (cur === id ? null : cur)), 1800);
  }, []);

  useEffect(() => {
    if (!focusRegionId || !regions.length) return;
    const raf = requestAnimationFrame(() => {
      focusRegion(focusRegionId);
      onFocusHandled?.();
    });
    return () => cancelAnimationFrame(raf);
  }, [focusRegionId, regions.length, focusRegion, onFocusHandled]);

  // ── Editing + undo ─────────────────────────────────────────────────────────
  const commit = useCallback(
    (id: string, next: EditableRegion, label: string, structural = false) => {
      const now = Date.now();
      const last = lastCheckpoint.current;
      if (structural || !last || last.key !== id || now - last.at > 1000) {
        checkpoint(regions, label);
      }
      lastCheckpoint.current = { key: structural ? `${id}:structural` : id, at: now };
      setRegions((prev) => prev.map((r) => (r.id === id ? next : r)));
    },
    [checkpoint, regions]
  );

  function handleUndo() {
    const top = stack[stack.length - 1];
    if (!top) return;
    setRegions(top.snapshot);
    undo();
    lastCheckpoint.current = null;
    showToast(`Undid: ${top.label}`);
  }

  function discardChanges() {
    if (!payload || !dirty) return;
    checkpoint(regions, 'Discard changes');
    setRegions(payload.model.regions);
    lastCheckpoint.current = null;
  }

  // ── Image drop into focused field / clipboard ──────────────────────────────
  function insertPathIntoFocus(path: string) {
    const el = document.activeElement as HTMLElement | null;
    const regionId = el?.dataset?.regionId;
    const region = regions.find((r) => r.id === regionId);
    if (el && region) {
      const field = el.dataset.field;
      const rowIdx = el.dataset.row !== undefined ? Number(el.dataset.row) : undefined;
      const itemIdx = el.dataset.index !== undefined ? Number(el.dataset.index) : undefined;
      if (region.kind === 'string') {
        commit(region.id, { ...region, value: path }, `Insert image into ${region.label}`, true);
        showToast(`Inserted ${path} into ${region.label}`);
        return;
      }
      if (region.kind === 'stringList' && itemIdx !== undefined) {
        const values = [...region.values];
        values[itemIdx] = path;
        commit(region.id, { ...region, values }, `Insert image into ${region.label}`, true);
        showToast(`Inserted ${path} into ${region.label}`);
        return;
      }
      if (region.kind === 'objectList' && rowIdx !== undefined && field) {
        const kind = region.listFields.includes(field)
          ? 'list'
          : region.recordListFields.includes(field)
            ? 'record'
            : 'plain';
        if (kind === 'plain') {
          const rows = region.rows.map((r, i) => (i === rowIdx ? { ...r, [field]: path } : r));
          commit(region.id, { ...region, rows }, `Insert image into ${region.label}`, true);
          showToast(`Inserted ${path} into ${region.label} → ${field}`);
          return;
        }
      }
    }
    void navigator.clipboard?.writeText(path).then(
      () => showToast(`No field focused — copied ${path} to clipboard`),
      () => showToast(`No field focused — path: ${path}`)
    );
    if (!navigator.clipboard) showToast(`No field focused — path: ${path}`);
  }

  // ── Validation (soft) ──────────────────────────────────────────────────────
  const validation = useMemo(() => {
    const notes: string[] = [];
    if (payload && !humanRegions.length) {
      notes.push(
        'No human-facing content regions were detected — only SEO/agent metadata (if any) is editable here.'
      );
    }
    for (const r of humanRegions) {
      if (r.kind === 'string' && !r.value.trim()) notes.push(`${r.label} is empty.`);
      if (r.kind === 'stringList' && r.values.some((v) => !v.trim())) {
        notes.push(`${r.label} has blank items.`);
      }
      if (r.kind === 'objectList' && r.rows.some((row) => Object.values(row).every((v) => !v.trim()))) {
        notes.push(`${r.label} has a completely empty item.`);
      }
    }
    return notes;
  }, [payload, humanRegions]);

  // ── Save with diff review ──────────────────────────────────────────────────
  function requestSave() {
    if (!payload) return;
    setError(null);
    setMessage(null);
    try {
      // Pure TS: seed span memory in this browser context, then compute the write result.
      extractTsxRegions(payload.source, payload.path);
      const next = applyTsxRegions(payload.source, payload.path, regions);
      const before = new Map(payload.model.regions.map((r) => [r.id, r]));
      const changed = regions
        .filter((r) => JSON.stringify(r) !== JSON.stringify(before.get(r.id)))
        .map((r) => ({ id: r.id, label: r.label, before: before.get(r.id) ?? null, after: r }));
      setReview({ next, diff: lineDiff(payload.source, next), changed });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not compute changes');
    }
  }

  async function confirmSave() {
    if (!payload) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/pages/${pageId}/source`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ regions, expectedSource: payload.source })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      setPayload((prev) =>
        prev ? { ...prev, source: data.source, model: data.model } : prev
      );
      setRegions(data.model.regions);
      window.localStorage.removeItem(DRAFT_PREFIX + pageId);
      setMessage(`Saved changes into ${data.path}`);
      setReview(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
      setReview(null);
    } finally {
      setBusy(false);
    }
  }

  // ── Delete / duplicate ─────────────────────────────────────────────────────
  async function confirmDelete() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/pages/${pageId}${deleteTsx ? '?deleteTsx=1' : ''}`, {
        method: 'DELETE'
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Delete failed');
      window.localStorage.removeItem(DRAFT_PREFIX + pageId);
      router.push('/pages');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
      setShowDelete(false);
      setBusy(false);
    }
  }

  async function duplicate() {
    if (dirty && !window.confirm('Unsaved edits are not included in the copy. Duplicate anyway?')) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/pages/${pageId}/duplicate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}'
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Duplicate failed');
      const newId: string | undefined = data.page?.id;
      showToast('Page duplicated');
      router.push(newId ? `/pages/${newId}` : '/pages');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Duplicate failed');
      setBusy(false);
    }
  }

  if (busy && !payload) {
    return <p className="text-sm text-ink-700">Loading page source…</p>;
  }

  const renderCard = (region: EditableRegion) => (
    <RegionCard
      key={region.id}
      region={region}
      active={activeId === region.id}
      onChange={(next, label, structural) => commit(region.id, next, label, structural)}
    />
  );

  return (
    <div className="space-y-4">
      {error ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p> : null}
      {message ? (
        <p className="rounded-md bg-accent-soft px-3 py-2 text-sm text-accent-dark">{message}</p>
      ) : null}

      {payload ? (
        <p className="text-sm text-ink-700">
          Editing the live file <code className="font-mono text-xs">{payload.path}</code>
          <span className="block text-xs text-ink-700/80">{payload.absolutePath}</span>
        </p>
      ) : null}

      {payload?.model.warnings.length ? (
        <ul className="list-disc pl-5 text-sm text-amber-900">
          {payload.model.warnings.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      ) : null}

      {validation.length ? (
        <ul className="list-disc rounded-md bg-amber-50 py-2 pl-7 pr-3 text-sm text-amber-900">
          {validation.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      ) : null}

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={busy || !regions.length}
          onClick={requestSave}
          className="rounded-md bg-accent px-3 py-2 text-sm font-semibold text-white hover:bg-accent-dark disabled:opacity-60"
        >
          Save into TSX file
        </button>
        <button
          type="button"
          disabled={!canUndo}
          onClick={handleUndo}
          className="rounded-md border border-ink-200 bg-white px-3 py-2 text-sm font-semibold disabled:opacity-50"
        >
          Undo{canUndo ? ` (${stack.length})` : ''}
        </button>
        <button
          type="button"
          disabled={!dirty}
          onClick={discardChanges}
          className="rounded-md border border-ink-200 bg-white px-3 py-2 text-sm disabled:opacity-50"
        >
          Discard changes
        </button>
        <span className="text-xs text-ink-700">
          {dirty ? 'Unsaved changes (draft autosaved in this browser)' : 'No unsaved changes'}
        </span>
        <span className="flex-1" />
        <button
          type="button"
          disabled={busy || !payload}
          onClick={duplicate}
          className="rounded-md border border-ink-200 bg-white px-3 py-2 text-sm font-semibold disabled:opacity-50"
        >
          Duplicate
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            setDeleteTsx(false);
            setShowDelete(true);
          }}
          className="rounded-md border border-red-300 bg-white px-3 py-2 text-sm font-semibold text-red-800 disabled:opacity-50"
        >
          Delete page
        </button>
      </div>

      {/* Drop image zone */}
      <div
        {...mediaDropProps((path) => {
          setDropActive(false);
          insertPathIntoFocus(path);
        })}
        onDragEnter={(e) => hasMedia(e.dataTransfer) && setDropActive(true)}
        onDragLeave={() => setDropActive(false)}
        className={`rounded-lg border-2 border-dashed px-3 py-2 text-center text-xs ${
          dropActive ? 'border-accent bg-accent-soft text-accent-dark' : 'border-ink-200 text-ink-700'
        }`}
      >
        Drop image here — inserts its path into the focused field, or copies it to the clipboard.
      </div>

      <div className="grid gap-4 lg:grid-cols-[210px_minmax(0,1fr)]">
        {/* Outline rail */}
        <nav
          aria-label="Page regions"
          className="self-start rounded-xl border border-ink-200 bg-white p-3 text-sm lg:sticky lg:top-4 lg:max-h-[80vh] lg:overflow-auto"
        >
          <OutlineGroup title="Human content" items={humanRegions} onPick={focusRegion} />
          <OutlineGroup title="SEO / agent metadata" items={agentRegions} onPick={focusRegion} />
          {!regions.length ? <p className="text-xs text-ink-700">No regions</p> : null}
        </nav>

        <div className="space-y-4">
          {humanRegions.length ? <GroupHeading text="Human content" tone="human" /> : null}
          {humanRegions.map(renderCard)}
          {agentRegions.length ? <GroupHeading text="SEO / agent metadata" tone="agent" /> : null}
          {agentRegions.map(renderCard)}
          {!regions.length ? (
            <p className="rounded-xl border border-dashed border-ink-200 p-4 text-sm text-ink-700">
              No structured content regions detected in this file yet. Preview still shows the live
              page. We can extend extractors for more TSX patterns as needed.
            </p>
          ) : null}
        </div>
      </div>

      {toast ? (
        <div
          role="status"
          className="fixed bottom-4 right-4 z-50 max-w-sm rounded-md bg-ink-900 px-3 py-2 text-sm text-white shadow-lg"
        >
          {toast}
        </div>
      ) : null}

      {review ? (
        <Modal title="Review changes before saving" onClose={() => setReview(null)}>
          {review.changed.length ? (
            <p className="text-sm">
              <strong>{review.changed.length}</strong> region{review.changed.length === 1 ? '' : 's'}{' '}
              will update in <code className="font-mono text-xs">{payload?.path}</code>.
            </p>
          ) : (
            <p className="text-sm text-ink-700">No region changes detected.</p>
          )}

          <ul className="space-y-1">
            {review.changed.map((c) => (
              <li key={c.id} className="rounded border border-ink-200 text-sm">
                <details>
                  <summary className="cursor-pointer px-2 py-1 font-medium">{c.label}</summary>
                  <div className="grid gap-2 border-t border-ink-200 p-2 sm:grid-cols-2">
                    <RegionSnapshot title="Before" region={c.before} tone="del" />
                    <RegionSnapshot title="After" region={c.after} tone="add" />
                  </div>
                </details>
              </li>
            ))}
          </ul>

          {review.diff.length ? (
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-700">
                File diff{' '}
                {review.diff.length > DIFF_LINE_LIMIT
                  ? `(first ${DIFF_LINE_LIMIT} of ${review.diff.length} lines)`
                  : ''}
              </p>
              <pre className="max-h-64 overflow-auto rounded-md bg-ink-950 p-2 text-[11px] leading-snug">
                {review.diff.slice(0, DIFF_LINE_LIMIT).map((line, i) => (
                  <div
                    key={i}
                    className={
                      line.type === 'add'
                        ? 'bg-green-900/50 text-green-100'
                        : line.type === 'del'
                          ? 'bg-red-900/50 text-red-100'
                          : 'text-ink-50/70'
                    }
                  >
                    {line.type === 'add' ? '+ ' : line.type === 'del' ? '- ' : '  '}
                    {line.text}
                  </div>
                ))}
              </pre>
            </div>
          ) : null}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setReview(null)}
              className="rounded-md border border-ink-200 px-3 py-2 text-sm"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={busy || !review.diff.length}
              onClick={confirmSave}
              className="rounded-md bg-accent px-3 py-2 text-sm font-semibold text-white hover:bg-accent-dark disabled:opacity-60"
            >
              Confirm save
            </button>
          </div>
        </Modal>
      ) : null}

      {showDelete ? (
        <Modal title="Delete page" onClose={() => setShowDelete(false)}>
          <p className="text-sm">Remove from AWED and optionally delete TSX file?</p>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={deleteTsx}
              onChange={(e) => setDeleteTsx(e.target.checked)}
            />
            Also delete the TSX file{payload ? ` (${payload.path})` : ''}
          </label>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowDelete(false)}
              className="rounded-md border border-ink-200 px-3 py-2 text-sm"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={confirmDelete}
              className="rounded-md bg-red-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              Delete
            </button>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}

function Modal({
  title,
  onClose,
  children
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="max-h-[90vh] w-full max-w-3xl space-y-3 overflow-auto rounded-xl bg-white p-4 shadow-xl"
      >
        <h2 className="font-display text-lg font-semibold">{title}</h2>
        {children}
      </div>
    </div>
  );
}

function RegionSnapshot({
  title,
  region,
  tone
}: {
  title: string;
  region: EditableRegion | null;
  tone: 'add' | 'del';
}) {
  let text = '—';
  if (region) {
    if (region.kind === 'string') text = region.value;
    else if (region.kind === 'stringList') text = region.values.join('\n');
    else text = JSON.stringify(region.rows, null, 2);
  }
  return (
    <div>
      <p className="mb-1 text-[11px] font-bold uppercase text-ink-700">{title}</p>
      <pre
        className={`max-h-48 overflow-auto whitespace-pre-wrap rounded p-2 text-xs ${
          tone === 'add' ? 'bg-green-50 text-green-950' : 'bg-red-50 text-red-950'
        }`}
      >
        {text}
      </pre>
    </div>
  );
}

function GroupHeading({ text, tone }: { text: string; tone: 'human' | 'agent' }) {
  return (
    <h2
      className={`text-xs font-bold uppercase tracking-wide ${
        tone === 'human' ? 'text-sky-900' : 'text-violet-900'
      }`}
    >
      {text}
    </h2>
  );
}

function OutlineGroup({
  title,
  items,
  onPick
}: {
  title: string;
  items: EditableRegion[];
  onPick: (id: string) => void;
}) {
  if (!items.length) return null;
  return (
    <div className="mb-3 last:mb-0">
      <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-ink-700">{title}</p>
      <ul className="space-y-0.5">
        {items.map((r) => (
          <li key={r.id}>
            <button
              type="button"
              onClick={() => onPick(r.id)}
              className="w-full truncate rounded px-2 py-1 text-left text-xs hover:bg-ink-100"
              title={r.label}
            >
              {r.label}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

type ChangeFn = (next: EditableRegion, label: string, structural?: boolean) => void;

function RegionCard({
  region,
  active,
  onChange
}: {
  region: EditableRegion;
  active: boolean;
  onChange: ChangeFn;
}) {
  const audienceLabel =
    region.audience === 'agent'
      ? 'Agent / machine'
      : region.audience === 'human'
        ? 'Human-facing'
        : 'Human + agent';

  const border =
    region.audience === 'agent'
      ? 'border-violet-300 bg-violet-50/40'
      : region.audience === 'human'
        ? 'border-sky-300 bg-sky-50/40'
        : 'border-ink-200 bg-white';

  const editLabel = `Edit ${region.label}`;

  return (
    <section
      id={regionDomId(region.id)}
      className={`scroll-mt-4 rounded-xl border-2 p-4 transition-shadow ${border} ${
        active ? 'ring-4 ring-accent/40' : ''
      }`}
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-display text-base font-semibold">{region.label}</h3>
        <span className="text-[11px] font-bold uppercase tracking-wide text-ink-700">
          {audienceLabel}
        </span>
      </div>

      {region.kind === 'string' ? (
        <textarea
          data-region-id={region.id}
          className="min-h-[72px] w-full rounded-md border border-ink-200 bg-white px-3 py-2 text-sm"
          value={region.value}
          onChange={(e) => onChange({ ...region, value: e.target.value }, editLabel)}
          {...(looksLikeImagePath(region.value)
            ? mediaDropProps((path) =>
                onChange({ ...region, value: path }, `Drop image into ${region.label}`, true)
              )
            : {})}
        />
      ) : null}

      {region.kind === 'stringList' ? (
        <div className="space-y-2">
          {region.values.map((value, index) => (
            <div key={index} className="flex gap-2">
              <textarea
                data-region-id={region.id}
                data-index={index}
                className="min-h-[56px] flex-1 rounded-md border border-ink-200 bg-white px-3 py-2 text-sm"
                value={value}
                onChange={(e) => {
                  const values = [...region.values];
                  values[index] = e.target.value;
                  onChange({ ...region, values }, editLabel);
                }}
                {...(looksLikeImagePath(value)
                  ? mediaDropProps((path) => {
                      const values = [...region.values];
                      values[index] = path;
                      onChange({ ...region, values }, `Drop image into ${region.label}`, true);
                    })
                  : {})}
              />
              <button
                type="button"
                className="rounded border border-red-200 px-2 text-xs text-red-800"
                onClick={() =>
                  onChange(
                    { ...region, values: region.values.filter((_, i) => i !== index) },
                    `Remove item from ${region.label}`,
                    true
                  )
                }
              >
                Remove
              </button>
            </div>
          ))}
          <button
            type="button"
            className="rounded-md border border-ink-200 bg-white px-2 py-1 text-xs font-semibold"
            onClick={() =>
              onChange(
                { ...region, values: [...region.values, ''] },
                `Add item to ${region.label}`,
                true
              )
            }
          >
            Add item
          </button>
        </div>
      ) : null}

      {region.kind === 'objectList' ? <ObjectListEditor region={region} onChange={onChange} /> : null}
    </section>
  );
}

function ObjectListEditor({
  region,
  onChange
}: {
  region: Extract<EditableRegion, { kind: 'objectList' }>;
  onChange: ChangeFn;
}) {
  const listFields = new Set(region.listFields ?? []);
  const booleanFields = new Set(region.booleanFields ?? []);
  const recordFields = new Set(region.recordListFields ?? []);
  const hasFeatured = booleanFields.has('featured') || region.fields.includes('featured');
  const radioName = `featured-${region.id}`;
  const editLabel = `Edit ${region.label}`;

  function setField(index: number, field: string, value: string, structural = false) {
    const rows = region.rows.map((r, i) => (i === index ? { ...r, [field]: value } : r));
    onChange({ ...region, rows }, editLabel, structural);
  }

  function setFeatured(index: number) {
    const rows = region.rows.map((r, i) => ({ ...r, featured: i === index ? 'true' : 'false' }));
    onChange({ ...region, rows }, `Set featured in ${region.label}`, true);
  }

  return (
    <div className="space-y-3">
      {region.rows.map((row, index) => (
        <div key={index} className="rounded-lg border border-ink-200 bg-white p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="text-xs font-semibold uppercase text-ink-700">Item {index + 1}</span>
            <div className="flex items-center gap-3">
              {hasFeatured ? (
                <label className="flex items-center gap-1 text-xs font-medium">
                  <input
                    type="radio"
                    name={radioName}
                    checked={/^\s*true\s*$/i.test(row.featured ?? '')}
                    onChange={() => setFeatured(index)}
                  />
                  Featured
                </label>
              ) : null}
              <button
                type="button"
                className="text-xs text-red-800"
                onClick={() =>
                  onChange(
                    { ...region, rows: region.rows.filter((_, i) => i !== index) },
                    `Remove item from ${region.label}`,
                    true
                  )
                }
              >
                Remove
              </button>
            </div>
          </div>
          <div className="grid gap-2">
            {region.fields
              .filter((field) => !(hasFeatured && field === 'featured'))
              .map((field) => {
                const value = row[field] ?? '';
                if (booleanFields.has(field)) {
                  return (
                    <label key={field} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={/^\s*true\s*$/i.test(value)}
                        onChange={(e) =>
                          setField(index, field, e.target.checked ? 'true' : 'false', true)
                        }
                      />
                      <span className="font-medium capitalize">{field}</span>
                    </label>
                  );
                }
                if (recordFields.has(field)) {
                  return (
                    <div key={field} className="text-sm">
                      <span className="font-medium capitalize">{field}</span>
                      <RecordListEditor
                        value={value}
                        onChange={(next, structural) => setField(index, field, next, structural)}
                      />
                    </div>
                  );
                }
                if (listFields.has(field)) {
                  return (
                    <label key={field} className="block text-sm">
                      <span className="font-medium capitalize">{field}</span>
                      <span className="ml-2 text-xs text-ink-700">one item per line</span>
                      <textarea
                        data-region-id={region.id}
                        data-row={index}
                        data-field={field}
                        className="mt-1 min-h-[88px] w-full rounded-md border border-ink-200 px-2 py-1.5"
                        value={value}
                        onChange={(e) => setField(index, field, e.target.value)}
                      />
                    </label>
                  );
                }
                const imageish = IMAGE_FIELD_RE.test(field) || looksLikeImagePath(value);
                return (
                  <label key={field} className="block text-sm">
                    <span className="font-medium capitalize">{field}</span>
                    {imageish ? (
                      <span className="ml-2 text-xs text-ink-700">drop an image here</span>
                    ) : null}
                    <input
                      data-region-id={region.id}
                      data-row={index}
                      data-field={field}
                      className="mt-1 w-full rounded-md border border-ink-200 px-2 py-1.5"
                      value={value}
                      onChange={(e) => setField(index, field, e.target.value)}
                      {...(imageish
                        ? mediaDropProps((path) => setField(index, field, path, true))
                        : {})}
                    />
                  </label>
                );
              })}
          </div>
        </div>
      ))}
      <button
        type="button"
        className="rounded-md border border-ink-200 bg-white px-2 py-1 text-xs font-semibold"
        onClick={() =>
          onChange(
            {
              ...region,
              rows: [
                ...region.rows,
                Object.fromEntries(
                  region.fields.map((f) => [f, booleanFields.has(f) ? 'false' : recordFields.has(f) ? '[]' : ''])
                )
              ]
            },
            `Add item to ${region.label}`,
            true
          )
        }
      >
        Add item
      </button>
    </div>
  );
}

function parseRecords(value: string): Record<string, string>[] | null {
  if (!value.trim()) return [];
  try {
    const data: unknown = JSON.parse(value);
    if (!Array.isArray(data)) return null;
    const out: Record<string, string>[] = [];
    for (const item of data) {
      if (!item || typeof item !== 'object' || Array.isArray(item)) return null;
      const rec: Record<string, string> = {};
      for (const [k, v] of Object.entries(item as Record<string, unknown>)) {
        rec[k] = typeof v === 'string' ? v : String(v ?? '');
      }
      out.push(rec);
    }
    return out;
  } catch {
    return null;
  }
}

/** Mini editor for JSON arrays of string records (e.g. metrics `{label, value}`). */
function RecordListEditor({
  value,
  onChange
}: {
  value: string;
  onChange: (next: string, structural?: boolean) => void;
}) {
  const records = parseRecords(value);

  if (records === null) {
    return (
      <div className="mt-1 space-y-1">
        <p className="text-xs text-amber-900">Not a valid JSON array of records — edit raw JSON.</p>
        <textarea
          className="min-h-[72px] w-full rounded-md border border-ink-200 px-2 py-1.5 font-mono text-xs"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    );
  }

  const keys: string[] = [];
  for (const rec of records) for (const k of Object.keys(rec)) if (!keys.includes(k)) keys.push(k);
  if (!keys.length) keys.push('label', 'value');

  const write = (next: Record<string, string>[], structural = false) =>
    onChange(JSON.stringify(next), structural);

  return (
    <div className="mt-1 space-y-1.5">
      {records.map((rec, i) => (
        <div key={i} className="flex items-center gap-2">
          {keys.map((k) => (
            <input
              key={k}
              aria-label={k}
              placeholder={k}
              className="min-w-0 flex-1 rounded-md border border-ink-200 px-2 py-1 text-sm"
              value={rec[k] ?? ''}
              onChange={(e) =>
                write(records.map((r, j) => (j === i ? { ...r, [k]: e.target.value } : r)))
              }
            />
          ))}
          <button
            type="button"
            className="text-xs text-red-800"
            onClick={() => write(records.filter((_, j) => j !== i), true)}
          >
            Remove
          </button>
        </div>
      ))}
      <button
        type="button"
        className="rounded-md border border-ink-200 bg-white px-2 py-1 text-xs font-semibold"
        onClick={() =>
          write([...records, Object.fromEntries(keys.map((k) => [k, '']))], true)
        }
      >
        Add {keys.includes('label') ? 'metric' : 'row'}
      </button>
    </div>
  );
}
