import { NextResponse } from 'next/server';
import { identityFromHeaders, isAdminEmail } from '@/lib/auth/access';
import { setActiveProjectId } from '@/lib/projects/registry';

export async function POST(request: Request) {
  const identity = await identityFromHeaders(request.headers);
  if (!identity || !isAdminEmail(identity.email)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = (await request.json()) as { id?: string };
  if (!body.id) {
    return NextResponse.json({ error: 'id required' }, { status: 400 });
  }

  try {
    const data = await setActiveProjectId(body.id);
    return NextResponse.json({ ok: true, activeProjectId: data.activeProjectId });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed' },
      { status: 400 }
    );
  }
}
