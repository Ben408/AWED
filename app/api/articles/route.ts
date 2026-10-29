import { NextResponse } from 'next/server';
import { identityFromHeaders, isAdminEmail } from '@/lib/auth/access';
import { parseArticleDocument } from '@/lib/schema/article';
import { getActiveStore } from '@/lib/server/get-store';

async function assertAdmin(request: Request) {
  const identity = await identityFromHeaders(request.headers);
  if (!identity || !isAdminEmail(identity.email)) {
    return null;
  }
  return identity;
}

export async function GET(request: Request) {
  if (!(await assertAdmin(request))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const { store } = await getActiveStore();
  const articles = await store.listArticles();
  return NextResponse.json({ articles });
}

export async function POST(request: Request) {
  if (!(await assertAdmin(request))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  try {
    const body = await request.json();
    const doc = parseArticleDocument(body);
    const { store } = await getActiveStore();
    await store.saveArticle(doc);
    return NextResponse.json({ ok: true, article: doc });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Invalid article' },
      { status: 400 }
    );
  }
}
