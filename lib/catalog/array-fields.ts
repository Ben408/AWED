/**
 * Field layouts for block prop arrays edited as structured rows in the Inspector.
 */

export type RowFieldDef = {
  key: string;
  label: string;
  multiline?: boolean;
};

export type ArrayFieldLayout = {
  itemLabel: string;
  fields: RowFieldDef[];
  blank: () => Record<string, string>;
};

const LAYOUTS: Record<string, ArrayFieldLayout> = {
  items: {
    itemLabel: 'Item',
    fields: [
      { key: 'title', label: 'Title' },
      { key: 'description', label: 'Description', multiline: true },
      { key: 'question', label: 'Question' },
      { key: 'answer', label: 'Answer', multiline: true }
    ],
    blank: () => ({})
  },
  people: {
    itemLabel: 'Person',
    fields: [
      { key: 'name', label: 'Name' },
      { key: 'role', label: 'Role' },
      { key: 'bio', label: 'Bio', multiline: true }
    ],
    blank: () => ({ name: '', role: '', bio: '' })
  },
  partners: {
    itemLabel: 'Partner',
    fields: [
      { key: 'name', label: 'Name' },
      { key: 'href', label: 'Link' },
      { key: 'logoSrc', label: 'Logo path' }
    ],
    blank: () => ({ name: '', href: '', logoSrc: '' })
  }
};

/** Infer which fields to show from the first row (or a known array key). */
export function resolveArrayLayout(
  arrayKey: string,
  rows: unknown[]
): ArrayFieldLayout {
  if (arrayKey === 'people') return LAYOUTS.people;
  if (arrayKey === 'partners') return LAYOUTS.partners;

  const sample = (rows.find((row) => row && typeof row === 'object') ?? {}) as Record<
    string,
    unknown
  >;
  const keys = Object.keys(sample);

  if (keys.includes('question') || keys.includes('answer')) {
    return {
      itemLabel: 'Item',
      fields: [
        { key: 'question', label: 'Question' },
        { key: 'answer', label: 'Answer', multiline: true }
      ],
      blank: () => ({ question: '', answer: '' })
    };
  }

  if (keys.includes('title') || keys.includes('description') || arrayKey === 'items') {
    return {
      itemLabel: 'Item',
      fields: [
        { key: 'title', label: 'Title' },
        { key: 'description', label: 'Description', multiline: true }
      ],
      blank: () => ({ title: '', description: '' })
    };
  }

  if (LAYOUTS[arrayKey]) return LAYOUTS[arrayKey];

  const inferredFields =
    keys.length > 0
      ? keys.map((key) => ({ key, label: capitalize(key), multiline: false }))
      : [{ key: 'value', label: 'Value' }];

  return {
    itemLabel: 'Item',
    fields: inferredFields,
    blank: () =>
      Object.fromEntries(inferredFields.map((field) => [field.key, ''])) as Record<string, string>
  };
}

export function createBlankRow(arrayKey: string, rows: unknown[]): Record<string, string> {
  return resolveArrayLayout(arrayKey, rows).blank();
}

export function updateRowField(
  rows: Record<string, unknown>[],
  index: number,
  field: string,
  value: string
): Record<string, unknown>[] {
  return rows.map((row, i) => (i === index ? { ...row, [field]: value } : row));
}

export function removeRow<T>(rows: T[], index: number): T[] {
  return rows.filter((_, i) => i !== index);
}

export function addRow<T>(rows: T[], blank: T): T[] {
  return [...rows, blank];
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
