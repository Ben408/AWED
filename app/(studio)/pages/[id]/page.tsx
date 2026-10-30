import { notFound } from 'next/navigation';
import { ImportedPageWorkspace } from '@/components/studio/ImportedPageWorkspace';
import { PageEditor } from '@/components/studio/PageEditor';
import { getActiveProject } from '@/lib/projects/registry';
import { getActiveStore } from '@/lib/server/get-store';

export default async function EditPagePage({ params }: { params: { id: string } }) {
  const { store } = await getActiveStore();
  const project = await getActiveProject();
  const page = await store.getPage(params.id);
  if (!page) notFound();

  const isTsxSource = page.source?.kind === 'tsx' && Boolean(page.source.path);
  const previewBaseUrl = project?.previewBaseUrl || project?.publicUrl;

  return (
    <div className="space-y-4">
      <h1 className="font-display text-3xl font-semibold">
        {page.metadata.title || page.id}
      </h1>
      {isTsxSource ? (
        <ImportedPageWorkspace page={page} previewBaseUrl={previewBaseUrl} />
      ) : (
        <PageEditor initial={page} previewBaseUrl={previewBaseUrl} />
      )}
    </div>
  );
}
