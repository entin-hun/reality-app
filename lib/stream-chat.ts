/**
 * Live chat + voting — KV-backed.
 *
 * Implements the Phase II 2.6 acceptance gap: viewers submit chat messages
 * during a broadcast; admins mark messages as vote options during an
 * active vote window; logged-in viewers cast one vote per vote id.
 *
 * Storage (all in AUTH_KV):
 *   streams:chat:status   → JSON { enabled: boolean }
 *   streams:chat:messages → JSON ChatMessage[] (capped at MAX_MESSAGES,
 *                           FIFO eviction). The whole array is rewritten on
 *                           every write — fine for a 200-item cap and a
 *                           tight broadcast (peak ~10 writes/min).
 *   streams:vote:current  → JSON Vote | null — the active vote. Only one
 *                           vote is open at a time; opening a new vote
 *                           replaces this key.
 *   streams:vote:<id>:ballots → JSON Array<{ optionId, email, ts }> —
 *                           one record per cast vote; dedup by email.
 *
 * Auth: messages require any staff role (the chat is only visible to
 * logged-in staff — same audience as the dashboard). Vote-casting
 * requires the same; opening/closing/marking requires Producer or
 * Rendszeradminisztrator (the same gate as stream CRUD).
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
    const kv = env?.AUTH_KV;
    if (kv && typeof (kv as KvBinding).get === 'function') {
      return kv as KvBinding;
    }
  } catch {}
  if (typeof process !== 'undefined' && process.env) {
    const v = (process.env as unknown as Record<string, unknown>).AUTH_KV;
    if (v && typeof (v as KvBinding).get === 'function') return v as KvBinding;
  }
  if (typeof globalThis !== 'undefined') {
    const g = globalThis as unknown as { __env__?: Record<string, unknown> };
    const v = g.__env__?.AUTH_KV;
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
  if (!kv) throw new Error('AUTH_KV binding is not available');
  await kv.put(key, value);
}

async function kvDel(key: string): Promise<void> {
  const kv = getKv();
  if (!kv) throw new Error('AUTH_KV binding is not available');
  await kv.delete(key);
}

// ─────────────────────────────────────────────────────────────────────────
// Chat
// ─────────────────────────────────────────────────────────────────────────

export interface ChatMessage {
  id: string;
  /** Email of the poster. Used for badge colour, vote dedup, and soft
   *  moderation. Not displayed if `hidden`. */
  email: string;
  /** Display name — the email local-part, lowercased (no PII). */
  userName: string;
  /** Role at the time of posting (for the badge colour). */
  userRole: string;
  text: string;
  createdAt: number; // epoch ms
  /** True when a moderator/admin marked the message as inappropriate. */
  hidden?: boolean;
  /** When an admin promoted this message as a vote option. */
  voteOption?: {
    voteId: string;
    optionId: string;
    label: string;
  };
}

const KV_CHAT_STATUS = 'streams:chat:status';
const KV_CHAT_MESSAGES = 'streams:chat:messages';
const MAX_MESSAGES = 200;

export interface ChatStatus {
  enabled: boolean;
}

export async function getChatStatus(): Promise<ChatStatus> {
  const raw = await kvGet(KV_CHAT_STATUS);
  if (!raw) return { enabled: true }; // default ON
  try {
    const parsed = JSON.parse(raw) as Partial<ChatStatus>;
    return { enabled: parsed.enabled !== false };
  } catch {
    return { enabled: true };
  }
}

export async function setChatStatus(status: ChatStatus): Promise<void> {
  await kvPut(KV_CHAT_STATUS, JSON.stringify(status));
}

export async function getChatMessages(): Promise<ChatMessage[]> {
  const raw = await kvGet(KV_CHAT_MESSAGES);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ChatMessage[]) : [];
  } catch {
    return [];
  }
}

/**
 * Append a new message. Evicts the oldest entries once the cap is reached
 * so the KV value stays small and the read path stays O(n).
 */
export async function appendChatMessage(msg: ChatMessage): Promise<ChatMessage[]> {
  const existing = await getChatMessages();
  const next = [...existing, msg];
  while (next.length > MAX_MESSAGES) next.shift();
  await kvPut(KV_CHAT_MESSAGES, JSON.stringify(next));
  return next;
}

export async function updateChatMessage(
  id: string,
  patch: Partial<Pick<ChatMessage, 'hidden' | 'voteOption'>>
): Promise<ChatMessage | null> {
  const existing = await getChatMessages();
  const idx = existing.findIndex((m) => m.id === id);
  if (idx < 0) return null;
  const merged: ChatMessage = { ...existing[idx], ...patch };
  existing[idx] = merged;
  await kvPut(KV_CHAT_MESSAGES, JSON.stringify(existing));
  return merged;
}

export async function clearChat(): Promise<void> {
  await kvDel(KV_CHAT_MESSAGES);
}

