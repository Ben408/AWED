/** Known MDX embeds registered (or expected) on the attached site. */
export type MdxEmbed = {
  id: string;
  label: string;
  tag: string;
  description: string;
};

export const MDX_EMBED_CATALOG: MdxEmbed[] = [
  {
    id: 'generative-ui-demo',
    label: 'Generative UI demo',
    tag: '<GenerativeUiDemo />',
    description:
      'Interactive simulation used on the localization article. Requires registration in components/mdx/mdx-components.tsx.'
  }
];

export function insertMdxEmbed(body: string, tag: string): string {
  const trimmed = body.trimEnd();
  if (trimmed.includes(tag)) return body;
  if (!trimmed) return `${tag}\n`;
  return `${trimmed}\n\n${tag}\n`;
}
