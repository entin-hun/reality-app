/**
 * Tiny audit-log helper.
 *
 * Append-only ring buffer in APPLICATIONS_KV at the `audit:log` key.
 * Keeps the last `MAX_ENTRIES` events. Each entry is JSON-serialised:
 *
 *   { id, at, actor, action, target, meta? }
 *
 * Reads happen from the `/dashboard/audit-logs` page (server component).
 * Writes happen inside admin API routes (CmsKind CRUD, vote lifecycle).
 *
 * No fallback file store: if KV isn't bound (local dev on Node), `record`
 * silently no-ops. That's safe -- the local dev audit just shows nothing
 * instead of faking data.
 */

import { getCloudflareContext } from '@opennextjs/cloudflare';

export interface AuditEntry {
  id: string;
  at: string; // ISO timestamp
  actor: string; // email or "anonymous"
  action: string; // "cms.create", "vote.open", "vote.close", ...
  target: string; // "/events", "vote:xyz", id, etc.
  meta?: Record<string, unknown>;
}

interface AuthKvLike {
  get(key: string): Promise<string | null>;
  put(key: string, value: string): Promise<void>;
}

const KV_KEY = 'audit:log';
const MAX_ENTRIES = 500;

function getKv(): AuthKvLike | null {
  try {
    const { env } = getCloudflareContext();
    if ((env as any)?.APPLICATIONS_KV) return (env as any).APPLICATIONS_KV;
  } catch {}
  if (typeof process !== 'undefined' && process.env && (process.env as any).APPLICATIONS_KV) {
    return (process.env as any).APPLICATIONS_KV;
  }
  if (typeof globalThis !== 'undefined' && (globalThis as any).__env__?.APPLICATIONS_KV) {
    return (globalThis as any).__env__.APPLICATIONS_KV;
  }
  return null;
}

function genId(): string {
  return `audit_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Best-effort append. Returns true if recorded, false if KV unavailable.
 * Callers should NOT block on this; failures are silent by design.
 */
export async function recordAudit(
  partial: Omit<AuditEntry, 'id' | 'at'> & { at?: string }
): Promise<boolean> {
  const kv = getKv();
  if (!kv) return false;
  const entry: AuditEntry = {
    id: genId(),
    at: partial.at ?? new Date().toISOString(),
    actor: partial.actor || 'anonymous',
    action: partial.action,
    target: partial.target,
    meta: partial.meta,
  };
  try {
    const raw = await kv.get(KV_KEY);
    const arr: AuditEntry[] = raw ? (JSON.parse(raw) as AuditEntry[]) : [];
    arr.push(entry);
    if (arr.length > MAX_ENTRIES) arr.splice(0, arr.length - MAX_ENTRIES);
    await kv.put(KV_KEY, JSON.stringify(arr));
    return true;
  } catch {
    return false;
  }
}

/** Read the most-recent N entries (newest first). */
export async function listAudit(limit = 200): Promise<AuditEntry[]> {
  const kv = getKv();
  if (!kv) return [];
  try {
    const raw = await kv.get(KV_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as AuditEntry[];
    return arr.slice(-limit).reverse();
  } catch {
    return [];
  }
}

/** Total count (for badges / UI). */
export async function countAudit(): Promise<number> {
  const kv = getKv();
  if (!kv) return 0;
  try {
    const raw = await kv.get(KV_KEY);
    if (!raw) return 0;
    const arr = JSON.parse(raw) as AuditEntry[];
    return arr.length;
  } catch {
    return 0;
  }
}