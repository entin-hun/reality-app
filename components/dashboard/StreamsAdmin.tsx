'use client';

/**
 * StreamsAdmin — interactive UI for managing CF Stream live inputs.
 *
 * Talks to three admin endpoints (no auth on the client side beyond the
 * role cookie that the routes verify server-side):
 *
 *   GET    /api/admin/streams/inputs        — refreshed from CF each call
 *   POST   /api/admin/streams/inputs        — create → returns RTMPS key
 *   DELETE /api/admin/streams/inputs/[uid]  — delete + clear current if needed
 *   GET    /api/admin/streams/current       — read current pointer
 *   PATCH  /api/admin/streams/current       — { uid } or { uid: null }
 *
 * The current stream is mirrored on /api/streams/current (public). Both
 * endpoints use AUTH_KV key `streams:current` underneath.
 *
 * Ingests supported:
 *   1. Direct OBS → CF Stream: paste rtmpsUrl + rtmpsStreamKey into OBS.
 *   2. OBS → Restream → CF Stream: paste rtmpsUrl + rtmpsStreamKey into
 *      Restream's CF Stream destination; OBS instead points at Restream.
 *   The admin UI doesn't care which path — both end up at the same UID.
 */

import { useCallback, useEffect, useState } from 'react';
import { StreamsArchive } from '@/components/dashboard/StreamsArchive';

type LiveStatus = 'ready' | 'live' | 'offline' | 'unknown';

interface LiveInput {
  uid: string;
  label: string;
  rtmpsUrl: string;
  rtmpsStreamKey: string;
  status: LiveStatus;
  createdAt: string;
  createdBy: string;
  lastSeenAt: string | null;
}

interface PublicCurrentStream {
  uid: string;
  customerCode: string;
  iframeUrl: string;
  hlsManifestUrl: string;
  label: string;
}

interface ListResponse {
  ok: boolean;
  inputs: LiveInput[];
  configured: boolean;
  missing?: string[];
  error?: string;
}

interface CurrentResponse {
  ok: boolean;
  current: PublicCurrentStream | null;
  configured: boolean;
  missing?: string[];
  error?: string;
}

interface NewlyCreated {
  uid: string;
  label: string;
  rtmpsUrl: string;
  rtmpsStreamKey: string;
}

/**
 * CF Stream does not expose a real-time viewer count via the REST API
 * for API tokens that lack the `Account Analytics: Read` permission. We
 * surface an honest `—` placeholder in the admin UI instead of faking
 * a number; the built-in CF Stream iframe player shows the live count
 * to end-users automatically when `hideLiveViewerCount` is false (the
 * default we leave it at).
 */
const VIEWER_COUNT_NOTE =
  'A CF Stream API nem adja vissza a valós idejű nézőszámot a jelenlegi API token jogosultságokkal. A /watch oldalon a CF Stream beépített lejátszója automatikusan mutatja a nézőszámot.';

const STATUS_COLOR: Record<LiveStatus, string> = {
  ready: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  live: 'bg-brand-red/20 text-brand-red border-brand-red/40',
  offline: 'bg-gray-700/40 text-gray-400 border-gray-600/40',
  unknown: 'bg-gray-700/40 text-gray-400 border-gray-600/40',
};

const STATUS_LABEL: Record<LiveStatus, string> = {
  ready: 'Kész — várja a streamet',
  live: 'ÉLŐ',
  offline: 'Offline',
  unknown: 'Ismeretlen',
};

function statusFromInput(i: { status?: LiveStatus }): LiveStatus {
  return (i.status ?? 'unknown') as LiveStatus;
}

