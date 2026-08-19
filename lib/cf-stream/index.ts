/**
 * Cloudflare Stream helper.
 *
 * Wraps the small slice of the CF Stream API the backoffice needs:
 *   list / create / delete live inputs + read+write a "current" pointer
 *   in AUTH_KV so /watch can fetch the currently-broadcast UID.
 *
 * Storage (AUTH_KV):
 *   streams:inputs   → JSON LiveInput[]   (label + uid + RTMPS + status)
 *   streams:current  → string | (missing) (the UID currently on /watch)
 *
 * Why AUTH_KV and not a separate STREAMS_KV?
 *   Streams are part of the admin/auth workflow (Producer needs to flip the
 *   "current" bit during a live event), so coupling them to the namespace
 *   that already carries the role map avoids a wrangler.toml change. Two
 *   namespace-scoped keys keep the surface area explicit.
 *
 * Wrangler secrets expected (runtime env):
 *   CLOUDFLARE_STREAM_ACCOUNT_ID   your CF account id (32-hex)
 *   CLOUDFLARE_STREAM_API_TOKEN    Cloudflare API token with
 *                                    Account.Stream:Edit permission
 *   CLOUDFLARE_STREAM_CUSTOMER_CODE the "customer" subdomain code visible
 *                                    at dash.cloudflare.com → Account →
 *                                    Stream; only needed for the public
 *                                    /watch playback URL.
 *
 * 3-call CF API surface used:
 *   GET    /accounts/{id}/stream/live_inputs
 *   POST   /accounts/{id}/stream/live_inputs
 *   DELETE /accounts/{id}/stream/live_inputs/{uid}
 *
 * Each existing UI path talks to this module, never directly to CF — the
 * API token never reaches the browser.
 */

import { getCloudflareContext } from '@opennextjs/cloudflare';

export type LiveStatus = 'ready' | 'live' | 'offline' | 'unknown';

export interface LiveInput {
  /** CF-assigned uid used as /accounts/.../live_inputs/{uid} and the path
   *  segment in the playback URLs. */
  uid: string;
  /** Human label chosen by the operator when they created the input.
   *  CF stores this in `meta.name`; we mirror it in KV as the source of
   *  truth so we can edit it later. */
  label: string;
  /** RTMPS ingest URL — paste into OBS (Settings → Stream → Server)
   *  when going via CF directly, OR into Restream (Destinations) when
   *  going via Restream. The same credentials work for both paths; the
   *  operator just configures their relay of choice upstream of CF. */
  rtmpsUrl: string;
  /** Stream key paired with rtmpsUrl. Shown to the admin ONCE after
   *  creation; if lost, delete and re-create. */
  rtmpsStreamKey: string;
  /** Reflects whether OBS/encoder is actively pushing frames. Polled from
   *  CF on each list call; "live" means frames arrived within the last
   *  few minutes. */
  status: LiveStatus;
  createdAt: string;
  /** Email of the operator who created the input — for audit trail. */
  createdBy: string;
  /** ISO date of the last detected ingest activity, or null. */
  lastSeenAt: string | null;
}

interface StreamEnv {
  ACCOUNT_ID: string;
  API_TOKEN: string;
  CUSTOMER_CODE: string;
  AUTH_KV: CloudflareKvLike | null;
}

