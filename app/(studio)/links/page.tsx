import Link from 'next/link';
import { checkInternalLinks } from '@/lib/catalog/link-check';
import { getActiveStore } from '@/lib/server/get-store';

/** Link review — PageMill Preview mode was for following and testing links. */
export default async function LinksPage() {
  const { store } = await getActiveStore();
  const [site, pages] = await Promise.all([store.getSite(), store.listPages()]);
  const issues = checkInternalLinks(pages, site);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-semibold">Links</h1>
        <p className="mt-1 text-sm text-ink-700">
          Internal link check across page documents (external URLs are skipped). Inspired by
          PageMill’s “test links in Preview” workflow—without copying Adobe’s UI.
        </p>
      </header>

      <div className="rounded-xl border border-ink-200 bg-white p-5">
        {issues.length ? (
          <ul className="space-y-3 text-sm">
            {issues.map((issue, index) => (
              <li
                key={`${issue.href}-${index}`}
                className={
                  issue.severity === 'error'
                    ? 'rounded-md border border-red-200 bg-red-50 px-3 py-2 text-red-900'
                    : 'rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-amber-950'
                }
              >
                <p className="font-semibold">
                  {issue.severity.toUpperCase()}: {issue.message}
                </p>
                <p className="mt-1 font-mono text-xs">{issue.href}</p>
                <p className="text-xs opacity-80">{issue.where}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-ink-700">No internal link issues found in page documents.</p>
        )}
        <p className="mt-4 text-sm">
          Fix links in the{' '}
          <Link href="/pages" className="font-semibold">
            Pages
          </Link>{' '}
          editor, then return here to re-check.
        </p>
      </div>
    </div>
  );
}
