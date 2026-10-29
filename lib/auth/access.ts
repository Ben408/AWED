import { createRemoteJWKSet, jwtVerify } from 'jose';

export type AccessIdentity = {
  email: string;
  name?: string;
};

const CF_ACCESS_JWT_HEADER = 'cf-access-jwt-assertion';

function adminEmails(): string[] {
  const raw = process.env.CF_ACCESS_ADMIN_EMAILS || 'ben@bencornelius.com';
  return [
    ...new Set(
      raw
        .split(',')
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean)
    )
  ];
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return adminEmails().includes(email.trim().toLowerCase());
}

export function accessConfigured(): boolean {
  return Boolean(process.env.CF_ACCESS_TEAM_DOMAIN?.trim() && process.env.CF_ACCESS_AUD?.trim());
}

export function devBypassEnabled(): boolean {
  return process.env.DEV_BYPASS_AUTH === '1' || process.env.NODE_ENV === 'development';
}

export async function verifyAccessJwt(token: string): Promise<AccessIdentity> {
  const team = process.env.CF_ACCESS_TEAM_DOMAIN?.trim();
  const aud = process.env.CF_ACCESS_AUD?.trim();
  if (!team || !aud) {
    throw new Error('Cloudflare Access is not configured');
  }

  const jwks = createRemoteJWKSet(new URL(`https://${team}.cloudflareaccess.com/cdn-cgi/access/certs`));
  const { payload } = await jwtVerify(token, jwks, { audience: aud });
  const email = typeof payload.email === 'string' ? payload.email : null;
  if (!email) throw new Error('Access token missing email');
  return {
    email,
    name: typeof payload.name === 'string' ? payload.name : undefined
  };
}

export async function identityFromHeaders(headers: Headers): Promise<AccessIdentity | null> {
  if (devBypassEnabled() && !accessConfigured()) {
    return {
      email: (process.env.DEV_BYPASS_EMAIL || 'ben@bencornelius.com').trim().toLowerCase()
    };
  }

  const token = headers.get(CF_ACCESS_JWT_HEADER);
  if (!token) {
    if (devBypassEnabled()) {
      return {
        email: (process.env.DEV_BYPASS_EMAIL || 'ben@bencornelius.com').trim().toLowerCase()
      };
    }
    return null;
  }

  try {
    return await verifyAccessJwt(token);
  } catch {
    return null;
  }
}

export { CF_ACCESS_JWT_HEADER };
