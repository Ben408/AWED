/** Scaffold a BC-style marketing page.tsx (editable by AWED region extractors). */
export function scaffoldMarketingPageTsx(input: {
  title: string;
  description: string;
  heading: string;
  lead: string;
  componentName: string;
}): string {
  return `import { Metadata } from 'next';
import { Container } from '@/components/ui/container';

export const metadata: Metadata = {
  title: ${JSON.stringify(input.title)},
  description: ${JSON.stringify(input.description)}
};

export default function ${input.componentName}() {
  return (
    <section className="py-20">
      <Container className="space-y-12">
        <div className="max-w-3xl space-y-6">
          <h1 className="text-4xl font-semibold tracking-tight text-zinc-900 dark:text-white">${escapeJsx(
            input.heading
          )}</h1>
          <p className="text-lg text-zinc-600 dark:text-zinc-300">
            ${escapeJsx(input.lead)}
          </p>
        </div>
      </Container>
    </section>
  );
}
`;
}

export function routeToComponentName(route: string): string {
  const parts = route
    .split('/')
    .filter(Boolean)
    .map((part) =>
      part
        .split('-')
        .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
        .join('')
    );
  return (parts.join('') || 'Home') + 'Page';
}

export function routeToAppPath(route: string): string {
  if (route === '/') return 'app/page.tsx';
  const segments = route.replace(/^\//, '').replace(/\/$/, '');
  return `app/${segments}/page.tsx`;
}

export function slugifyTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 64) || 'new-page';
}

function escapeJsx(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\{/g, '&#123;')
    .replace(/\}/g, '&#125;');
}
