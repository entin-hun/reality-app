/**
 * Admin Cloudflare Stream — VOD archive endpoints.
 *
 *   GET  /api/admin/streams/videos → list VODs (CF auto-recordings)
 *                                     with operator-controlled fields merged.
 *   POST /api/admin/streams/videos → no-op (force refresh), included for parity
 *                                    with the inputs route.
 *
 * The actual operator field edits (label, keep) live on
 * PUT /api/admin/streams/videos/[uid].
 *
 * Auth: producer/admin via requireStreamsAdmin().
 */

import { NextResponse } from 'next/server';
import { requireStreamsAdmin } from '@/lib/auth/admin-streams';
import { isStreamConfigured, refreshVideos, setVideoMeta } from '@/lib/cf-stream';

export const runtime = 'nodejs';

interface VideosResponse {
  ok: boolean;
  configured: boolean;
  missing?: string[];
  videos: {
    uid: string;
    label: string;
    duration: number;
    status: string;
    created: string;
    modified: string;
    thumbnail: string;
    width?: number;
    height?: number;
    inputUid?: string;
    keep: boolean;
    playlistOrder: number | null;
  }[];
  error?: string;
}

interface PatchBody {
  label?: string;
  keep?: boolean;
  addToPlaylist?: boolean;
}

async function handlePatch(uid: string, body: PatchBody) {
  if (!/^[a-zA-Z0-9_-]{8,40}$/.test(uid)) {
    return NextResponse.json(
      { ok: false, error: 'invalid uid' },
      { status: 400 },
    );
  }
  const patch: { label?: string; keep?: boolean; playlistOrder?: number | null } = {};
  if (typeof body.label === 'string') patch.label = body.label.slice(0, 200);
  if (typeof body.keep === 'boolean') patch.keep = body.keep;
  await setVideoMeta(uid, patch);
  return NextResponse.json({ ok: true });
}

export async function GET() {
  const guard = await requireStreamsAdmin();
  if (!guard.ok) {
    return NextResponse.json({ ok: false, reason: guard.reason }, {
      status: guard.reason === 'unauthenticated' ? 401 : 403,
    });
  }
  const cfg = isStreamConfigured();
  if (!cfg.ok) {
    return NextResponse.json({
      ok: true,
      configured: false,
      missing: cfg.missing,
      videos: [],
    } satisfies VideosResponse);
  }
  try {
    const list = await refreshVideos();
    // Sort newest first.
    list.sort((a, b) => (b.created || '').localeCompare(a.created || ''));
    return NextResponse.json({
      ok: true,
      configured: true,
      videos: list.map((v) => ({
        uid: v.uid,
        label: v.label,
        duration: v.duration,
        status: v.status,
        created: v.created,
        modified: v.modified,
        thumbnail: v.thumbnail,
        width: v.width,
        height: v.height,
        inputUid: v.inputUid,
        keep: v.keep,
        playlistOrder: v.playlistOrder,
      })),
    } satisfies VideosResponse);
  } catch (e) {
    return NextResponse.json(
      {
        ok: true,
        configured: true,
        videos: [],
        error: e instanceof Error ? e.message : 'ismeretlen hiba',
      } satisfies VideosResponse,
      { status: 502 },
    );
  }
}

// PATCH /api/admin/streams/videos — body: { uid, label?, keep? }
// Convenience endpoint for per-row edits without a dynamic segment.
export async function PATCH(req: Request) {
  const guard = await requireStreamsAdmin();
  if (!guard.ok) {
    return NextResponse.json({ ok: false, reason: guard.reason }, {
      status: guard.reason === 'unauthenticated' ? 401 : 403,
    });
  }
  try {
    const body = (await req.json()) as { uid?: string } & PatchBody;
    if (!body.uid) {
      return NextResponse.json({ ok: false, error: 'uid required' }, { status: 400 });
    }
    return await handlePatch(body.uid, body);
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : 'ismeretlen hiba' },
      { status: 400 },
    );
  }
}
