import { notFound } from 'next/navigation';
import { PageEditor } from '@/components/studio/PageEditor';
import { getActiveProject } from '@/lib/projects/registry';
import { getActiveStore } from '@/lib/server/get-store';

export default async function EditPagePage({ params }: { params: { id: string } }) {
  const { store } = await getActiveStore();
  const project = await getActiveProject();
  const page = await store.getPage(params.id);
  if (!page) notFound();

  return (
    <div className="space-y-4">
      <h1 className="font-display text-3xl font-semibold">Edit page</h1>
      {page.source?.kind === 'tsx' ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          This page is a <strong>path record</strong> for{' '}
          <code className="font-mono">{page.source.path}</code> — the full TSX file on disk is the
          asset (not extracted snippets). Use <strong>Preview</strong> for the live human + agent
          views. Add Image blocks from the <strong>Library</strong> when placing art on AWED-managed
          document pages.
        </p>
      ) : null}
      <PageEditor initial={page} previewBaseUrl={project?.previewBaseUrl || project?.publicUrl} />
    </div>
  );
}
