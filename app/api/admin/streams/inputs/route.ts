/**
 * Admin Cloudflare Stream live-inputs API.
 *
 *   GET  /api/admin/streams/inputs
 *     → { ok: true, inputs: LiveInput[] }
 *
 *   POST /api/admin/streams/inputs
 *     Body (JSON): { label: string }
 *     → 201 { ok: true, input: LiveInput }     (rtmpsUrl + streamKey
 *                                                included — only chance
 *                                                to copy the key)
 *     → 400 if missing label
 *
 * Auth: producer/admin via requireStreamsAdmin().
 *
 * GET refreshes the cached input list from CF (canonical source for
 * status, RTMPS URL, key, lastSeen) before returning, so the dashboard
 * always reflects "is OBS actually pushing frames right now?" truth.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireStreamsAdmin } from '@/lib/auth/admin-streams';
import {
  createInput,
  isStreamConfigured,
  readInputsKv,
  refreshInputs,
} from '@/lib/cf-stream';

export const runtime = 'nodejs'; // worker runtime; harmless on Edge too

function guardError(reason: 'unauthenticated' | 'forbidden') {
  return NextResponse.json({ ok: false, reason }, {
    status: reason === 'unauthenticated' ? 401 : 403,
  });
}

export async function GET(_req: NextRequest) {
  const guard = await requireStreamsAdmin();
  if (!guard.ok) return guardError(guard.reason);

  const cfg = isStreamConfigured();
  if (!cfg.ok) {
    // Secrets aren't set up yet — return the local KV view (probably
    // empty) along with the missing-secret hint so the admin UI can
    // surface actionable copy.
    const inputs = await readInputsKv();
    return NextResponse.json({
      ok: true,
      inputs,
      configured: false,
      missing: cfg.missing,
    });
  }

  try {
    const inputs = await refreshInputs();
    return NextResponse.json({ ok: true, inputs, configured: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'CF Stream error';
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}

export async function POST(req: NextRequest) {
  const guard = await requireStreamsAdmin();
  if (!guard.ok) return guardError(guard.reason);

  const cfg = isStreamConfigured();
  if (!cfg.ok) {
    return NextResponse.json(
      { ok: false, error: 'CF Stream secrets are not configured', missing: cfg.missing },
      { status: 503 },
    );
  }

  let body: { label?: unknown };
  try {
    body = (await req.json()) as { label?: unknown };
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON body' }, { status: 400 });
  }
  const label = typeof body.label === 'string' ? body.label.trim() : '';
  if (!label) {
    return NextResponse.json({ ok: false, error: 'label is required' }, { status: 400 });
  }
  if (label.length > 80) {
    return NextResponse.json({ ok: false, error: 'label too long (80 max)' }, { status: 400 });
  }

  try {
    const input = await createInput(label, '');
    return NextResponse.json({ ok: true, input }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'CF Stream error';
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
