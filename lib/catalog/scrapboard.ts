/**
 * Scrapboard — PageMill had a Pasteboard for reusable pieces.
 * AWED stores approved block instances for reuse across pages (browser localStorage).
 */

import type { BlockInstance } from '@/lib/catalog/blocks';
import { blockInstanceSchema } from '@/lib/catalog/blocks';

const STORAGE_KEY = 'awed.scrapboard.v1';
const MAX_ITEMS = 24;

export type ScrapItem = {
  id: string;
  savedAt: string;
  label: string;
  block: BlockInstance;
};

export function loadScrapboard(): ScrapItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ScrapItem[];
    return parsed
      .map((item) => ({
        ...item,
        block: blockInstanceSchema.parse(item.block)
      }))
      .slice(0, MAX_ITEMS);
  } catch {
    return [];
  }
}

export function saveScrapboard(items: ScrapItem[]): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, MAX_ITEMS)));
}

export function addToScrapboard(block: BlockInstance, label?: string): ScrapItem[] {
  const items = loadScrapboard();
  const entry: ScrapItem = {
    id: `scrap-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    savedAt: new Date().toISOString(),
    label: label || `${block.type} scrap`,
    block: blockInstanceSchema.parse({
      ...block,
      id: `${block.type}-${Math.random().toString(36).slice(2, 8)}`
    })
  };
  const next = [entry, ...items].slice(0, MAX_ITEMS);
  saveScrapboard(next);
  return next;
}

export function removeFromScrapboard(id: string): ScrapItem[] {
  const next = loadScrapboard().filter((item) => item.id !== id);
  saveScrapboard(next);
  return next;
}
