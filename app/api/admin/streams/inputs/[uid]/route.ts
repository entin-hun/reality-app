/**
 * Admin Cloudflare Stream — delete a single live input.
 *
 *   DELETE /api/admin/streams/inputs/[uid]
 *     → { ok: true, wasCurrent: boolean }
 *     → 404 if the uid isn't known locally (safety — refuse to delete
 *            something we never created).
 *
 * Auth: producer/admin via requireStreamsAdmin().
 *
 * If the deleted input was the "current" one (the one /watch is
 * streaming), the pointer is cleared as well so users don't watch a
 * stream from a deleted input on the next refresh.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireStreamsAdmin } from '@/lib/auth/admin-streams';
import {
  deleteInput,
  isStreamConfigured,
  readInputsKv,
} from '@/lib/cf-stream';

export const runtime = 'nodejs';

function guardError(reason: 'unauthenticated' | 'forbidden') {
  return NextResponse.json({ ok: false, reason }, {
    status: reason === 'unauthenticated' ? 401 : 403,
  });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ uid: string }> },
) {
  const guard = await requireStreamsAdmin();
  if (!guard.ok) return guardError(guard.reason);

  const cfg = isStreamConfigured();
  if (!cfg.ok) {
    return NextResponse.json(
      { ok: false, error: 'CF Stream secrets are not configured', missing: cfg.missing },
      { status: 503 },
    );
  }

  const { uid } = await params;
  if (!uid || !/^[a-zA-Z0-9_-]{8,40}$/.test(uid)) {
    return NextResponse.json({ ok: false, error: 'invalid uid' }, { status: 400 });
  }

  // Local-knowledge guard: only delete inputs we've seen before.
  const existing = await readInputsKv();
  const matched = existing.find((i) => i.uid === uid);
  if (!matched) {
    return NextResponse.json({ ok: false, error: 'unknown uid' }, { status: 404 });
  }

  try {
    const { wasCurrent } = await deleteInput(uid);
    return NextResponse.json({ ok: true, wasCurrent });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'CF Stream error';
    // 404 from CF means the input was already deleted in their panel.
    if (message.toLowerCase().includes('not found') || message.includes('"code":1004')) {
      return NextResponse.json({ ok: true, wasCurrent: false });
    }
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
