import { CreatePageWizard } from '@/components/studio/CreatePageWizard';

export default function NewPagePage() {
  return (
    <div className="space-y-4">
      <h1 className="font-display text-3xl font-semibold">Create page</h1>
      <p className="text-sm text-ink-700">
        Writes a real <code className="font-mono">app/**/page.tsx</code> you can edit in AWED — no
        blank stub.
      </p>
      <CreatePageWizard />
    </div>
  );
}
