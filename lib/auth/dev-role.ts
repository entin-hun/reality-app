/**
 * Auth role gate.
 *
 * Resolution order (highest priority first):
 *   1. Session cookie (efu_session) set by magic-link verify → role comes
 *      from the email→role map at the moment the link was issued.
 *   2. If the cookie's role is no longer in the role map (revoked), drop
 *      back to guest — invalidates stale sessions on role removal.
 *   3. No cookie → guest.
 *
 * The email→role map itself lives in AUTH_KV (KV on Workers, cf-roles.json
 * in local dev) — see lib/db/kv-roles.ts.
 *
 * Backward compat:
 *   The old `efu_role` cookie is still honoured if `efu_session` is missing,
 *   so existing sessions survive the upgrade. New sessions only ever use
 *   `efu_session`.
 */

import { cookies } from 'next/headers';
import { roleForEmail, type RoleId } from '@/lib/db/kv-roles';
import { parseSessionCookie, SESSION_COOKIE } from './magic-link';

export type Role = 'guest' | RoleId;

export const STAFF_ROLES: ReadonlySet<Role> = new Set<Role>([
  'Rendszeradminisztrator',
  'Producer',
  'Reality szerkeszto',
  'Tartalomkeszito',
  'Marketing',
  'Moderator',
]);

export const ADMIN_ROLES: ReadonlySet<Role> = new Set<Role>([
  'Rendszeradminisztrator',
  'Producer',
  'Reality szerkeszto',
]);

/**
 * Resolve the role of the current request.
 *
 * - `guest` if no session cookie, no role in cookie, or cookie's role no
 *    longer exists in the role map.
 * - Otherwise returns the staff role string from the map.
 */
export async function currentRole(): Promise<Role> {
  const c = await cookies();

  // ─── 1) New magic-link session cookie ─────────────────────────────
  const session = parseSessionCookie(c.get(SESSION_COOKIE)?.value);
  if (session?.email) {
    // Re-validate against current role map (revocation safety).
    const role = await roleForEmail(session.email);
    if (role && STAFF_ROLES.has(role)) return role;
    // Stale session — fall through to guest.
  }

  // ─── 2) Legacy `efu_role` cookie (dev/upgrade compat) ─────────────
  const legacy = c.get('efu_role')?.value as Role | undefined;
  if (legacy && (STAFF_ROLES.has(legacy) || legacy === 'guest')) {
    return legacy;
  }

  return 'guest';
}

/** Email of the signed-in user, if any. */
export async function currentEmail(): Promise<string | null> {
  const c = await cookies();
  const session = parseSessionCookie(c.get(SESSION_COOKIE)?.value);
  return session?.email ?? null;
}

/** Hard guard for a specific role set. Returns the role on success. */
export async function requireRole(
  allowed: Role[] | ReadonlySet<Role>
): Promise<
  | { ok: true; role: Role; email: string | null }
  | { ok: false; reason: 'forbidden' | 'unauthenticated' }
> {
  const role = await currentRole();
  const set = allowed instanceof Set ? allowed : new Set<Role>(allowed);
  if (role === 'guest') return { ok: false, reason: 'unauthenticated' };
  if (!set.has(role)) return { ok: false, reason: 'forbidden' };
  return { ok: true, role, email: await currentEmail() };
}

/**
 * Hard guard that ONLY allows the system administrator role.
 * Used for sensitive endpoints (user CRUD, role edits).
 */
export async function requireAdmin(): Promise<
  | { ok: true; role: 'Rendszeradminisztrator'; email: string | null }
  | { ok: false; reason: 'forbidden' | 'unauthenticated' }
> {
  return (await requireRole(['Rendszeradminisztrator'])) as
    | { ok: true; role: 'Rendszeradminisztrator'; email: string | null }
    | { ok: false; reason: 'forbidden' | 'unauthenticated' };
}
