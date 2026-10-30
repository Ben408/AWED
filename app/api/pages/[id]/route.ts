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
  const url = new URL(request.url);
  const deleteTsx = url.searchParams.get('deleteTsx') === '1';
  const { store } = await getActiveStore();
  const result = await store.deletePageDeep(params.id, { deleteTsx });
  if (!result.deletedYaml) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ ok: true, ...result });
}
