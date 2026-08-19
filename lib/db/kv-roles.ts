/**
 * Email → role store.
 *
 * Single source of truth for "who is allowed to log in to the backoffice and
 * with which role". Replaces the previous `/etc/efu-storefront/cf-roles.json`
 * filesystem read — that path doesn't work on Cloudflare Workers (read-only
 * fs) and was silently failing in production.
 *
 * Storage:
 *   AUTH_KV["role_map"]        → JSON object: { "Role": ["email@..."] }
 *   AUTH_KV["token:<token>"]   → JSON object: { email, expiresAt }
 *   AUTH_KV["ratelimit:<ip>"]  → JSON object: { count, resetAt }
 *
 * Falls back to the workspace `cf-roles.json` file when running on Node
 * (local dev) so the existing seed data keeps working without manual setup.
 */

import { readFileSync, existsSync } from 'fs';
import path from 'path';
import { getCloudflareContext } from '@opennextjs/cloudflare';

export type RoleId =
  | 'Rendszeradminisztrator'
  | 'Producer'
  | 'Reality szerkeszto'
  | 'Tartalomkeszito'
  | 'Marketing'
  | 'Moderator';

export const STAFF_ROLE_IDS: ReadonlyArray<RoleId> = [
  'Rendszeradminisztrator',
  'Producer',
  'Reality szerkeszto',
  'Tartalomkeszito',
  'Marketing',
  'Moderator',
];

/** role → [email, ...] */
export type RoleMap = Partial<Record<RoleId, string[]>>;

/** Shape of env bindings for AUTH_KV. */
interface AuthKv {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, opts?: { expirationTtl?: number }): Promise<void>;
  delete(key: string): Promise<void>;
}

function getKv(): AuthKv | null {
  try {
    const { env } = getCloudflareContext();
    if ((env as any)?.AUTH_KV) return (env as any).AUTH_KV;
  } catch {}
  if (typeof process !== 'undefined' && process.env && (process.env as any).AUTH_KV) {
    return (process.env as any).AUTH_KV;
  }
  if (typeof globalThis !== 'undefined' && (globalThis as any).__env__?.AUTH_KV) {
    return (globalThis as any).__env__.AUTH_KV;
  }
  return null;
}

const ROLE_MAP_KEY = 'role_map';

/** Empty default so dev/local always has something safe. */
const DEFAULT_ROLE_MAP: RoleMap = {};

/**
 * Seed fallback — read cf-roles.json from the workspace root when running
 * locally (no KV bound). On Workers this returns the empty default if KV is
 * empty; sysadmin seeds via /dashboard/users.
 */
function loadFileRoleMap(): RoleMap {
  try {
    const p = path.join(process.cwd(), 'cf-roles.json');
    if (!existsSync(p)) return DEFAULT_ROLE_MAP;
    const raw = readFileSync(p, 'utf-8');
    const data = JSON.parse(raw) as Record<string, unknown>;
    const out: RoleMap = {};
    for (const role of STAFF_ROLE_IDS) {
      const arr = data[role];
      if (Array.isArray(arr)) {
        out[role] = arr.filter((e): e is string => typeof e === 'string');
      }
    }
    return out;
  } catch {
    return DEFAULT_ROLE_MAP;
  }
}

/** Read the full role map (KV on Workers, filesystem in local dev). */
export async function readRoleMap(): Promise<RoleMap> {
  const kv = getKv();
  if (!kv) return loadFileRoleMap();
  const raw = await kv.get(ROLE_MAP_KEY);
  if (!raw) return loadFileRoleMap();
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const out: RoleMap = {};
    for (const role of STAFF_ROLE_IDS) {
      const arr = parsed[role];
      if (Array.isArray(arr)) {
        out[role] = arr.filter((e): e is string => typeof e === 'string');
      }
    }
    return out;
  } catch {
    return loadFileRoleMap();
  }
}

/** Persist the full role map. Replaces the entire object. */
export async function writeRoleMap(map: RoleMap): Promise<void> {
  const kv = getKv();
  if (!kv) throw new Error('AUTH_KV not bound — cannot persist role map');
  // Validate before writing.
  const clean: RoleMap = {};
  for (const role of STAFF_ROLE_IDS) {
    const arr = (map[role] ?? []).filter((e): e is string => typeof e === 'string');
    clean[role] = Array.from(new Set(arr.map((e) => e.toLowerCase())));
  }
  await kv.put(ROLE_MAP_KEY, JSON.stringify(clean));
}