interface CloudflareKvLike {
  get(key: string): Promise<string | null>;
  put(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
}

const KV_INPUTS = 'streams:inputs';
const KV_CURRENT = 'streams:current';

/** Read a CF Stream runtime secret (or any env var). Exported so the
 *  diag route can pull the same values the helper uses to ping CF. */
export function readEnvVar(name: string): string | undefined {
  // 1) OpenNext-injected binding (production on Workers)
  try {
    const ctx = getCloudflareContext() as unknown as { env?: Record<string, unknown> };
    const env = ctx.env ?? {};
    const v = env[name];
    if (typeof v === 'string' && v.length > 0) return v;
  } catch {}
  // 2) Node.js process env (dev / .dev.vars)
  if (typeof process !== 'undefined' && process.env && (process.env as Record<string, unknown>)[name]) {
    return (process.env as Record<string, unknown>)[name] as string;
  }
  // 3) Global shim from local CF Workers simulation
  const g = (globalThis as { __env__?: Record<string, unknown> }).__env__;
  if (g && g[name] && typeof g[name] === 'string') return g[name] as string;
  return undefined;
}

export function getEnv(): StreamEnv {
  // KV bindings are OBJECTS (not strings), so they must NOT go through
  // readEnvVar which filters to strings only. Read the binding directly.
  const kv = readKvBinding('AUTH_KV');
  return {
    ACCOUNT_ID: readEnvVar('CLOUDFLARE_STREAM_ACCOUNT_ID') ?? '',
    API_TOKEN: readEnvVar('CLOUDFLARE_STREAM_API_TOKEN') ?? '',
    CUSTOMER_CODE: readEnvVar('CLOUDFLARE_STREAM_CUSTOMER_CODE') ?? '',
    AUTH_KV: kv,
  };
}

/** Read a Cloudflare KV binding (an object with get/put/delete) — must
 *  be resolved separately from string secrets. */
function readKvBinding(name: string): CloudflareKvLike | null {
  try {
    const ctx = getCloudflareContext() as unknown as { env?: Record<string, unknown> };
    const env = ctx.env ?? {};
    const v = env[name];
    if (v && typeof v === 'object' && typeof (v as { get?: unknown }).get === 'function') {
      return v as CloudflareKvLike;
    }
  } catch {}
  return null;
}

/**
 * Runtime gate — checks the API tokens the CRUD endpoints need (account id
 * + API token). Customer code is checked separately via `isPlaybackConfigured`
 * because it only matters when constructing the public playback URL.
 */
export function isStreamConfigured(): { ok: true } | { ok: false; missing: string[] } {
  const env = getEnv();
  const missing: string[] = [];
  if (!env.ACCOUNT_ID) missing.push('CLOUDFLARE_STREAM_ACCOUNT_ID');
  if (!env.API_TOKEN) missing.push('CLOUDFLARE_STREAM_API_TOKEN');
  return missing.length === 0 ? { ok: true } : { ok: false, missing };
}

/**
 * Separate check for the customer subdomain code. Only needed when the
 * /watch page renders an actual playback iframe; the admin can still
 * create / delete / list live inputs and flip the "current" pointer
 * before this is set.
 */
export function isPlaybackConfigured(): boolean {
  return readEnvVar('CLOUDFLARE_STREAM_CUSTOMER_CODE')?.length ? true : false;
}

function cfBase(env: StreamEnv): string {
  if (!env.ACCOUNT_ID) throw new Error('CLOUDFLARE_STREAM_ACCOUNT_ID is not set');
  return `https://api.cloudflare.com/client/v4/accounts/${env.ACCOUNT_ID}/stream`;
}

async function cfFetch<T>(env: StreamEnv, path: string, init?: RequestInit): Promise<T> {
  if (!env.API_TOKEN) throw new Error('CLOUDFLARE_STREAM_API_TOKEN is not set');
  const url = `${cfBase(env)}/${path.replace(/^\/+/, '')}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${env.API_TOKEN}`,
      'Content-Type': 'application/json',
      ...(init?.headers as Record<string, string> | undefined),
    },
  });
  let data: { success?: boolean; result?: T; errors?: unknown } = {};
  try {
    data = await res.json();
  } catch {
    /* CF returned non-JSON — keep raw status text below */
  }
  if (!res.ok || data?.success === false) {
    const detail = data?.errors ? JSON.stringify(data.errors) : `${res.status} ${res.statusText}`;
    // Log to wrangler tail — the operator can run
    // `npx wrangler tail mma-stream` to see exactly what CF rejected.
    console.error(
      `[cf-stream] ${path} failed: status=${res.status} body=${detail}`,
    );
    const err = new Error(`CF Stream ${path} failed (${res.status}): ${detail}`);
    (err as Error & { cfStatus?: number }).cfStatus = res.status;
    throw err;
  }
  return data.result as T;
}