export function StreamsAdmin() {
  const [inputs, setInputs] = useState<LiveInput[]>([]);
  const [current, setCurrent] = useState<PublicCurrentStream | null>(null);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [missing, setMissing] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyUid, setBusyUid] = useState<string | null>(null);

  // Create modal state
  const [showCreate, setShowCreate] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [newlyCreated, setNewlyCreated] = useState<NewlyCreated | null>(null);

  // Per-row stream-key reveal toggle. Once shown, stays visible across
  // refreshes (cheap; the list re-renders anyway).
  const [revealedKeys, setRevealedKeys] = useState<Record<string, boolean>>({});

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [listRes, currRes] = await Promise.all([
        fetch('/api/admin/streams/inputs', { cache: 'no-store' }),
        fetch('/api/admin/streams/current', { cache: 'no-store' }),
      ]);
      const list = (await listRes.json()) as ListResponse;
      const curr = (await currRes.json()) as CurrentResponse;
      if (!list.ok) throw new Error(list.error ?? 'list failed');
      if (!curr.ok) throw new Error(curr.error ?? 'current failed');
      setInputs(list.inputs ?? []);
      setConfigured(list.configured && curr.configured);
      setMissing(list.missing ?? curr.missing ?? []);
      setCurrent(curr.current ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ismeretlen hiba');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Auto-poll for status so 'live' lights up automatically when OBS
  // starts pushing. 15 s is light enough to be a free refresh.
  useEffect(() => {
    const id = setInterval(() => void refresh(), 15_000);
    return () => clearInterval(id);
  }, [refresh]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLabel.trim()) return;
    setCreating(true);
    setCreateError(null);
    try {
      const res = await fetch('/api/admin/streams/inputs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: newLabel.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error ?? 'create failed');
      }
      setNewlyCreated({
        uid: data.input.uid,
        label: data.input.label,
        rtmpsUrl: data.input.rtmpsUrl,
        rtmpsStreamKey: data.input.rtmpsStreamKey,
      });
      setNewLabel('');
      await refresh();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Ismeretlen hiba');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (uid: string) => {
    if (!confirm('Biztosan törlöd ezt a live inputot? A /watch lekapcsol róla.')) return;
    setBusyUid(uid);
    try {
      const res = await fetch(`/api/admin/streams/inputs/${uid}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? 'delete failed');
      await refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Törlés sikertelen');
    } finally {
      setBusyUid(null);
    }
  };

  const handleSetCurrent = async (uid: string) => {
    setBusyUid(uid);
    try {
      const res = await fetch('/api/admin/streams/current', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? 'set current failed');
      await refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Beállítás sikertelen');
    } finally {
      setBusyUid(null);
    }
  };

  const handleClearCurrent = async () => {
    setBusyUid('__clear__');
    try {
      const res = await fetch('/api/admin/streams/current', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: null }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? 'clear failed');
      await refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Lekapcsolás sikertelen');
    } finally {
      setBusyUid(null);
    }
  };

  return (
    <main className="min-h-screen pt-24 pb-16 px-4">
      <div className="max-w-5xl mx-auto">
        <header className="mb-6 flex items-baseline justify-between flex-wrap gap-4">
          <div>
            <p className="text-brand-red text-sm uppercase tracking-widest font-semibold mb-1">
              Admin · Élő közvetítés
            </p>
            <h1
              className="text-3xl sm:text-4xl font-black text-white uppercase"
              style={{ fontFamily: 'Impact, Arial Black, sans-serif' }}
            >
              Cloudflare Stream
            </h1>
            <p className="text-gray-500 text-xs mt-1">
              OBS → CF Stream, vagy OBS → Restream → CF Stream — ugyanaz a cél UID.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => refresh()}
              disabled={loading}
              className="px-3 py-2 text-xs font-semibold rounded bg-brand-dark-muted text-gray-300 hover:bg-brand-dark disabled:opacity-50"
            >
              {loading ? 'Frissítés…' : 'Frissítés'}
            </button>
            <button
              onClick={() => {
                setShowCreate(true);
                setNewlyCreated(null);
                setCreateError(null);
              }}
              className="px-4 py-2 text-sm font-bold rounded bg-brand-red text-white hover:opacity-90"
            >
              + Új live input
            </button>
          </div>
        </header>

        {configured === false && (
          <div className="card-dark rounded-xl p-4 mb-6 border border-brand-gold/40">
            <p className="text-brand-gold font-semibold">⚠️ A CF Stream nincs konfigurálva.</p>
            <p className="text-gray-400 text-sm mt-1">
              A wrangler secret-ek hiányoznak:{' '}
              {missing.map((m) => (
                <code key={m} className="px-1 py-0.5 mx-0.5 bg-brand-dark-muted rounded text-xs">
                  {m}
                </code>
              ))}
              . Állítsd be az alábbi utasítások szerint.
            </p>
            <pre className="mt-3 text-xs bg-brand-dark-muted p-3 rounded overflow-x-auto text-gray-300">
{`npx wrangler secret put CLOUDFLARE_STREAM_ACCOUNT_ID
npx wrangler secret put CLOUDFLARE_STREAM_API_TOKEN
npx wrangler secret put CLOUDFLARE_STREAM_CUSTOMER_CODE`}
            </pre>
            <p className="text-gray-500 text-xs mt-2">
              A CUSTOMER_CODE a Cloudflare Dashboardon található:
              <code className="px-1">dash.cloudflare.com → Account → Stream → Customer subdomain</code>
              (kód, ami a <code className="px-1">customer-XXXX.cloudflarestream.com</code> URL-ben XXXX).
            </p>
          </div>
        )}

        {error && (
          <div className="card-dark rounded-xl p-4 mb-6 border border-brand-red/50">
            <p className="text-brand-red text-sm">{error}</p>
          </div>
        )}

        {/* Currently-live card */}
        <section className="card-dark rounded-xl p-5 mb-6">
          <h2 className="text-sm uppercase tracking-widest text-gray-500 mb-3">
            Most a /watch-en
          </h2>
          {current ? (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="min-w-0">
                <div className="text-white font-semibold text-lg">
                  {current.label || current.uid}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  UID: <code className="text-gray-300">{current.uid}</code>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Iframe:{' '}
                  <code className="text-gray-300 break-all">{current.iframeUrl || '—'}</code>
                </div>
                <div
                  className="text-xs text-gray-500 mt-2 inline-flex items-center gap-1.5"
                  title={VIEWER_COUNT_NOTE}
                >
                  <span className="text-gray-400">Nézőszám:</span>
                  <span className="text-white font-semibold" aria-label="viewer count placeholder">
                    —
                  </span>
                  <span className="text-gray-600">(CF Stream API nem adja vissza)</span>
                </div>
              </div>
              <button
                onClick={handleClearCurrent}
                disabled={busyUid === '__clear__'}
                className="px-3 py-2 text-xs font-semibold rounded bg-brand-dark-muted text-gray-200 hover:bg-brand-dark disabled:opacity-50"
              >
                {busyUid === '__clear__' ? 'Lekapcsolás…' : 'Lekapcsolás /watch-ről'}
              </button>
            </div>
          ) : (
            <div className="text-gray-500 text-sm">
              Jelenleg nincs élő input kijelölve. Húzd be az OBS-t az egyik inputra, és kattints a "Mutasd /watch-en" gombra.
            </div>
          )}
        </section>

        {/* Inputs list */}
        <section className="card-dark rounded-xl p-5">
          <h2 className="text-sm uppercase tracking-widest text-gray-500 mb-3">
            Live inputok ({inputs.length})
          </h2>
          {loading && inputs.length === 0 ? (
            <p className="text-gray-500 text-sm">Betöltés…</p>
          ) : inputs.length === 0 ? (
            <p className="text-gray-500 text-sm">
              Még nincs live input. Kattints a "+ Új live input" gombra.
            </p>
          ) : (
            <ul className="divide-y divide-white/5">
              {inputs.map((i) => {
                const isCurrent = current?.uid === i.uid;
                const isBusy = busyUid === i.uid;
                const status = statusFromInput(i);
                return (
                  <li key={i.uid} className="py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={`inline-flex items-center gap-1 text-xs uppercase font-bold px-2 py-0.5 rounded border ${STATUS_COLOR[status]}`}
                        >
                          {status === 'live' && (
                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                          )}
                          {STATUS_LABEL[status]}
                        </span>
                        <span className="text-white font-semibold truncate">
                          {i.label || i.uid}
                        </span>
                        {isCurrent && (
                          <span className="text-xs uppercase font-bold px-2 py-0.5 rounded bg-brand-gold text-black">
                            JELENLEG A /WATCH-EN
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 truncate">
                        UID: <code className="text-gray-300">{i.uid}</code>
                      </div>
                      <div className="text-xs text-gray-500 truncate">
                        RTMPS: <code className="text-gray-300">{i.rtmpsUrl || '—'}</code>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        <button
                          type="button"
                          onClick={() =>
                            setRevealedKeys((prev) => ({ ...prev, [i.uid]: !prev[i.uid] }))
                          }
                          className="text-xs text-brand-gold hover:underline"
                        >
                          {revealedKeys[i.uid] ? '🔓 Kulcs elrejtése' : '🔑 Stream key mutatása'}
                        </button>
                        {revealedKeys[i.uid] && (
                          <div className="mt-1">
                            {i.rtmpsStreamKey ? (
                              <CopyableField value={i.rtmpsStreamKey} sensitive />
                            ) : (
                              <span className="text-gray-600 italic">
                                (nincs elmentve — töröld és hozd létre újra)
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {isCurrent ? (
                        <button
                          onClick={handleClearCurrent}
                          disabled={isBusy}
                          className="px-3 py-2 text-xs font-semibold rounded bg-brand-gold text-black hover:opacity-90 disabled:opacity-50"
                        >
                          Rejtsd el /watch-ről
                        </button>
                      ) : (
                        <button
                          onClick={() => handleSetCurrent(i.uid)}
                          disabled={isBusy}
                          className="px-3 py-2 text-xs font-semibold rounded bg-emerald-600 text-white hover:opacity-90 disabled:opacity-50"
                        >
                          Mutasd /watch-en
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(i.uid)}
                        disabled={isBusy}
                        className="px-3 py-2 text-xs font-semibold rounded bg-brand-dark-muted text-gray-300 hover:bg-brand-red/30 hover:text-white disabled:opacity-50"
                      >
                        Törlés
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* VOD archive + playlist editor */}
        {current?.customerCode && (
          <StreamsArchive customerCode={current.customerCode} />
        )}
        {!current?.customerCode && (
          <StreamsArchive customerCode="" />
        )}

        {/* Setup notes */}
        <section className="card-dark rounded-xl p-5 mt-6">
          <h2 className="text-sm uppercase tracking-widest text-gray-500 mb-3">
            OBS / Restream beállítás
          </h2>
          <ol className="text-sm text-gray-300 space-y-2 list-decimal list-inside">
            <li>
              Hozz létre egy új live inputot a <strong>„+ Új live input"</strong> gombbal —
              ez generálja a CF RTMPS ingest URL-t + stream key-t (utóbbit csak egyszer mutatjuk).
            </li>
            <li>
              <strong>Ha OBS → CF Stream (single platform):</strong> OBS →
              Beállítások → Stream → Service: <em>Custom</em> →
              Server: <code className="text-gray-200">{`{rtmpsUrl}`}</code>,
              Stream key: <code className="text-gray-200">{`{rtmpsStreamKey}`}</code>.
            </li>
            <li>
              <strong>Ha OBS → Restream → CF Stream (multi-platform):</strong> Restream-ben
              adj hozzá egy új <em>Cloudflare Stream</em> destination-t; server +
              stream key ugyanaz, mint fent. Az OBS ehelyett a Restream RTMP URL-jére
              küld — a CF végpont változatlan.
            </li>
            <li>
              Mikor OBS elindítja a streamet, a státusz <em>offline → live</em>-ra vált
              (15 s-enként ellenőrizzük). A <em>„Mutasd /watch-en"</em> gombbal
              jelenítheted meg a nézőknek.
            </li>
          </ol>
          <details className="mt-4 text-xs text-gray-400">
            <summary className="cursor-pointer text-gray-300 hover:text-white">
              OBS hiba: „No config URL available for the current service"
            </summary>
            <div className="mt-2 space-y-2 leading-relaxed">
              <p>
                Ez akkor jelenik meg, ha az OBS-ben a Service legördülő nem a megfelelő
                értékre van állítva. A CF Stream RTMPS-t <strong>nem</strong> szabad
                „Twitch" / „YouTube" / „Facebook" szerviznek választani — ezek
                mindegyike saját RTMP-szervert vár.
              </p>
              <p>
                <strong>Helyes beállítás (OBS 30+):</strong>
              </p>
              <ol className="list-decimal list-inside space-y-1 ml-2">
                <li>
                  Settings → Stream → Service: <em>Custom…</em> (a három pontos, nem
                  sima „Custom" — ez a Custom RTMP).
                </li>
                <li>
                  Server: pontosan <code className="text-gray-200">rtmps://live.cloudflare.com:443/live/</code>
                  (perjel a végén kötelező).
                </li>
                <li>
                  Stream Key: a fenti listából kimásolt teljes kulcs (egyben, szóköz nélkül).
                </li>
                <li>
                  Ha Restream-en keresztül mész: az OBS a Restream RTMP URL-jére
                  küld, a Restream CF Stream destination-jében kell ugyanezt az
                  ingest URL-t + stream key-t megadni.
                </li>
              </ol>
              <p>
                Ha OBS az „Apply" / „OK" után is <em>„Starting the output failed”</em>-t ír:
                nyisd meg a <em>Help → Log Files → Upload last log</em>-ot, és a
                kapott URL-t tedd be egy hibajegybe — a logból kiderül, hogy a CF
                elutasította-e a kulcsot, vagy az encoder indult-e el egyáltalán.
              </p>
            </div>
          </details>
        </section>

        {/* Create modal */}
        {showCreate && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
            <div className="card-dark rounded-2xl p-6 max-w-xl w-full">
              <h3 className="text-xl font-bold text-white mb-4">
                {newlyCreated ? 'Új live input kész' : 'Új Cloudflare live input'}
              </h3>

              {!newlyCreated ? (
                <>
                  <form onSubmit={handleCreate}>
                    <label className="block text-sm text-gray-300 mb-1">
                      Címke (pl. „EFU Fight Night #5")
                    </label>
                    <input
                      type="text"
                      value={newLabel}
                      onChange={(e) => setNewLabel(e.target.value)}
                      maxLength={80}
                      required
                      className="w-full px-3 py-2 bg-brand-dark-muted text-white rounded mb-3 border border-white/10 focus:outline-none focus:border-brand-red"
                      placeholder="EFU Fight Night #5 — Főmérkőzés"
                    />
                    {createError && (
                      <p className="text-brand-red text-sm mb-3">{createError}</p>
                    )}
                    <p className="text-gray-500 text-xs mb-4">
                      Létrehozás után megmutatjuk az RTMPS ingest URL-t és a stream key-t.
                      A stream key-t <strong>elmentjük helyben</strong> is, és az input
                      listában a „🔑 Stream key mutatása" gombbal bármikor újra
                      előhívható — de ajánlott most kimásolni és biztonságos helyre
                      (jelszókezelő, 1Password stb.) eltenni.
                    </p>
                    <div className="flex gap-2 justify-end">
                      <button
                        type="button"
                        onClick={() => setShowCreate(false)}
                        className="px-4 py-2 text-sm font-semibold rounded bg-brand-dark-muted text-gray-300 hover:bg-brand-dark"
                      >
                        Mégse
                      </button>
                      <button
                        type="submit"
                        disabled={creating || !newLabel.trim()}
                        className="px-4 py-2 text-sm font-bold rounded bg-brand-red text-white hover:opacity-90 disabled:opacity-50"
                      >
                        {creating ? 'Létrehozás…' : 'Létrehozás'}
                      </button>
                    </div>
                  </form>
                </>
              ) : (
                <>
                  <p className="text-gray-300 text-sm mb-4">
                    Mentve: <strong>{newlyCreated.label}</strong> · UID{' '}
                    <code className="text-gray-200">{newlyCreated.uid}</code>
                  </p>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs uppercase tracking-widest text-gray-500 mb-1">
                        Server (CF Stream RTMPS)
                      </label>
                      <CopyableField value={newlyCreated.rtmpsUrl} />
                    </div>
                    <div>
                      <label className="block text-xs uppercase tracking-widest text-gray-500 mb-1">
                        Stream key (csak most látható!)
                      </label>
                      <CopyableField value={newlyCreated.rtmpsStreamKey} sensitive />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 mt-5">
                    <button
                      onClick={() => {
                        setShowCreate(false);
                        setNewlyCreated(null);
                      }}
                      className="px-4 py-2 text-sm font-bold rounded bg-brand-red text-white"
                    >
                      Kész
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

function CopyableField({ value, sensitive }: { value: string; sensitive?: boolean }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex gap-2">
      <input
        type={sensitive ? 'password' : 'text'}
        readOnly
        value={value}
        onFocus={(e) => e.currentTarget.select()}
        className="flex-1 px-3 py-2 bg-brand-dark-muted text-white rounded text-xs font-mono border border-white/10"
      />
      <button
        type="button"
        onClick={() => {
          if (!value) return;
          void navigator.clipboard.writeText(value).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          });
        }}
        className="px-3 py-2 text-xs font-semibold rounded bg-brand-dark-muted text-gray-200 hover:bg-brand-dark"
      >
        {copied ? 'Másolva!' : 'Másolás'}
      </button>
    </div>
  );
}
