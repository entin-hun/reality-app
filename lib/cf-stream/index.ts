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

// ─── VOD archive (auto-recorded streams) ───────────────────────────
//
// CF Stream is configured with `recording: { mode: 'automatic' }`, so
// every live stream also produces a VOD. The admin streams page
// exposes the archive so the operator can:
//   1. Preview each recording with audio to decide what to keep.
//   2. Delete the ones they don't want (storage costs money).
//   3. Curate an ordered playlist that loops on /watch when no live
//      stream is on air.
//
// VOD state is a mix of two sources:
//   * CF Stream API  → source of truth for `uid, duration, status,
//                      thumbnail, created`. Updated by `refreshVideos`.
//   * AUTH_KV        → source of truth for operator-controlled fields:
//                      `label` (editable human name), `keep` flag,
//                      `playlistOrder` index (null = not in playlist).

export type VideoStatus = 'ready' | 'downloading' | 'queued' | 'error' | 'unknown';

export interface LiveVideo {
  /** CF-assigned video UID — same namespace as live_inputs but
   *  recordings are children of their input, and they survive after
   *  the parent input is deleted. */
  uid: string;
  /** Duration in seconds (0 when CF is still processing). */
  duration: number;
  /** Ready means HLS + thumbnail are generated and the iframe can
   *  serve traffic. "downloading" / "queued" mean CF is still
   *  processing the recording. */
  status: VideoStatus;
  /** ISO timestamp when the recording was created in CF. */
  created: string;
  /** ISO timestamp of the last CF modification (status changes etc). */
  modified: string;
  /** Optional CF-generated thumbnail URL (always available when ready). */
  thumbnail: string;
  /** Width × height — useful for aspect ratio in the admin grid. */
  width?: number;
  height?: number;
  /** UID of the parent live_input that produced this recording, when
   *  CF surfaces it. Lets us group archive entries by stream session. */
  inputUid?: string;
  // ─── Operator-controlled (KV-only) ──────────────────────────────
  /** Editable human label. Falls back to a derived label from the
   *  created date when missing. */
  label: string;
  /** Set to false to mark a video as "ok to delete" — purely
   *  organizational since nothing auto-deletes; the operator still
   *  needs to press the delete button. Default true (keep). */
  keep: boolean;
  /** Position in the looping playlist (0-based). null = not in
   *  playlist. The playlist is the ordered list of videos where this
   *  field is not null, sorted ascending. */
  playlistOrder: number | null;
}

interface CfVideo {
  uid: string;
  creator?: string;
  thumbnail?: string;
  thumbnailTimestampPct?: number;
  readyToStream?: boolean;
  readyToStreamAt?: string;
  duration?: number;
  input?: { uid?: string };
  liveInput?: string;
  status?: { state?: string };
  created?: string;
  modified?: string;
  size?: number;
  preview?: string;
  allowedOrigins?: string[];
  requireSignedURLs?: boolean;
  uploaded?: string;
  meta?: { name?: string; [k: string]: unknown };
  width?: number;
  height?: number;
}

function fromCfVideo(cf: CfVideo, labelOverride?: string): LiveVideo {
  let status: VideoStatus = 'unknown';
  if (cf.status?.state === 'ready' || cf.readyToStream === true) status = 'ready';
  else if (cf.status?.state === 'downloading' || cf.status?.state === 'processing') status = 'downloading';
  else if (cf.status?.state === 'queued' || cf.status?.state === 'pending') status = 'queued';
  else if (cf.status?.state === 'error') status = 'error';

  // Fallback thumbnail: CF serves one at /thumbnails/thumbnail.jpg.
  // We need the customer code to build it, which is set per-env.
  const env = getEnv();
  const fallbackThumb = env.CUSTOMER_CODE
    ? `https://customer-${env.CUSTOMER_CODE}.cloudflarestream.com/${cf.uid}/thumbnails/thumbnail.jpg?time=1s&height=240`
    : '';

  return {
    uid: cf.uid,
    duration: typeof cf.duration === 'number' ? cf.duration : 0,
    status,
    created: cf.created ?? '',
    modified: cf.modified ?? '',
    thumbnail: cf.thumbnail || fallbackThumb,
    width: cf.width,
    height: cf.height,
    inputUid: cf.input?.uid ?? cf.liveInput,
    label: labelOverride && labelOverride.trim().length > 0
      ? labelOverride
      : (cf.meta?.name ?? `VOD ${cf.created?.slice(0, 10) ?? cf.uid.slice(0, 8)}`),
    keep: true,
    playlistOrder: null,
  };
}

