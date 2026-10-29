import { PageEditor } from '@/components/studio/PageEditor';
import { getActiveProject } from '@/lib/projects/registry';
import { createBlankPage } from '@/lib/schema/page';

export default async function NewPagePage() {
  const project = await getActiveProject();
  const page = createBlankPage({
    id: 'new-page',
    route: '/new-page',
    title: 'New page'
  });

  return (
    <div className="space-y-4">
      <h1 className="font-display text-3xl font-semibold">New page</h1>
      <PageEditor
        isNew
        initial={page}
        previewBaseUrl={project?.previewBaseUrl || project?.publicUrl}
      />
    </div>
  );
}
