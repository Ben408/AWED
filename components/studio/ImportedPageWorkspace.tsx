'use client';

import { useCallback, useState } from 'react';
import { PageLivePreview } from '@/components/studio/PageLivePreview';
import { TsxSourceEditor, type EditTarget } from '@/components/studio/TsxSourceEditor';
import type { PageDocument } from '@/lib/schema/page';

export function ImportedPageWorkspace({
  page,
  previewBaseUrl
}: {
  page: PageDocument;
  previewBaseUrl?: string;
}) {
  const [mode, setMode] = useState<'edit' | 'preview'>('edit');
  const [focusRegionId, setFocusRegionId] = useState<string | null>(null);
  const [editTargets, setEditTargets] = useState<EditTarget[]>([]);

  const handleEditTarget = useCallback((id: string) => {
    setMode('edit');
    setFocusRegionId(id);
  }, []);
  const clearFocus = useCallback(() => setFocusRegionId(null), []);

  return (
    <div className="space-y-4">
      <p className="rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-950">
        Editing the existing site file <code className="font-mono">{page.source?.path}</code>.
        Saves write back into that TSX — no page rewrite for AWED. Blue = human copy; violet =
        agent/SEO.
      </p>

      <div className="inline-flex rounded-lg border border-ink-200 bg-white p-1 text-sm">
        {(
          [
            ['edit', 'Edit'],
            ['preview', 'Preview']
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

      {/* Editor stays mounted (hidden in preview) so unsaved edits and undo history survive. */}
      <div className={mode === 'edit' ? '' : 'hidden'}>
        <TsxSourceEditor
          pageId={page.id}
          focusRegionId={focusRegionId}
          onFocusHandled={clearFocus}
          onTargetsChange={setEditTargets}
        />
      </div>
      {mode === 'preview' ? (
        <PageLivePreview
          page={page}
          previewBaseUrl={previewBaseUrl}
          editTargets={editTargets}
          onEditTarget={handleEditTarget}
        />
      ) : null}
    </div>
  );
}
