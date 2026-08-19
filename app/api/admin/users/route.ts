/**
 * /api/admin/users
 *
 * GET  → list the full role map (Rendszeradminisztrator only)
 * POST → add an email to a role { email, role }
 *
 * DELETE/PUT for individual users live in [email]/route.ts.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/dev-role';
import {
  readRoleMap,
  addEmailToRole,
  STAFF_ROLE_IDS,
  type RoleId,
} from '@/lib/db/kv-roles';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const guard = await requireAdmin();
  if (!guard.ok) {
    return NextResponse.json({ ok: false, message: 'forbidden' }, { status: 403 });
  }
  const map = await readRoleMap();
  return NextResponse.json({ ok: true, map });
}

interface PostBody {
  email?: string;
  role?: string;
}

export async function POST(request: NextRequest) {
  const guard = await requireAdmin();
  if (!guard.ok) {
    return NextResponse.json({ ok: false, message: 'forbidden' }, { status: 403 });
  }

  let body: PostBody;
  try {
    body = (await request.json()) as PostBody;
  } catch {
    return NextResponse.json({ ok: false, message: 'invalid_body' }, { status: 400 });
  }

  const email = (body.email ?? '').trim().toLowerCase();
  const role = body.role as RoleId | undefined;
  if (!email || !email.includes('@') || email.length > 254) {
    return NextResponse.json({ ok: false, message: 'invalid_email' }, { status: 400 });
  }
  if (!role || !STAFF_ROLE_IDS.includes(role)) {
    return NextResponse.json({ ok: false, message: 'invalid_role' }, { status: 400 });
  }

  try {
    const map = await addEmailToRole(email, role);
    return NextResponse.json({ ok: true, map });
  } catch (err) {
    return NextResponse.json(
      { ok: false, message: 'persistence_failed', detail: (err as Error).message },
      { status: 500 }
    );
  }
}
