import { NextResponse } from 'next/server';
import { identityFromHeaders, isAdminEmail } from '@/lib/auth/access';
import { extractAgentSurfaceFromHtml } from '@/lib/preview/agent-surface';

export async function GET(request: Request) {
  const identity = await identityFromHeaders(request.headers);
  if (!identity || !isAdminEmail(identity.email)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const url = new URL(request.url).searchParams.get('url');
  if (!url) {
    return NextResponse.json({ error: 'url required' }, { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return NextResponse.json({ error: 'Invalid url' }, { status: 400 });
  }

  // Local Alpha: only allow localhost / 127.0.0.1 preview fetches.
  if (!['localhost', '127.0.0.1'].includes(parsed.hostname)) {
    return NextResponse.json(
      { error: 'Preview agent-surface fetch is limited to localhost in Alpha' },
      { status: 400 }
    );
  }

  try {
    const res = await fetch(parsed.toString(), {
      headers: { Accept: 'text/html' },
      cache: 'no-store'
    });
    if (!res.ok) {
      return NextResponse.json(
        { error: `Upstream returned ${res.status}` },
        { status: 502 }
      );
    }
    const html = await res.text();
    return NextResponse.json({
      ok: true,
      surface: extractAgentSurfaceFromHtml(html, parsed.toString())
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Fetch failed' },
      { status: 502 }
    );
  }
}
