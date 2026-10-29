import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC = ['/api/health', '/forbidden'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (PUBLIC.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return NextResponse.next();
  }

  // Edge cannot import jose JWKS easily without bundle size; auth is enforced
  // in server layouts/API via identityFromHeaders. Middleware only blocks when
  // Access is configured and the JWT header is missing (production posture).
  const team = process.env.CF_ACCESS_TEAM_DOMAIN;
  const aud = process.env.CF_ACCESS_AUD;
  const bypass = process.env.DEV_BYPASS_AUTH === '1';

  if (team && aud && !bypass) {
    const token = request.headers.get('cf-access-jwt-assertion');
    if (!token) {
      return new NextResponse('Authentication required', {
        status: 401,
        headers: { 'Cache-Control': 'no-store' }
      });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)']
};