// ─────────────────────────────────────────────────────────────────────────
// Votes
// ─────────────────────────────────────────────────────────────────────────

export interface VoteOption {
  id: string;
  label: string;
  /** Optional link back to the chat message that seeded this option. */
  messageId?: string;
}

export interface Vote {
  id: string;
  question: string;
  options: VoteOption[];
  openedAt: number; // epoch ms
  closesAt: number; // epoch ms
  status: 'open' | 'closed';
  /** When closed, the close-time tally snapshot — kept so the UI can
   *  reveal results after the window without re-counting ballots. */
  results?: Array<{ optionId: string; count: number }>;
}

const KV_VOTE_CURRENT = 'streams:vote:current';

export async function getCurrentVote(): Promise<Vote | null> {
  const raw = await kvGet(KV_VOTE_CURRENT);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Vote;
    // Auto-flip to 'closed' if closesAt has elapsed — the UI can still
    // read results from the same record.
    if (parsed.status === 'open' && parsed.closesAt <= Date.now()) {
      parsed.status = 'closed';
      await kvPut(KV_VOTE_CURRENT, JSON.stringify(parsed));
    }
    return parsed;
  } catch {
    return null;
  }
}

export async function setCurrentVote(vote: Vote | null): Promise<void> {
  if (vote === null) {
    // Snapshot the previous current vote into history before clearing it.
    const prev = await getCurrentVote();
    if (prev) await archiveVote(prev);
    await kvDel(KV_VOTE_CURRENT);
    return;
  }
  // If we're replacing an existing current vote, archive the previous one
  // so the operator can still browse it on /dashboard/votes.
  const prev = await getCurrentVote();
  if (prev && prev.id !== vote.id) await archiveVote(prev);
  await kvPut(KV_VOTE_CURRENT, JSON.stringify(vote));
}

/**
 * Append an option to an open vote. If the vote is closed or missing, the
 * call is a no-op and we return null. If `replace` is true (default) we
 * refresh the vote record in KV with the merged options.
 */
export async function addVoteOption(
  voteId: string,
  option: VoteOption
): Promise<Vote | null> {
  const current = await getCurrentVote();
  if (!current || current.id !== voteId) return null;
  if (current.status !== 'open') return null;
  if (current.closesAt <= Date.now()) return null;
  // Dedupe by id.
  if (current.options.some((o) => o.id === option.id)) {
    return current;
  }
  const next: Vote = {
    ...current,
    options: [...current.options, option],
  };
  await setCurrentVote(next);
  return next;
}

// ─────────────────────────────────────────────────────────────────────────
// Ballots (one vote per user per vote id)
// ─────────────────────────────────────────────────────────────────────────

interface Ballot {
  optionId: string;
  email: string;
  ts: number;
}

function ballotKey(voteId: string): string {
  return `streams:vote:${voteId}:ballots`;
}

export async function getBallots(voteId: string): Promise<Ballot[]> {
  const raw = await kvGet(ballotKey(voteId));
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Ballot[]) : [];
  } catch {
    return [];
  }
}

export interface CastResult {
  ok: boolean;
  reason?: 'closed' | 'duplicate' | 'unknown-option' | 'no-vote';
  vote?: Vote;
  tally?: Record<string, number>;
}

/**
 * Record a ballot. Rejects duplicates for the same email within the same
 * vote id. Closes the vote (writes a final tally) when closesAt has
 * elapsed — the next caller gets `reason: 'closed'`.
 */
export async function castBallot(
  voteId: string,
  email: string,
  optionId: string
): Promise<CastResult> {
  const vote = await getCurrentVote();
  if (!vote || vote.id !== voteId) {
    return { ok: false, reason: 'no-vote' };
  }
  if (vote.status !== 'open' || vote.closesAt <= Date.now()) {
    return { ok: false, reason: 'closed', vote };
  }
  if (!vote.options.some((o) => o.id === optionId)) {
    return { ok: false, reason: 'unknown-option' };
  }
  const ballots = await getBallots(voteId);
  if (ballots.some((b) => b.email === email)) {
    return { ok: false, reason: 'duplicate', vote };
  }
  ballots.push({ optionId, email, ts: Date.now() });
  await kvPut(ballotKey(voteId), JSON.stringify(ballots));
  // Build a fresh tally on each cast — kept on the vote record so the
  // close path doesn't have to re-read ballots.
  const tally: Record<string, number> = {};
  for (const o of vote.options) tally[o.id] = 0;
  for (const b of ballots) {
    if (tally[b.optionId] !== undefined) tally[b.optionId] += 1;
  }
  return { ok: true, vote, tally };
}

/**
 * Close a vote, snapshot its tally, and write it back. The vote record
 * stays in KV so viewers can see the final result.
 */
