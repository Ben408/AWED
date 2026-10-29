'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import type { ProjectEntry } from '@/lib/projects/registry';

export function ProjectSwitcher({
  projects,
  activeProjectId
}: {
  projects: ProjectEntry[];
  activeProjectId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  async function onChange(id: string) {
    startTransition(async () => {
      await fetch('/api/projects/active', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      router.refresh();
    });
  }

  return (
    <label className="flex items-center gap-2">
      <span className="sr-only">Site project</span>
      <select
        className="rounded-md border border-ink-200 bg-white px-2 py-1 text-sm"
        value={activeProjectId}
        disabled={pending}
        onChange={(e) => onChange(e.target.value)}
      >
        {projects.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
    </label>
  );
}