// ─── CF raw responses ──────────────────────────────────────────────
interface CfRtmpsIngest {
  url: string;
  streamKey: string;
}
interface CfLiveInput {
  uid: string;
  created?: string;
  modified?: string;
  meta?: { name?: string; [k: string]: unknown };
  rtmps?: CfRtmpsIngest;
  rtmpsPlayback?: { url: string };
  status?: { current?: { state?: LiveStatus; lastSeen?: string } };
  recording?: { mode?: string };
}

// ─── Mappers ───────────────────────────────────────────────────────
function fromCf(i: CfLiveInput): LiveInput {
  const status = (i.status?.current?.state ?? 'unknown') as LiveStatus;
  return {
    uid: i.uid,
    label: i.meta?.name ?? i.uid,
    rtmpsUrl: i.rtmps?.url ?? '',
    rtmpsStreamKey: i.rtmps?.streamKey ?? '',
    status,
    createdAt: i.created ?? new Date().toISOString(),
    createdBy: '',
    lastSeenAt: i.status?.current?.lastSeen ?? null,
  };
}

// ─── CF API calls ──────────────────────────────────────────────────
async function cfListInputs(env: StreamEnv): Promise<LiveInput[]> {
  const list = await cfFetch<CfLiveInput[]>(env, 'live_inputs');
  return (list ?? []).map(fromCf);
}

async function cfCreateInput(env: StreamEnv, label: string): Promise<LiveInput> {
  const created = await cfFetch<CfLiveInput>(env, 'live_inputs', {
    method: 'POST',
    body: JSON.stringify({
      meta: { name: label },
      recording: { mode: 'automatic' },
    }),
  });
  return fromCf(created);
}

async function cfDeleteInput(env: StreamEnv, uid: string): Promise<void> {
  await cfFetch<unknown>(env, `live_inputs/${uid}`, { method: 'DELETE' });
}

// ─── KV readers/writers ────────────────────────────────────────────
async function kvGet(key: string): Promise<string | null> {
  const env = getEnv();
  if (!env.AUTH_KV) return null;
  return await env.AUTH_KV.get(key);
}

async function kvPut(key: string, value: string): Promise<void> {
  const env = getEnv();
  if (!env.AUTH_KV) throw new Error('AUTH_KV binding is not available');
  await env.AUTH_KV.put(key, value);
}

async function kvDel(key: string): Promise<void> {
  const env = getEnv();
  if (!env.AUTH_KV) throw new Error('AUTH_KV binding is not available');
  await env.AUTH_KV.delete(key);
}

export async function readInputsKv(): Promise<LiveInput[]> {
  const raw = await kvGet(KV_INPUTS);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as LiveInput[]) : [];
  } catch {
    return [];
  }
}

async function writeInputsKv(inputs: LiveInput[]): Promise<void> {
  await kvPut(KV_INPUTS, JSON.stringify(inputs));
}

export async function readCurrentKv(): Promise<string | null> {
  return await kvGet(KV_CURRENT);
}

async function writeCurrentKv(uid: string | null): Promise<void> {
  if (uid === null) await kvDel(KV_CURRENT);
  else await kvPut(KV_CURRENT, uid);
}

// ─── High-level operations (call these from API routes) ────────────

/**
 * Pull latest input list (with statuses) from CF and merge with whatever
 * local labels/edits we've cached. CF is source of truth for status,
 * RTMPS URL, and stream key; local KV holds our labels and audit fields.
 *
 * Returns the merged list, also persisted to KV.
 */
