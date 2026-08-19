/**
 * Admin fighter authorization helper.
 *
 * Centralizes the role check so the public /api/dashboard/fighters/* routes
 * and the /dashboard/fighters/* pages all ask the same question. Mirrors the
 * pattern of admin/applications/page.tsx which gates on
 * `Role` ∈ {Rendszeradminisztrator, Producer, Reality szerkeszto}.
 *
 * When L1-AUTH-RBAC ships, this becomes a thin wrapper around the real
 * session role lookup; call sites stay unchanged.
 */

import { currentRole, ADMIN_ROLES } from '@/lib/auth/dev-role';
import type { Role } from '@/lib/auth/dev-role';

export type AdminFighterGuardResult =
  | { ok: true; role: Role }
  | { ok: false; reason: 'forbidden' | 'unauthenticated' };

export async function requireFighterAdmin(): Promise<AdminFighterGuardResult> {
  const role = await currentRole();
  if (role === 'guest') {
    return { ok: false, reason: 'unauthenticated' };
  }
  if (!ADMIN_ROLES.has(role)) {
    return { ok: false, reason: 'forbidden' };
  }
  return { ok: true, role };
}
