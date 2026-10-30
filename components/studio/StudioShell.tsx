import Link from 'next/link';
import { ProjectSwitcher } from '@/components/studio/ProjectSwitcher';
import type { ProjectEntry } from '@/lib/projects/registry';
import type { PublishResult } from '@/lib/store/fs-site-store';

type StudioShellProps = {
  email: string;
  projectName: string;
  projects: ProjectEntry[];
  activeProjectId: string;
  publishStatus: PublishResult;
  children: React.ReactNode;
};

const NAV = [
  { href: '/', label: 'Overview' },
  { href: '/import', label: 'Import' },
  { href: '/library', label: 'Library' },
  { href: '/sitemap', label: 'Site map' },
  { href: '/articles', label: 'Articles' },
  { href: '/pages', label: 'Pages' },
  { href: '/links', label: 'Links' },
  { href: '/site', label: 'Site settings' },
  { href: '/publish', label: 'Publish' }
];

export function StudioShell({
  email,
  projectName,
  projects,
  activeProjectId,
  publishStatus,
  children
}: StudioShellProps) {
  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_#dbe7ef_0%,_#f4f6f8_45%,_#eef2f5_100%)]">
      <header className="border-b border-ink-200/80 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-6">
            <Link
              href="/"
              className="font-display text-xl font-bold tracking-tight text-ink-900 no-underline"
            >
              AWED
              <span className="ml-2 align-middle text-[10px] font-semibold uppercase tracking-wide text-accent">
                0.1 Alpha
              </span>
            </Link>
            <nav className="flex flex-wrap gap-3 text-sm font-medium text-ink-700">
              {NAV.map((item) => (
                <Link key={item.href} href={item.href} className="no-underline hover:text-accent">
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm text-ink-700">
            <ProjectSwitcher projects={projects} activeProjectId={activeProjectId} />
            <span className="hidden sm:inline">{email}</span>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[220px_1fr]">
        <aside className="space-y-4 text-sm">
          <div className="rounded-lg border border-ink-200 bg-white p-4">
            <p className="text-xs uppercase tracking-wide text-ink-700/70">Active site</p>
            <p className="mt-1 font-display font-semibold text-ink-900">{projectName}</p>
            <p className="mt-2 text-xs text-ink-700/70">Agentic Web Experience Designer</p>
          </div>
          <div className="rounded-lg border border-ink-200 bg-white p-4">
            <p className="text-xs uppercase tracking-wide text-ink-700/70">Publish</p>
            <p className="mt-1 text-ink-800">{publishStatus.message}</p>
            {publishStatus.at && publishStatus.at !== new Date(0).toISOString() ? (
              <p className="mt-2 text-xs text-ink-700/70">
                {new Date(publishStatus.at).toLocaleString()}
              </p>
            ) : null}
          </div>
        </aside>
        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}
