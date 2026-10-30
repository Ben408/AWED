import { describe, expect, it } from 'vitest';
import { popHistory, pushHistory } from '@/lib/studio/history';
import { insertMdxEmbed, MDX_EMBED_CATALOG } from '@/lib/studio/embeds';

describe('history + embeds', () => {
  it('pushes and pops undo snapshots', () => {
    let stack = pushHistory([], { n: 1 }, 'first');
    stack = pushHistory(stack, { n: 2 }, 'second');
    expect(stack).toHaveLength(2);
    const { stack: next, entry } = popHistory(stack);
    expect(entry?.snapshot).toEqual({ n: 2 });
    expect(next).toHaveLength(1);
  });

  it('inserts MDX embeds once', () => {
    const tag = MDX_EMBED_CATALOG[0].tag;
    const once = insertMdxEmbed('Hello', tag);
    expect(once).toContain(tag);
    expect(insertMdxEmbed(once, tag)).toBe(once);
  });
});
