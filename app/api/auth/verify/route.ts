/**
 * GET /api/auth/verify?token=...
 *
 * Magic-link callback. Consumes the token from AUTH_KV (one-time, 15 min),
 * looks up the role, sets the session cookie, and redirects to the
 * dashboard.
 *
 * Errors redirect back to /admin-login with a `?error=` query so the page
 * can show a friendly message.
 */

import { NextRequest, NextResponse } from 'next/server';
import { consumeToken, roleForEmail } from '@/lib/db/kv-roles';
import { buildSessionCookie } from '@/lib/auth/magic-link';

export const runtime = 'nodejs';

const LOGIN_URL = '/admin-login';
const DASHBOARD_URL = '/dashboard';

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token') ?? '';
  if (!token || token.length < 16 || token.length > 200) {
    return redirectWithError('invalid_token');
  }

  const email = await consumeToken(token);
  if (!email) {
    return redirectWithError('expired_or_used');
  }

  const role = await roleForEmail(email);
  if (!role) {
    // Token valid but email removed from role map between request + verify.
    return redirectWithError('no_role');
  }

  const cookie = buildSessionCookie(email, role);
  const res = NextResponse.redirect(new URL(DASHBOARD_URL, request.url));
  res.headers.append('Set-Cookie', cookie);
  return res;
}

function redirectWithError(code: string) {
  const url = new URL(LOGIN_URL, 'http://placeholder');
  url.searchParams.set('error', code);
  return NextResponse.redirect(url, { status: 303 });
}
