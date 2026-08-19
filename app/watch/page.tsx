'use client';

/**
 * /watch — distraction-free live stream viewer.
 *
 * Just the CF Stream iframe filling the whole viewport. Nothing else:
 * no header, no status bar, no player-mode toggle, no info cards, no
 * CTAs, no share buttons. The CF Stream iframe already ships its own
 * playback controls and viewer count, so we don't reinvent them.
 *
 * The "no broadcast" empty state is the only other thing that can render.
 */

import { Suspense, useEffect, useRef, useState } from 'react';

// Live stream config surfaced by /api/streams/current. The Producer /
// Admin picks the uid in /dashboard/streams — /watch reflects whatever
// is actually on air.
interface LiveStream {
  uid: string;
  customerCode: string;
  iframeUrl: string;
  hlsManifestUrl: string;
  label: string;
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
          elindul, amint a Producer elindítja az adást.
        </p>
      </div>
    </div>
  );
}

function WatchContent() {
  const [liveStream, setLiveStream] = useState<LiveStream | null>(null);
  const [liveStreamChecked, setLiveStreamChecked] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    const fetchCurrentStream = async () => {
      try {
        const res = await fetch('/api/streams/current', { cache: 'no-store' });
        if (cancelled) return;
        if (!res.ok) {
          setLiveStreamChecked(true);
          return;
        }
        const data = await res.json();
        if (data?.ok && data.current && data.current.iframeUrl) {
          setLiveStream(data.current as LiveStream);
        }
      } catch {
        // Network blip — UI falls back to the no-broadcast state.
      } finally {
        if (!cancelled) setLiveStreamChecked(true);
      }
    };
    void fetchCurrentStream();
    return () => {
      cancelled = true;
    };
  }, []);

  // Disable right-click on the player surface (basic anti-leech).
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const prevent = (e: MouseEvent) => e.preventDefault();
    el.addEventListener('contextmenu', prevent);
    return () => el.removeEventListener('contextmenu', prevent);
  }, [liveStream]);

  if (!liveStreamChecked) {
    return <PlayerSkeleton />;
  }

  if (!liveStream) {
    return <NoBroadcast />;
  }

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 bg-black select-none"
      style={{ touchAction: 'none' }}
      data-testid="watch-live-player"
    >
      <iframe
        src={`${liveStream.iframeUrl}?autoplay=true&muted=false&preload=true`}
        allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture; fullscreen"
        allowFullScreen
        title="EFU Live Stream"
        className="w-full h-full border-0"
        style={{ position: 'relative', zIndex: 1 }}
      />
      {/* Transparent overlay to block right-click on the player surface. */}
      <div
        className="absolute inset-0 z-10"
        style={{ pointerEvents: 'none' }}
        onContextMenu={(e) => e.preventDefault()}
      />
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
