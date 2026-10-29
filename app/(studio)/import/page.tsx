import { ImportExistingForm } from '@/components/studio/ImportExistingForm';

export default function ImportPage() {
  return (
    <div className="space-y-4">
      <header>
        <h1 className="font-display text-3xl font-semibold">Import existing project</h1>
        <p className="mt-2 max-w-2xl text-sm text-ink-700">
          Map a local Next.js App Router site (like bencornelius.com) into AWED: invent{' '}
          <code className="font-mono">site.yaml</code>, page documents linked to each{' '}
          <code className="font-mono">app/**/page.tsx</code>, allowlists from Insights/Backyard,
          and attach the folder as the active project so articles under{' '}
          <code className="font-mono">content/</code> appear in the editor.
        </p>
      </header>
      <ImportExistingForm />
    </div>
  );
}