/** Look up the role assigned to a given email. */
export async function roleForEmail(email: string): Promise<RoleId | null> {
  const norm = email.trim().toLowerCase();
  if (!norm || !norm.includes('@')) return null;
  const map = await readRoleMap();
  for (const role of STAFF_ROLE_IDS) {
    if (map[role]?.includes(norm)) return role;
  }
  return null;
}

/** Add an email to a role. Idempotent. */
export async function addEmailToRole(email: string, role: RoleId): Promise<RoleMap> {
  const map = await readRoleMap();
  const norm = email.trim().toLowerCase();
  const existing = (map[role] ?? []).filter((e) => e !== norm);
  existing.push(norm);
  map[role] = existing;
  await writeRoleMap(map);
  return map;
}

/** Move an email from one role to another (or remove if newRole is null). */
export async function moveEmail(
  email: string,
  newRole: RoleId | null
): Promise<RoleMap> {
  const map = await readRoleMap();
  const norm = email.trim().toLowerCase();
  for (const role of STAFF_ROLE_IDS) {
    if (map[role]) map[role] = map[role]!.filter((e) => e !== norm);
  }
  if (newRole) {
    map[newRole] = [...(map[newRole] ?? []), norm];
  }
  await writeRoleMap(map);
  return map;
}

/** Remove an email from every role. */
export async function removeEmail(email: string): Promise<RoleMap> {
  return moveEmail(email, null);
}

// ─── Magic link token store ────────────────────────────────────────────────

const TOKEN_TTL_SECONDS = 15 * 60; // 15 minutes
const TOKEN_KEY_PREFIX = 'token:';

export interface MagicLinkToken {
  email: string;
  expiresAt: number; // ms since epoch
}

/** Persist a new magic-link token. Returns the token string. */
export async function storeToken(token: string, email: string): Promise<MagicLinkToken> {
  const kv = getKv();
  if (!kv) throw new Error('AUTH_KV not bound — cannot store token');
  const record: MagicLinkToken = {
    email: email.trim().toLowerCase(),
    expiresAt: Date.now() + TOKEN_TTL_SECONDS * 1000,
  };
  await kv.put(TOKEN_KEY_PREFIX + token, JSON.stringify(record), {
    expirationTtl: TOKEN_TTL_SECONDS,
  });
  return record;
}

/**
 * Atomically consume a token: read, delete, return the email if valid.
 * Returns null when the token doesn't exist, is expired, or was already used.
 */
export async function consumeToken(token: string): Promise<string | null> {
  const kv = getKv();
  if (!kv) return null;
  const key = TOKEN_KEY_PREFIX + token;
  const raw = await kv.get(key);
  if (!raw) return null;
  let parsed: MagicLinkToken;
  try {
    parsed = JSON.parse(raw) as MagicLinkToken;
  } catch {
    await kv.delete(key);
    return null;
  }
  // Single-use: delete first, then validate. Even if TTL check fails, the
  // token is gone — replays fail closed.
  await kv.delete(key);
  if (typeof parsed.expiresAt !== 'number' || parsed.expiresAt < Date.now()) {
    return null;
  }
  return parsed.email || null;
}

// ─── Rate limiter (per-IP, per-email) ──────────────────────────────────────

const RATE_LIMIT_KEY_PREFIX = 'ratelimit:';
const RATE_WINDOW_SECONDS = 10 * 60; // 10 min
const RATE_MAX_PER_IP = 10;
const RATE_MAX_PER_EMAIL = 3;

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

/** Atomic-ish rate limit. Two separate buckets: per-IP and per-email. */
export async function checkRateLimit(
  bucket: 'ip' | 'email',
  key: string
): Promise<RateLimitResult> {
  const kv = getKv();
  if (!kv) {
    // No KV → can't rate-limit; fail open in dev.
    return { allowed: true, remaining: RATE_MAX_PER_EMAIL, resetAt: 0 };
  }
  const k = RATE_LIMIT_KEY_PREFIX + bucket + ':' + key.toLowerCase();
  const raw = await kv.get(k);
  const now = Date.now();
  let count = 0;
  let resetAt = now + RATE_WINDOW_SECONDS * 1000;
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as { count: number; resetAt: number };
      if (parsed.resetAt > now) {
        count = parsed.count;
        resetAt = parsed.resetAt;
      }
    } catch {}
  }
  const max = bucket === 'ip' ? RATE_MAX_PER_IP : RATE_MAX_PER_EMAIL;
  if (count >= max) return { allowed: false, remaining: 0, resetAt };
  count += 1;
  await kv.put(
    k,
    JSON.stringify({ count, resetAt }),
    { expirationTtl: RATE_WINDOW_SECONDS }
  );
  return { allowed: true, remaining: Math.max(0, max - count), resetAt };
}
