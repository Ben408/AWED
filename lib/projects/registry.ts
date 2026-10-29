import fs from 'fs/promises';
import path from 'path';
import { z } from 'zod';

export const projectEntrySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  rootPath: z.string().min(1),
  kind: z.enum(['local', 'github']).default('local'),
  github: z
    .object({
      owner: z.string(),
      repo: z.string(),
      branch: z.string().default('main'),
      contentRoot: z.string().default('')
    })
    .optional(),
  publicUrl: z.string().optional()
});

export const projectsFileSchema = z.object({
  version: z.literal(1),
  activeProjectId: z.string().optional(),
  projects: z.array(projectEntrySchema)
});

export type ProjectEntry = z.infer<typeof projectEntrySchema>;
export type ProjectsFile = z.infer<typeof projectsFileSchema>;

export function defaultProjectsFilePath(): string {
  return process.env.FWP_PROJECTS_FILE?.trim() || path.join(process.cwd(), 'data', 'projects.json');
}

export async function loadProjectsFile(filePath = defaultProjectsFilePath()): Promise<ProjectsFile> {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    return projectsFileSchema.parse(JSON.parse(raw));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return { version: 1, projects: [], activeProjectId: undefined };
    }
    throw error;
  }
}

export async function saveProjectsFile(
  data: ProjectsFile,
  filePath = defaultProjectsFilePath()
): Promise<void> {
  const parsed = projectsFileSchema.parse(data);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(parsed, null, 2) + '\n', 'utf8');
}

export async function getActiveProject(
  filePath = defaultProjectsFilePath()
): Promise<ProjectEntry | null> {
  const data = await loadProjectsFile(filePath);
  if (!data.projects.length) return null;
  const active =
    data.projects.find((p) => p.id === data.activeProjectId) ?? data.projects[0] ?? null;
  return active;
}

export async function setActiveProjectId(
  id: string,
  filePath = defaultProjectsFilePath()
): Promise<ProjectsFile> {
  const data = await loadProjectsFile(filePath);
  if (!data.projects.some((p) => p.id === id)) {
    throw new Error(`Unknown project: ${id}`);
  }
  data.activeProjectId = id;
  await saveProjectsFile(data, filePath);
  return data;
}
