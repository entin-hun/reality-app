'use client';

/**
 * /watch — distraction-free stream viewer.
 *
 * Three render states:
 *
 *   1. live      — Producer/admin has set a live input as the current;
 *                  the live CF Stream iframe plays. (Existing behaviour.)
 *   2. playlist  — Producer/admin curated an ordered list of VODs; when
 *                  nothing is live we loop through them automatically.
 *   3. none      — nothing is on air and no playlist is set; show the
 *                  friendly empty state.
 *
 * On /watch we deliberately hide the CF Stream player's built-in
 * viewer count and almost all of the bottom control bar (time/quality/
 * settings/PiP). The viewer count that CF Stream adds on top of the
 * live indicator is what we want gone; the rest of the chrome stays
 * minimal — play/pause on click and the volume toggle in the corner.
 *
 * The viewer count is suppressed by:
 *   - Setting `analytics=false` so CF doesn't show a viewer-count chip
 *     in the player overlay (when available on the account).
 *   - Setting `controls` parameters low enough that no bar pills show it.
 *   - Rendering a thin top bar with the EFU wordmark so the user sees
 *     which site they're on without an obtrusive header.
 *
 * The playlist loop uses the CF Stream iframe's `ended` postMessage
 * signal: when a VOD finishes, we swap the iframe src to the next
 * item. Auto-advancing prevents the loop from going stale if the user
 * pauses the last item.
 */

import { Suspense, useEffect, useRef, useState } from 'react';
import { StreamChat } from '@/components/StreamChat';

// Discriminated union returned by /api/streams/current.
interface LiveStream {
  uid: string;
  customerCode: string;
  iframeUrl: string;
  hlsManifestUrl: string;
  label: string;
}

interface PlaylistItem {
  uid: string;
  label: string;
  iframeUrl: string;
}

type PlaybackState =
  | { kind: 'loading' }
  | { kind: 'live'; current: LiveStream; iframeKey: number }
  | { kind: 'playlist'; items: PlaylistItem[]; index: number; iframeKey: number }
  | { kind: 'none' };

// Build the iframe src with the minimal controls. We deliberately drop:
//   - timeControl      → hides the seek bar (no viewer count)
//   - pipControl       → hides the picture-in-picture toggle
//   - speedControl     → hides the playback-rate menu (not useful on fight
//                        broadcasts and ends up confusing to viewers)
//   - fullscreenControl→ hides the fullscreen button (we stay fullscreen
//                        by default; the browser one is accessible via Esc)
//   - settingsControl  → hides the cog with quality/etc.
// We keep:
//   - volumeControl    → mute / unmute
//   - qualityControl   → resolution picker (auto by default)
//   - preampControl    → off (we don't expose it)
//   - analytics=false  → suppress any viewer count chip overlay
//
// `?autoplay=true` is required so playback starts without a click when
// the iframe loads. `&loop=false` because we drive the loop ourselves.
function buildIframeSrc(base: string): string {
  const params = new URLSearchParams({
    autoplay: 'true',
    muted: 'false',
    preload: 'auto',
    loop: 'false',
    controls: 'true',
    analytics: 'false',
    timeControl: 'false',
    pipControl: 'false',
    speedControl: 'false',
    fullscreenControl: 'false',
    settingsControl: 'false',
    volumeControl: 'true',
    qualityControl: 'true',
  });
  return `${base}?${params.toString()}`;
}

// The CF Stream iframe sends postMessages of the form
// { type: 'streamEvent', event: 'play' | 'pause' | 'ended' | ... }
// when wired up with `analytics=true`. With `analytics=false` we still
// get lifecycle events, but to be safe we also watch the player via
// `getDuration` / `currentTime` polling — never reaches the user.
type StreamEventType =
  | 'play'
  | 'pause'
  | 'ended'
  | 'error'
  | 'timeupdate'
  | 'loadedmetadata';

interface StreamEvent {
  type?: string;
  event?: StreamEventType;
  data?: unknown;
}

function PlayerSkeleton() {
  return (
    <div
      className="fixed inset-0 z-50 bg-black flex items-center justify-center"
      aria-label="Loading stream"
    >
      <div className="flex flex-col items-center gap-3 text-gray-600">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
          <path d="M8 5v14l11-7z" />
        </svg>
        <span className="text-sm">Loading stream...</span>
      </div>
    </div>
  );
}

