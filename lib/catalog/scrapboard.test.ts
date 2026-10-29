import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createBlockInstance } from '@/lib/catalog/blocks';
import { addToScrapboard, loadScrapboard, removeFromScrapboard } from '@/lib/catalog/scrapboard';

describe('scrapboard', () => {
  const store = new Map<string, string>();

  beforeEach(() => {
    store.clear();
    vi.stubGlobal('window', {
      localStorage: {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => {
          store.set(k, v);
        }
      }
    });
  });

  it('adds and removes scrap items', () => {
    const block = createBlockInstance('prose', 'p1');
    addToScrapboard(block, 'Intro copy');
    expect(loadScrapboard()).toHaveLength(1);
    const id = loadScrapboard()[0].id;
    removeFromScrapboard(id);
    expect(loadScrapboard()).toHaveLength(0);
  });
});
