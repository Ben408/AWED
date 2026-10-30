/* Fixture sample for extract/apply tests — not a compilable Next route. */
export const metadata = {
  title: 'Case Studies | Fixture',
  description: 'Fixture case studies for AWED tests.'
};

const caseStudies = [
  {
    title: 'Enterprise SaaS Global Expansion',
    subtitle: 'From 1 to 60 Markets in 70 Days',
    industry: 'Enterprise SaaS',
    timeline: '70 days',
    challenge: 'Rapid international expansion across 60 markets',
    results: 'Complete market coverage 20 days ahead of schedule',
    slug: 'enterprise-saas-expansion',
    featured: true,
    metrics: [
      { label: 'Markets Launched', value: '60' },
      { label: 'Time to Market', value: '70 days' }
    ]
  },
  {
    title: 'FinTech European Expansion',
    subtitle: 'Strategic Market Entry',
    industry: 'FinTech',
    timeline: '3 months',
    challenge: 'European market expansion',
    results: '30% revenue increase',
    slug: 'fintech-european-expansion',
    featured: false,
    metrics: [
      { label: 'Markets Added', value: '5' },
      { label: 'Revenue Growth', value: '30%' }
    ]
  }
];

export default function CaseStudiesPage() {
  return (
    <section className="py-20">
      <div className="space-y-12">
        <div className="max-w-3xl space-y-6">
          <h1 className="text-4xl font-semibold tracking-tight text-zinc-900 dark:text-white">Case Studies</h1>
          <p className="text-lg text-zinc-600 dark:text-zinc-300">
            Explore how organizations achieve remarkable results.
          </p>
        </div>
        <div className="grid gap-8 lg:grid-cols-2">
          {caseStudies.map((study) => (
            <article key={study.slug}>{study.title}</article>
          ))}
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-8 text-center dark:border-zinc-800 dark:bg-zinc-900">
          <h3 className="text-xl font-semibold text-zinc-900 dark:text-white mb-4">
            Ready to Create Your Success Story?
          </h3>
          <p className="text-base text-zinc-600 dark:text-zinc-300 mb-6">
            Let&apos;s discuss how we can help your organization.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/contact">Start Your Project</Link>
            <Link href="/services">View Our Services</Link>
          </div>
        </div>
      </div>
    </section>
  );
}
