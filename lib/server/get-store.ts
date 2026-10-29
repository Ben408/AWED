import path from 'path';
import { getActiveProject } from '@/lib/projects/registry';
import { FsSiteStore } from '@/lib/store/fs-site-store';

export function resolveProjectRoot(rootPath: string): string {
  return path.isAbsolute(rootPath) ? rootPath : path.resolve(process.cwd(), rootPath);
}

export async function getActiveStore(): Promise<{
  store: FsSiteStore;
  projectId: string;
  projectName: string;
}> {
  const project = await getActiveProject();
  if (!project) {
    throw new Error('No site project configured. Add one in data/projects.json.');
  }
  return {
    store: new FsSiteStore(resolveProjectRoot(project.rootPath)),
    projectId: project.id,
    projectName: project.name
  };
}
