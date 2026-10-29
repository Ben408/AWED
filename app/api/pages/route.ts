import { NextResponse } from 'next/server';
import { identityFromHeaders, isAdminEmail } from '@/lib/auth/access';
import { parsePageDocument } from '@/lib/schema/page';
import { getActiveStore } from '@/lib/server/get-store';

async function assertAdmin(request: Request) {
  const identity = await identityFromHeaders(request.headers);
  return Boolean(identity && isAdminEmail(identity.email));
}

export async function GET(request: Request) {
  if (!(await assertAdmin(request))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const { store } = await getActiveStore();
  return NextResponse.json({ pages: await store.listPages() });
}

export async function POST(request: Request) {
  if (!(await assertAdmin(request))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  try {
    const page = parsePageDocument(await request.json());
    const { store } = await getActiveStore();
    await store.savePage(page);
    return NextResponse.json({ ok: true, page });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Invalid page' },
      { status: 400 }
    );
  }
}