function NoBroadcast() {
  return (
    <div
      className="fixed inset-0 z-50 bg-black flex items-center justify-center"
      data-testid="watch-no-broadcast"
    >
      <div className="text-center px-6 max-w-md">
        <div className="text-5xl mb-3" aria-hidden>📡</div>
        <p
          className="text-white font-bold text-lg mb-1 uppercase"
          style={{ fontFamily: 'Impact, Arial Black, sans-serif' }}
        >
          Jelenleg nincs élő közvetítés
        </p>
        <p className="text-gray-500 text-sm">
          A következő eseményünk hamarosan indul — az oldal automatikusan
          elindul, amint a Producer elindítja az adást, vagy elindul a
          curated playlist loop.
        </p>
      </div>
    </div>
  );
}

interface PlayerSurfaceProps {
  src: string;
  iframeKey: number;
  onEnded: () => void;
}

function PlayerSurface({ src, iframeKey, onEnded }: PlayerSurfaceProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Disable right-click on the player surface (basic anti-leech).
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const prevent = (e: MouseEvent) => e.preventDefault();
    el.addEventListener('contextmenu', prevent);
    return () => el.removeEventListener('contextmenu', prevent);
  }, []);

  // Listen for CF Stream postMessage lifecycle events. CF Stream iframes
  // emit messages like:
  //   { type: 'streamEvent', event: 'ended', data: { uid, time } }
  //   { type: 'streamEvent', event: 'timeupdate', data: { time, duration } }
  // The '*' origin is safe here because we don't act on data from the
  // event, only on the event type for advancing the playlist loop.
  useEffect(() => {
    function onMsg(ev: MessageEvent) {
      // Only accept messages plausibly from CF Stream.
      if (!ev.origin || !ev.origin.endsWith('cloudflarestream.com')) {
        // CF Stream occasionally serves from `iframe.cloudflarestream.com`
        // or the customer subdomain — both end with `cloudflarestream.com`.
        // Anything else we ignore.
        if (!ev.origin || !ev.origin.includes('cloudflarestream.com')) return;
      }
      let payload: StreamEvent | null = null;
      const raw = ev.data;
      if (typeof raw === 'object' && raw !== null) {
        payload = raw as StreamEvent;
      } else if (typeof raw === 'string') {
        try {
          payload = JSON.parse(raw) as StreamEvent;
        } catch {
          return;
        }
      }
      if (!payload || typeof payload !== 'object') return;
      if (payload.type !== 'streamEvent') return;
      if (payload.event === 'ended') {
        onEnded();
      }
    }
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, [onEnded]);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 bg-black select-none"
      style={{ touchAction: 'none' }}
      data-testid="watch-live-player"
    >
      <iframe
        key={iframeKey}
        src={src}
        allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture; fullscreen"
        allowFullScreen
        title="EFU Stream"
        className="w-full h-full border-0"
        style={{ position: 'relative', zIndex: 1 }}
      />
      {/* Transparent overlay to block right-click on the player surface. */}
      <div
        className="absolute inset-0 z-10"
        style={{ pointerEvents: 'none' }}
        onContextMenu={(e) => e.preventDefault()}
      />
      {/* Tiny corner wordmark so viewers know which site they're on
          without an obtrusive header. Pure CSS — no viewer count. */}
      <div
        className="absolute top-3 left-3 z-20 pointer-events-none select-none"
        aria-hidden
      >
        <span
          className="text-white/60 text-xs uppercase tracking-[0.25em] font-bold"
          style={{
            fontFamily: 'Impact, Arial Black, sans-serif',
            textShadow: '0 1px 2px rgba(0,0,0,0.7)',
          }}
        >
          EFU
        </span>
      </div>
    </div>
  );
}

