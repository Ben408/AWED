/** Small in-memory undo stack for studio editors. */
export type HistoryEntry<T> = {
  label: string;
  snapshot: T;
  at: number;
};

export function pushHistory<T>(
  stack: HistoryEntry<T>[],
  snapshot: T,
  label: string,
  limit = 20
): HistoryEntry<T>[] {
  return [...stack, { label, snapshot: structuredClone(snapshot), at: Date.now() }].slice(
    -limit
  );
}

export function popHistory<T>(
  stack: HistoryEntry<T>[]
): { stack: HistoryEntry<T>[]; entry: HistoryEntry<T> | null } {
  if (!stack.length) return { stack, entry: null };
  const next = [...stack];
  const entry = next.pop() ?? null;
  return { stack: next, entry };
}
