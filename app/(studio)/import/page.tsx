import { ImportExistingForm } from '@/components/studio/ImportExistingForm';

export default function ImportPage() {
  return (
    <div className="space-y-4">
      <header>
        <h1 className="font-display text-3xl font-semibold">Import existing project</h1>
        <p className="mt-2 max-w-2xl text-sm text-ink-700">
          Attach a local Next.js App Router site by registering <strong>full file paths</strong>{' '}
          (pages, articles, drafts, art under <code className="font-mono">public/</code>) into{' '}
          <code className="font-mono">.awed/manifest.yaml</code>. Import does not extract page copy
          into stub blocks—the site files remain the assets.
        </p>
      </header>
      <ImportExistingForm />
    </div>
  );
}
