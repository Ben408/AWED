import { NextResponse } from 'next/server';
import { identityFromHeaders, isAdminEmail } from '@/lib/auth/access';
import { getActiveStore } from '@/lib/server/get-store';

async function assertAdmin(request: Request) {
  const identity = await identityFromHeaders(request.headers);
  if (!identity || !isAdminEmail(identity.email)) return false;
  return true;
}

export async function GET(request: Request, { params }: { params: { slug: string } }) {
  if (!(await assertAdmin(request))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const { store } = await getActiveStore();
  const article = await store.getArticle(params.slug);
  if (!article) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ article });
}

export async function DELETE(request: Request, { params }: { params: { slug: string } }) {
  if (!(await assertAdmin(request))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const { store } = await getActiveStore();
  const deleted = await store.deleteArticle(params.slug);
  if (!deleted) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
