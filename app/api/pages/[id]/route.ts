import { NextResponse } from 'next/server';
import { identityFromHeaders, isAdminEmail } from '@/lib/auth/access';
import { getActiveStore } from '@/lib/server/get-store';

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
  if (!page) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ page });
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  if (!(await assertAdmin(request))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const { store } = await getActiveStore();
  const deleted = await store.deletePage(params.id);
  if (!deleted) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
