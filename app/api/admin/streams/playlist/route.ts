/**
 * Admin Cloudflare Stream — playlist (loop) endpoints.
 *
 *   GET  /api/admin/streams/playlist → ordered list of playlist items
 *                                       with VOD metadata.
 *   PUT  /api/admin/streams/playlist → body: { uids: string[] }
 *                                       replaces the entire playlist
 *                                       with the supplied order.
 *
 * Add/remove single items are handled by PATCH on
 * /api/admin/streams/videos/[uid] (with `addToPlaylist` or
 * `removeFromPlaylist`) which routes through the same KV helpers
 * (addToPlaylist / removeFromPlaylist in lib/cf-stream).
 *
 * Auth: producer/admin via requireStreamsAdmin().
 */

import { NextResponse } from 'next/server';
import { requireStreamsAdmin } from '@/lib/auth/admin-streams';
import { getPlaylist, setPlaylist } from '@/lib/cf-stream';

export const runtime = 'nodejs';

interface PlaylistResponse {
  ok: boolean;
  configured: boolean;
  missing?: string[];
  items: { uid: string; label: string; index: number }[];
  error?: string;
}

interface PutBody {
  uids?: unknown;
}

export async function GET() {
  const guard = await requireStreamsAdmin();
  if (!guard.ok) {
    return NextResponse.json({ ok: false, reason: guard.reason }, {
      status: guard.reason === 'unauthenticated' ? 401 : 403,
    });
  }
  try {
    const list = await getPlaylist();
    return NextResponse.json({
      ok: true,
      configured: true,
      items: list.map((v, i) => ({
        uid: v.uid,
        label: v.label || v.uid,
        index: i,
      })),
    } satisfies PlaylistResponse);
  } catch (e) {
    return NextResponse.json({
      ok: true,
      configured: true,
      items: [],
      error: e instanceof Error ? e.message : 'ismeretlen hiba',
    } satisfies PlaylistResponse);
  }
}

export async function PUT(req: Request) {
  const guard = await requireStreamsAdmin();
  if (!guard.ok) {
    return NextResponse.json({ ok: false, reason: guard.reason }, {
      status: guard.reason === 'unauthenticated' ? 401 : 403,
    });
  }
  try {
    const body = (await req.json()) as PutBody;
    if (!Array.isArray(body.uids)) {
      return NextResponse.json({ ok: false, error: 'uids must be an array' }, { status: 400 });
    }
    await setPlaylist(body.uids as string[]);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : 'ismeretlen hiba' },
      { status: 400 },
    );
  }
}
