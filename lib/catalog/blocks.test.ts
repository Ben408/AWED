import { describe, expect, it } from 'vitest';
import { BLOCK_CATALOG, createBlockInstance, blockInstanceSchema } from '@/lib/catalog/blocks';

describe('block catalog', () => {
  it('has unique block types', () => {
    const types = BLOCK_CATALOG.map((b) => b.type);
    expect(new Set(types).size).toBe(types.length);
  });

  it('creates valid default instances for every catalog entry', () => {
    for (const entry of BLOCK_CATALOG) {
      const block = createBlockInstance(entry.type, `${entry.type}-1`);
      expect(blockInstanceSchema.parse(block).type).toBe(entry.type);
    }
  });
});
