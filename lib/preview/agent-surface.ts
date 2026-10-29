export type AgentSurface = {
  url: string;
  title?: string;
  metaDescription?: string;
  jsonLd: unknown[];
  warnings: string[];
};

/** Extract machine-facing signals from rendered HTML (JSON-LD, meta). */
export function extractAgentSurfaceFromHtml(html: string, url: string): AgentSurface {
  const warnings: string[] = [];
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch?.[1]?.replace(/\s+/g, ' ').trim();

  const metaDescription =
    matchMeta(html, 'name', 'description') || matchMeta(html, 'property', 'og:description');

  const jsonLd: unknown[] = [];
  const scriptRe =
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;
  while ((match = scriptRe.exec(html))) {
    try {
      jsonLd.push(JSON.parse(match[1].trim()));
    } catch {
      warnings.push('Found JSON-LD script that did not parse as JSON');
    }
  }

  if (!jsonLd.length) {
    warnings.push('No application/ld+json blocks found in rendered HTML');
  }

  return { url, title, metaDescription, jsonLd, warnings };
}

function matchMeta(html: string, attr: string, value: string): string | undefined {
  const re = new RegExp(
    `<meta[^>]*${attr}=["']${value}["'][^>]*content=["']([^"']*)["'][^>]*>|<meta[^>]*content=["']([^"']*)["'][^>]*${attr}=["']${value}["'][^>]*>`,
    'i'
  );
  const m = html.match(re);
  return (m?.[1] || m?.[2])?.trim();
}
