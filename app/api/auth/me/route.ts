/**
 * GET /api/auth/me
 *
 * Returns the current auth status.
 * - If a staff role is set (via cf-roles.json mapping or cookie) → authenticated.
 * - If CF Access header is present but no role → needs role selection.
 * - Otherwise → unauthenticated.
 *
 * The email→role mapping is in /etc/efu-storefront/cf-roles.json,
 * managed by the sysadmin. No email→role mapping is hardcoded.
 *
 * Response:
 *   { authenticated: true, email: string|null, role: Role, mappedRole: Role|null }
 *   { authenticated: false, reason: 'unauthenticated'|'no_role' }
 */

import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { currentRole, getMappedRole, isCfAuthenticated, STAFF_ROLES } from '@/lib/auth/dev-role';

export const dynamic = 'force-dynamic';

export async function GET() {
  const role = await currentRole();
  const cfAuthed = await isCfAuthenticated();
  const mappedRole = await getMappedRole();
  const hdrs = await headers();
  const cfEmail = hdrs.get('Cf-Access-Authenticated-User-Email') || null;

  // User has a staff role (via cf-roles.json or cookie) → authenticated
  if (role && STAFF_ROLES.has(role)) {
    return NextResponse.json({
      authenticated: true,
      email: cfEmail,
      role,
      mappedRole,
    });
  }

  // CF Access passed but no role yet → needs to pick a role
  if (cfAuthed) {
    return NextResponse.json({
      authenticated: false,
      email: cfEmail,
      mappedRole,
      reason: 'no_role',
      message: 'Pick a role to continue.',
    });
  }

  return NextResponse.json({
    authenticated: false,
    email: null,
    mappedRole: null,
    reason: 'unauthenticated',
  });
}