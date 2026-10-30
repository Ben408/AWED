import fs from 'fs/promises';
import path from 'path';
import type { FooterGroup, NavItem } from '@/lib/schema/site';

const NAV_EXPORT_RE =
  /export const navItems(?::\s*NavItem\[\])?\s*=\s*\[[\s\S]*?\];/;

const FOOTER_EXPORT_RE =
  /export const footerNavGroups(?::\s*FooterNavGroup\[\])?\s*=\s*\[[\s\S]*?\];/;

/** Read curated nav from the site's lib/constants.ts when present. */
export async function readConstantsNav(siteRoot: string): Promise<NavItem[] | null> {
  const filePath = path.join(siteRoot, 'lib', 'constants.ts');
  try {
    const source = await fs.readFile(filePath, 'utf8');
    const match = source.match(NAV_EXPORT_RE);
    if (!match) return null;
    const items: NavItem[] = [];
    const itemRe = /\{\s*label:\s*(['"`])([\s\S]*?)\1\s*,\s*href:\s*(['"`])([\s\S]*?)\3\s*\}/g;
    let m: RegExpExecArray | null;
    while ((m = itemRe.exec(match[0]))) {
      items.push({ label: m[2], href: m[4], listed: true });
    }
    return items.length ? items : null;
  } catch {
    return null;
  }
}

/** Write navItems array back into lib/constants.ts (header source of truth). */
export async function writeConstantsNav(siteRoot: string, nav: NavItem[]): Promise<boolean> {
  const filePath = path.join(siteRoot, 'lib', 'constants.ts');
  let source: string;
  try {
    source = await fs.readFile(filePath, 'utf8');
  } catch {
    return false;
  }
  if (!NAV_EXPORT_RE.test(source)) return false;

  const lines = nav
    .filter((item) => item.listed !== false)
    .map((item) => `  { label: ${quote(item.label)}, href: ${quote(item.href)} }`)
    .join(',\n');
  const nextBlock = `export const navItems: NavItem[] = [\n${lines}\n];`;
  const next = source.replace(NAV_EXPORT_RE, nextBlock);
  await fs.writeFile(filePath, next, 'utf8');
  return true;
}

export async function writeConstantsFooterGroups(
  siteRoot: string,
  groups: FooterGroup[]
): Promise<boolean> {
  const filePath = path.join(siteRoot, 'lib', 'constants.ts');
  let source: string;
  try {
    source = await fs.readFile(filePath, 'utf8');
  } catch {
    return false;
  }

  const groupBlocks = groups
    .map((group) => {
      const links = group.links
        .filter((l) => l.listed !== false)
        .map((l) => `      { label: ${quote(l.label)}, href: ${quote(l.href)} }`)
        .join(',\n');
      return `  {\n    title: ${quote(group.title)},\n    links: [\n${links}\n    ]\n  }`;
    })
    .join(',\n');

  const nextBlock = `export const footerNavGroups: FooterNavGroup[] = [\n${groupBlocks}\n];`;

  if (!source.includes('export type FooterNavGroup')) {
    source = source.replace(
      /export type NavItem = \{[\s\S]*?\};/,
      (m) =>
        `${m}\n\nexport type FooterNavGroup = {\n  title: string;\n  links: NavItem[];\n};`
    );
  }

  if (FOOTER_EXPORT_RE.test(source)) {
    source = source.replace(FOOTER_EXPORT_RE, nextBlock);
  } else {
    source = `${source.trimEnd()}\n\n${nextBlock}\n`;
  }

  await fs.writeFile(filePath, source, 'utf8');
  return true;
}

function quote(value: string): string {
  return `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}
