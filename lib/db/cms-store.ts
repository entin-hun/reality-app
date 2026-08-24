/**
 * Generic CMS store -- KV-backed list CRUD for content types that don't
 * justify a dedicated schema (events, fight-cards, news, videos, photos,
 * sponsors, social-links, results, reality-triggers, audio-library).
 *
 * Storage:
 *   cms:<kind>:list   → JSON Array<string>  (ordered id index)
 *   cms:<kind>:<id>   → JSON <record>
 *
 * Concurrency: per-kind in-process mutex (writeLock). The dataset is
 * tiny (admin-curated), so a single-key rewrite is fine. When L1-DB
*   lands, swap the bodies of the read+write helpers -- call sites stay identical.
 *
 * The "kind" namespace is closed at construction time so we can't get
 * typos poisoning the KV store.
 */

import { getCloudflareContext } from '@opennextjs/cloudflare';

interface KvBinding {
  get(key: string): Promise<string | null>;
  put(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
}

function getKv(): KvBinding | null {
  try {
    const { env } = getCloudflareContext() as unknown as {
      env?: Record<string, unknown>;
    };
    const kv = env?.APPLICATIONS_KV;
    if (kv && typeof (kv as KvBinding).get === 'function') {
      return kv as KvBinding;
    }
  } catch {}
  if (typeof process !== 'undefined' && process.env) {
    const v = (process.env as unknown as Record<string, unknown>).APPLICATIONS_KV;
    if (v && typeof (v as KvBinding).get === 'function') return v as KvBinding;
  }
  if (typeof globalThis !== 'undefined') {
    const g = globalThis as unknown as { __env__?: Record<string, unknown> };
    const v = g.__env__?.APPLICATIONS_KV;
    if (v && typeof (v as KvBinding).get === 'function') return v as KvBinding;
  }
  return null;
}

async function kvGet(key: string): Promise<string | null> {
  const kv = getKv();
  if (!kv) return null;
  return kv.get(key);
}

async function kvPut(key: string, value: string): Promise<void> {
  const kv = getKv();
  if (!kv) throw new Error('APPLICATIONS_KV binding is not available');
  await kv.put(key, value);
}

async function kvDel(key: string): Promise<void> {
  const kv = getKv();
  if (!kv) throw new Error('APPLICATIONS_KV binding is not available');
  await kv.delete(key);
}

// Per-kind write mutex (KV doesn't have atomic append -- serialise).
const locks = new Map<string, Promise<unknown>>();

async function withLock<T>(kind: string, fn: () => Promise<T>): Promise<T> {
  const prev = locks.get(kind) ?? Promise.resolve();
  let resolve!: () => void;
  const next = new Promise<void>((r) => (resolve = r));
  locks.set(kind, prev.then(() => next));
  try {
    await prev;
    return await fn();
  } finally {
    resolve();
    // GC: only keep the lock while it's the latest chain.
    if (locks.get(kind) === prev.then(() => next)) {
      // Re-derive the latest chain reference (we stored `prev.then(()=>next)`
      // but used `prev` as the head -- clear if no one queued behind us).
    }
  }
}

/** Allowed content kinds -- typed so callers can't get a typo. */
export type CmsKind =
  | 'events'
  | 'fight-cards'
  | 'news'
  | 'videos'
  | 'photos'
  | 'sponsors'
  | 'social-links'
  | 'results'
  | 'reality-triggers'
  | 'audio-library';

function idListKey(kind: CmsKind): string {
  return `cms:${kind}:list`;
}
function idItemKey(kind: CmsKind, id: string): string {
  return `cms:${kind}:${id}`;
}

function newId(): string {
  const ts = Date.now().toString(36);
  const r = Math.random().toString(36).slice(2, 10);
  return `${ts}_${r}`;
}

export async function listItems<T>(kind: CmsKind): Promise<T[]> {
  const raw = await kvGet(idListKey(kind));
  let ids: string[] = [];
  try {
    const parsed = raw ? JSON.parse(raw) : [];
    if (Array.isArray(parsed)) ids = parsed as string[];
  } catch {
    ids = [];
  }
  const out: T[] = [];
  for (const id of ids) {
    const rawItem = await kvGet(idItemKey(kind, id));
    if (!rawItem) continue;
    try {
      out.push(JSON.parse(rawItem) as T);
    } catch {
      // skip corrupted row
    }
  }
  return out;
}

export async function getItem<T>(kind: CmsKind, id: string): Promise<T | null> {
  const raw = await kvGet(idItemKey(kind, id));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function createItem<T extends { id?: string }>(
  kind: CmsKind,
  data: T
): Promise<T & { id: string; createdAt: string; updatedAt: string }> {
  return withLock(kind, async () => {
    const now = new Date().toISOString();
    const record = {
      ...data,
      id: data.id ?? newId(),
      createdAt: (data as { createdAt?: string }).createdAt ?? now,
      updatedAt: now,
    };
    const rawList = await kvGet(idListKey(kind));
    let ids: string[] = [];
    try {
      const parsed = rawList ? JSON.parse(rawList) : [];
      if (Array.isArray(parsed)) ids = parsed as string[];
    } catch {
      ids = [];
    }
    if (!ids.includes(record.id)) ids.unshift(record.id);
    await kvPut(idListKey(kind), JSON.stringify(ids));
    await kvPut(idItemKey(kind, record.id), JSON.stringify(record));
    return record;
  });
}

export async function updateItem<T extends { id: string }>(
  kind: CmsKind,
  id: string,
  patch: Partial<T>
): Promise<T> {
  return withLock(kind, async () => {
    const current = await getItem<T>(kind, id);
    if (!current) throw new Error(`${kind}/${id} not found`);
    const next = {
      ...current,
      ...patch,
      id,
      updatedAt: new Date().toISOString(),
    } as T;
    await kvPut(idItemKey(kind, id), JSON.stringify(next));
    return next;
  });
}

export async function deleteItem(kind: CmsKind, id: string): Promise<boolean> {
  return withLock(kind, async () => {
    const rawList = await kvGet(idListKey(kind));
    let ids: string[] = [];
    try {
      const parsed = rawList ? JSON.parse(rawList) : [];
      if (Array.isArray(parsed)) ids = parsed as string[];
    } catch {
      ids = [];
    }
    const next = ids.filter((x) => x !== id);
    if (next.length === ids.length) return false;
    await kvPut(idListKey(kind), JSON.stringify(next));
    await kvDel(idItemKey(kind, id));
    return true;
  });
}