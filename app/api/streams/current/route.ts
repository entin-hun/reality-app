/**
 * Public — what's currently live on /watch?
 *
 *   GET /api/streams/current
 *     → { ok: true, current: null } when nothing is on air
 *     → { ok: true, current: { uid, customerCode, iframeUrl,
 *                              hlsManifestUrl, label } } when something is
 *
 * No auth. The CF Stream iframe URL itself enforces any per-event access
 * policy (CF Stream supports signing the playback URL with a token; for
 * now we rely on the season-pass gate that /watch already checks before
 * rendering the player).
 *
 * Caching: `Cache-Control: no-store` — switching inputs is a manual admin
 * action and we want every poll to see fresh truth.
 */

import { NextResponse } from 'next/server';
import { getCurrentStream, isStreamConfigured } from '@/lib/cf-stream';

export const runtime = 'nodejs';

export async function GET() {
  const cfg = isStreamConfigured();
  if (!cfg.ok) {
    return NextResponse.json(
      { ok: true, current: null, configured: false, missing: cfg.missing },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  }
  const current = await getCurrentStream();
  return NextResponse.json(
    { ok: true, current },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
