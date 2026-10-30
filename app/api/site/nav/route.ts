import { NextResponse } from 'next/server';
import { identityFromHeaders, isAdminEmail } from '@/lib/auth/access';
import { navItemSchema } from '@/lib/schema/site';
import { getActiveStore } from '@/lib/server/get-store';
import { z } from 'zod';

const bodySchema = z.object({
  nav: z.array(navItemSchema)
});

export async function PUT(request: Request) {
  const identity = await identityFromHeaders(request.headers);
  if (!identity || !isAdminEmail(identity.email)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  try {
    const parsed = bodySchema.parse(await request.json());
    const { store } = await getActiveStore();
    const site = await store.saveNav(parsed.nav);
    return NextResponse.json({ ok: true, nav: site.nav, site });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Nav save failed' },
      { status: 400 }
    );
  }
}
