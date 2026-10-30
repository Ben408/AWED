import { z } from 'zod';

export const stringRegionSchema = z.object({
  kind: z.literal('string'),
  id: z.string(),
  label: z.string(),
  audience: z.enum(['human', 'agent', 'both']),
  value: z.string()
});

export const stringListRegionSchema = z.object({
  kind: z.literal('stringList'),
  id: z.string(),
  label: z.string(),
  audience: z.enum(['human', 'agent', 'both']),
  values: z.array(z.string())
});

export const objectListRegionSchema = z.object({
  kind: z.literal('objectList'),
  id: z.string(),
  label: z.string(),
  audience: z.enum(['human', 'agent', 'both']),
  fields: z.array(z.string()),
  /** Fields stored as newline-joined text in the UI, serialized as string[] in TSX. */
  listFields: z.array(z.string()).default([]),
  /** Fields stored as 'true' / 'false' strings in the UI, serialized as boolean literals in TSX. */
  booleanFields: z.array(z.string()).default([]),
  /** Nested arrays of string-only objects, stored as JSON strings in row values. */
  recordListFields: z.array(z.string()).default([]),
  rows: z.array(z.record(z.string()))
});

export const editableRegionSchema = z.discriminatedUnion('kind', [
  stringRegionSchema,
  stringListRegionSchema,
  objectListRegionSchema
]);

export type EditableRegion = z.infer<typeof editableRegionSchema>;

export type TsxEditModel = {
  path: string;
  regions: EditableRegion[];
  warnings: string[];
};

type Span = { start: number; end: number };

/**
 * Extract editable regions from an existing page.tsx and write them back in place.
 * The live TSX file remains the source of truth — no page refactor required.
 */