export async function closeVote(voteId: string): Promise<Vote | null> {
  const vote = await getCurrentVote();
  if (!vote || vote.id !== voteId) return null;
  if (vote.status === 'closed') {
    // Already closed — but make sure it's in history.
    await archiveVote(vote);
    return vote;
  }
  const ballots = await getBallots(voteId);
  const tally: Record<string, number> = {};
  for (const o of vote.options) tally[o.id] = 0;
  for (const b of ballots) {
    if (tally[b.optionId] !== undefined) tally[b.optionId] += 1;
  }
  const results = vote.options.map((o) => ({
    optionId: o.id,
    count: tally[o.id] ?? 0,
  }));
  const closed: Vote = { ...vote, status: 'closed', results };
  await setCurrentVote(closed);
  await archiveVote(closed);
  return closed;
}

/** Compute the current tally without mutating the vote record. */
export async function getTally(voteId: string): Promise<Record<string, number>> {
  const vote = await getCurrentVote();
  const tally: Record<string, number> = {};
  if (!vote || vote.id !== voteId) return tally;
  for (const o of vote.options) tally[o.id] = 0;
  const ballots = await getBallots(voteId);
  for (const b of ballots) {
    if (tally[b.optionId] !== undefined) tally[b.optionId] += 1;
  }
  return tally;
}

/** Whether the email has already voted on this vote. */
export async function hasVoted(voteId: string, email: string): Promise<boolean> {
  const ballots = await getBallots(voteId);
  return ballots.some((b) => b.email === email);
}

// ─────────────────────────────────────────────────────────────────────────
// Vote history (archive of every vote — even after it's been replaced)
// ─────────────────────────────────────────────────────────────────────────

const KV_VOTE_HISTORY = 'streams:vote:history';

/**
 * Snapshot a vote into the history index. Called automatically when a
 * vote is replaced (so the previous vote is preserved) or closed.
 *
 * History entries are immutable — re-saving a vote overwrites its row,
 * so callers should only archive votes that are no longer "current".
 */
export async function archiveVote(vote: Vote): Promise<void> {
  const raw = await kvGet(KV_VOTE_HISTORY);
  let list: Vote[] = [];
  try {
    const parsed = raw ? JSON.parse(raw) : [];
    if (Array.isArray(parsed)) list = parsed as Vote[];
  } catch {
    list = [];
  }
  const idx = list.findIndex((v) => v.id === vote.id);
  if (idx >= 0) list[idx] = vote;
  else list.unshift(vote);
  await kvPut(KV_VOTE_HISTORY, JSON.stringify(list));
}

/** Return every archived vote, newest first. Includes the current vote
 *  if it isn't already archived. */
export async function listVotes(): Promise<Vote[]> {
  const raw = await kvGet(KV_VOTE_HISTORY);
  let list: Vote[] = [];
  try {
    const parsed = raw ? JSON.parse(raw) : [];
    if (Array.isArray(parsed)) list = parsed as Vote[];
  } catch {
    list = [];
  }
  // Ensure the current vote is part of the list (it might be a vote that
  // is open right now and hasn't been archived yet).
  const current = await getCurrentVote();
  if (current && !list.find((v) => v.id === current.id)) {
    list.unshift(current);
  }
  return list;
}

/** Drop a vote from history. Current vote cannot be deleted — first close
 *  it. Returns true if a history row was removed. */
export async function deleteVote(voteId: string): Promise<boolean> {
  const raw = await kvGet(KV_VOTE_HISTORY);
  let list: Vote[] = [];
  try {
    const parsed = raw ? JSON.parse(raw) : [];
    if (Array.isArray(parsed)) list = parsed as Vote[];
  } catch {
    list = [];
  }
  const next = list.filter((v) => v.id !== voteId);
  if (next.length === list.length) return false;
  await kvPut(KV_VOTE_HISTORY, JSON.stringify(next));
  return true;
}

/** Hard-reset vote history — only used by tests/admin tooling. */
export async function clearVoteHistory(): Promise<void> {
  await kvDel(KV_VOTE_HISTORY);
}

// ─────────────────────────────────────────────────────────────────────────
// Helpers shared by API routes
// ─────────────────────────────────────────────────────────────────────────

/** Cheap, unique-enough id: timestamp + random suffix (base36). */
export function newId(prefix: string = 'm'): string {
  const r = crypto.getRandomValues(new Uint8Array(6));
  let s = '';
  for (const b of r) s += b.toString(36).padStart(2, '0');
  return `${prefix}_${Date.now().toString(36)}_${s}`;
}

/**
 * Derive a stable display name from an email: take the local-part, drop
 * everything after the first `+` (sub-addressing), and lowercase.
 * Falls back to 'anonymous' if no `@`.
 */
export function deriveDisplayName(email: string): string {
  if (!email) return 'anonymous';
  const at = email.indexOf('@');
  if (at <= 0) return 'anonymous';
  const local = email.slice(0, at).split('+')[0].toLowerCase();
  return local || 'anonymous';
}
