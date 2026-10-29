import { describe, expect, it } from 'vitest';
import { extractAgentSurfaceFromHtml } from '@/lib/preview/agent-surface';

describe('extractAgentSurfaceFromHtml', () => {
  it('pulls title, description, and JSON-LD', () => {
    const html = `<!doctype html><html><head>
      <title>About Us</title>
      <meta name="description" content="We help globally." />
      <script type="application/ld+json">{"@type":"Organization","name":"Demo"}</script>
    </head><body></body></html>`;
    const surface = extractAgentSurfaceFromHtml(html, 'http://localhost/about');
    expect(surface.title).toBe('About Us');
    expect(surface.metaDescription).toBe('We help globally.');
    expect(surface.jsonLd[0]).toMatchObject({ '@type': 'Organization' });
  });
});
