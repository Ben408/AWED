import { NextResponse } from 'next/server';
import { z } from 'zod';
import { identityFromHeaders, isAdminEmail } from '@/lib/auth/access';
import { getActiveStore } from '@/lib/server/get-store';
import { slugifyTitle } from '@/lib/studio/tsx-scaffold';

const bodySchema = z.object({
  title: z.string().optional(),
  route: z
    .string()
    .regex(/^\/[a-z0-9\-\/]*$/)
    .optional()
});

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const identity = await identityFromHeaders(request.headers);
  if (!identity || !isAdminEmail(identity.email)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  try {
    const body = bodySchema.parse(await request.json().catch(() => ({})));
    const { store } = await getActiveStore();
    const source = await store.getPage(params.id);
    if (!source) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const base = slugifyTitle(body.title || `${source.metadata.title}-copy`);
    const newId = base;
    const newRoute = body.route || `/${base}`;
    const page = await store.duplicatePage(params.id, newId, newRoute);
    return NextResponse.json({ ok: true, page });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Duplicate failed' },
      { status: 400 }
    );
  }
}