/** GET /accounts/{id}/stream — list VODs. CF returns up to ~1000 per
 *  page; we page through until exhausted. */
async function cfListVideos(env: StreamEnv): Promise<CfVideo[]> {
  const all: CfVideo[] = [];
  let cursor: string | undefined;
  // Cap at 50 pages (50,000 videos) — far above our actual use.
  for (let page = 0; page < 50; page++) {
    const qs = new URLSearchParams();
    qs.set('per_page', '1000');
    if (cursor) qs.set('cursor', cursor);
    const list = await cfFetch<CfVideo[]>(env, `?${qs.toString()}`);
    if (!Array.isArray(list) || list.length === 0) break;
    all.push(...list);
    // CF returns a `result_info` envelope elsewhere; the list endpoint
    // uses a cursor via the `cursor` query param. We stop when we get
    // less than a full page (no more results).
    if (list.length < 1000) break;
  }
  return all;
}

/** DELETE /accounts/{id}/stream/{uid} — delete a single VOD. */
async function cfDeleteVideo(env: StreamEnv, uid: string): Promise<void> {
  await cfFetch<unknown>(env, uid, { method: 'DELETE' });
}

// ─── KV storage for archive + playlist ────────────────────────────

interface VideoMeta {
  /** Editable label override; missing key means "use CF-generated". */
  label?: string;
  /** Operator toggle; missing key defaults to true (keep). */
  keep?: boolean;
  /** Stable playlist position (0-based). Missing/null = not in playlist. */
  playlistOrder?: number | null;
}

/** Per-video metadata KV keys: `streams:videos:<uid>` → JSON VideoMeta. */
const KV_VIDEO_PREFIX = 'streams:videos:';
/** Ordered playlist KV key: `streams:playlist` → JSON string[] (UIDs). */
const KV_PLAYLIST = 'streams:playlist';

async function kvGetVideo(uid: string): Promise<VideoMeta | null> {
  const raw = await kvGet(KV_VIDEO_PREFIX + uid);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as VideoMeta;
  } catch {
    return null;
  }
}

async function kvPutVideo(uid: string, meta: VideoMeta): Promise<void> {
  await kvPut(KV_VIDEO_PREFIX + uid, JSON.stringify(meta));
}

async function kvDelVideo(uid: string): Promise<void> {
  await kvDel(KV_VIDEO_PREFIX + uid);
}

/**
 * Pull the canonical VOD list from CF and merge with KV-stored operator
 * fields. Returns the merged list, also persisted to KV.
 */
export async function refreshVideos(): Promise<LiveVideo[]> {
  const env = getEnv();
  const cfList = await cfListVideos(env);

  // Load all KV meta in parallel. KV doesn't support list-by-prefix
  // outside paid plan, so we lean on the CF list as the authoritative
  // set of UIDs and only read meta for those.
  const merged: LiveVideo[] = [];
  for (const cf of cfList) {
    const meta = await kvGetVideo(cf.uid);
    merged.push(fromCfVideo(cf, meta?.label));
    // Apply keep + playlistOrder from KV.
    if (meta) {
      merged[merged.length - 1].keep = meta.keep ?? true;
      merged[merged.length - 1].playlistOrder =
        typeof meta.playlistOrder === 'number' ? meta.playlistOrder : null;
    }
  }
  return merged;
}

/** Persist operator-editable fields for a single video. */
export async function setVideoMeta(uid: string, patch: VideoMeta): Promise<void> {
  const existing = (await kvGetVideo(uid)) ?? {};
  await kvPutVideo(uid, { ...existing, ...patch });
}

