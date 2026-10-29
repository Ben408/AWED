import { SiteSettingsForm } from '@/components/studio/SiteSettingsForm';
import { getActiveStore } from '@/lib/server/get-store';

export default async function SiteSettingsPage() {
  const { store } = await getActiveStore();
  const site = await store.getSite();

  return (
    <div className="space-y-4">
      <h1 className="font-display text-3xl font-semibold">Site settings</h1>
      <p className="text-sm text-ink-700">
        Brand, SEO defaults, and agent-facing facts stored in <code className="font-mono">site.yaml</code>.
      </p>
      <SiteSettingsForm initial={site} />
    </div>
  );
}
