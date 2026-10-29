import { notFound } from 'next/navigation';
import { ArticleEditor } from '@/components/studio/ArticleEditor';
import { getActiveStore } from '@/lib/server/get-store';

export default async function EditArticlePage({ params }: { params: { slug: string } }) {
  const { store } = await getActiveStore();
  const article = await store.getArticle(params.slug);
  if (!article) notFound();

  return (
    <div className="space-y-4">
      <h1 className="font-display text-3xl font-semibold">Edit article</h1>
      <ArticleEditor initial={article} />
    </div>
  );
}
