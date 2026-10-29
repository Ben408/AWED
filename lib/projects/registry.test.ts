import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  loadProjectsFile,
  saveProjectsFile,
  setActiveProjectId,
  getActiveProject
} from '@/lib/projects/registry';

describe('projects registry', () => {
  let filePath: string;

  beforeEach(async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'fwp-proj-'));
    filePath = path.join(dir, 'projects.json');
    await saveProjectsFile(
      {
        version: 1,
        activeProjectId: 'a',
        projects: [
          { id: 'a', name: 'A', rootPath: '/tmp/a', kind: 'local' },
          { id: 'b', name: 'B', rootPath: '/tmp/b', kind: 'local' }
        ]
      },
      filePath
    );
  });

  afterEach(async () => {
    await fs.rm(path.dirname(filePath), { recursive: true, force: true });
  });

  it('loads and switches active project', async () => {
    const active = await getActiveProject(filePath);
    expect(active?.id).toBe('a');
    await setActiveProjectId('b', filePath);
    expect((await getActiveProject(filePath))?.id).toBe('b');
    const data = await loadProjectsFile(filePath);
    expect(data.activeProjectId).toBe('b');
  });

  it('rejects unknown project ids', async () => {
    await expect(setActiveProjectId('missing', filePath)).rejects.toThrow(/Unknown project/);
  });
});
