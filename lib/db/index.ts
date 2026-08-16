/**
 * Persistence layer — pluggable, environment-aware.
 *
 * On Cloudflare Workers/Pages (OpenNext): KV-backed store when the
 *   APPLICATIONS_KV namespace is bound — the filesystem there is read-only,
 *   so the JSON file store cannot persist writes (persistence_failed).
 * Locally / on Node servers: JSON file store at .data/applications.json
 *   (gitignored) — visible in dev and admin triage, durable across restarts.
 * Tomorrow (when L1-DB lands at t_0b2dbb52): swap the `ApplicationStore`
 *   implementation to Prisma. The controller code keeps calling
 *   `store.create(...)` / `store.list()` / `store.update(...)`.
 *
 * The shape of `ApplicationRecord` matches what L1-DB will store, so
 * data carries over without re-mapping.
 */

import { promises as fs } from 'fs';
import path from 'path';
import { kvStore, isKvAvailable } from './kv';

export type ApplicationStatus = 'new' | 'contacted' | 'approved' | 'rejected';

export interface ApplicationRecord {
  id: string;
  createdAt: string; // ISO
  updatedAt: string;
  status: ApplicationStatus;
  notes?: string;
  locale: string;
  name: string;
  age: number;
  city: string;
  testSuly: string; // bodyweight category bucket
  sportMult: string; // sport history
  motivation: string;
  videoOrSocialUrl: string;
  email: string;
  phone: string;
  contact: string; // email | phone (legacy, kept for backward compat)
  gdprConsent: true; // enforced at type level
  gdprConsentAt: string;
  ipHash?: string;
  userAgent?: string;
  honeypotTriggered?: boolean;
  turnstileVerified?: boolean;
}

export interface CreateApplicationInput
  extends Omit<ApplicationRecord, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'notes'> {}

export interface ApplicationStore {
  create(input: CreateApplicationInput): Promise<ApplicationRecord>;
  list(filter?: { status?: ApplicationStatus }): Promise<ApplicationRecord[]>;
  get(id: string): Promise<ApplicationRecord | null>;
  updateStatus(id: string, status: ApplicationStatus, notes?: string): Promise<ApplicationRecord>;
}

const DATA_DIR = path.join(process.cwd(), '.data');
const DATA_FILE = path.join(DATA_DIR, 'applications.json');

async function ensureFile(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(DATA_FILE);
  } catch {
    await fs.writeFile(DATA_FILE, '[]', 'utf8');
  }
}

async function readAll(): Promise<ApplicationRecord[]> {
  await ensureFile();
  const raw = await fs.readFile(DATA_FILE, 'utf8');
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ApplicationRecord[]) : [];
  } catch {
    return [];
  }
}

async function writeAll(records: ApplicationRecord[]): Promise<void> {
  await ensureFile();
  await fs.writeFile(DATA_FILE, JSON.stringify(records, null, 2), 'utf8');
}

function genId(): string {
  // ULID-like, lexicographic-sortable enough for admin queue ordering.
  const ts = Date.now().toString(36);
  const r = Math.random().toString(36).slice(2, 10);
  return `as_${ts}_${r}`;
}

class JsonFileStore implements ApplicationStore {
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
    await writeAll(records);
    return record;
  }

  async list(filter?: { status?: ApplicationStatus }): Promise<ApplicationRecord[]> {
    const records = await readAll();
    const filtered = filter?.status ? records.filter((r) => r.status === filter.status) : records;
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

class HybridStore implements ApplicationStore {
  private get activeStore(): ApplicationStore {
    return isKvAvailable() ? kvStore : new JsonFileStore();
  }

  create(input: CreateApplicationInput) {
    return this.activeStore.create(input);
  }
  list(filter?: { status?: ApplicationStatus }) {
    return this.activeStore.list(filter);
  }
  get(id: string) {
    return this.activeStore.get(id);
  }
  updateStatus(id: string, status: ApplicationStatus, notes?: string) {
    return this.activeStore.updateStatus(id, status, notes);
  }
}

// Module-level singleton — KV on Cloudflare, JSON file elsewhere.
// Swap the implementation when Prisma / D1 lands.
export const store: ApplicationStore = new HybridStore();
