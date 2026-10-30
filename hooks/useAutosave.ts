'use client';

import { useEffect, useRef } from 'react';

/** Debounced autosave. Calls `save` when `value` changes after `delayMs`. */
export function useAutosave<T>(
  value: T,
  save: (value: T) => void | Promise<void>,
  options?: { delayMs?: number; enabled?: boolean }
) {
  const delayMs = options?.delayMs ?? 1500;
  const enabled = options?.enabled ?? true;
  const first = useRef(true);
  const saveRef = useRef(save);
  saveRef.current = save;

  useEffect(() => {
    if (!enabled) return;
    if (first.current) {
      first.current = false;
      return;
    }
    const timer = window.setTimeout(() => {
      void saveRef.current(value);
    }, delayMs);
    return () => window.clearTimeout(timer);
  }, [value, delayMs, enabled]);
}
