import { MediaLibrary } from '@/components/studio/MediaLibrary';
import { getActiveProject } from '@/lib/projects/registry';
import { getActiveStore } from '@/lib/server/get-store';

export default async function LibraryPage() {
  const { store } = await getActiveStore();
  const project = await getActiveProject();
  const media = await store.listMedia();

  return (
    <div className="space-y-4">
      <header>
        <h1 className="font-display text-3xl font-semibold">Library</h1>
        <p className="mt-2 max-w-2xl text-sm text-ink-700">
          Art files from the attached site&apos;s <code className="font-mono">public/</code> tree.
          Upload new files, then place them on pages with an Image block using the public URL path.
        </p>
      </header>
      <MediaLibrary
        initial={media.map((m) => ({ path: m.path, urlPath: m.urlPath, fileName: m.fileName }))}
        previewBaseUrl={project?.previewBaseUrl || project?.publicUrl}
      />
    </div>
  );
}
