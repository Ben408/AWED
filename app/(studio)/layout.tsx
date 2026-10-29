import { StudioShell } from '@/components/studio/StudioShell';
import { loadProjectsFile } from '@/lib/projects/registry';
import { requireAdmin } from '@/lib/server/require-admin';
import { getActiveStore } from '@/lib/server/get-store';

export default async function StudioLayout({ children }: { children: React.ReactNode }) {
  const identity = await requireAdmin();
  const projectsFile = await loadProjectsFile();
  const { store, projectId, projectName } = await getActiveStore();
  const publishStatus = await store.getPublishStatus();

  return (
    <StudioShell
      email={identity.email}
      projectName={projectName}
      projects={projectsFile.projects}
      activeProjectId={projectId}
      publishStatus={publishStatus}
    >
      {children}
    </StudioShell>
  );
}
