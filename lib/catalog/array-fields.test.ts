import { describe, expect, it } from 'vitest';
import {
  addRow,
  createBlankRow,
  removeRow,
  resolveArrayLayout,
  updateRowField
} from '@/lib/catalog/array-fields';

describe('array field layouts', () => {
  it('resolves FAQ question/answer rows', () => {
    const layout = resolveArrayLayout('items', [{ question: 'Q?', answer: 'A.' }]);
    expect(layout.fields.map((f) => f.key)).toEqual(['question', 'answer']);
    expect(createBlankRow('items', [{ question: 'Q?', answer: 'A.' }])).toEqual({
      question: '',
      answer: ''
    });
  });

  it('resolves service card title/description rows', () => {
    const layout = resolveArrayLayout('items', []);
    expect(layout.fields.map((f) => f.key)).toEqual(['title', 'description']);
  });

  it('updates, adds, and removes rows immutably', () => {
    const rows = [{ title: 'A', description: '1' }];
    const updated = updateRowField(rows, 0, 'title', 'B');
    expect(updated[0].title).toBe('B');
    expect(rows[0].title).toBe('A');

    const withNew = addRow(updated, { title: '', description: '' });
    expect(withNew).toHaveLength(2);

    expect(removeRow(withNew, 0)).toEqual([{ title: '', description: '' }]);
  });
});
