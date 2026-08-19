/**
 * GET /api/auth/me
 *
 * Returns the current auth status from the session cookie (magic-link
 * backed). Used by client components to decide whether to show the login
 * form or bounce to /dashboard.
 *
 * Response:
 *   { authenticated: true, email, role }
 *   { authenticated: false, reason: 'unauthenticated' }
 */

import { NextResponse } from 'next/server';
import { currentEmail, currentRole, STAFF_ROLES } from '@/lib/auth/dev-role';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const role = await currentRole();
  if (STAFF_ROLES.has(role)) {
    const email = await currentEmail();
    return NextResponse.json({
      authenticated: true,
      email,
      role,
    });
  }
  return NextResponse.json({
    authenticated: false,
    reason: 'unauthenticated',
  });
}
