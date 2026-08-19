'use client';

/**
 * LiveNowIndicator — client component that polls /api/streams/current
 * and renders a "🔴 ÉLŐ" badge + "▶ Nézd most" CTA when something is
 * currently broadcasting. When offline it falls back to the supplied
 * children so the surrounding UI keeps its layout intact.
 *
 * Used by:
 *   - homepage hero (replaces the hardcoded <LiveBadge live={false} />)
 *   - global Navbar (so /watch is discoverable pre-purchase)
 *
 * Polls every 30s — cheap (one KV read, no third-party calls). The
 * endpoint is public, so no auth header is needed.
 */

import Link from 'next/link';
import { useEffect, useState } from 'react';

interface CurrentResponse {
  ok: boolean;
  current: {
    uid: string;
    customerCode: string;
    iframeUrl: string;
    hlsManifestUrl: string;
    label: string;
  } | null;
}

export function LiveNowIndicator({
  className = '',
  variant = 'badge',
  showWhenOffline = false,
}: {
  className?: string;
  variant?: 'badge' | 'pill' | 'inline';
  showWhenOffline?: boolean;
}) {
  const [current, setCurrent] = useState<CurrentResponse['current'] | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      try {
        const res = await fetch('/api/streams/current', { cache: 'no-store' });
        if (!res.ok) return;
        const data = (await res.json()) as CurrentResponse;
        if (cancelled) return;
        setCurrent(data?.ok ? data.current : null);
        setLoaded(true);
      } catch {
        // network blip — keep prior state
      }
    };
    void tick();
    const id = setInterval(tick, 30_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const live = !!current;

  if (!loaded) {
    // Render nothing on first paint to avoid layout shift; the surrounding
    // page renders its own offline state.
    return null;
  }

  if (!live && !showWhenOffline) return null;

  if (variant === 'pill') {
    return (
      <Link
        href="/watch"
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-red text-white text-xs font-bold uppercase shadow-lg shadow-brand-red/30 hover:scale-105 transition-transform animate-pulse ${className}`}
      >
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full rounded-full bg-white opacity-75 animate-ping" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
        </span>
        <span>● Élő most</span>
        <span aria-hidden>▶</span>
      </Link>
    );
  }

  if (variant === 'inline') {
    return (
      <Link
        href="/watch"
        className={`inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-brand-red text-white text-base font-bold uppercase shadow-lg shadow-brand-red/40 hover:opacity-90 transition-opacity ${className}`}
      >
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full rounded-full bg-white opacity-75 animate-ping" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white" />
        </span>
        <span>▶ Nézd élőben most</span>
      </Link>
    );
  }

  // 'badge' variant — small pill next to the existing logo/heading
  return (
    <Link
      href="/watch"
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-bold uppercase transition-colors ${
        live
          ? 'bg-brand-red/20 text-brand-red border-brand-red/50 hover:bg-brand-red/30 animate-pulse'
          : 'bg-gray-700/40 text-gray-400 border-gray-600/40'
      } ${className}`}
      title={live ? `Élő: ${current?.label || current?.uid || 'ismeretlen'} — kattints a /watch-hez` : 'Jelenleg nincs élő adás'}
    >
      <span
        className={`inline-block w-1.5 h-1.5 rounded-full ${live ? 'bg-brand-red' : 'bg-gray-500'}`}
      />
      <span>{live ? 'ÉLŐ' : 'OFFLINE'}</span>
    </Link>
  );
}