import { notFound } from 'next/navigation';
import { PageEditor } from '@/components/studio/PageEditor';
import { getActiveStore } from '@/lib/server/get-store';

export default async function EditPagePage({ params }: { params: { id: string } }) {
  const { store } = await getActiveStore();
  const page = await store.getPage(params.id);
  if (!page) notFound();

  return (
    <div className="space-y-4">
      <h1 className="font-display text-3xl font-semibold">Edit page</h1>
      <PageEditor initial={page} />
    </div>
  );
}
