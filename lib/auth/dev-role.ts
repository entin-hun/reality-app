/**
 * Auth role gate — reads Cloudflare Access headers or falls back to
 * the `efu_role` cookie (dev backward-compat).
 *
 * EMAIL → ROLE MAPPING (sysadmin-managed):
 *   /etc/efu-storefront/cf-roles.json
 *
 *   The sysadmin edits this file directly on the server. The application
 *   reads it at request time — no rebuild needed after changes.
 *
 *   Format: { "Role": ["email1@...", "email2@..."], ... }
 *   Each email can be a single address or multiple — just add them to the array.
 *
 * FLOW:
 *   1. CF Access sends Cf-Access-Authenticated-User-Email after OTP
 *   2. Code looks up the email in cf-roles.json
 *   3. If found → role is set automatically (cookie + redirect)
 *   4. If not found → user sees the role picker
 *   5. efu_role cookie is always the fallback
 */

import { cookies, headers } from 'next/headers';
import { readFileSync } from 'fs';

export type Role =
  | 'guest'
  | 'user'
  | 'Rendszeradminisztrator'
  | 'Producer'
  | 'Reality szerkeszto'
  | 'Tartalomkeszito'
  | 'Marketing'
  | 'Moderator';

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

const ROLE_MAP_PATH = '/etc/efu-storefront/cf-roles.json';

/** Load the role mapping from the JSON config file. Returns email → role map. */
function loadRoleMap(): Record<string, string> {
  try {
    const raw = readFileSync(ROLE_MAP_PATH, 'utf-8');
    const data = JSON.parse(raw) as Record<string, unknown[]>;
    const map: Record<string, string> = {};
    for (const [role, emails] of Object.entries(data)) {
      if (!STAFF_ROLES.has(role as Role)) continue;
      for (const email of emails) {
        if (typeof email === 'string') map[email.toLowerCase()] = role;
      }
    }
    return map;
  } catch {
    return {};
  }
}

/**
 * Look up the CF-authenticated email in the role map.
 * Returns the mapped role, or null if the email is not found.
 */
export async function getMappedRole(): Promise<Role | null> {
  try {
    const hdrs = await headers();
    const email = hdrs.get('Cf-Access-Authenticated-User-Email');
    if (!email) return null;
    const roleMap = loadRoleMap();
    const role = roleMap[email] as Role | undefined;
    if (role && STAFF_ROLES.has(role)) return role;
    return null;
  } catch {
    return null;
  }
}

/**
 * Check if the current request passed Cloudflare Zero Trust Access.
 */
export async function isCfAuthenticated(): Promise<boolean> {
  try {
    const hdrs = await headers();
    return !!hdrs.get('Cf-Access-Authenticated-User-Email');
  } catch {
    return false;
  }
}

export async function currentRole(): Promise<Role> {
  // 1. Look up CF email in the role map file
  const mapped = await getMappedRole();
  if (mapped) return mapped;

  // 2. Fallback to efu_role cookie (set by login page)
  const c = await cookies();
  const r = c.get('efu_role')?.value as Role | undefined;
  if (r && (STAFF_ROLES.has(r) || r === 'user' || r === 'guest')) return r;
  return 'guest';
}

export async function requireRole(allowed: Role[] | ReadonlySet<Role>): Promise<{
  ok: true;
  role: Role;
} | { ok: false; reason: 'forbidden' }> {
  const role = await currentRole();
  const set = allowed instanceof Set ? allowed : new Set<Role>(allowed);
  if (!set.has(role)) return { ok: false, reason: 'forbidden' };
  return { ok: true, role };
}