export function extractTsxRegions(source: string, filePath: string): TsxEditModel {
  const warnings: string[] = [];
  const regions: EditableRegion[] = [];
  const spans = new Map<string, Span>();

  const meta = matchBlock(
    source,
    /export const metadata(?:\s*:\s*[A-Za-z0-9_.<>,\s]+)?\s*=\s*\{[\s\S]*?\n\};/
  );
  if (meta) {
    addStringProp(source, meta, 'title', 'metadata.title', 'Page title', 'both', regions, spans);
    addStringProp(
      source,
      meta,
      'description',
      'metadata.description',
      'Meta description (agents + SEO)',
      'agent',
      regions,
      spans
    );
  } else {
    warnings.push('No export const metadata block found');
  }

  const constArrayRe =
    /(?:export\s+)?const\s+([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(\[[\s\S]*?\n\]);/g;
  let match: RegExpExecArray | null;
  while ((match = constArrayRe.exec(source))) {
    const name = match[1];
    const arraySrc = match[2];
    const start = match.index + match[0].indexOf(arraySrc);
    const end = start + arraySrc.length;

    if (looksLikeStringArray(arraySrc)) {
      regions.push({
        kind: 'stringList',
        id: `const.${name}`,
        label: humanize(name),
        audience: 'human',
        values: parseStringArray(arraySrc)
      });
      spans.set(`const.${name}`, { start, end });
      continue;
    }

    const objectList = parseObjectArray(arraySrc);
    if (objectList) {
      regions.push({
        kind: 'objectList',
        id: `const.${name}`,
        label: humanize(name),
        audience: 'human',
        fields: objectList.fields,
        listFields: objectList.listFields,
        booleanFields: objectList.booleanFields,
        recordListFields: objectList.recordListFields,
        rows: objectList.rows
      });
      spans.set(`const.${name}`, { start, end });
    }
  }

  extractJsxTextRegions(source, regions, spans);

  if (!regions.length) {
    warnings.push('No editable metadata, data arrays, or simple JSX text detected in this file');
  }

  rememberSpans(filePath, source, spans);
  return { path: filePath, regions, warnings };
}

/** Capture simple human-facing JSX text nodes (h1 / lead paragraphs). */
function extractJsxTextRegions(
  source: string,
  regions: EditableRegion[],
  spans: Map<string, Span>
) {
  const patterns: { id: string; label: string; re: RegExp; allowBreaks?: boolean }[] = [
    {
      id: 'jsx.h1',
      label: 'Page heading',
      re: /<h1\b[^>]*>\s*([^<{]+?)\s*<\/h1>/i
    },
    {
      id: 'jsx.lead',
      label: 'Lead paragraph',
      // Allow simple <br /> inside lead copy (services page).
      re: /<p className="text-lg[^"]*"[^>]*>\s*([\s\S]*?)\s*<\/p>/i,
      allowBreaks: true
    }
  ];

  for (const pattern of patterns) {
    const m = source.match(pattern.re);
    if (!m || m.index === undefined) continue;
    let inner = m[1];
    if (pattern.allowBreaks) {
      if (/<(?!br\s*\/?>)/i.test(inner)) continue; // nested non-br markup → skip
      inner = inner.replace(/<br\s*\/?>/gi, '\n');
    } else if (/[<{]/.test(inner)) {
      continue;
    }
    const text = inner.replace(/[ \t]+/g, ' ').replace(/\n+/g, '\n').trim();
    if (!text) continue;
    const absolute = m.index + m[0].indexOf(m[1]);
    regions.push({
      kind: 'string',
      id: pattern.id,
      label: pattern.label,
      audience: 'human',
      value: text
    });
    spans.set(pattern.id, { start: absolute, end: absolute + m[1].length });
  }

  extractCtaRegions(source, regions, spans);
}

/**
 * CTA band: `<div className="rounded-…"> <h3>…</h3> <p className="text-base …">…</p>
 * [<div …>] <Link href="…">label</Link> [<Link href="…">label</Link>] </div>`.
 */
function extractCtaRegions(
  source: string,
  regions: EditableRegion[],
  spans: Map<string, Span>
) {
  const re =
    /<div\s+className="rounded[^"]*"[^>]*>\s*<h3\b[^>]*>\s*([^<{]+?)\s*<\/h3>\s*<p\s+className="text-base[^"]*"[^>]*>\s*([^<{]+?)\s*<\/p>\s*(?:<div\b[^>]*>\s*)?<Link\b([^>]*)>\s*([^<{]+?)\s*<\/Link>(?:\s*<Link\b([^>]*)>\s*([^<{]+?)\s*<\/Link>)?/;
  const m = re.exec(source);
  if (!m) return;

  let cursor = m.index;
  const locate = (text: string): Span => {
    const start = source.indexOf(text, cursor);
    cursor = start + text.length;
    return { start, end: cursor };
  };

  const addText = (id: string, label: string, raw: string) => {
    const span = locate(raw);
    regions.push({
      kind: 'string',
      id,
      label,
      audience: 'human',
      value: decodeJsxText(raw.replace(/\s+/g, ' ').trim())
    });
    spans.set(id, span);
  };

  const addHref = (id: string, label: string, attrs: string | undefined) => {
    if (!attrs) return;
    const hm = /\bhref="([^"{}]*)"/.exec(attrs);
    if (!hm) return;
    const attrsSpan = locate(attrs);
    const hrefStart = attrsSpan.start + hm.index + hm[0].indexOf('"') + 1;
    regions.push({
      kind: 'string',
      id,
      label,
      audience: 'human',
      value: hm[1]
    });
    spans.set(id, { start: hrefStart, end: hrefStart + hm[1].length });
  };

  addText('jsx.cta.heading', 'CTA heading', m[1]);
  addText('jsx.cta.body', 'CTA body', m[2]);
  addHref('jsx.cta.primaryHref', 'CTA primary link (href)', m[3]);
  addText('jsx.cta.primaryLabel', 'CTA primary button label', m[4]);
  if (m[6]) {
    addHref('jsx.cta.secondaryHref', 'CTA secondary link (href)', m[5]);
    addText('jsx.cta.secondaryLabel', 'CTA secondary button label', m[6]);
  }
}

function decodeJsxText(value: string): string {
  return value
    .replace(/&apos;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

function encodeJsxText(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/'/g, '&apos;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\{/g, '&#123;')
    .replace(/\}/g, '&#125;')
    .replace(/\s*\n\s*/g, ' ');
}

export function applyTsxRegions(
  source: string,
  filePath: string,
  regions: EditableRegion[]
): string {
  const remembered = recallSpans(filePath, source);
  if (!remembered) {
    throw new Error(
      'Edit session expired or file changed on disk. Reload the page editor and try again.'
    );
  }

  const updates: { start: number; end: number; next: string }[] = [];
  for (const region of regions) {
    const span = remembered.get(region.id);
    if (!span) continue;
    updates.push({ start: span.start, end: span.end, next: serializeRegion(region) });
  }

  updates.sort((a, b) => b.start - a.start);
  let next = source;
  for (const update of updates) {
    next = next.slice(0, update.start) + update.next + next.slice(update.end);
  }
  return next;
}

function serializeRegion(region: EditableRegion): string {
  if (region.kind === 'string') {
    // JSX text spans are raw (unquoted). Metadata / other string props stay quoted.
    if (region.id.startsWith('jsx.')) {
      if (/^jsx\.cta\.\w+Href$/.test(region.id)) {
        return region.value.replace(/"/g, '%22').replace(/[\r\n]+/g, '');
      }
      if (region.id.startsWith('jsx.cta.')) {
        return encodeJsxText(region.value).trim();
      }
      if (region.id === 'jsx.lead' && region.value.includes('\n')) {
        return region.value
          .split('\n')
          .map((part) => part.trim())
          .filter(Boolean)
          .join(' <br /><br />');
      }
      return region.value;
    }
    return quoteTsString(region.value);
  }
  if (region.kind === 'stringList') {
    const lines = region.values.map((v) => `  ${quoteTsString(v)},`);
    return `[\n${lines.join('\n')}\n]`;
  }
  const listFields = new Set(region.listFields ?? []);
  const booleanFields = new Set(region.booleanFields ?? []);
  const recordListFields = new Set(region.recordListFields ?? []);
  const rows = region.rows.map((row) => {
    const props = region.fields
      .map((field) => {
        if (booleanFields.has(field)) {
          return `    ${field}: ${/^\s*true\s*$/i.test(row[field] ?? '') ? 'true' : 'false'}`;
        }
        if (recordListFields.has(field)) {
          const records = parseRecordJson(row[field] ?? '');
          if (!records.length) return `    ${field}: []`;
          const lines = records.map((rec) => {
            const inner = Object.entries(rec)
              .map(([k, v]) => `${k}: ${quoteTsString(v)}`)
              .join(', ');
            return `      { ${inner} },`;
          });
          return `    ${field}: [\n${lines.join('\n')}\n    ]`;
        }
        if (listFields.has(field)) {
          const items = (row[field] ?? '')
            .split('\n')
            .map((s) => s.trim())
            .filter(Boolean);
          if (!items.length) return `    ${field}: []`;
          const lines = items.map((v) => `      ${quoteTsString(v)},`);
          return `    ${field}: [\n${lines.join('\n')}\n    ]`;
        }
        return `    ${field}: ${quoteTsString(row[field] ?? '')}`;
      })
      .join(',\n');
    return `  {\n${props}\n  }`;
  });
  return `[\n${rows.join(',\n')}\n]`;
}

function addStringProp(
  source: string,
  block: { start: number; end: number; text: string },
  key: string,
  id: string,
  label: string,
  audience: 'human' | 'agent' | 'both',
  regions: EditableRegion[],
  spans: Map<string, Span>
) {
  const re = new RegExp(`${key}\\s*:\\s*(['\`"])([\\s\\S]*?)\\1`);
  const m = block.text.match(re);
  if (!m || m.index === undefined) return;
  const quoted = m[0].slice(m[0].indexOf(m[1]));
  const absolute = block.start + m.index + m[0].indexOf(m[1]);
  regions.push({
    kind: 'string',
    id,
    label,
    audience,
    value: unescape(m[2])
  });
  spans.set(id, { start: absolute, end: absolute + quoted.length });
  void source;
}

function matchBlock(
  source: string,
  re: RegExp
): { start: number; end: number; text: string } | null {
  const m = source.match(re);
  if (!m || m.index === undefined) return null;
  return { start: m.index, end: m.index + m[0].length, text: m[0] };
}

function looksLikeStringArray(src: string): boolean {
  const inner = src.trim().slice(1, -1).trim();
  if (!inner) return true;
  if (/^\s*\{/.test(inner)) return false;
  return /^\s*['"`]/.test(inner);
}

function parseStringArray(src: string): string[] {
  const values: string[] = [];
  const re = /(['"`])([\s\S]*?)\1/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) values.push(unescape(m[2]));
  return values;
}

type FieldKind = 'string' | 'boolean' | 'list' | 'record' | 'emptyArray';

type ParsedObjectBody = {
  row: Record<string, string>;
  kinds: Record<string, FieldKind>;
};

type ParsedObjectArray = {
  fields: string[];
  listFields: string[];
  booleanFields: string[];
  recordListFields: string[];
  rows: Record<string, string>[];
};

function mergeKind(prev: FieldKind | undefined, next: FieldKind): FieldKind | null {
  if (!prev || prev === next) return next;
  if (prev === 'emptyArray' && (next === 'list' || next === 'record')) return next;
  if (next === 'emptyArray' && (prev === 'list' || prev === 'record')) return prev;
  return null;
}

function parseObjectArray(src: string): ParsedObjectArray | null {
  const rows: Record<string, string>[] = [];
  const kinds = new Map<string, FieldKind>();
  let i = 0;
  let found = false;

  while (i < src.length) {
    if (src[i] !== '{') {
      i += 1;
      continue;
    }
    const bodyStart = i + 1;
    const bodyEnd = findMatching(src, i, '{', '}');
    if (bodyEnd < 0) return null;
    found = true;
    const body = src.slice(bodyStart, bodyEnd);
    // Skip objects with expressions / unsupported props so write-back cannot destroy code.
    const parsed = parseStringObjectBody(body);
    if (!parsed) return null;
    for (const [key, kind] of Object.entries(parsed.kinds)) {
      const merged = mergeKind(kinds.get(key), kind);
      if (!merged) return null; // same field changes type between rows
      kinds.set(key, merged);
    }
    rows.push(parsed.row);
    i = bodyEnd + 1;
  }

  if (!found || !rows.length) return null;

  const fields = [...kinds.keys()];
  const listFields: string[] = [];
  const booleanFields: string[] = [];
  const recordListFields: string[] = [];
  for (const field of fields) {
    const kind = kinds.get(field);
    if (kind === 'boolean') booleanFields.push(field);
    else if (kind === 'record') recordListFields.push(field);
    else if (kind === 'list' || kind === 'emptyArray') listFields.push(field);
  }
  // Empty `[]` in a record-list column becomes an empty JSON array.
  for (const field of recordListFields) {
    for (const row of rows) if (!row[field]) row[field] = '[]';
  }

  return { fields, listFields, booleanFields, recordListFields, rows };
}

/**
 * Parse an object body (without outer braces). Supported prop values:
 * quoted strings, `true` / `false`, string arrays, and arrays of string-only objects.
 * Returns null on anything else (expressions, numbers, identifiers, …).
 * With `flat`, only quoted strings are accepted (used for nested records).
 */
function parseStringObjectBody(
  body: string,
  options: { flat?: boolean } = {}
): ParsedObjectBody | null {
  const row: Record<string, string> = {};
  const kinds: Record<string, FieldKind> = {};
  let i = 0;
  const len = body.length;

  while (i < len) {
    while (i < len && /[\s,]/.test(body[i])) i += 1;
    if (i >= len) break;

    const keyMatch = /^([A-Za-z_][A-Za-z0-9_]*)\s*:/.exec(body.slice(i));
    if (!keyMatch) return null;
    const key = keyMatch[1];
    if (key in row) return null; // duplicate key
    i += keyMatch[0].length;
    while (i < len && /\s/.test(body[i])) i += 1;
    if (i >= len) return null;

    const ch = body[i];
    if (ch === "'" || ch === '"' || ch === '`') {
      const closed = readQuotedString(body, i);
      if (!closed) return null;
      row[key] = closed.value;
      kinds[key] = 'string';
      i = closed.end;
    } else if (options.flat) {
      return null;
    } else if (ch === 't' || ch === 'f') {
      const bm = /^(true|false)(?![A-Za-z0-9_$.])/.exec(body.slice(i));
      if (!bm) return null;
      row[key] = bm[1];
      kinds[key] = 'boolean';
      i += bm[1].length;
    } else if (ch === '[') {
      const close = findMatching(body, i, '[', ']');
      if (close < 0) return null;
      const inner = body.slice(i + 1, close);
      const trimmed = inner.trim();
      if (!trimmed) {
        row[key] = '';
        kinds[key] = 'emptyArray';
      } else if (trimmed[0] === '{') {
        const records = parseRecordArrayInner(inner);
        if (!records) return null;
        row[key] = JSON.stringify(records);
        kinds[key] = 'record';
      } else {
        const items = parseStringArrayInner(inner);
        if (!items) return null;
        row[key] = items.join('\n');
        kinds[key] = 'list';
      }
      i = close + 1;
    } else {
      return null;
    }

    // After a value only whitespace + a comma (or end of body) may follow.
    while (i < len && /\s/.test(body[i])) i += 1;
    if (i < len && body[i] !== ',') return null;
  }

  return Object.keys(row).length ? { row, kinds } : null;
}

/** `'a', "b",` → ['a', 'b']; null if anything other than quoted strings. */
function parseStringArrayInner(inner: string): string[] | null {
  const items: string[] = [];
  let i = 0;
  while (i < inner.length) {
    while (i < inner.length && /[\s,]/.test(inner[i])) i += 1;
    if (i >= inner.length) break;
    const q = readQuotedString(inner, i);
    if (!q) return null;
    if (q.value.includes('\n')) return null; // would be split by the newline-joined editor
    items.push(q.value);
    i = q.end;
    while (i < inner.length && /\s/.test(inner[i])) i += 1;
    if (i < inner.length && inner[i] !== ',') return null;
  }
  return items;
}

/** `{ a: 'x' }, { a: 'y' }` → rows; null if any object has non-string props. */
function parseRecordArrayInner(inner: string): Record<string, string>[] | null {
  const records: Record<string, string>[] = [];
  let i = 0;
  while (i < inner.length) {
    while (i < inner.length && /[\s,]/.test(inner[i])) i += 1;
    if (i >= inner.length) break;
    if (inner[i] !== '{') return null;
    const close = findMatching(inner, i, '{', '}');
    if (close < 0) return null;
    const parsed = parseStringObjectBody(inner.slice(i + 1, close), { flat: true });
    if (!parsed) return null;
    records.push(parsed.row);
    i = close + 1;
  }
  return records.length ? records : null;
}

/** Parse the JSON stored in a recordList row value; tolerant of bad edits. */
function parseRecordJson(value: string): Record<string, string>[] {
  if (!value.trim()) return [];
  try {
    const data: unknown = JSON.parse(value);
    if (!Array.isArray(data)) return [];
    const out: Record<string, string>[] = [];
    for (const item of data) {
      if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
      const rec: Record<string, string> = {};
      for (const [k, v] of Object.entries(item as Record<string, unknown>)) {
        if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(k)) continue;
        rec[k] = typeof v === 'string' ? v : String(v ?? '');
      }
      if (Object.keys(rec).length) out.push(rec);
    }
    return out;
  } catch {
    return [];
  }
}

/** Find the matching close char for the open char at `openIndex`, skipping strings. */
function findMatching(src: string, openIndex: number, open: string, close: string): number {
  let depth = 0;
  let i = openIndex;
  while (i < src.length) {
    const ch = src[i];
    if (ch === "'" || ch === '"' || ch === '`') {
      const q = readQuotedString(src, i);
      if (!q) return -1;
      i = q.end;
      continue;
    }
    if (ch === open) depth += 1;
    else if (ch === close) {
      depth -= 1;
      if (depth === 0) return i;
    }
    i += 1;
  }
  return -1;
}

/** Read a JS string starting at `start` (must be a quote char). */
function readQuotedString(
  src: string,
  start: number
): { value: string; end: number } | null {
  const quote = src[start];
  if (quote !== "'" && quote !== '"' && quote !== '`') return null;
  let i = start + 1;
  let raw = '';
  while (i < src.length) {
    const ch = src[i];
    if (ch === '\\' && i + 1 < src.length) {
      raw += ch + src[i + 1];
      i += 2;
      continue;
    }
    if (ch === quote) {
      return { value: unescape(raw), end: i + 1 };
    }
    raw += ch;
    i += 1;
  }
  return null;
}

function quoteTsString(value: string): string {
  const escaped = value
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\n/g, '\\n');
  return `'${escaped}'`;
}

function unescape(value: string): string {
  return value
    .replace(/\\n/g, '\n')
    .replace(/\\'/g, "'")
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, '\\');
}

function humanize(name: string): string {
  return name
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .replace(/^\w/, (c) => c.toUpperCase());
}

type Memory = { source: string; spans: Map<string, Span> };
const spanMemory = new Map<string, Memory>();

function rememberSpans(filePath: string, source: string, spans: Map<string, Span>) {
  spanMemory.set(filePath, { source, spans });
}

function recallSpans(filePath: string, source: string): Map<string, Span> | null {
  const mem = spanMemory.get(filePath);
  if (!mem || mem.source !== source) return null;
  return mem.spans;
}

export function clearTsxSpanMemory() {
  spanMemory.clear();
}
