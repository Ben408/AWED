import { PageEditor } from '@/components/studio/PageEditor';
import { createBlankPage } from '@/lib/schema/page';

export default function NewPagePage() {
  const page = createBlankPage({
    id: 'new-page',
    route: '/new-page',
    title: 'New page'
  });

  return (
    <div className="space-y-4">
      <h1 className="font-display text-3xl font-semibold">New page</h1>
      <PageEditor isNew initial={page} />
    </div>
  );
}
