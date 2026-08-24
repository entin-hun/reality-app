/**
 * Google Analytics 4 Data API — server-side REST client.
 *
 * Reads the GA4 property + service-account credentials from env (set via
 * `wrangler secret put` on Workers, or `.dev.vars` locally) and exposes
 * a single `runReport()` helper. Designed for the dashboard: pull
 * pageviews, users, top pages and traffic sources for a date range.
 *
 * Implementation note:
 *   The official `@google-analytics/data` SDK uses google-gax +
 *   protobufjs, which calls `new Function(...)` during descriptor
 *   instantiation. Cloudflare Workers disallow code generation from
 *   strings, so the SDK throws `EvalError: Code generation from strings
 *   disallowed` on cold start. We talk to the REST endpoint directly
 *   (POST https://analyticsdata.googleapis.com/v1beta/properties/{id}:runReport)
 *   using a signed JWT for the service-account assertion. This keeps
 *   the runtime footprint tiny and 100% Worker-compatible.
 *
 * Required env (private — never NEXT_PUBLIC_):
 *   GA_PROPERTY_ID       — e.g. "123456789" (numeric GA4 property id)
 *   GA_CLIENT_EMAIL     — service-account email
 *   GA_PRIVATE_KEY      — service-account private key (PEM, \n escaped)
 *
 * If credentials are missing, every helper returns `{ configured: false }`
 * so the dashboard can render a "Set up GA Data API" setup card instead
 * of a hard 500.
 */

const SCOPES = ['https://www.googleapis.com/auth/analytics.readonly'];

export type GARunReportResponse = {
  configured: false;
  reason: 'missing-credentials' | 'missing-property' | 'api-error';
  setupInstructions?: string[];
  error?: string;
};

export type GAReportRow = Record<string, string | number>;

export type GAReportResponse = {
  configured: true;
  range: { startDate: string; endDate: string };
  totals: GAReportRow;
  rows: GAReportRow[];
  rowCount: number;
};

type RunReportOpts = {
  startDate: string;            // "YYYY-MM-DD" or relative like "7daysAgo"
  endDate: string;              // "YYYY-MM-DD" or "today"
  metrics: string[];            // e.g. ["screenPageViews", "totalUsers"]
  dimensions?: string[];        // e.g. ["pagePath", "sessionDefaultChannelGroup"]
  orderBy?: {
    metric?: { metricName: string };
    dimension?: { dimensionName: string };
    desc?: boolean;
  }[];
  limit?: number;
};

type CachedToken = { token: string; expiresAt: number };
let cachedToken: CachedToken | null = null;

function getConfig() {
  const clientEmail = process.env.GA_CLIENT_EMAIL;
  const privateKeyRaw = process.env.GA_PRIVATE_KEY;
  const propertyId = process.env.GA_PROPERTY_ID;
  if (!clientEmail || !privateKeyRaw || !propertyId) return null;
  const privateKey = privateKeyRaw.replace(/\\n/g, '\n');
  return { clientEmail, privateKey, propertyId };
}

export function isGaConfigured(): boolean {
  return getConfig() !== null;
}

export function getMeasurementId(): string | null {
  return process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || null;
}

export function getSetupInstructions(): string[] {
  return [
    '1. Create a GCP service account with the "Google Analytics Data API Viewer" role.',
    '2. In the GA4 property (Admin → Property access management), add the service-account email as a Viewer.',
    '3. Download the service-account JSON, then set the following worker secrets:',
    '     npx wrangler secret put GA_PROPERTY_ID         # numeric GA4 property id',
    '     npx wrangler secret put GA_CLIENT_EMAIL       # service-account email',
    '     npx wrangler secret put GA_PRIVATE_KEY        # service-account private key (PEM)',
    '4. For local dev, copy .dev.vars.example → .dev.vars and fill in the same three values.',
    '5. The client-side gtag tracker is already wired via NEXT_PUBLIC_GA_MEASUREMENT_ID; once data flows in (24-48h), the dashboard reports will populate.',
  ];
}

// ─── JWT + OAuth2 token (Web Crypto only) ────────────────────────────────

function base64UrlEncode(input: ArrayBuffer | Uint8Array | string): string {
  let bytes: Uint8Array;
  if (typeof input === 'string') {
    bytes = new TextEncoder().encode(input);
  } else if (input instanceof Uint8Array) {
    bytes = input;
  } else {
    bytes = new Uint8Array(input);
  }
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  const b64 = btoa(bin);
  return b64.replace(/=+$/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

async function importPrivateKey(pem: string): Promise<CryptoKey> {
  // Strip PEM headers + whitespace; base64-decode the body.
  const body = pem
    .replace(/-----BEGIN PRIVATE KEY-----/g, '')
    .replace(/-----END PRIVATE KEY-----/g, '')
    .replace(/\s+/g, '');
  const der = Uint8Array.from(atob(body), (c) => c.charCodeAt(0));
  return crypto.subtle.importKey(
    'pkcs8',
    der,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );
}

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.token;
  }
  const cfg = getConfig();
  if (!cfg) throw new Error('GA not configured');

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const claim = {
    iss: cfg.clientEmail,
    scope: SCOPES.join(' '),
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  };

  const headerB64 = base64UrlEncode(JSON.stringify(header));
  const claimB64 = base64UrlEncode(JSON.stringify(claim));
  const signingInput = `${headerB64}.${claimB64}`;

  const key = await importPrivateKey(cfg.privateKey);
  const sig = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    new TextEncoder().encode(signingInput),
  );
  const jwt = `${signingInput}.${base64UrlEncode(sig)}`;

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }).toString(),
  });
  if (!tokenRes.ok) {
    throw new Error(`Token exchange failed: ${tokenRes.status} ${await tokenRes.text()}`);
  }
  const tokenJson = (await tokenRes.json()) as { access_token?: string; expires_in?: number };
  if (!tokenJson.access_token) throw new Error('Token response missing access_token');
  cachedToken = {
    token: tokenJson.access_token,
    expiresAt: Date.now() + (tokenJson.expires_in ?? 3600) * 1000,
  };
  return cachedToken.token;
}

