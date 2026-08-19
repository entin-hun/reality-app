/**
 * Contact-message persistence layer — pluggable, env-aware.
 *
 * On Cloudflare Workers/Pages (OpenNext): KV-backed store when the
 *   APPLICATIONS_KV namespace is bound — the filesystem there is read-only,
 *   so the JSON file store cannot persist writes (persistence_failed).
 * Locally / on Node servers: JSON file store at .data/contact-messages.json
 *   (gitignored) — visible in dev and admin triage, durable across restarts.
 * Tomorrow (when L1-DB lands at t_0b2dbb52): swap the `ContactStore`
 *   implementation to Prisma. The controller code keeps calling
 *   `store.create(...)` / `store.list()` / `store.get(...)`.
 *
 * Kept in a separate file from `lib/db/index.ts` (applications) because:
 *   1) The records have a different shape (no fighter-specific fields).
 *   2) The admin triage view (L6) will eventually render both side by side,
 *      and separate stores make that split clean.
 *   3) When Prisma lands, each table gets its own model and we want the
 *      swap to be per-domain.
 */

import { promises as fs } from 'fs';
import path from 'path';
import { getCloudflareContext } from '@opennextjs/cloudflare';

export type ContactStatus = 'new' | 'in_progress' | 'resolved' | 'spam';

export interface ContactRecord {
  id: string;
  createdAt: string; // ISO
  updatedAt: string;
  status: ContactStatus;
  notes?: string;
  locale: string;
  name: string;
  email: string;
  subject: string; // 'general' | 'partnership' | 'press' | 'support' | 'other'
  message: string;
  gdprConsent: true; // enforced at type level
  gdprConsentAt: string;
  ipHash?: string;
  userAgent?: string;
  honeypotTriggered?: boolean;
  turnstileVerified?: boolean;
}

export interface CreateContactInput
  extends Omit<ContactRecord, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'notes'> {}

export interface ContactStore {
  create(input: CreateContactInput): Promise<ContactRecord>;
  list(filter?: { status?: ContactStatus }): Promise<ContactRecord[]>;
  get(id: string): Promise<ContactRecord | null>;
  updateStatus(
    id: string,
    status: ContactStatus,
    notes?: string
  ): Promise<ContactRecord>;
}

const DATA_DIR = path.join(process.cwd(), '.data');
const DATA_FILE = path.join(DATA_DIR, 'contact-messages.json');
const KV_KEY = 'contact:all';
const MAX_LIST = 10_000;

// ---------------------------------------------------------------------------
// Env-aware handle (mirrors lib/db/kv.ts)
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

async function readAll(): Promise<ContactRecord[]> {
  // KV on Workers.
  const kv = getKv();
  if (kv) {
    const raw = await kv.get(KV_KEY);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as ContactRecord[]) : [];
    } catch {
      return [];
    }
  }
  // fs on Node.
  await ensureFile();
  const raw = await fs.readFile(DATA_FILE, 'utf8');
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ContactRecord[]) : [];
  } catch {
    return [];
  }
}

async function writeAll(records: ContactRecord[]): Promise<void> {
  const kv = getKv();
  if (kv) {
    await kv.put(KV_KEY, JSON.stringify(records.slice(-MAX_LIST)));
    return;
  }
  await ensureFile();
  await fs.writeFile(DATA_FILE, JSON.stringify(records, null, 2), 'utf8');
}

async function ensureFile(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(DATA_FILE);
  } catch {
    await fs.writeFile(DATA_FILE, '[]', 'utf8');
  }
}

function genId(): string {
  // ULID-like, lexicographic-sortable enough for admin queue ordering.
  // Prefixed `ct_` (contact) so it can't collide with `as_` (application).
  const ts = Date.now().toString(36);
  const r = Math.random().toString(36).slice(2, 10);
  return `ct_${ts}_${r}`;
}

class JsonFileContactStore implements ContactStore {
  async create(input: CreateContactInput): Promise<ContactRecord> {
    const records = await readAll();
    const now = new Date().toISOString();
    const record: ContactRecord = {
      id: genId(),
      createdAt: now,
      updatedAt: now,
      status: 'new',
      ...input,
    };
    records.push(record);
    await writeAll(records);
    return record;
  }

  async list(filter?: { status?: ContactStatus }): Promise<ContactRecord[]> {
    const records = await readAll();
    const filtered = filter?.status
      ? records.filter((r) => r.status === filter.status)
      : records;
    return [...filtered].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async get(id: string): Promise<ContactRecord | null> {
    const records = await readAll();
    return records.find((r) => r.id === id) ?? null;
  }

  async updateStatus(
    id: string,
    status: ContactStatus,
    notes?: string
  ): Promise<ContactRecord> {
    const records = await readAll();
    const idx = records.findIndex((r) => r.id === id);
    if (idx === -1) throw new Error(`Contact ${id} not found`);
    const updated: ContactRecord = {
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

// Module-level singleton — swap this line when Prisma lands.
export const contactStore: ContactStore = new JsonFileContactStore();