import Link from 'next/link';
import { getActiveStore } from '@/lib/server/get-store';

export default async function OverviewPage() {
  const { store, projectName } = await getActiveStore();
  const [site, pages, articles] = await Promise.all([
    store.getSite(),
    store.listPages(),
    store.listArticles()
  ]);
  const drafts = articles.filter((a) => a.location === 'drafts').length;
  const published = articles.filter((a) => a.location === 'articles').length;

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="font-display text-3xl font-semibold text-ink-900">{projectName}</h1>
        <p className="max-w-2xl text-ink-700">
          AWED 0.1 Alpha — manage structured site documents (pages, articles, agent metadata)
          without editing raw TypeScript. Saves write into the connected site project.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Pages" value={String(pages.length)} href="/pages" />
        <Stat label="Published articles" value={String(published)} href="/articles" />
        <Stat label="Drafts" value={String(drafts)} href="/articles" />
      </div>

      <section className="rounded-xl border border-ink-200 bg-white p-5">
        <h2 className="font-display text-lg font-semibold">Agent summary</h2>
        <p className="mt-2 text-sm text-ink-700">
          {site.agent.summary || 'Add an agent summary under Site settings.'}
        </p>
        {site.agent.facts.length ? (
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-ink-700">
            {site.agent.facts.map((fact) => (
              <li key={fact}>{fact}</li>
            ))}
          </ul>
        ) : null}
        <Link href="/site" className="mt-4 inline-block text-sm font-semibold">
          Edit site settings
        </Link>
      </section>
    </div>
  );
}

function Stat({ label, value, href }: { label: string; value: string; href: string }) {
  return (
    <Link
      href={href}
      className="rounded-xl border border-ink-200 bg-white p-4 no-underline shadow-sm transition hover:border-accent"
    >
      <p className="text-xs uppercase tracking-wide text-ink-700/70">{label}</p>
      <p className="mt-1 font-display text-3xl font-semibold text-ink-900">{value}</p>
    </Link>
  );
}
