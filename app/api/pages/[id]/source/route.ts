import fs from 'fs/promises';
import path from 'path';
import { NextResponse } from 'next/server';
import { identityFromHeaders, isAdminEmail } from '@/lib/auth/access';
import { getActiveStore } from '@/lib/server/get-store';
import { applyTsxRegions, extractTsxRegions, type EditableRegion } from '@/lib/tsx-edit/regions';

async function assertAdmin(request: Request) {
  const identity = await identityFromHeaders(request.headers);
  return Boolean(identity && isAdminEmail(identity.email));
}

export async function GET(request: Request, { params }: { params: { id: string } }) {
  if (!(await assertAdmin(request))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { store } = await getActiveStore();
  const page = await store.getPage(params.id);
  if (!page?.source?.path) {
    return NextResponse.json({ error: 'Page has no source file path' }, { status: 404 });
  }

  const absolute = path.join(store.layout.root, page.source.path);
  const source = await fs.readFile(absolute, 'utf8');
  const model = extractTsxRegions(source, page.source.path);
  return NextResponse.json({
    ok: true,
    path: page.source.path,
    absolutePath: absolute,
    source,
    model
  });
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  if (!(await assertAdmin(request))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = (await request.json()) as {
    regions?: EditableRegion[];
    expectedSource?: string;
  };
  if (!body.regions) {
    return NextResponse.json({ error: 'regions required' }, { status: 400 });
  }

  const { store } = await getActiveStore();
  const page = await store.getPage(params.id);
  if (!page?.source?.path) {
    return NextResponse.json({ error: 'Page has no source file path' }, { status: 404 });
  }

  const absolute = path.join(store.layout.root, page.source.path);
  const current = await fs.readFile(absolute, 'utf8');
  if (body.expectedSource && body.expectedSource !== current) {
    return NextResponse.json(
      { error: 'File changed on disk since you loaded it. Reload and try again.' },
      { status: 409 }
    );
  }

  try {
    // Re-extract against current to seed span memory, then apply edits.
    extractTsxRegions(current, page.source.path);
    const next = applyTsxRegions(current, page.source.path, body.regions);
    await fs.writeFile(absolute, next, 'utf8');
    const model = extractTsxRegions(next, page.source.path);
    return NextResponse.json({ ok: true, path: page.source.path, model, source: next });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Write failed' },
      { status: 400 }
    );
  }
}
