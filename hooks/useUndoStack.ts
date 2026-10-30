'use client';

import { useCallback, useState } from 'react';
import { popHistory, pushHistory, type HistoryEntry } from '@/lib/studio/history';

export function useUndoStack<T>(limit = 20) {
  const [stack, setStack] = useState<HistoryEntry<T>[]>([]);

  const checkpoint = useCallback(
    (snapshot: T, label: string) => {
      setStack((prev) => pushHistory(prev, snapshot, label, limit));
    },
    [limit]
  );

  const undo = useCallback((): HistoryEntry<T> | null => {
    let entry: HistoryEntry<T> | null = null;
    setStack((prev) => {
      const result = popHistory(prev);
      entry = result.entry;
      return result.stack;
    });
    return entry;
  }, []);

  return { stack, checkpoint, undo, canUndo: stack.length > 0 };
}
