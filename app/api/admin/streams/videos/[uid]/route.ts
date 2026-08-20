/**
 * Admin Cloudflare Stream — single VOD endpoints.
 *
 *   DELETE /api/admin/streams/videos/[uid] → delete the CF VOD and its
 *                                            KV-side metadata (label,
 *                                            keep, playlist entry).
 *
 * Auth: producer/admin via requireStreamsAdmin().
 */

import { NextResponse } from 'next/server';
import { requireStreamsAdmin } from '@/lib/auth/admin-streams';
import { isStreamConfigured, deleteVideo, setVideoMeta } from '@/lib/cf-stream';

export const runtime = 'nodejs';

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ uid: string }> },
) {
  const guard = await requireStreamsAdmin();
  if (!guard.ok) {
    return NextResponse.json({ ok: false, reason: guard.reason }, {
      status: guard.reason === 'unauthenticated' ? 401 : 403,
    });
  }
  const cfg = isStreamConfigured();
  if (!cfg.ok) {
    return NextResponse.json(
      { ok: false, error: 'CF Stream nincs konfigurálva' },
      { status: 503 },
    );
  }
  const { uid } = await params;
  if (!/^[a-zA-Z0-9_-]{8,40}$/.test(uid)) {
    return NextResponse.json({ ok: false, error: 'invalid uid' }, { status: 400 });
  }
  try {
    await deleteVideo(uid);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'ismeretlen hiba';
    return NextResponse.json({ ok: false, error: msg }, { status: 502 });
  }
}

/**
 * PATCH /api/admin/streams/videos/[uid]
 *   body: { label?, keep?, addToPlaylist?, removeFromPlaylist? }
 *
 * Edits the KV-side operator metadata without round-tripping through
 * CF Stream (which is what we want — labels and toggles are local
 * state only).
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ uid: string }> },
) {
  const guard = await requireStreamsAdmin();
  if (!guard.ok) {
    return NextResponse.json({ ok: false, reason: guard.reason }, {
      status: guard.reason === 'unauthenticated' ? 401 : 403,
    });
  }
  const { uid } = await params;
  if (!/^[a-zA-Z0-9_-]{8,40}$/.test(uid)) {
    return NextResponse.json({ ok: false, error: 'invalid uid' }, { status: 400 });
  }
  try {
    const body = (await req.json()) as {
      label?: string;
      keep?: boolean;
      addToPlaylist?: boolean;
      removeFromPlaylist?: boolean;
    };
    const patch: {
      label?: string;
      keep?: boolean;
      playlistOrder?: number | null;
    } = {};
    if (typeof body.label === 'string') patch.label = body.label.slice(0, 200);
    if (typeof body.keep === 'boolean') patch.keep = body.keep;
    if (body.removeFromPlaylist === true) patch.playlistOrder = null;
    await setVideoMeta(uid, patch);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : 'ismeretlen hiba' },
      { status: 400 },
    );
  }
}
