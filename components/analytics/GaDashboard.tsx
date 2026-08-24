'use client';

/**
 * /dashboard/analytics — Google Analytics 4 dashboard.
 *
 * Fetches /api/admin/analytics/ga and renders six reports:
 *   1. Overview KPIs (pageviews, users, sessions, bounce rate, avg duration)
 *   2. Daily pageviews line
 *   3. Top pages table
 *   4. Traffic sources (channels)
 *   5. Countries table
 *   6. Devices breakdown
 *
 * Falls back to a setup card if GA_DATA_API credentials are not yet
 * configured; the gtag.js client tracker is independent and already
 * starts counting pageviews as soon as NEXT_PUBLIC_GA_MEASUREMENT_ID
 * is set.
 */

import { useCallback, useEffect, useState } from 'react';

type GaConfiguredTrue = {
  ok: true;
  configured: true;
  range: { startDate: string; endDate: string };
  measurementId: string | null;
  overview: {
    configured: true;
    pageViews: number;
    users: number;
    sessions: number;
    bounceRate: number;
    avgSessionDuration: number;
    newUsers: number;
  };
  topPages: { rows: Record<string, string | number>[] };
  trafficSources: { rows: Record<string, string | number>[] };
  countries: { rows: Record<string, string | number>[] };
  devices: { rows: Record<string, string | number>[] };
  daily: { rows: Record<string, string | number>[] };
};

type GaConfiguredFalse = {
  ok: false;
  configured: false;
  reason: string;
  measurementId: string | null;
};

type GaApiError = {
  ok: false;
  configured?: true;
  reason: string;
  error?: string;
};

type ApiResponse =
  | GaConfiguredTrue
  | GaConfiguredFalse
  | GaApiError;

type Range = '7d' | '14d' | '30d' | '90d';

const RANGES: { id: Range; label: string }[] = [
  { id: '7d', label: 'Utolsó 7 nap' },
  { id: '14d', label: 'Utolsó 14 nap' },
  { id: '30d', label: 'Utolsó 30 nap' },
  { id: '90d', label: 'Utolsó 90 nap' },
];

function formatNumber(n: number): string {
  return n.toLocaleString('hu-HU');
}

