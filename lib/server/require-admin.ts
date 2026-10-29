import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { identityFromHeaders, isAdminEmail, type AccessIdentity } from '@/lib/auth/access';

export async function requireAdmin(): Promise<AccessIdentity> {
  const identity = await identityFromHeaders(headers());
  if (!identity || !isAdminEmail(identity.email)) {
    redirect('/forbidden');
  }
  return identity;
}
