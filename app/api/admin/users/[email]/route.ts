/**
 * /api/admin/users/[email]
 *
 * PUT    → change an existing user's role { role }
 * DELETE → remove a user from the role map entirely
 *
 * The [email] segment is URL-encoded (e.g. "balint%40overace.agency").
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/dev-role';
import {
  readRoleMap,
  moveEmail,
  removeEmail,
  STAFF_ROLE_IDS,
  type RoleId,
} from '@/lib/db/kv-roles';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ email: string }>;
}

function decodeEmail(raw: string): string {
  try {
    return decodeURIComponent(raw).trim().toLowerCase();
  } catch {
    return raw.trim().toLowerCase();
  }
}

export async function PUT(
  request: NextRequest,
  context: RouteContext
) {
  const guard = await requireAdmin();
  if (!guard.ok) {
    return NextResponse.json({ ok: false, message: 'forbidden' }, { status: 403 });
  }

  const { email: rawEmail } = await context.params;
  const email = decodeEmail(rawEmail);
  if (!email || !email.includes('@')) {
    return NextResponse.json({ ok: false, message: 'invalid_email' }, { status: 400 });
  }

  let body: { role?: string };
  try {
    body = (await request.json()) as { role?: string };
  } catch {
    return NextResponse.json({ ok: false, message: 'invalid_body' }, { status: 400 });
  }

  const role = body.role as RoleId | undefined;
  if (!role || !STAFF_ROLE_IDS.includes(role)) {
    return NextResponse.json({ ok: false, message: 'invalid_role' }, { status: 400 });
  }

  // Guard: don't allow the only remaining Rendszeradminisztrator to demote
  // themselves out of the role.
  if (role !== 'Rendszeradminisztrator') {
    const map = await readRoleMap();
    const admins = map.Rendszeradminisztrator ?? [];
    if (admins.includes(email) && admins.length === 1) {
      return NextResponse.json(
        { ok: false, message: 'last_admin_protected' },
        { status: 409 }
      );
    }
  }

  try {
    const map = await moveEmail(email, role);
    return NextResponse.json({ ok: true, map });
  } catch (err) {
    return NextResponse.json(
      { ok: false, message: 'persistence_failed', detail: (err as Error).message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  context: RouteContext
) {
  const guard = await requireAdmin();
  if (!guard.ok) {
    return NextResponse.json({ ok: false, message: 'forbidden' }, { status: 403 });
  }

  const { email: rawEmail } = await context.params;
  const email = decodeEmail(rawEmail);
  if (!email || !email.includes('@')) {
    return NextResponse.json({ ok: false, message: 'invalid_email' }, { status: 400 });
  }

  // Guard: don't allow removing the only remaining admin.
  const map = await readRoleMap();
  const admins = map.Rendszeradminisztrator ?? [];
  if (admins.includes(email) && admins.length === 1) {
    return NextResponse.json(
      { ok: false, message: 'last_admin_protected' },
      { status: 409 }
    );
  }

  try {
    const next = await removeEmail(email);
    return NextResponse.json({ ok: true, map: next });
  } catch (err) {
    return NextResponse.json(
      { ok: false, message: 'persistence_failed', detail: (err as Error).message },
      { status: 500 }
    );
  }
}
