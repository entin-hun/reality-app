'use client';

/**
 * StreamsArchive — admin UI for the CF Stream VOD archive.
 *
 * For every auto-recorded VOD it lets the operator:
 *   1. Preview it (inline CF Stream iframe with audio).
 *   2. Mark it as "keep" / "ok-to-delete" (purely organizational —
 *      nothing deletes without a click).
 *   3. Toggle it in/out of the looping playlist that runs on /watch
 *      when no live stream is on air.
 *   4. Reorder the playlist.
 *   5. Permanently delete the VOD from CF Stream (irreversible;
 *      storage cost goes away).
 *
 * Endpoints consumed:
 *   GET    /api/admin/streams/videos       — VOD list with operator
 *                                             metadata merged.
 *   PATCH  /api/admin/streams/videos/[uid] — {label?, keep?,
 *                                             addToPlaylist?,
 *                                             removeFromPlaylist?}
 *   DELETE /api/admin/streams/videos/[uid] — drop from CF Stream.
 *   GET    /api/admin/streams/playlist     — ordered UID list.
 *   PUT    /api/admin/streams/playlist     — replace whole order.
 *
 * All requests go through the role cookie that /api/admin/streams/*
 * checks via `requireStreamsAdmin()` server-side.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

interface Video {
  uid: string;
  label: string;
  duration: number;
  status: 'ready' | 'downloading' | 'queued' | 'error' | 'unknown';
  created: string;
  modified: string;
  thumbnail: string;
  width?: number;
  height?: number;
  inputUid?: string;
  keep: boolean;
  playlistOrder: number | null;
}

interface VideosListResponse {
  ok: boolean;
  configured: boolean;
  missing?: string[];
  customerCode?: string;
  videos: Video[];
  error?: string;
}

interface PlaylistResponse {
  ok: boolean;
  configured: boolean;
  items: { uid: string; label: string; index: number }[];
}

interface PlaylistPutResponse {
  ok: boolean;
  error?: string;
}

function formatDuration(seconds: number): string {
  if (!seconds || seconds < 0) return '—';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatDate(iso: string): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString('hu-HU', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

const STATUS_COLOR: Record<Video['status'], string> = {
  ready: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  downloading: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
  queued: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
  error: 'bg-brand-red/20 text-brand-red border-brand-red/40',
  unknown: 'bg-gray-700/40 text-gray-400 border-gray-600/40',
};

const STATUS_LABEL: Record<Video['status'], string> = {
  ready: 'Feldolgozva',
  downloading: 'Feldolgozás…',
  queued: 'Várakozik',
  error: 'Hiba',
  unknown: 'Ismeretlen',
};

/**
 * Inline preview — same CF Stream iframe as the public /watch page but
 * constrained to the row width and with the full control bar so the
 * operator can scrub, watch with audio, and confirm the VOD is worth
 * keeping.
 */
function VideoPreview({
  uid,
  customerCode,
  label,
  onClose,
}: {
  uid: string;
  customerCode: string;
  label: string;
  onClose: () => void;
}) {
  const iframeUrl = `https://customer-${customerCode}.cloudflarestream.com/${uid}/iframe`;
  return (
    <div className="rounded-lg overflow-hidden border border-white/10 bg-black">
      <div className="flex items-center justify-between px-3 py-1.5 bg-brand-dark-muted text-xs">
        <span className="text-gray-300 truncate">
          Előnézet: <strong className="text-white">{label || uid}</strong>
        </span>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white text-xs font-semibold"
        >
          Bezárás ✕
        </button>
      </div>
      <div className="relative w-full" style={{ aspectRatio: '16/9' }}>
        <iframe
          src={`${iframeUrl}?autoplay=true&muted=false&preload=auto&controls=true`}
          allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          title={`Preview ${label}`}
          className="w-full h-full border-0"
        />
      </div>
    </div>
  );
}