export async function refreshInputs(): Promise<LiveInput[]> {
  const env = getEnv();
  const cfList = await cfListInputs(env);
  const local = await readInputsKv();
  const localByUid = new Map(local.map((i) => [i.uid, i]));

  const merged: LiveInput[] = cfList.map((cf) => {
    const prev = localByUid.get(cf.uid);
    return {
      ...cf,
      // Preserve local edits to the human label; fall back to whatever
      // CF stores; fall back to the UID (so the UI doesn't render an
      // empty string).
      label: prev?.label && prev.label.trim().length > 0 ? prev.label : cf.label || cf.uid,
      createdBy: prev?.createdBy ?? '',
      // createdAt from CF if we have no prior entry; otherwise keep prior
      createdAt: prev?.createdAt ?? cf.createdAt,
      // The CF LIST endpoint intentionally omits the stream key for
      // security. We persisted it on creation in `createInput`, so
      // keep the locally-saved copy across refreshes.
      rtmpsStreamKey: prev?.rtmpsStreamKey ?? '',
    };
  });

  await writeInputsKv(merged);
  return merged;
}

/**
 * Create a CF live input + persist the operator's label locally.
 * Returns the input INCLUDING the fresh RTMPS URL & stream key, which
 * is shown to the admin exactly once.
 */
export async function createInput(label: string, createdBy: string): Promise<LiveInput> {
  const env = getEnv();
  if (!label || label.trim().length === 0) {
    throw new Error('label is required');
  }
  const input = await cfCreateInput(env, label.trim());
  // The stream key is only ever returned on POST. Mirror other fields
  // from the fresh create response.
  const persisted: LiveInput = {
    ...input,
    label: label.trim(),
    createdBy: createdBy || '',
  };
  const existing = await readInputsKv();
  const next = [persisted, ...existing.filter((i) => i.uid !== persisted.uid)];
  await writeInputsKv(next);
  return persisted;
}

/**
 * Delete a CF live input and clean the current-pointer if it pointed
 * to this one.
 */
export async function deleteInput(uid: string): Promise<{ wasCurrent: boolean }> {
  const env = getEnv();
  if (!uid) throw new Error('uid is required');
  await cfDeleteInput(env, uid);

  const existing = await readInputsKv();
  await writeInputsKv(existing.filter((i) => i.uid !== uid));

  const cur = await readCurrentKv();
  const wasCurrent = cur === uid;
  if (wasCurrent) await writeCurrentKv(null);
  return { wasCurrent };
}

export async function setCurrent(uid: string): Promise<void> {
  if (!uid) throw new Error('uid is required');
  // Sanity check the input actually exists in our local cache.
  const existing = await readInputsKv();
  if (!existing.some((i) => i.uid === uid)) {
    // Try to refresh once — admin may have created it via CF directly.
    await refreshInputs();
    const after = await readInputsKv();
    if (!after.some((i) => i.uid === uid)) {
      throw new Error(`Unknown live input uid: ${uid}`);
    }
  }
  await writeCurrentKv(uid);
}

export async function clearCurrent(): Promise<void> {
  await writeCurrentKv(null);
}

/**
 * Public shape consumed by /api/streams/current and the watch page.
 * `null` when nothing is configured to broadcast.
 */
export interface PublicCurrentStream {
  uid: string;
  customerCode: string;
  iframeUrl: string;
  hlsManifestUrl: string;
  label: string;
}

export async function getCurrentStream(): Promise<PublicCurrentStream | null> {
  const env = getEnv();
  const uid = await readCurrentKv();
  if (!uid) return null;
  if (!env.CUSTOMER_CODE) {
    // Stream secret missing but stream is set — return shape with empty
    // code so the UI can render a friendly "config not ready" message
    // instead of crashing.
    return {
      uid,
      customerCode: '',
      iframeUrl: '',
      hlsManifestUrl: '',
      label: '',
    };
  }
  const local = await readInputsKv();
  const matched = local.find((i) => i.uid === uid);
  return {
    uid,
    customerCode: env.CUSTOMER_CODE,
    iframeUrl: `https://customer-${env.CUSTOMER_CODE}.cloudflarestream.com/${uid}/iframe`,
    hlsManifestUrl: `https://customer-${env.CUSTOMER_CODE}.cloudflarestream.com/${uid}/manifest/video.m3u8`,
    label: matched?.label ?? '',
  };
}
