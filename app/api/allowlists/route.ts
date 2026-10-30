import { NextResponse } from 'next/server';
import { identityFromHeaders, isAdminEmail } from '@/lib/auth/access';
import { getActiveStore } from '@/lib/server/get-store';

export async function GET(request: Request) {
  const identity = await identityFromHeaders(request.headers);
  if (!identity || !isAdminEmail(identity.email)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const { store } = await getActiveStore();
  const allowlists = await store.getAllowlists();
  return NextResponse.json({ allowlists });
}

export async function PUT(request: Request) {
  const identity = await identityFromHeaders(request.headers);
  if (!identity || !isAdminEmail(identity.email)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  try {
    const body = (await request.json()) as {
      allowlists?: { business?: string[]; backyard?: string[] };
    };
    const { store } = await getActiveStore();
    const current = await store.getAllowlists();
    const next = {
      business: Array.isArray(body.allowlists?.business)
        ? body.allowlists.business
        : current.business,
      backyard: Array.isArray(body.allowlists?.backyard)
        ? body.allowlists.backyard
        : current.backyard
    };
    await store.saveAllowlists(next);
    return NextResponse.json({ ok: true, allowlists: next });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Save failed' },
      { status: 400 }
    );
  }
}