// ─── Run a single report ─────────────────────────────────────────────────

export async function runReport(
  opts: RunReportOpts,
): Promise<GAReportResponse | GARunReportResponse> {
  const cfg = getConfig();
  if (!cfg) {
    return {
      configured: false,
      reason: !process.env.GA_PROPERTY_ID ? 'missing-property' : 'missing-credentials',
      setupInstructions: getSetupInstructions(),
    };
  }

  try {
    const token = await getAccessToken();
    const res = await fetch(
      `https://analyticsdata.googleapis.com/v1beta/properties/${encodeURIComponent(cfg.propertyId)}:runReport`,
      {
        method: 'POST',
        headers: {
          authorization: `Bearer ${token}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          dateRanges: [{ startDate: opts.startDate, endDate: opts.endDate }],
          metrics: opts.metrics.map((m) => ({ name: m })),
          dimensions: (opts.dimensions ?? []).map((d) => ({ name: d })),
          orderBys: opts.orderBy,
          limit: String(opts.limit ?? 10),
        }),
      },
    );
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      return {
        configured: false,
        reason: 'api-error',
        error: `${res.status} ${errText.slice(0, 500)}`,
      };
    }
    const json = (await res.json()) as {
      rows?: {
        dimensionValues?: { value?: string | null }[];
        metricValues?: { value?: string | null }[];
      }[];
      rowCount?: string | null;
      metadata?: {
        dimensions?: { apiName?: string | null }[];
        metrics?: { apiName?: string | null }[];
      };
      totals?: { metricValues?: { value?: string | null }[] }[];
    };

    const dimNames = (json.metadata?.dimensions ?? []).map(
      (d) => d.apiName ?? '',
    );
    const metNames = (json.metadata?.metrics ?? []).map((m) => m.apiName ?? '');

    const rows: GAReportRow[] = (json.rows ?? []).map((r) => {
      const obj: GAReportRow = {};
      r.dimensionValues?.forEach((dv, i) => {
        obj[dimNames[i] ?? `dim${i}`] = dv.value ?? '';
      });
      r.metricValues?.forEach((mv, i) => {
        const name = metNames[i] ?? `metric${i}`;
        const v = Number(mv.value ?? 0);
        obj[name] = v;
      });
      return obj;
    });

    const totals: GAReportRow = {};
    json.totals?.[0]?.metricValues?.forEach((mv, i) => {
      const name = metNames[i] ?? `metric${i}`;
      totals[name] = Number(mv.value ?? 0);
    });

    return {
      configured: true,
      range: { startDate: opts.startDate, endDate: opts.endDate },
      totals,
      rows,
      rowCount: Number(json.rowCount ?? rows.length),
    };
  } catch (e) {
    return {
      configured: false,
      reason: 'api-error',
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

// ─── Convenience report presets ──────────────────────────────────────────

export async function runOverview(opts: {
  startDate: string;
  endDate: string;
}): Promise<GAReportResponse | GARunReportResponse> {
  return runReport({
    startDate: opts.startDate,
    endDate: opts.endDate,
    metrics: [
      'screenPageViews',
      'totalUsers',
      'sessions',
      'bounceRate',
      'averageSessionDuration',
      'newUsers',
    ],
  });
}

export async function runTopPages(opts: {
  startDate: string;
  endDate: string;
}) {
  return runReport({
    startDate: opts.startDate,
    endDate: opts.endDate,
    metrics: ['screenPageViews', 'totalUsers', 'averageSessionDuration'],
    dimensions: ['pagePath', 'pageTitle'],
    orderBy: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
    limit: 20,
  });
}

export async function runTrafficSources(opts: {
  startDate: string;
  endDate: string;
}) {
  return runReport({
    startDate: opts.startDate,
    endDate: opts.endDate,
    metrics: ['sessions', 'totalUsers', 'engagedSessions'],
    dimensions: ['sessionDefaultChannelGroup'],
    orderBy: [{ metric: { metricName: 'sessions' }, desc: true }],
    limit: 10,
  });
}

export async function runCountries(opts: {
  startDate: string;
  endDate: string;
}) {
  return runReport({
    startDate: opts.startDate,
    endDate: opts.endDate,
    metrics: ['sessions', 'totalUsers'],
    dimensions: ['country'],
    orderBy: [{ metric: { metricName: 'sessions' }, desc: true }],
    limit: 15,
  });
}

export async function runDevices(opts: {
  startDate: string;
  endDate: string;
}) {
  return runReport({
    startDate: opts.startDate,
    endDate: opts.endDate,
    metrics: ['sessions', 'totalUsers'],
    dimensions: ['deviceCategory'],
    orderBy: [{ metric: { metricName: 'sessions' }, desc: true }],
    limit: 5,
  });
}

export async function runDailyPageViews(opts: {
  startDate: string;
  endDate: string;
}) {
  return runReport({
    startDate: opts.startDate,
    endDate: opts.endDate,
    metrics: ['screenPageViews', 'totalUsers'],
    dimensions: ['date'],
    orderBy: [{ dimension: { dimensionName: 'date' } }],
    limit: 90,
  });
}