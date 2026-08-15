/**
 * POST /api/dashboard/fighters/{slug}     — update an existing fighter
 * DELETE /api/dashboard/fighters/{slug}   — delete a fighter
 *
 * Both gated to ADMIN_ROLES. The slug in the URL is the target; the
 * form payload carries `originalSlug` so the parser can detect renames
 * that collide with an existing slug.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireFighterAdmin } from '@/lib/auth/admin';
import {
  readAllFighters,
  readFighter,
  upsertFighter,
  deleteFighter,
} from '@/lib/fighters';
import { parseFighterForm } from '@/lib/fighters/payload';

export const runtime = 'nodejs';

async function handleUpdate(
  req: NextRequest,
  slug: string,
): Promise<NextResponse> {
  const guard = await requireFighterAdmin();
  if (!guard.ok) {
    return NextResponse.json(
      { ok: false, reason: guard.reason },
      { status: guard.reason === 'unauthenticated' ? 401 : 403 },
    );
  }

  const existing = await readFighter(slug);
  if (!existing) {
    return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });
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
  // Always carry forward the original slug so the parser can detect renames.
  form.originalSlug = slug;

  const allExisting = await readAllFighters();
  const { fighter, errors, ok } = parseFighterForm(form, allExisting);
  if (!ok) {
    return NextResponse.json({ ok: false, errors }, { status: 400 });
  }
  // Keep the original `fightHistory` and `updatedAt`-respecting semantics.
  const merged = { ...existing, ...fighter };
  await upsertFighter(merged);
  return NextResponse.json({ ok: true, slug: merged.slug });
}

async function handleDelete(slug: string): Promise<NextResponse> {
  const guard = await requireFighterAdmin();
  if (!guard.ok) {
    return NextResponse.json(
      { ok: false, reason: guard.reason },
      { status: guard.reason === 'unauthenticated' ? 401 : 403 },
    );
  }
  const ok = await deleteFighter(slug);
  if (!ok) {
    return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  return handleUpdate(req, slug);
}

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ slug: string }> },
) {
  const { slug } = await ctx.params;
  return handleDelete(slug);
}
