/**
 * POST /api/dashboard/fighters
 *
 * Create a new fighter record. Multipart form post from the admin UI.
 * Re-runs server-side validation; rejects on slug collisions, missing
 * photo, or any other invariant.
 *
 * Auth: gated to ADMIN_ROLES via `requireFighterAdmin()`. When L1-AUTH-RBAC
 * ships, the helper swaps to a real session lookup; call sites unchanged.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireFighterAdmin } from '@/lib/auth/admin';
import {
  readAllFighters,
  upsertFighter,
} from '@/lib/fighters';
import { parseFighterForm } from '@/lib/fighters/payload';

export const runtime = 'nodejs'; // fs writes; swap to edge-runtime when L1-DB lands.

export async function POST(req: NextRequest) {
  const guard = await requireFighterAdmin();
  if (!guard.ok) {
    return NextResponse.json(
      { ok: false, reason: guard.reason },
      { status: guard.reason === 'unauthenticated' ? 401 : 403 },
    );
  }

  const contentType = req.headers.get('content-type') ?? '';
  let form: Record<string, string>;
  if (contentType.includes('application/json')) {
    form = (await req.json()) as Record<string, string>;
  } else {
    const fd = await req.formData();
    form = {};
    for (const [k, v] of fd.entries()) {
      if (typeof v === 'string') form[k] = v;
    }
  }

  const existing = await readAllFighters();
  const { fighter, errors, ok } = parseFighterForm(form, existing);
  if (!ok) {
    return NextResponse.json({ ok: false, errors }, { status: 400 });
  }
  await upsertFighter(fighter);
  return NextResponse.json({ ok: true, slug: fighter.slug });
}
