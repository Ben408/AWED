import { NextResponse } from 'next/server';
import { identityFromHeaders, isAdminEmail } from '@/lib/auth/access';
import { getActiveStore } from '@/lib/server/get-store';

export async function POST(request: Request, { params }: { params: { slug: string } }) {
  const identity = await identityFromHeaders(request.headers);
  if (!identity || !isAdminEmail(identity.email)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  try {
    const { store } = await getActiveStore();
    const article = await store.unpublishArticle(params.slug);
    return NextResponse.json({ ok: true, article });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unpublish failed' },
      { status: 400 }
    );
  }
}
