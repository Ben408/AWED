import { NextResponse } from 'next/server';
import { z } from 'zod';
import { identityFromHeaders, isAdminEmail } from '@/lib/auth/access';
import { getActiveStore } from '@/lib/server/get-store';
import { slugifyTitle } from '@/lib/studio/tsx-scaffold';

const bodySchema = z.object({
  title: z.string().min(1),
  route: z
    .string()
    .regex(/^\/[a-z0-9\-\/]*$/)
    .optional(),
  description: z.string().optional(),
  lead: z.string().optional(),
  addToNav: z.boolean().optional()
});

export async function POST(request: Request) {
  const identity = await identityFromHeaders(request.headers);
  if (!identity || !isAdminEmail(identity.email)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  try {
    const body = bodySchema.parse(await request.json());
    const id = slugifyTitle(body.title);
    const route = body.route || `/${id}`;
    const { store } = await getActiveStore();
    const page = await store.createTsxPage({
      id,
      route,
      title: body.title,
      description: body.description,
      lead: body.lead,
      addToNav: body.addToNav
    });
    return NextResponse.json({ ok: true, page });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Create failed' },
      { status: 400 }
    );
  }
}
