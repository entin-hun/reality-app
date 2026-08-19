/**
 * Admin stream authorization helper.
 *
 * Single source of truth for "may this request manage Cloudflare Stream
 * live inputs?" — used by every /api/admin/streams/* route.
 *
 * Roles permitted (mirrors the dashboard sidebar for `streams`):
 *   - Rendszeradminisztrator : full control (create / delete / set current)
 *   - Producer               : create + set current; can also delete to
 *                              avoid leaving orphan inputs around.
 *
 * Anyone else (Tartalomkeszito, Marketing, Reality szerkeszto, Moderator,
 * guest) → 403.
 *
 * Wraps `currentRole()` so the same checks reuse the magic-link session
 * cookie already validated against the email→role map in AUTH_KV.
 */

import { currentRole, ADMIN_ROLES } from '@/lib/auth/dev-role';
import type { Role } from '@/lib/auth/dev-role';

export type AdminStreamsGuardResult =
  | { ok: true; role: Role; email: string | null }
  | { ok: false; reason: 'forbidden' | 'unauthenticated' };

const STREAM_ROLES: ReadonlySet<Role> = new Set<Role>([
  'Rendszeradminisztrator',
  'Producer',
]);

export async function requireStreamsAdmin(): Promise<AdminStreamsGuardResult> {
  const role = await currentRole();
  if (role === 'guest') {
    return { ok: false, reason: 'unauthenticated' };
  }
  if (!STREAM_ROLES.has(role)) {
    return { ok: false, reason: 'forbidden' };
  }
  // We don't currently expose the email from the role lookup; if needed in
  // a future audit log, we can extend `roleForEmail` to return both. For
  // now, the dashboard captures the actor in client-side state.
  void ADMIN_ROLES; // satisfy unused-import lint; kept as a positive signal
  return { ok: true, role, email: null };
}
