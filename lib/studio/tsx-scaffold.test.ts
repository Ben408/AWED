import { describe, expect, it } from 'vitest';
import {
  routeToAppPath,
  routeToComponentName,
  scaffoldMarketingPageTsx,
  slugifyTitle
} from '@/lib/studio/tsx-scaffold';
import { clearTsxSpanMemory, extractTsxRegions } from '@/lib/tsx-edit/regions';

describe('tsx-scaffold', () => {
  it('maps routes to app paths and component names', () => {
    expect(routeToAppPath('/')).toBe('app/page.tsx');
    expect(routeToAppPath('/speaking')).toBe('app/speaking/page.tsx');
    expect(routeToComponentName('/open-source-tools')).toBe('OpenSourceToolsPage');
    expect(slugifyTitle('Hello World!')).toBe('hello-world');
  });

  it('scaffolds TSX that AWED can extract', () => {
    clearTsxSpanMemory();
    const source = scaffoldMarketingPageTsx({
      title: 'Speaking | Fixture',
      description: 'Talks and appearances.',
      heading: 'Speaking',
      lead: 'Invite Ben to speak.',
      componentName: 'SpeakingPage'
    });
    expect(source).toContain('export const metadata');
    expect(source).toContain('function SpeakingPage');
    const model = extractTsxRegions(source, 'app/speaking/page.tsx');
    expect(model.regions.some((r) => r.id === 'metadata.title')).toBe(true);
    expect(model.regions.some((r) => r.id === 'jsx.h1')).toBe(true);
    expect(model.regions.some((r) => r.id === 'jsx.lead')).toBe(true);
  });
});
