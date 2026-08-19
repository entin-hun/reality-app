/**
 * POST /api/auth/logout
 *
 * Clears both the new session cookie and the legacy `efu_role` cookie.
 * Returns 200 JSON; the client then redirects to /admin-login.
 */

import { NextResponse } from 'next/server';
import { buildClearSessionCookie } from '@/lib/auth/magic-link';

export const runtime = 'nodejs';

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.headers.append('Set-Cookie', buildClearSessionCookie());
  res.headers.append(
    'Set-Cookie',
    'efu_role=; Path=/; Max-Age=0; SameSite=Lax'
  );
  return res;
}
