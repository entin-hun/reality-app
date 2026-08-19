/**
 * EFU Analytics — env-aware event store (KV on Workers, fs on Node).
 *
 * The L8 brief is "ship the dashboard + dep seams". Once a real database
 * lands (Postgres / ClickHouse), replace `EVENTS` with a thin repository
 * and keep the public function surface intact.
 *
 * Data lives in two places:
 *   - a process-local array (fast for API routes on the same Node instance)
 *   - a single KV key on Workers (APPLICATIONS_KV["analytics:events"])
 *   - a JSON file at /tmp/efu-analytics.json (local dev fallback)
 *
 * In production this whole module would be replaced; for now it gives the
 * dashboard real numbers to render against.
 */

import { promises as fs } from 'fs';
import { randomUUID } from 'crypto';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import type { AnalyticsEvent, AnalyticsEventStored } from './types';

const DEV_STORE_PATH = process.env.EFU_ANALYTICS_STORE ?? '/tmp/efu-analytics.json';
const KV_KEY = 'analytics:events';
const MAX_EVENTS = 50_000; // ring-buffer cap to keep dev memory bounded

declare global {
  // eslint-disable-next-line no-var
  var __EFU_EVENTS__: AnalyticsEventStored[] | undefined;
}

let EVENTS: AnalyticsEventStored[] | undefined;

// ---------------------------------------------------------------------------
// Env-aware handle
// ---------------------------------------------------------------------------

interface KvLike {
  get(key: string): Promise<string | null>;
  put(key: string, value: string): Promise<void>;
}

function getKv(): KvLike | null {
  try {
    const { env } = getCloudflareContext();
    if ((env as any)?.APPLICATIONS_KV) return (env as any).APPLICATIONS_KV;
  } catch {}
  if (typeof process !== 'undefined' && (process.env as any)?.APPLICATIONS_KV) {
    return (process.env as any).APPLICATIONS_KV;
  }
  if (typeof globalThis !== 'undefined' && (globalThis as any).__env__?.APPLICATIONS_KV) {
    return (globalThis as any).__env__.APPLICATIONS_KV;
  }
  return null;
}

export function isKvAvailable(): boolean {
  return getKv() !== null;
}

// ---------------------------------------------------------------------------
// Persistence helpers
// ---------------------------------------------------------------------------

async function loadFromFs(): Promise<AnalyticsEventStored[]> {
  try {
    const raw = await fs.readFile(DEV_STORE_PATH, 'utf-8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed as AnalyticsEventStored[];
  } catch {
    // file missing or malformed — start fresh
  }
  return [];
}

async function persistToFs(events: AnalyticsEventStored[]): Promise<void> {
  try {
    await fs.writeFile(DEV_STORE_PATH, JSON.stringify(events), 'utf-8');
  } catch {
    // disk unavailable — silently keep in-memory state
  }
}

async function loadFromKv(): Promise<AnalyticsEventStored[] | null> {
  const kv = getKv();
  if (!kv) return null;
  const raw = await kv.get(KV_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as AnalyticsEventStored[]) : null;
  } catch {
    return null;
  }
}

async function persistToKv(events: AnalyticsEventStored[]): Promise<void> {
  const kv = getKv();
  if (!kv) throw new Error('KV unavailable — persistToKv called outside Workers');
  await kv.put(KV_KEY, JSON.stringify(events));
}

async function getEvents(): Promise<AnalyticsEventStored[]> {
  if (EVENTS) return EVENTS;
  // 1) On Workers: hydrate from KV once per isolate lifetime.
  const kvLoaded = await loadFromKv();
  if (kvLoaded !== null) {
    EVENTS = kvLoaded;
    return EVENTS;
  }
  // 2) In dev: reuse across HMR.
  if (isKvAvailable()) {
    // KV is bound but empty — start fresh.
    EVENTS = [];
    return EVENTS;
  }
  if (process.env.NODE_ENV !== 'production' && globalThis.__EFU_EVENTS__) {
    EVENTS = globalThis.__EFU_EVENTS__;
    return EVENTS;
  }
  EVENTS = await loadFromFs();
  if (process.env.NODE_ENV !== 'production') {
    globalThis.__EFU_EVENTS__ = EVENTS;
  }
  return EVENTS;
}

async function persist(events: AnalyticsEventStored[]): Promise<void> {
  if (isKvAvailable()) {
    await persistToKv(events);
    return;
  }
  await persistToFs(events);
}

export async function trackEvent(event: AnalyticsEvent): Promise<AnalyticsEventStored> {
  const stored: AnalyticsEventStored = {
    ...event,
    id: randomUUID(),
    ts: Date.now(),
  };
  const events = await getEvents();
  events.push(stored);
  if (events.length > MAX_EVENTS) {
    events.splice(0, events.length - MAX_EVENTS);
  }
  await persist(events);
  return stored;
}

export async function trackBatch(events: AnalyticsEvent[]): Promise<number> {
  const stored: AnalyticsEventStored[] = events.map((e) => ({
    ...e,
    id: randomUUID(),
    ts: Date.now(),
  }));
  const all = await getEvents();
  all.push(...stored);
  if (all.length > MAX_EVENTS) {
    all.splice(0, all.length - MAX_EVENTS);
  }
  await persist(all);
  return stored.length;
}

export async function readEvents(opts?: { sinceMs?: number; untilMs?: number; limit?: number }): Promise<AnalyticsEventStored[]> {
  const events = await getEvents();
  const sinceMs = opts?.sinceMs ?? 0;
  const untilMs = opts?.untilMs ?? Number.POSITIVE_INFINITY;
  const limit = opts?.limit ?? events.length;
  const filtered: AnalyticsEventStored[] = [];
  // iterate from newest backward so the limit caps the most-recent
  for (let i = events.length - 1; i >= 0 && filtered.length < limit; i--) {
    const e = events[i];
    if (e.ts >= sinceMs && e.ts <= untilMs) filtered.push(e);
  }
  return filtered.reverse();
}

export async function resetEvents(): Promise<void> {
  EVENTS = [];
  if (process.env.NODE_ENV !== 'production') {
    globalThis.__EFU_EVENTS__ = [];
  }
  await persist([]);
}

// Re-export the canonical seeder from ./seed so the admin page can
// import it through this module without losing in-memory state.
export { seedDemoEvents } from './seed';
