import { NextResponse } from 'next/server';
import { identityFromHeaders, isAdminEmail } from '@/lib/auth/access';
import { getActiveStore } from '@/lib/server/get-store';

export async function POST(request: Request) {
  const identity = await identityFromHeaders(request.headers);
  if (!identity || !isAdminEmail(identity.email)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  try {
    const body = (await request.json()) as { slugs?: string[] };
    if (!Array.isArray(body.slugs) || !body.slugs.length) {
      return NextResponse.json({ error: 'slugs array required' }, { status: 400 });
    }
    const { store } = await getActiveStore();
    const articles = await store.reorderArticles(body.slugs);
    return NextResponse.json({ ok: true, articles });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Reorder failed' },
      { status: 400 }
    );
  }
}
