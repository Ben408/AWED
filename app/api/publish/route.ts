import { NextResponse } from 'next/server';
import { identityFromHeaders, isAdminEmail } from '@/lib/auth/access';
import { getActiveStore } from '@/lib/server/get-store';

export async function POST(request: Request) {
  const identity = await identityFromHeaders(request.headers);
  if (!identity || !isAdminEmail(identity.email)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const body = (await request.json()) as { message?: string };
  const { store } = await getActiveStore();
  const status = await store.recordPublish(
    body.message?.trim() || `Publish checkpoint by ${identity.email}`
  );
  return NextResponse.json({ ok: true, status });
}
