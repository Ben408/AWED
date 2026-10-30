import { CreateArticleWizard } from '@/components/studio/CreateArticleWizard';

export default function NewArticlePage() {
  return (
    <div className="space-y-4">
      <h1 className="font-display text-3xl font-semibold">Create article</h1>
      <p className="text-sm text-ink-700">Starts a draft MDX post under content/drafts.</p>
      <CreateArticleWizard />
    </div>
  );
}