function formatPercent(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

function formatDuration(seconds: number): string {
  const total = Math.round(seconds);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function shortPath(p: string): string {
  if (!p) return '/';
  if (p.length <= 40) return p;
  return `…${p.slice(-37)}`;
}

export function GaDashboard() {
  const [range, setRange] = useState<Range>('7d');
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setErrMsg(null);
    try {
      const res = await fetch(`/api/admin/analytics/ga?range=${range}`, {
        cache: 'no-store',
      });
      const payload = (await res.json()) as ApiResponse;
      setData(payload);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setErrMsg(msg);
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Setup card — credentials not configured
  if (data && data.ok === false && data.configured === false) {
    return (
      <SetupCard
        measurementId={data.measurementId}
        reason={data.reason}
        range={range}
        setRange={setRange}
        refresh={refresh}
        loading={loading}
      />
    );
  }

  // Hard API error
  if (data && data.ok === false && data.configured === true) {
    return (
      <main className="min-h-screen bg-brand-dark text-white pt-20 pb-16 px-4">
        <div className="max-w-6xl mx-auto">
          <Header range={range} setRange={setRange} refresh={refresh} loading={loading} />
          <div className="bg-red-950/40 border border-red-700 rounded-2xl p-6">
            <h2 className="text-xl font-bold mb-2">GA Data API hiba</h2>
            <p className="text-sm text-red-200 mb-2">{data.reason}</p>
            {data.error && (
              <pre className="text-xs bg-black/40 rounded p-3 overflow-x-auto">
                {data.error}
              </pre>
            )}
          </div>
        </div>
      </main>
    );
  }

  const configured = data?.ok === true ? data : null;

  return (
    <main className="min-h-screen bg-brand-dark text-white pt-20 pb-16 px-4">
      <div className="max-w-6xl mx-auto flex flex-col gap-6">
        <Header range={range} setRange={setRange} refresh={refresh} loading={loading} />

        {errMsg && (
          <p className="text-xs text-red-400">Hálózati hiba: {errMsg}</p>
        )}

        {!configured || loading ? (
          <SkeletonGrid />
        ) : (
          <>
            <OverviewKpis overview={configured.overview} />
            <DailyPageViews daily={configured.daily.rows} />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <TopPages rows={configured.topPages.rows} />
              <TrafficSources rows={configured.trafficSources.rows} />
              <Countries rows={configured.countries.rows} />
              <Devices rows={configured.devices.rows} />
            </div>
          </>
        )}
      </div>
    </main>
  );
}

// ---------------------------------------------------------------------------
// Subcomponents
// ---------------------------------------------------------------------------

function Header({
  range,
  setRange,
  refresh,
  loading,
}: {
  range: Range;
  setRange: (r: Range) => void;
  refresh: () => void;
  loading: boolean;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tight">
          EFU <span className="text-brand-red">Analytics</span>
        </h1>
        <p className="text-sm text-gray-400 mt-1 max-w-2xl">
          Élő Google Analytics 4 adatok (Data API v1). Az oldalletöltések
          és egyedi látogatók a production{' '}
          <code className="text-brand-gold">efutv.eu</code> /{' '}
          <code className="text-brand-gold">efutv.hu</code> tartományokról.
        </p>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <select
          value={range}
          onChange={(e) => setRange(e.target.value as Range)}
          className="bg-brand-dark-muted text-white text-xs rounded px-2 py-1 border border-brand-dark-border focus:outline-none focus:border-brand-red"
        >
          {RANGES.map((r) => (
            <option key={r.id} value={r.id}>
              {r.label}
            </option>
          ))}
        </select>
        <button
          onClick={refresh}
          disabled={loading}
          className="px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider bg-brand-dark-muted text-white hover:text-brand-gold disabled:opacity-50"
        >
          {loading ? 'Frissítés…' : 'Frissítés'}
        </button>
      </div>
    </header>
  );
}

function SetupCard({
  measurementId,
  reason,
  range,
  setRange,
  refresh,
  loading,
}: {
  measurementId: string | null;
  reason: string;
  range: Range;
  setRange: (r: Range) => void;
  refresh: () => void;
  loading: boolean;
}) {
  const steps = [
    'Hozz létre egy GCP service accountot, és adj neki "Google Analytics Data API Viewer" szerepkört.',
    'A GA4 tulajdonságban (Admin → Property access management) add hozzá a service account emailjét Viewer-ként.',
    'Töltsd le a service account JSON-t, majd állítsd be a következő worker secret-eket:',
    '  npx wrangler secret put GA_PROPERTY_ID      # számszerű GA4 property id',
    '  npx wrangler secret put GA_CLIENT_EMAIL    # service-account email',
    '  npx wrangler secret put GA_PRIVATE_KEY     # service-account privát kulcs (PEM)',
    'Helyi fejlesztéshez: másold a .dev.vars.example → .dev.vars fájlt és töltsd ki ugyanazokat.',
    'A kliens oldali tracker (gtag.js) már él — a NEXT_PUBLIC_GA_MEASUREMENT_ID alapján a pageview-k azonnal gyűlnek, a dashboard riportok 24-48 órán belül telnek fel.',
  ];
  return (
    <main className="min-h-screen bg-brand-dark text-white pt-20 pb-16 px-4">
      <div className="max-w-6xl mx-auto flex flex-col gap-6">
        <Header range={range} setRange={setRange} refresh={refresh} loading={loading} />

        <div className="bg-brand-dark-card border border-brand-gold/40 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">📊</span>
            <h2 className="text-xl font-bold">
              Google Analytics Data API nincs bekötve
            </h2>
          </div>
          <p className="text-sm text-gray-300 mb-4">
            A kliens oldali <code className="text-brand-gold">gtag.js</code>{' '}
            már működik
            {measurementId ? (
              <>
                {' '}
                (Measurement ID:{' '}
                <code className="text-brand-gold">{measurementId}</code>)
              </>
            ) : (
              ' — a NEXT_PUBLIC_GA_MEASUREMENT_ID hiányzik'
            )}
            . A dashboard riportok a Data API v1-et hívják service-account
            hitelesítéssel. Amíg a secret-ek nincsenek beállítva, a
            dashboard ezt a kártyát mutatja (hiba helyett).
          </p>
          <p className="text-xs text-gray-500 mb-3">
            HIBA OKA: <code className="text-brand-red">{reason}</code>
          </p>
          <ol className="text-sm space-y-1.5 text-gray-200 list-decimal pl-6">
            {steps.map((s, i) => (
              <li key={i} className={s.startsWith('  ') ? 'pl-1 font-mono text-xs text-brand-gold' : ''}>
                {s.trimStart()}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </main>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="h-24 rounded-2xl bg-brand-dark-card border border-brand-dark-border animate-pulse"
        />
      ))}
    </div>
  );
}

function OverviewKpis({
  overview,
}: {
  overview: GaConfiguredTrue['overview'];
}) {
  const kpis = [
    { label: 'Oldalletöltések', value: formatNumber(overview.pageViews), accent: 'red' as const },
    { label: 'Felhasználók', value: formatNumber(overview.users), accent: 'gold' as const },
    { label: 'Munkamenetek', value: formatNumber(overview.sessions), accent: 'gold' as const },
    { label: 'Új felhasználók', value: formatNumber(overview.newUsers), accent: 'red' as const },
    { label: 'Bounce rate', value: formatPercent(overview.bounceRate), accent: 'gold' as const },
    { label: 'Átl. munkamenet', value: formatDuration(overview.avgSessionDuration), accent: 'gold' as const },
  ];
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {kpis.map((k) => (
        <div
          key={k.label}
          className={`rounded-2xl p-4 border ${
            k.accent === 'red'
              ? 'bg-brand-red/10 border-brand-red/40'
              : 'bg-brand-dark-card border-brand-gold/30'
          }`}
        >
          <p className="text-xs uppercase tracking-widest text-gray-400">{k.label}</p>
          <p className={`mt-2 text-2xl font-black tabular-nums ${k.accent === 'red' ? 'text-brand-red' : 'text-brand-gold'}`}>
            {k.value}
          </p>
        </div>
      ))}
    </div>
  );
}

function DailyPageViews({ daily }: { daily: Record<string, string | number>[] }) {
  const points = daily
    .map((r) => ({
      date: String(r.date ?? ''),
      views: Number(r.screenPageViews ?? 0),
      users: Number(r.totalUsers ?? 0),
    }))
    .filter((p) => p.date);
  if (points.length === 0) {
    return (
      <div className="bg-brand-dark-card border border-brand-dark-border rounded-2xl p-5 text-sm text-gray-500">
        Nincs napi bontású adat ehhez az időszakhoz.
      </div>
    );
  }
  const maxViews = Math.max(...points.map((p) => p.views), 1);
  return (
    <section className="bg-brand-dark-card border border-brand-dark-border rounded-2xl p-5">
      <h3 className="text-sm font-bold uppercase tracking-widest text-brand-gold mb-4">
        Napi oldalletöltések
      </h3>
      <div className="flex items-end gap-1 h-40">
        {points.map((p) => {
          const h = Math.max(2, (p.views / maxViews) * 100);
          return (
            <div key={p.date} className="flex-1 flex flex-col items-center justify-end gap-1">
              <div
                className="w-full bg-brand-red rounded-t"
                style={{ height: `${h}%` }}
                title={`${p.date}: ${p.views} views, ${p.users} users`}
              />
              <span className="text-[9px] text-gray-500 rotate-0">{p.date.slice(4, 6)}/{p.date.slice(6, 8)}</span>
            </div>
          );
        })}
      </div>
      <div className="flex justify-between text-xs text-gray-500 mt-2">
        <span>{points[0].date}</span>
        <span>Peak: {formatNumber(maxViews)}</span>
        <span>{points[points.length - 1].date}</span>
      </div>
    </section>
  );
}

function TopPages({ rows }: { rows: Record<string, string | number>[] }) {
  return (
    <Card title="Top oldalak">
      <Table
        headers={['Útvonal', 'Cím', 'Views', 'Users']}
        rows={rows.map((r) => [
          <code key="p" className="text-xs">{shortPath(String(r.pagePath ?? ''))}</code>,
          <span key="t" className="text-xs text-gray-400">{String(r.pageTitle ?? '').slice(0, 40)}</span>,
          <span key="v" className="tabular-nums">{formatNumber(Number(r.screenPageViews ?? 0))}</span>,
          <span key="u" className="tabular-nums">{formatNumber(Number(r.totalUsers ?? 0))}</span>,
        ])}
      />
    </Card>
  );
}

function TrafficSources({ rows }: { rows: Record<string, string | number>[] }) {
  const totalSessions = rows.reduce((acc, r) => acc + Number(r.sessions ?? 0), 0) || 1;
  return (
    <Card title="Forgalmi források">
      <ul className="space-y-2">
        {rows.length === 0 && <li className="text-gray-500 text-sm">Nincs adat.</li>}
        {rows.map((r) => {
          const sessions = Number(r.sessions ?? 0);
          const pct = (sessions / totalSessions) * 100;
          return (
            <li key={String(r.sessionDefaultChannelGroup)}>
              <div className="flex justify-between text-xs mb-1">
                <span className="uppercase">{String(r.sessionDefaultChannelGroup)}</span>
                <span className="tabular-nums">{formatNumber(sessions)} ({pct.toFixed(1)}%)</span>
              </div>
              <div className="h-2 bg-brand-dark-muted rounded">
                <div className="h-2 bg-brand-red rounded" style={{ width: `${pct}%` }} />
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

function Countries({ rows }: { rows: Record<string, string | number>[] }) {
  return (
    <Card title="Országok">
      <Table
        headers={['Ország', 'Sessions', 'Users']}
        rows={rows.map((r) => [
          <span key="c">{String(r.country ?? '—')}</span>,
          <span key="s" className="tabular-nums">{formatNumber(Number(r.sessions ?? 0))}</span>,
          <span key="u" className="tabular-nums">{formatNumber(Number(r.totalUsers ?? 0))}</span>,
        ])}
      />
    </Card>
  );
}

function Devices({ rows }: { rows: Record<string, string | number>[] }) {
  const total = rows.reduce((acc, r) => acc + Number(r.sessions ?? 0), 0) || 1;
  return (
    <Card title="Eszközök">
      <ul className="space-y-2">
        {rows.length === 0 && <li className="text-gray-500 text-sm">Nincs adat.</li>}
        {rows.map((r) => {
          const sessions = Number(r.sessions ?? 0);
          const pct = (sessions / total) * 100;
          return (
            <li key={String(r.deviceCategory)}>
              <div className="flex justify-between text-xs mb-1">
                <span className="capitalize">{String(r.deviceCategory)}</span>
                <span className="tabular-nums">{formatNumber(sessions)} ({pct.toFixed(1)}%)</span>
              </div>
              <div className="h-2 bg-brand-dark-muted rounded">
                <div className="h-2 bg-brand-gold rounded" style={{ width: `${pct}%` }} />
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-brand-dark-card border border-brand-dark-border rounded-2xl p-5">
      <h3 className="text-sm font-bold uppercase tracking-widest text-brand-gold mb-4">
        {title}
      </h3>
      {children}
    </section>
  );
}

function Table({ headers, rows }: { headers: string[]; rows: React.ReactNode[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-xs text-gray-500 uppercase tracking-widest">
          <tr>
            {headers.map((h) => (
              <th key={h} className="text-left py-1 pr-2 font-semibold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="text-gray-300">
          {rows.length === 0 && (
            <tr>
              <td colSpan={headers.length} className="text-center text-gray-600 py-4">
                Nincs adat.
              </td>
            </tr>
          )}
          {rows.map((cells, i) => (
            <tr key={i} className="border-t border-brand-dark-border">
              {cells.map((c, j) => (
                <td key={j} className="py-2 pr-2">{c}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}