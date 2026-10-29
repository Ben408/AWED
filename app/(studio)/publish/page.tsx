import { PublishPanel } from '@/components/studio/PublishPanel';
import { getActiveStore } from '@/lib/server/get-store';

export default async function PublishPage() {
  const { store, projectName } = await getActiveStore();
  const status = await store.getPublishStatus();

  return (
    <div className="space-y-4">
      <h1 className="font-display text-3xl font-semibold">Publish</h1>
      <p className="max-w-2xl text-sm text-ink-700">
        PageMill uploaded HTML over FTP. FWP records a publish checkpoint against the active site
        project (<strong>{projectName}</strong>). Remote Git push can be wired when a token is
        configured; local saves already write into the project files.
      </p>
      <PublishPanel initial={status} />
    </div>
  );
}