/** Delete a VOD from CF and remove its KV record. */
export async function deleteVideo(uid: string): Promise<void> {
  const env = getEnv();
  if (!uid) throw new Error('uid is required');
  await cfDeleteVideo(env, uid);
  await kvDelVideo(uid);
  // Also remove from playlist if present.
  await removeFromPlaylist(uid);
}

/**
 * Read the ordered playlist from KV. Returns UIDs in display order.
 * Each UID is paired with a `LiveVideo` (the admin UI wants metadata
 * for the order list).
 */
export async function getPlaylist(): Promise<LiveVideo[]> {
  const raw = await kvGet(KV_PLAYLIST);
  let uids: string[] = [];
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) uids = parsed.filter((u): u is string => typeof u === 'string');
    } catch {
      // Corrupted — start fresh.
      uids = [];
    }
  }
  if (uids.length === 0) return [];

  // Resolve UIDs to LiveVideo (best effort — missing ones are filtered).
  // We use KV metadata only; calling refreshVideos here would slow every
  // /watch poll. The admin UI does its own refresh before showing.
  const out: LiveVideo[] = [];
  for (const uid of uids) {
    const meta = await kvGetVideo(uid);
    if (!meta) continue;
    out.push({
      uid,
      label: meta.label ?? '',
      duration: 0,
      status: 'unknown',
      created: '',
      modified: '',
      thumbnail: '',
      keep: meta.keep ?? true,
      playlistOrder: 0, // assigned by index below
    });
  }
  out.forEach((v, i) => {
    v.playlistOrder = i;
  });
  return out;
}

/** Replace the entire playlist (admin reorder / bulk edit). */
export async function setPlaylist(uids: string[]): Promise<void> {
  // De-dupe and sanitize.
  const seen = new Set<string>();
  const clean: string[] = [];
  for (const u of uids) {
    if (typeof u !== 'string') continue;
    if (!/^[a-zA-Z0-9_-]{8,40}$/.test(u)) continue;
    if (seen.has(u)) continue;
    seen.add(u);
    clean.push(u);
  }
  await kvPut(KV_PLAYLIST, JSON.stringify(clean));
}

/** Append a UID to the playlist (admin "add to playlist" button). */
export async function addToPlaylist(uid: string): Promise<void> {
  if (!/^[a-zA-Z0-9_-]{8,40}$/.test(uid)) throw new Error('invalid uid');
  const raw = await kvGet(KV_PLAYLIST);
  let list: string[] = [];
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) list = parsed.filter((u): u is string => typeof u === 'string');
    } catch {
      list = [];
    }
  }
  if (list.includes(uid)) return; // already in
  list.push(uid);
  await kvPut(KV_PLAYLIST, JSON.stringify(list));
  await setVideoMeta(uid, { playlistOrder: list.length - 1 });
}

/** Remove a UID from the playlist (admin "remove from playlist"). */
export async function removeFromPlaylist(uid: string): Promise<void> {
  const raw = await kvGet(KV_PLAYLIST);
  if (!raw) return;
  let list: string[] = [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) list = parsed.filter((u): u is string => typeof u === 'string');
  } catch {
    return;
  }
  const next = list.filter((u) => u !== uid);
  if (next.length === list.length) return;
  if (next.length === 0) {
    await kvDel(KV_PLAYLIST);
  } else {
    await kvPut(KV_PLAYLIST, JSON.stringify(next));
  }
  await setVideoMeta(uid, { playlistOrder: null });
}

/**
 * Public shape consumed by /watch when no live stream is on air.
 * Returns null if the playlist is empty.
 */
export async function getPlaylistForWatch(): Promise<PublicPlaylistItem[] | null> {
  const env = getEnv();
  if (!env.CUSTOMER_CODE) return null;
  const items = await getPlaylist();
  if (items.length === 0) return null;
  return items.map((v) => ({
    uid: v.uid,
    label: v.label || v.uid,
    iframeUrl: `https://customer-${env.CUSTOMER_CODE}.cloudflarestream.com/${v.uid}/iframe`,
  }));
}

export interface PublicPlaylistItem {
  uid: string;
  label: string;
  iframeUrl: string;
}
