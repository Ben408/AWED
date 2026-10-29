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
  rootPath: string;
}> {
  const project = await getActiveProject();
  if (!project) {
    throw new Error(
      'No site project configured. Use Import existing project or add one in data/projects.json.'
    );
  }
  const rootPath = resolveProjectRoot(project.rootPath);
  return {
    store: new FsSiteStore(rootPath),
    projectId: project.id,
    projectName: project.name,
    rootPath
  };
}
