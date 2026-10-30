import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Resources | Fixture',
  description: 'Fixture resources page.'
};

const resources = [
  {
    title: 'Cultural Dimensions Guide',
    description: 'Standalone guide to Geert Hofstede\'s six cultural dimensions.',
    href: '/resources/cultural-dimensions-guide.pdf'
  }
];

const categories = [
  { name: 'All', count: resources.length },
  { name: 'Strategy', count: 1 }
];

export default function ResourcesPage() {
  return (
    <section>
      <h1 className="text-4xl">Globalization Resources</h1>
      <p className="text-lg text-zinc-600">Access free tools and guides.</p>
      <div>{categories.map((c) => c.name).join(',')}</div>
      <div>{resources.map((r) => r.title).join(',')}</div>
    </section>
  );
}
