/**
 * Cloudflare KV-backed ApplicationStore.
 *
 * Used automatically when the app runs on Cloudflare Workers/Pages
 * (OpenNext adapter) and a KV namespace is bound as `APPLICATIONS_KV`.
 * Falls back to the JSON file store locally / on Node servers.
 *
 * KV layout:
 *   applications            → JSON array of all ApplicationRecord objects
 *                              (single key; fine for the expected volume.
 *                               L1-DB / D1 migration will shard this later.)
 *
 * Swap to D1 when relational queries / status filters at scale are needed:
 *   the ApplicationStore interface stays identical.
 */

import type {
  ApplicationRecord,
  ApplicationStatus,
  ApplicationStore,
  CreateApplicationInput,
} from './index';

import { getCloudflareContext } from '@opennextjs/cloudflare';

/** Shape of env bindings injected by OpenNext on Cloudflare. */
interface CloudflareEnv {
  APPLICATIONS_KV?: {
    get(key: string): Promise<string | null>;
    put(key: string, value: string): Promise<void>;
  };
}

const KV_KEY = 'applications';
const MAX_LIST = 10_000; // safety cap; D1 migration territory beyond this

function getKv(): CloudflareEnv['APPLICATIONS_KV'] | null {
  try {
    const { env } = getCloudflareContext();
    if ((env as any).APPLICATIONS_KV) return (env as any).APPLICATIONS_KV;
  } catch {}
  
  if (typeof process !== 'undefined' && process.env && (process.env as any).APPLICATIONS_KV) {
    return (process.env as any).APPLICATIONS_KV;
  }
  
  if (typeof globalThis !== 'undefined' && (globalThis as any).__env__?.APPLICATIONS_KV) {
    return (globalThis as any).__env__.APPLICATIONS_KV;
  }

  return null;
}

/** True when a KV namespace binding is available (i.e. we're on CF Workers). */
export function isKvAvailable(): boolean {
  return getKv() !== null;
}

function genId(): string {
  const ts = Date.now().toString(36);
  const r = Math.random().toString(36).slice(2, 10);
  return `as_${ts}_${r}`;
}

async function readAll(): Promise<ApplicationRecord[]> {
  const kv = getKv();
  if (!kv) throw new Error('KV namespace APPLICATIONS_KV is not bound');
  const raw = await kv.get(KV_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ApplicationRecord[]) : [];
  } catch {
    return [];
  }
}

async function writeAll(records: ApplicationRecord[]): Promise<void> {
  const kv = getKv();
  if (!kv) throw new Error('KV namespace APPLICATIONS_KV is not bound');
  await kv.put(KV_KEY, JSON.stringify(records));
}

class KvStore implements ApplicationStore {
  async create(input: CreateApplicationInput): Promise<ApplicationRecord> {
    const records = await readAll();
    const now = new Date().toISOString();
    const record: ApplicationRecord = {
      id: genId(),
      createdAt: now,
      updatedAt: now,
      status: 'new',
      ...input,
    };
    records.push(record);
    await writeAll(records.slice(-MAX_LIST));
    return record;
  }

  async list(
    filter?: { status?: ApplicationStatus }
  ): Promise<ApplicationRecord[]> {
    const records = await readAll();
    const filtered = filter?.status
      ? records.filter((r) => r.status === filter.status)
      : records;
    // Sort newest first.
    return [...filtered].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async get(id: string): Promise<ApplicationRecord | null> {
    const records = await readAll();
    return records.find((r) => r.id === id) ?? null;
  }

  async updateStatus(
    id: string,
    status: ApplicationStatus,
    notes?: string
  ): Promise<ApplicationRecord> {
    const records = await readAll();
    const idx = records.findIndex((r) => r.id === id);
    if (idx === -1) throw new Error(`Application ${id} not found`);
    const updated: ApplicationRecord = {
      ...records[idx],
      status,
      notes: notes ?? records[idx].notes,
      updatedAt: new Date().toISOString(),
    };
    records[idx] = updated;
    await writeAll(records);
    return updated;
  }
}

export const kvStore: ApplicationStore = new KvStore();