export function StreamsArchive() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [missing, setMissing] = useState<string[]>([]);
  // Pulled from /api/admin/streams/videos — drives the inline preview
  // iframe URL. No more empty-string prop when no live input is set.
  const [customerCode, setCustomerCode] = useState<string>('');

  const [previewUid, setPreviewUid] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  // Playlist reorder state. We keep a local snapshot while reordering
  // so we can call PUT once on "Save order" instead of round-tripping
  // on every drag.
  const [playlistOrder, setPlaylistOrder] = useState<string[]>([]);
  const [playlistDirty, setPlaylistDirty] = useState(false);
  const [playlistBusy, setPlaylistBusy] = useState(false);

  // Edits are batched into a manual save per row. Track which UIDs have
  // pending label edits.
  const [labelDrafts, setLabelDrafts] = useState<Record<string, string>>({});
  const [labelDirty, setLabelDirty] = useState<Record<string, boolean>>({});

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [vRes, pRes] = await Promise.all([
        fetch('/api/admin/streams/videos', { cache: 'no-store' }),
        fetch('/api/admin/streams/playlist', { cache: 'no-store' }),
      ]);
      const vData = (await vRes.json()) as VideosListResponse;
      const pData = (await pRes.json()) as PlaylistResponse;
      if (!vData.ok) throw new Error(vData.error ?? 'videos fetch failed');
      setVideos(vData.videos ?? []);
      setConfigured(vData.configured);
      setMissing(vData.missing ?? []);
      setCustomerCode(vData.customerCode ?? '');
      if (pData.ok) {
        const items = (pData.items ?? []).map((i) => i.uid);
        setPlaylistOrder(items);
        setPlaylistDirty(false);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'ismeretlen hiba');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Reload 30s after mount so newly-finished recordings appear without
  // a manual refresh.
  useEffect(() => {
    const id = setInterval(() => void refresh(), 30_000);
    return () => clearInterval(id);
  }, [refresh]);

  const setVideoField = useCallback(
    async (uid: string, patch: {
      label?: string;
      keep?: boolean;
      addToPlaylist?: boolean;
      removeFromPlaylist?: boolean;
    }) => {
      setBusy(uid);
      try {
        const res = await fetch(`/api/admin/streams/videos/${uid}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(patch),
        });
        const data = await res.json();
        if (!res.ok || !data.ok) throw new Error(data.error ?? 'patch failed');
        await refresh();
      } catch (e) {
        alert(e instanceof Error ? e.message : 'Ismeretlen hiba');
      } finally {
        setBusy(null);
      }
    },
    [refresh],
  );

  const handleDelete = useCallback(
    async (uid: string, label: string) => {
      if (
        !confirm(
          `Biztosan törlöd ezt a VOD-ot?\n\n${label || uid}\n\nEz törli a CF Stream-ből (storage költség is megszűnik). Nem visszavonható.`,
        )
      ) {
        return;
      }
      setBusy(uid);
      try {
        const res = await fetch(`/api/admin/streams/videos/${uid}`, {
          method: 'DELETE',
        });
        const data = await res.json();
        if (!res.ok || !data.ok) throw new Error(data.error ?? 'delete failed');
        if (previewUid === uid) setPreviewUid(null);
        await refresh();
      } catch (e) {
        alert(e instanceof Error ? e.message : 'Törlés sikertelen');
      } finally {
        setBusy(null);
      }
    },
    [refresh, previewUid],
  );

  const handleSavePlaylist = useCallback(async () => {
    setPlaylistBusy(true);
    try {
      const res = await fetch('/api/admin/streams/playlist', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uids: playlistOrder }),
      });
      const data = (await res.json()) as PlaylistPutResponse;
      if (!res.ok || !data.ok) throw new Error(data.error ?? 'put failed');
      setPlaylistDirty(false);
      await refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Mentés sikertelen');
    } finally {
      setPlaylistBusy(false);
    }
  }, [playlistOrder, refresh]);

  const moveInPlaylist = (uid: string, dir: -1 | 1) => {
    setPlaylistOrder((prev) => {
      const next = [...prev];
      const i = next.indexOf(uid);
      if (i < 0) return prev;
      const j = i + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
    setPlaylistDirty(true);
  };

  const removeFromPlaylistLocal = (uid: string) => {
    setPlaylistOrder((prev) => prev.filter((u) => u !== uid));
    setPlaylistDirty(true);
  };

  const addToPlaylistLocal = (uid: string) => {
    setPlaylistOrder((prev) => (prev.includes(uid) ? prev : [...prev, uid]));
    setPlaylistDirty(true);
  };

  const saveLabel = async (uid: string) => {
    const draft = labelDrafts[uid];
    if (draft === undefined) return;
    await setVideoField(uid, { label: draft });
    setLabelDirty((p) => {
      const n = { ...p };
      delete n[uid];
      return n;
    });
    setLabelDrafts((p) => {
      const n = { ...p };
      delete n[uid];
      return n;
    });
  };

  const videosByUid = useMemo(() => {
    const m = new Map<string, Video>();
    for (const v of videos) m.set(v.uid, v);
    return m;
  }, [videos]);

  return (
    <section className="card-dark rounded-xl p-5 mt-6">
      <header className="flex items-baseline justify-between flex-wrap gap-3 mb-4">
        <div>
          <h2 className="text-white text-lg font-bold">VOD archívum</h2>
          <p className="text-gray-500 text-xs mt-1">
            Minden stream <code className="text-gray-300">recording: automatic</code> módban
            kerül mentésre — itt nézheted meg, jelölheted megőrzésre, és
            összeállíthatod a /watch loop playlistjét.
          </p>
        </div>
        <button
          onClick={() => void refresh()}
          disabled={loading}
          className="px-3 py-2 text-xs font-semibold rounded bg-brand-dark-muted text-gray-300 hover:bg-brand-dark disabled:opacity-50"
        >
          {loading ? 'Frissítés…' : 'Frissítés'}
        </button>
      </header>

      {configured === false && (
        <div className="rounded-lg p-4 mb-4 border border-brand-gold/40 bg-brand-dark-muted">
          <p className="text-brand-gold font-semibold text-sm">
            ⚠️ A CF Stream nincs konfigurálva
          </p>
          <p className="text-gray-400 text-xs mt-1">
            Hiányzó secret-ek:{' '}
            {missing.map((m) => (
              <code key={m} className="px-1 py-0.5 mx-0.5 bg-brand-dark-card rounded text-[10px]">
                {m}
              </code>
            ))}
          </p>
        </div>
      )}

      {error && (
        <div className="rounded-lg p-3 mb-4 border border-brand-red/50 bg-brand-dark-muted">
          <p className="text-brand-red text-sm">{error}</p>
        </div>
      )}

      {/* Playlist section */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm uppercase tracking-widest text-gray-500">
            Playlist ({playlistOrder.length})
            {playlistDirty && (
              <span className="ml-2 text-brand-gold normal-case tracking-normal text-[10px]">
                • nem mentett változtatások
              </span>
            )}
          </h3>
          <div className="flex gap-2">
            <button
              onClick={() => void handleSavePlaylist()}
              disabled={!playlistDirty || playlistBusy}
              className="px-3 py-1.5 text-xs font-bold rounded bg-brand-red text-white hover:opacity-90 disabled:opacity-40"
            >
              {playlistBusy ? 'Mentés…' : 'Sorrend mentése'}
            </button>
          </div>
        </div>
        {playlistOrder.length === 0 ? (
          <p className="text-gray-500 text-sm bg-brand-dark-muted rounded p-3">
            A playlist üres. Az alábbi listában a „+ Playlistre” gombbal tudsz
            VOD-okat hozzáadni — a /watch ezt fogja loopolni, amikor nincs élő
            adás.
          </p>
        ) : (
          <ol className="space-y-1">
            {playlistOrder.map((uid, i) => {
              const v = videosByUid.get(uid);
              return (
                <li
                  key={uid}
                  className="flex items-center gap-2 bg-brand-dark-muted rounded px-3 py-2 text-sm"
                >
                  <span className="w-6 text-right text-gray-500 font-mono">
                    {i + 1}.
                  </span>
                  <span className="flex-1 truncate text-white">
                    {v?.label || uid}
                    {v && v.status !== 'ready' && (
                      <span className="ml-2 text-[10px] text-amber-300 uppercase">
                        ({STATUS_LABEL[v.status]})
                      </span>
                    )}
                  </span>
                  <span className="text-gray-500 text-xs hidden sm:inline">
                    {v ? formatDuration(v.duration) : '—'}
                  </span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => moveInPlaylist(uid, -1)}
                      disabled={i === 0}
                      title="Feljebb"
                      aria-label="Move up"
                      className="px-2 py-1 text-xs rounded bg-brand-dark-card text-gray-300 hover:bg-brand-dark disabled:opacity-30"
                    >
                      ▲
                    </button>
                    <button
                      onClick={() => moveInPlaylist(uid, +1)}
                      disabled={i === playlistOrder.length - 1}
                      title="Lejjebb"
                      aria-label="Move down"
                      className="px-2 py-1 text-xs rounded bg-brand-dark-card text-gray-300 hover:bg-brand-dark disabled:opacity-30"
                    >
                      ▼
                    </button>
                    <button
                      onClick={() => removeFromPlaylistLocal(uid)}
                      title="Eltávolítás a playlistről"
                      className="px-2 py-1 text-xs rounded bg-brand-dark-card text-gray-300 hover:bg-brand-red/40"
                    >
                      ✕
                    </button>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>

      {/* Archive rows */}
      <h3 className="text-sm uppercase tracking-widest text-gray-500 mb-2">
        VOD-ok ({videos.length})
      </h3>
      {loading && videos.length === 0 ? (
        <p className="text-gray-500 text-sm">Betöltés…</p>
      ) : videos.length === 0 ? (
        <p className="text-gray-500 text-sm bg-brand-dark-muted rounded p-3">
          Még nincs rögzített VOD. Mikor elindítod az első streamet és a CF
          feldolgozza, itt fognak megjelenni az automatikus felvételek.
        </p>
      ) : (
        <ul className="space-y-3">
          {videos.map((v) => {
            const isExpanded = previewUid === v.uid;
            const isInPlaylist = v.playlistOrder !== null;
            const isBusy = busy === v.uid;
            return (
              <li
                key={v.uid}
                className={`bg-brand-dark-muted rounded-lg p-3 ${
                  v.status === 'error' ? 'border border-brand-red/40' : ''
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  {/* Thumbnail */}
                  {v.thumbnail ? (
                    <img
                      src={v.thumbnail}
                      alt={v.label}
                      className="w-32 h-20 object-cover rounded border border-white/10 flex-shrink-0"
                    />
                  ) : (
                    <div className="w-32 h-20 bg-brand-dark-card rounded flex items-center justify-center text-gray-600 text-xs flex-shrink-0">
                      Nincs kép
                    </div>
                  )}
                  {/* Meta */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span
                        className={`inline-flex items-center text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border ${STATUS_COLOR[v.status]}`}
                      >
                        {STATUS_LABEL[v.status]}
                      </span>
                      {isInPlaylist && (
                        <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-brand-gold text-black">
                          Playlist #{v.playlistOrder! + 1}
                        </span>
                      )}
                      {v.keep ? (
                        <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                          Megőrizendő
                        </span>
                      ) : (
                        <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-gray-700/40 text-gray-400 border border-gray-600/40">
                          Törölhető
                        </span>
                      )}
                    </div>
                    {/* Editable label */}
                    <div className="flex gap-2 items-center mb-1">
                      <input
                        type="text"
                        value={labelDrafts[v.uid] ?? v.label}
                        onChange={(e) => {
                          setLabelDrafts((p) => ({ ...p, [v.uid]: e.target.value }));
                          setLabelDirty((p) => ({ ...p, [v.uid]: true }));
                        }}
                        placeholder="Címke (pl. EFU Fight Night #5)"
                        maxLength={120}
                        className="flex-1 min-w-0 px-2 py-1 bg-brand-dark-card text-white text-sm rounded border border-white/10 focus:outline-none focus:border-brand-red"
                      />
                      {labelDirty[v.uid] && (
                        <button
                          onClick={() => void saveLabel(v.uid)}
                          className="px-2 py-1 text-xs font-semibold rounded bg-brand-red text-white hover:opacity-90"
                        >
                          Mentés
                        </button>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 flex flex-wrap gap-x-3">
                      <span>
                        <span className="text-gray-400">Hossz:</span>{' '}
                        <span className="text-gray-200 font-mono">
                          {formatDuration(v.duration)}
                        </span>
                      </span>
                      <span>
                        <span className="text-gray-400">Létrehozva:</span>{' '}
                        <span className="text-gray-300">{formatDate(v.created)}</span>
                      </span>
                      <span className="truncate">
                        <span className="text-gray-400">UID:</span>{' '}
                        <code className="text-gray-300">{v.uid}</code>
                      </span>
                      {v.inputUid && (
                        <span className="truncate">
                          <span className="text-gray-400">Input:</span>{' '}
                          <code className="text-gray-300">{v.inputUid}</code>
                        </span>
                      )}
                    </div>
                  </div>
                  {/* Action column */}
                  <div className="flex flex-row sm:flex-col gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => setPreviewUid(isExpanded ? null : v.uid)}
                      disabled={isBusy || v.status !== 'ready'}
                      title={
                        v.status !== 'ready'
                          ? 'A VOD még nincs kész a CF-nél.'
                          : 'Hanggal együtt lejátszás'
                      }
                      className="px-3 py-1.5 text-xs font-semibold rounded bg-emerald-600 text-white hover:opacity-90 disabled:opacity-40"
                    >
                      {isExpanded ? 'Bezárás' : '▶ Lejátszás'}
                    </button>
                    <button
                      onClick={() =>
                        void setVideoField(v.uid, { keep: !v.keep })
                      }
                      disabled={isBusy}
                      className={`px-3 py-1.5 text-xs font-semibold rounded ${
                        v.keep
                          ? 'bg-brand-dark-card text-emerald-300 hover:bg-brand-dark'
                          : 'bg-emerald-600 text-white hover:opacity-90'
                      } disabled:opacity-40`}
                    >
                      {v.keep ? 'Megőrizve ✓' : 'Megőrzés'}
                    </button>
                    <button
                      onClick={() => {
                        if (isInPlaylist) {
                          removeFromPlaylistLocal(v.uid);
                        } else {
                          addToPlaylistLocal(v.uid);
                        }
                      }}
                      disabled={isBusy || v.status !== 'ready'}
                      className={`px-3 py-1.5 text-xs font-semibold rounded ${
                        isInPlaylist
                          ? 'bg-amber-600 text-white hover:opacity-90'
                          : 'bg-brand-dark-card text-amber-300 hover:bg-brand-dark'
                      } disabled:opacity-40`}
                    >
                      {isInPlaylist ? '− Playlistről' : '+ Playlistre'}
                    </button>
                    <button
                      onClick={() => void handleDelete(v.uid, v.label)}
                      disabled={isBusy}
                      title="Végleges törlés a CF Stream storage-ból"
                      className="px-3 py-1.5 text-xs font-semibold rounded bg-brand-dark-card text-gray-300 hover:bg-brand-red/40 hover:text-white disabled:opacity-40"
                    >
                      Törlés
                    </button>
                  </div>
                </div>
                {/* Preview iframe (collapsed by default — needs a click to
                    meet the browser autoplay-with-sound rule). */}
                {isExpanded && customerCode && (
                  <div className="mt-3">
                    <VideoPreview
                      uid={v.uid}
                      customerCode={customerCode}
                      label={labelDrafts[v.uid] ?? v.label}
                      onClose={() => setPreviewUid(null)}
                    />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <p className="text-gray-600 text-xs mt-4 leading-relaxed">
        💡 A CF Stream storage díja a rögzített percek után fizetendő —
        a nem megőrzendő VOD-okat a „Törlés” gombbal tudod véglegesen
        eltávolítani. A megőrzendőekből érdemes playlistet építeni, mert
        a /watch automatikusan ezt loopolja, amikor nincs élő adás.
      </p>
    </section>
  );
}
