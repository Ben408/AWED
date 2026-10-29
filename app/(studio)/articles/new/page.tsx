import { ArticleEditor } from '@/components/studio/ArticleEditor';

export default function NewArticlePage() {
  const today = new Date().toISOString().slice(0, 10);
  return (
    <div className="space-y-4">
      <h1 className="font-display text-3xl font-semibold">New article</h1>
      <ArticleEditor
        isNew
        initial={{
          slug: 'new-article',
          location: 'drafts',
          frontmatter: {
            title: 'Untitled article',
            date: today,
            summary: '',
            status: 'draft',
            listed: true
          },
          body: '# Untitled article\n\n## TL;DR\n\n\n'
        }}
      />
    </div>
  );
}
