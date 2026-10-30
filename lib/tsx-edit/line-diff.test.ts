import { describe, expect, it } from 'vitest';
import { lineDiff } from '@/lib/tsx-edit/line-diff';

describe('lineDiff', () => {
  it('returns empty for identical input', () => {
    expect(lineDiff('a\nb', 'a\nb')).toEqual([]);
  });

  it('reports changed lines with context', () => {
    const out = lineDiff('a\nb\nc\nd', 'a\nB\nc\nd', 1);
    expect(out.filter((l) => l.type === 'del').map((l) => l.text)).toEqual(['b']);
    expect(out.filter((l) => l.type === 'add').map((l) => l.text)).toEqual(['B']);
    expect(out[0]).toEqual({ type: 'same', text: 'a' });
  });

  it('handles additions and removals', () => {
    const out = lineDiff('a\nb', 'a\nb\nc');
    expect(out.some((l) => l.type === 'add' && l.text === 'c')).toBe(true);
  });
});
