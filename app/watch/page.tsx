'use client';

import { Suspense, useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CloudflareMockPlayer } from '@/components/CloudflareMockPlayer';

// Mock stream token response (in real app this comes from /api/get-stream-token)
const MOCK_STREAM_TOKEN = 'eyJhbGciOiJSUzI1NiIsImtpZCI6ImNmLXN0cmVhbS1rZXkifQ.eyJ2aWRlb0lkIjoiYWJjMTIzZGVmNDU2IiwiZXhwIjoxNzE3NzgwMDAwLCJuYmYiOjE3MTc3NzY0MDB9.MOCK_SIGNATURE';

const STREAM_ID = 'abc123def456789'; // mock stream ID
const MOCK_CF_CUSTOMER_CODE = 'f33zs165nr7gyfy4';
const MOCK_CF_VIDEO_UID = '6b9e68b07dfee8cc2d116e4c51d6a957';
const MOCK_CF_POSTER =
  `https://customer-${MOCK_CF_CUSTOMER_CODE}.cloudflarestream.com/${MOCK_CF_VIDEO_UID}/thumbnails/thumbnail.jpg?time=&height=600`;
const MOCK_CF_IFRAME_URL =
  `https://customer-${MOCK_CF_CUSTOMER_CODE}.cloudflarestream.com/${MOCK_CF_VIDEO_UID}/iframe?poster=${encodeURIComponent(MOCK_CF_POSTER)}`;
const MOCK_CF_HLS_MANIFEST =
  `https://customer-${MOCK_CF_CUSTOMER_CODE}.cloudflarestream.com/${MOCK_CF_VIDEO_UID}/manifest/video.m3u8`;

type PlayerMode = 'cloudflare-player' | 'hlsjs';

function VideoPlayerSkeleton() {
  return (
    <div className="w-full aspect-video bg-brand-dark-card rounded-xl flex items-center justify-center animate-pulse">
      <div className="flex flex-col items-center gap-3 text-gray-600">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
          <path d="M8 5v14l11-7z" />
        </svg>
        <span className="text-sm">Loading stream...</span>
      </div>
    </div>
  );
}

// Live stream config surfaced by /api/streams/current. When present, the
// watch page swaps the mock iframe + HLS player for the real CF Stream
// playback URLs (uid selected by the Producer / Admin via /dashboard/streams).
interface LiveStream {
  uid: string;
  customerCode: string;
  iframeUrl: string;
  hlsManifestUrl: string;
  label: string;
}

