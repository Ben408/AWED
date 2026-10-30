export type DiffLine = { type: 'same' | 'add' | 'del'; text: string };

/**
 * Minimal line diff used for the save preview. Trims the common prefix/suffix, then runs an
 * LCS on the changed middle (falling back to del-then-add blocks for very large changes).
 * Returns only changed lines plus up to `context` lines of surrounding context.
 */
export function lineDiff(before: string, after: string, context = 2): DiffLine[] {
  if (before === after) return [];
  const a = before.split('\n');
  const b = after.split('\n');

  let start = 0;
  while (start < a.length && start < b.length && a[start] === b[start]) start += 1;
  let endA = a.length;
  let endB = b.length;
  while (endA > start && endB > start && a[endA - 1] === b[endB - 1]) {
    endA -= 1;
    endB -= 1;
  }

  const midA = a.slice(start, endA);
  const midB = b.slice(start, endB);
  const mid: DiffLine[] = [];

  if (midA.length * midB.length > 4_000_000) {
    midA.forEach((text) => mid.push({ type: 'del', text }));
    midB.forEach((text) => mid.push({ type: 'add', text }));
  } else {
    const n = midA.length;
    const m = midB.length;
    const lcs: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
    for (let i = n - 1; i >= 0; i -= 1) {
      for (let j = m - 1; j >= 0; j -= 1) {
        lcs[i][j] =
          midA[i] === midB[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
      }
    }
    let i = 0;
    let j = 0;
    while (i < n && j < m) {
      if (midA[i] === midB[j]) {
        mid.push({ type: 'same', text: midA[i] });
        i += 1;
        j += 1;
      } else if (lcs[i + 1][j] >= lcs[i][j + 1]) {
        mid.push({ type: 'del', text: midA[i] });
        i += 1;
      } else {
        mid.push({ type: 'add', text: midB[j] });
        j += 1;
      }
    }
    while (i < n) mid.push({ type: 'del', text: midA[i++] });
    while (j < m) mid.push({ type: 'add', text: midB[j++] });
  }

  const head = a.slice(Math.max(0, start - context), start).map<DiffLine>((text) => ({
    type: 'same',
    text
  }));
  const tail = a.slice(endA, endA + context).map<DiffLine>((text) => ({ type: 'same', text }));
  const all = [...head, ...mid, ...tail];

  // Collapse long unchanged runs inside the middle to keep the preview compact.
  const out: DiffLine[] = [];
  let run: DiffLine[] = [];
  const flush = (final: boolean) => {
    if (run.length > context * 2 + 1 && !final) {
      out.push(...run.slice(0, context));
      out.push({ type: 'same', text: '…' });
      out.push(...run.slice(-context));
    } else {
      out.push(...run);
    }
    run = [];
  };
  for (const line of all) {
    if (line.type === 'same') run.push(line);
    else {
      flush(false);
      out.push(line);
    }
  }
  flush(true);
  return out;
}
