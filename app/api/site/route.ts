import { NextResponse } from 'next/server';
import { identityFromHeaders, isAdminEmail } from '@/lib/auth/access';
import { parseSiteDocument } from '@/lib/schema/site';
import { getActiveStore } from '@/lib/server/get-store';

export async function GET(request: Request) {
  const identity = await identityFromHeaders(request.headers);
  if (!identity || !isAdminEmail(identity.email)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const { store } = await getActiveStore();
  return NextResponse.json({ site: await store.getSite() });
}

export async function POST(request: Request) {
  const identity = await identityFromHeaders(request.headers);
  if (!identity || !isAdminEmail(identity.email)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  try {
    const site = parseSiteDocument(await request.json());
    const { store } = await getActiveStore();
    await store.saveSite(site);
    return NextResponse.json({ ok: true, site });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Invalid site document' },
      { status: 400 }
    );
  }
}