function WatchContent() {
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [tokenLoading, setTokenLoading] = useState(true);
  const [isPreview, setIsPreview] = useState(false);
  const [playerMode, setPlayerMode] = useState<PlayerMode>('cloudflare-player');
  const [viewerCount] = useState(Math.floor(Math.random() * 3000) + 1200);
  const [liveStream, setLiveStream] = useState<LiveStream | null>(null);
  const [liveStreamChecked, setLiveStreamChecked] = useState(false);
  const videoRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const preview = searchParams.get('preview') === 'true';
    setIsPreview(preview);

    const access = localStorage.getItem('cw_access') === 'granted';
    const loggedIn = localStorage.getItem('cw_logged_in') === 'true';

    if (preview) {
      setAuthorized(true);
      setToken('preview-token');
      setPlayerMode('hlsjs');
      setTokenLoading(false);
      return;
    }

    if (!loggedIn) {
      router.replace('/');
      return;
    }

    if (!access) {
      setAuthorized(false);
      setTokenLoading(false);
      return;
    }

    // Simulate fetching signed token from /api/get-stream-token
    const fetchToken = async () => {
      await new Promise((r) => setTimeout(r, 900));
      setToken(MOCK_STREAM_TOKEN);
      setAuthorized(true);
      setTokenLoading(false);
    };
    fetchToken();

    // Pull the live stream config (uid chosen by Producer/Admin). When
    // present, prefer it over the CF mock examples so /watch reflects
    // whatever is actually on air. Falls back to mocks when absent.
    const fetchCurrentStream = async () => {
      try {
        const res = await fetch('/api/streams/current', { cache: 'no-store' });
        if (!res.ok) {
          setLiveStreamChecked(true);
          return;
        }
        const data = await res.json();
        if (data?.ok && data.current && data.current.iframeUrl) {
          setLiveStream(data.current as LiveStream);
        }
      } catch {
        // Network blip — keep mocks. UI shows a graceful empty state below.
      } finally {
        setLiveStreamChecked(true);
      }
    };
    void fetchCurrentStream();
  }, [router, searchParams]);

  // Disable right-click on video
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    const prevent = (e: MouseEvent) => e.preventDefault();
    el.addEventListener('contextmenu', prevent);
    return () => el.removeEventListener('contextmenu', prevent);
  }, [token]);

  if (authorized === null || tokenLoading) {
    return (
      <main className="min-h-screen pt-16 px-4 max-w-5xl mx-auto">
        <div className="pt-10">
          <VideoPlayerSkeleton />
        </div>
      </main>
    );
  }

  if (!authorized) {
    return (
      <main className="min-h-screen pt-16 flex items-center justify-center px-4">
        <div className="card-dark rounded-2xl p-8 sm:p-12 text-center max-w-md w-full">
          <div className="text-5xl mb-4">🔒</div>
          <h2
            className="text-3xl font-black text-white mb-3"
            style={{ fontFamily: 'Impact, Arial Black, sans-serif' }}
          >
            HOZZÁFÉRÉS MEGTAGADVA
          </h2>
          <p className="text-gray-400 mb-6">
            Az esemény megtekintéséhez aktív szezonbérlet szükséges.
          </p>
          <Link href="/#pricing" className="btn-primary inline-block">
            Szezonbérlet kérése — 2 500 HUF
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen pt-16">
      {/* Preview banner */}
      {isPreview && (
        <div className="bg-brand-gold/10 border-b border-brand-gold/30 px-4 py-3 text-center">
          <p className="text-brand-gold text-sm font-semibold">
            🎬 Ingyenes teaser — most egy 3 perces előzetest nézel.{' '}
            <Link href="/#pricing" className="underline hover:text-yellow-300">
              Teljes közvetítés feloldása →
            </Link>
          </p>
        </div>
      )}

      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Status bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              {!isPreview && (
                <div className="flex items-center gap-1.5 px-2 py-1 bg-brand-red/20 border border-brand-red/40 rounded-full">
                  <div className="w-2 h-2 rounded-full bg-brand-red animate-pulse" />
                  <span className="text-brand-red text-xs font-bold uppercase">ÉLŐ</span>
                </div>
              )}
              <h1
                className="text-xl sm:text-2xl font-black text-white uppercase"
                style={{ fontFamily: 'Impact, Arial Black, sans-serif' }}
              >
                {liveStream
                  ? liveStream.label || `EFU · ${liveStream.uid.slice(0, 6)}`
                  : isPreview
                    ? 'TEASER'
                    : 'EFU · 2026 Szezon 1. Esemény'}
              </h1>
            </div>
            <p className="text-gray-500 text-sm">
              {liveStream
                ? `Élő adás · UID ${liveStream.uid}`
                : 'Budapest Aréna · 2026. július 17.'}
            </p>
          </div>
          <div className="flex items-center gap-2 text-gray-500 text-sm">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
            </svg>
            <span className="font-medium text-white">{viewerCount.toLocaleString()}</span>
            <span>néző élőben</span>
          </div>
        </div>

        <div className="mb-4 card-dark rounded-xl p-3 flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
          <p className="text-xs text-gray-500 uppercase tracking-widest">
            {liveStream ? 'Élő adás' : 'Mock lejátszó mód (Cloudflare példák alapján)'}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPlayerMode('cloudflare-player')}
              className={`px-3 py-1.5 rounded text-xs font-semibold transition-colors ${
                playerMode === 'cloudflare-player'
                  ? 'bg-brand-red text-white'
                  : 'bg-brand-dark-muted text-gray-300'
              }`}
            >
              Stream Player iframe
            </button>
            <button
              onClick={() => setPlayerMode('hlsjs')}
              className={`px-3 py-1.5 rounded text-xs font-semibold transition-colors ${
                playerMode === 'hlsjs'
                  ? 'bg-brand-red text-white'
                  : 'bg-brand-dark-muted text-gray-300'
              }`}
            >
              hls.js manifest
            </button>
          </div>
        </div>

        {/* Video Player */}
        <div
          ref={videoRef}
          className="video-wrapper w-full aspect-video bg-black rounded-xl overflow-hidden relative select-none"
          style={{ touchAction: 'none' }}
        >
          {liveStreamChecked && !liveStream ? (
            // No live broadcast configured yet — show a placeholder so the
            // page communicates the gap clearly instead of faking playback.
            <div className="w-full h-full flex items-center justify-center bg-brand-dark-card">
              <div className="text-center px-6">
                <div className="text-5xl mb-3" aria-hidden>📡</div>
                <p className="text-white font-bold text-lg mb-1" style={{ fontFamily: 'Impact, Arial Black, sans-serif' }}>
                  JELENLEG NINCS ÉLŐ KÖZVETÍTÉS
                </p>
                <p className="text-gray-500 text-sm">
                  A következő eseményünk hamarosan indul — a /watch automatikusan
                  elindul, amint a Producer elindítja az adást.
                </p>
                <p className="text-gray-600 text-xs mt-3">
                  Stream beállítás: <code className="text-gray-500">/dashboard/streams</code>
                </p>
              </div>
            </div>
          ) : playerMode === 'cloudflare-player' ? (
            <iframe
              src={
                liveStream
                  ? `${liveStream.iframeUrl}?token=${token}&autoplay=true&muted=false&preload=true`
                  : isPreview
                    ? MOCK_CF_IFRAME_URL
                    : `https://customer-stream.cloudflarestream.com/embed/${STREAM_ID}?token=${token}&autoplay=true&muted=false&preload=true`
              }
              allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
              allowFullScreen
              title="EFU Live Stream"
              className="w-full h-full border-0"
              style={{ position: 'relative', zIndex: 1 }}
            />
          ) : (
            <CloudflareMockPlayer
              manifestUrl={liveStream?.hlsManifestUrl ?? MOCK_CF_HLS_MANIFEST}
              poster={liveStream ? undefined : MOCK_CF_POSTER}
            />
          )}

          {/* Watermark overlay */}
          <div
            className="absolute top-4 right-4 z-20 px-2 py-1 bg-black/50 rounded text-white/40 text-xs font-mono select-none pointer-events-none"
            style={{ userSelect: 'none' }}
          >
            EFU · LICENCELT STREAM
          </div>

          {/* Transparent overlay to block right-click on player */}
          <div
            className="absolute inset-0 z-30"
            style={{ pointerEvents: 'none' }}
            onContextMenu={(e) => e.preventDefault()}
          />
        </div>

        {/* Below player info */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Stream info */}
          <div className="card-dark rounded-xl p-4 sm:col-span-2">
            <h2 className="font-bold text-white mb-1 text-base">
              Főmeccs: KOZÁK PÉTER vs. STEFAN MÜLLER
            </h2>
            <p className="text-gray-500 text-sm">
              Nehézsúlyú bajnoki mérkőzés · 5 menet · Budapest Aréna
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="px-2 py-1 bg-brand-dark-muted rounded text-xs text-gray-400">
                🔒 Aláírt token: aktív
              </span>
              <span className="px-2 py-1 bg-brand-dark-muted rounded text-xs text-gray-400">
                🛡️ Cloudflare Stream
              </span>
              <span className="px-2 py-1 bg-brand-dark-muted rounded text-xs text-gray-400">
                ⚡ CDN: Frankfurt PoP
              </span>
              {liveStream ? (
                <span className="px-2 py-1 bg-emerald-600/30 text-emerald-300 rounded text-xs">
                  🟢 Élő forrás: {liveStream.uid.slice(0, 8)}
                </span>
              ) : (
                <span className="px-2 py-1 bg-brand-dark-muted rounded text-xs text-gray-400">
                  🎬 Mock forrás: Cloudflare examples
                </span>
              )}
            </div>
          </div>

          {/* Token refresh */}
          <div className="card-dark rounded-xl p-4 flex flex-col justify-between">
            <div>
              <p className="text-xs text-gray-500 mb-1 uppercase tracking-wider">Stream token</p>
              <p className="text-green-400 text-sm font-medium">✓ Érvényes · 58 perc maradt</p>
              <p className="text-gray-600 text-xs mt-1">Frissítés után automatikusan újragenerálódik</p>
            </div>
            {!isPreview && (
              <div className="mt-3 text-xs text-brand-gold border border-brand-gold/20 rounded px-2 py-1 text-center">
                ✓ Szezonbérlet aktív
              </div>
            )}
          </div>
        </div>

        {/* Share prompt for free preview */}
        {isPreview && (
          <div className="mt-6 card-dark rounded-xl p-6 text-center border-brand-gold/20 border">
            <p className="text-brand-gold font-bold text-lg mb-2">Tetszett a teaser?</p>
            <p className="text-gray-400 text-sm mb-5">
              Kérd a szezonbérletet, és nézd az összes 2026-os meccset élőben.
            </p>
            <Link href="/#pricing" className="btn-gold inline-block text-base px-8">
              Szezonbérlet kérése — 2 500 HUF
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}

export default function WatchPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen pt-16 px-4 max-w-5xl mx-auto">
          <div className="pt-10">
            <VideoPlayerSkeleton />
          </div>
        </main>
      }
    >
      <WatchContent />
    </Suspense>
  );
}