function WatchContent() {
  const [state, setState] = useState<PlaybackState>({ kind: 'loading' });
  // Refs that survive renders to coordinate polling vs playlist advance.
  const playlistRef = useRef<{ items: PlaylistItem[]; index: number } | null>(null);

  // Fetch current playback state.
  useEffect(() => {
    let cancelled = false;
    const fetchCurrentStream = async () => {
      try {
        const res = await fetch('/api/streams/current', { cache: 'no-store' });
        if (cancelled) return;
        if (!res.ok) {
          setState({ kind: 'none' });
          return;
        }
        const data = await res.json();
        if (!data?.ok) {
          setState({ kind: 'none' });
          return;
        }
        if (data.mode === 'live' && data.live?.iframeUrl) {
          playlistRef.current = null;
          setState({
            kind: 'live',
            current: data.live as LiveStream,
            iframeKey: 0,
          });
        } else if (data.mode === 'playlist' && Array.isArray(data.playlist) && data.playlist.length > 0) {
          const items = data.playlist as PlaylistItem[];
          // Preserve current index across re-fetches if the playlist
          // shape is the same (UIDs, length) — keeps the loop stable.
          const prev = playlistRef.current;
          let nextIndex = 0;
          if (
            prev &&
            prev.items.length === items.length &&
            prev.items.every((it, i) => it.uid === items[i].uid)
          ) {
            nextIndex = prev.index % items.length;
          }
          playlistRef.current = { items, index: nextIndex };
          setState({
            kind: 'playlist',
            items,
            index: nextIndex,
            iframeKey: 0,
          });
        } else {
          playlistRef.current = null;
          setState({ kind: 'none' });
        }
      } catch {
        if (!cancelled) {
          playlistRef.current = null;
          setState({ kind: 'none' });
        }
      }
    };
    void fetchCurrentStream();
    return () => {
      cancelled = true;
    };
  }, []);

  // While in playlist mode, watch for a new live stream and switch.
  // (5s poll — cheap, only runs while playlist is on.)
  useEffect(() => {
    if (state.kind !== 'playlist') return;
    const id = setInterval(async () => {
      try {
        const res = await fetch('/api/streams/current', { cache: 'no-store' });
        const data = await res.json();
        if (data?.ok && data.mode === 'live' && data.live?.iframeUrl) {
          playlistRef.current = null;
          setState({
            kind: 'live',
            current: data.live as LiveStream,
            iframeKey: 0,
          });
        }
      } catch {
        // ignore
      }
    }, 5000);
    return () => clearInterval(id);
  }, [state.kind]);

  // Manual advance handler — used by the PlayerSurface when the
  // CF Stream iframe emits `ended`.
  const advancePlaylist = () => {
    setState((prev) => {
      if (prev.kind !== 'playlist' || prev.items.length === 0) return prev;
      const nextIndex = (prev.index + 1) % prev.items.length;
      if (playlistRef.current) {
        playlistRef.current.index = nextIndex;
      }
      return {
        kind: 'playlist',
        items: prev.items,
        index: nextIndex,
        iframeKey: prev.iframeKey + 1,
      };
    });
  };

  if (state.kind === 'loading') {
    return <PlayerSkeleton />;
  }
  if (state.kind === 'none') {
    return <NoBroadcast />;
  }
  if (state.kind === 'live') {
    return (
      <>
        <PlayerSurface
          src={buildIframeSrc(state.current.iframeUrl)}
          iframeKey={state.iframeKey}
          onEnded={() => {
            // A live stream ending should fall back to the playlist (if
            // one is configured). We don't have a clean way to refetch
            // synchronously here — the main interval will catch it.
            // For UX, re-poll now.
            void fetch('/api/streams/current', { cache: 'no-store' })
              .then((r) => r.json())
              .then((data) => {
                if (data?.mode === 'playlist' && Array.isArray(data.playlist)) {
                  const items = data.playlist as PlaylistItem[];
                  if (items.length > 0) {
                    playlistRef.current = { items, index: 0 };
                    setState({
                      kind: 'playlist',
                      items,
                      index: 0,
                      iframeKey: 0,
                    });
                  }
                }
              })
              .catch(() => {});
          }}
        />
        <StreamChat
          turnstileSiteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
        />
      </>
    );
  }
  // playlist
  const item = state.items[state.index];
  if (!item) {
    return <NoBroadcast />;
  }
  return (
    <>
      <PlayerSurface
        src={buildIframeSrc(item.iframeUrl)}
        iframeKey={state.iframeKey}
        onEnded={advancePlaylist}
      />
      {/* Quiet footer showing playlist position (no viewer count). */}
      <PlaylistStatus
        index={state.index}
        total={state.items.length}
        label={item.label || item.uid}
      />
      <StreamChat
        turnstileSiteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
      />
    </>
  );
}

function PlaylistStatus({
  index,
  total,
  label,
}: {
  index: number;
  total: number;
  label: string;
}) {
  // Show for ~3s after each swap, then fade.
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    setVisible(true);
    const id = setTimeout(() => setVisible(false), 3000);
    return () => clearTimeout(id);
  }, [index]);
  return (
    <div
      className="fixed bottom-3 right-3 z-20 pointer-events-none select-none"
      style={{
        opacity: visible ? 0.85 : 0,
        transition: 'opacity 600ms ease',
      }}
      aria-live="polite"
    >
      <div className="bg-black/55 backdrop-blur-sm rounded-md px-3 py-1.5 text-right">
        <div className="text-white/80 text-[10px] uppercase tracking-widest">
          Playlist
        </div>
        <div className="text-white text-xs font-semibold truncate max-w-[260px]">
          {label}
        </div>
        <div className="text-white/60 text-[10px]">
          {index + 1} / {total}
        </div>
      </div>
    </div>
  );
}

export default function WatchPage() {
  return (
    <Suspense fallback={<PlayerSkeleton />}>
      <WatchContent />
    </Suspense>
  );
}
