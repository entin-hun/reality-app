/**
 * Admin — control which Cloudflare Stream live input is "current" (i.e.
 * the one /watch is showing).
 *
 *   GET   /api/admin/streams/current → reads the same shape
 *                                       /api/streams/current returns so the
 *                                       admin can preview exactly what
 *                                       the watch page sees.
 *   PATCH /api/admin/streams/current  → body { uid: string | null }
 *                                       sets or clears the pointer.
 *
 * Auth: producer/admin via requireStreamsAdmin().
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireStreamsAdmin } from '@/lib/auth/admin-streams';
import {
  clearCurrent,
  getCurrentStream,
  isStreamConfigured,
  setCurrent,
} from '@/lib/cf-stream';

export const runtime = 'nodejs';

function guardError(reason: 'unauthenticated' | 'forbidden') {
  return NextResponse.json({ ok: false, reason }, {
    status: reason === 'unauthenticated' ? 401 : 403,
  });
}

export async function GET() {
  const guard = await requireStreamsAdmin();
  if (!guard.ok) return guardError(guard.reason);
  const current = await getCurrentStream();
  const cfg = isStreamConfigured();
  return NextResponse.json({
    ok: true,
    current,
    configured: cfg.ok,
    missing: cfg.ok ? undefined : cfg.missing,
  });
}

export async function PATCH(req: NextRequest) {
  const guard = await requireStreamsAdmin();
  if (!guard.ok) return guardError(guard.reason);

  let body: { uid?: unknown };
  try {
    body = (await req.json()) as { uid?: unknown };
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON body' }, { status: 400 });
  }

  if (body.uid === null) {
    await clearCurrent();
    return NextResponse.json({ ok: true, current: null });
  }
  if (typeof body.uid !== 'string' || !body.uid) {
    return NextResponse.json({ ok: false, error: 'uid (string|null) required' }, { status: 400 });
  }
  if (!/^[a-zA-Z0-9_-]{8,40}$/.test(body.uid)) {
    return NextResponse.json({ ok: false, error: 'invalid uid format' }, { status: 400 });
  }

  try {
    await setCurrent(body.uid);
    const current = await getCurrentStream();
    return NextResponse.json({ ok: true, current });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'CF Stream error';
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
