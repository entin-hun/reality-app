/**
 * Public — what's currently playing on /watch?
 *
 * Returns a discriminated shape so the /watch renderer doesn't need
 * to know about playlists or fallback modes — it just renders
 * `mode === 'live'` (current live input), `mode === 'playlist'` (the
 * curator's loop when nothing is live), or `mode === 'none'` (empty
 * state).
 *
 *   GET /api/streams/current
 *     → {
 *         ok: true,
 *         configured: boolean,
 *         missing?: string[],
 *         mode: 'live' | 'playlist' | 'none',
 *         live?: { uid, customerCode, iframeUrl, hlsManifestUrl, label }
 *         playlist?: { uid, label, iframeUrl }[]
 *       }
 *
 * No auth. The CF Stream iframe URL itself enforces any per-event
 * access policy (CF Stream supports signing the playback URL with a
 * token; for now we rely on the season-pass gate that /watch already
 * checks before rendering the player).
 *
 * Caching: `Cache-Control: no-store` — switching inputs is a manual
 * admin action and we want every poll to see fresh truth.
 */

import { NextResponse } from 'next/server';
import { getCurrentStream, getPlaylistForWatch, isStreamConfigured } from '@/lib/cf-stream';

export const runtime = 'nodejs';

export interface PublicLiveStream {
  uid: string;
  customerCode: string;
  iframeUrl: string;
  hlsManifestUrl: string;
  label: string;
}

export interface PublicPlaylistItem {
  uid: string;
  label: string;
  iframeUrl: string;
}

export interface PublicCurrentResponse {
  ok: true;
  configured: boolean;
  missing?: string[];
  mode: 'live' | 'playlist' | 'none';
  live?: PublicLiveStream;
  playlist?: PublicPlaylistItem[];
}

export async function GET() {
  const cfg = isStreamConfigured();
  if (!cfg.ok) {
    const body: PublicCurrentResponse = {
      ok: true,
      configured: false,
      missing: cfg.missing,
      mode: 'none',
    };
    return NextResponse.json(body, {
      headers: { 'Cache-Control': 'no-store' },
    });
  }
  const live = await getCurrentStream();
  if (live && live.iframeUrl) {
    const body: PublicCurrentResponse = {
      ok: true,
      configured: true,
      mode: 'live',
      live,
    };
    return NextResponse.json(body, {
      headers: { 'Cache-Control': 'no-store' },
    });
  }
  const playlist = await getPlaylistForWatch();
  if (playlist && playlist.length > 0) {
    const body: PublicCurrentResponse = {
      ok: true,
      configured: true,
      mode: 'playlist',
      playlist,
    };
    return NextResponse.json(body, {
      headers: { 'Cache-Control': 'no-store' },
    });
  }
  const body: PublicCurrentResponse = {
    ok: true,
    configured: true,
    mode: 'none',
  };
  return NextResponse.json(body, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
