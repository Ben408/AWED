import { NextResponse } from 'next/server';
import { z } from 'zod';
import { identityFromHeaders, isAdminEmail } from '@/lib/auth/access';
import { getActiveStore } from '@/lib/server/get-store';

const bodySchema = z.object({
  slug: z
    .string()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .optional()
});

export async function POST(request: Request, { params }: { params: { slug: string } }) {
  const identity = await identityFromHeaders(request.headers);
  if (!identity || !isAdminEmail(identity.email)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  try {
    const body = bodySchema.parse(await request.json().catch(() => ({})));
    const { store } = await getActiveStore();
    const newSlug = body.slug || `${params.slug}-copy`;
    const article = await store.duplicateArticle(params.slug, newSlug);
    return NextResponse.json({ ok: true, article });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Duplicate failed' },
      { status: 400 }
    );
  }
}
