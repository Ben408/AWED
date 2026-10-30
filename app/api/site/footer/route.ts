import { NextResponse } from 'next/server';
import { z } from 'zod';
import { identityFromHeaders, isAdminEmail } from '@/lib/auth/access';
import { footerGroupSchema } from '@/lib/schema/site';
import { getActiveStore } from '@/lib/server/get-store';

const bodySchema = z.object({
  footerGroups: z.array(footerGroupSchema)
});

export async function PUT(request: Request) {
  const identity = await identityFromHeaders(request.headers);
  if (!identity || !isAdminEmail(identity.email)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  try {
    const body = bodySchema.parse(await request.json());
    const { store } = await getActiveStore();
    const site = await store.saveFooterGroups(body.footerGroups);
    return NextResponse.json({ ok: true, footerGroups: site.footerGroups });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Footer save failed' },
      { status: 400 }
    );
  }
}
