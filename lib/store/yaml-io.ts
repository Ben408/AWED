import fs from 'fs/promises';
import yaml from 'js-yaml';

export async function readYamlFile<T>(filePath: string): Promise<T | null> {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    return yaml.load(raw) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw error;
  }
}

export async function writeYamlFile(filePath: string, data: unknown): Promise<void> {
  const raw = yaml.dump(data, {
    lineWidth: 100,
    noRefs: true,
    quotingType: '"'
  });
  await fs.mkdir(pathDirname(filePath), { recursive: true });
  await fs.writeFile(filePath, raw, 'utf8');
}

function pathDirname(filePath: string): string {
  const idx = Math.max(filePath.lastIndexOf('/'), filePath.lastIndexOf('\\'));
  return idx >= 0 ? filePath.slice(0, idx) : '.';
}
