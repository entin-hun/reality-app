/**
 * Email provider — pluggable transport, prod-defaults to Resend.
 *
 * Production: sends via Resend (env.RESEND_API_KEY). The sender address
 *   MUST be in the verified `efutv.eu` domain — change only after
 *   re-verifying in the Resend dashboard.
 * Local dev: when RESEND_API_KEY is not set, writes emails to
 *   `.data/email-outbox.json` for inspection. On Cloudflare Workers the
 *   filesystem path will throw immediately, which is the desired
 *   "fail loud" behaviour — it forces ops to set the secret before
 *   deploying a real environment.
 *
 * Controller code never imports a concrete class. Call `email.send(...)`
 *   and the transport selection happens at module load.
 */

import { promises as fs } from 'fs';
import path from 'path';

export interface OutboundEmail {
  id: string;
  to: string;
  from: string;
  subject: string;
  text: string;
  html?: string;
  sentAt: string;
  category: 'admin-notification' | 'auto-reply';
  relatedApplicationId?: string;
}

export interface EmailProvider {
  send(email: Omit<OutboundEmail, 'id' | 'sentAt'>): Promise<OutboundEmail>;
  /** Admin queue view: returns recent sends (local outbox or Resend API). */
  recent(limit?: number): Promise<OutboundEmail[]>;
}

const OUTBOX_FILE = path.join(process.cwd(), '.data', 'email-outbox.json');
// Default sender uses the verified `efutv.eu` domain in Resend.
// Do NOT switch to a different domain without re-verifying in Resend first.
const FROM = process.env.EMAIL_FROM ?? 'EFU <noreply@efutv.eu>';
// Admin notification recipient — owner of Elite Fight Club Kft.
// The `elitefightuniverse.live` mailbox does not exist (no MX / no inbox);
// notifications were silently dropped. Real company inbox is the Gmail
// address listed in the legal imprint (ÁSZF, Adatkezelés, Impresszum).
const ADMIN = process.env.ADMIN_EMAIL ?? 'elitefightclubkft@gmail.com';

// --- Resend transport -----------------------------------------------------

class ResendEmailProvider implements EmailProvider {
  constructor(private readonly apiKey: string) {}

  async send(email: Omit<OutboundEmail, 'id' | 'sentAt'>): Promise<OutboundEmail> {
    const payload: Record<string, unknown> = {
      from: email.from,
      to: [email.to],
      subject: email.subject,
      text: email.text,
    };
    if (email.html) payload.html = email.html;

    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        // Tag sends so they show up under categories in Resend logs.
        'X-Entity-Relationship-Tag': `category=${email.category}`,
      },
      body: JSON.stringify(payload),
    });

    if (!resp.ok) {
      const detail = await resp.text().catch(() => '<no body>');
      throw new Error(
        `resend_failed status=${resp.status} to=${email.to} subject=${email.subject} body=${detail.slice(0, 512)}`
      );
    }

    const data = (await resp.json().catch(() => ({}))) as { id?: string };
    const record: OutboundEmail = {
      ...email,
      id: data.id ?? `re_${Date.now().toString(36)}`,
      sentAt: new Date().toISOString(),
    };
    // eslint-disable-next-line no-console
    console.log(
      `[email:${record.category}] resend_id=${record.id} -> ${record.to} | subject=${record.subject}`
    );
    return record;
  }

  /** Pull recent sends from Resend's API for the admin queue view. */
  async recent(limit = 50): Promise<OutboundEmail[]> {
    const resp = await fetch(
      `https://api.resend.com/emails?limit=${Math.max(1, Math.min(limit, 100))}`,
      {
        method: 'GET',
        headers: { Authorization: `Bearer ${this.apiKey}` },
      }
    );
    if (!resp.ok) {
      // Fail soft — return empty so the admin page renders without crash.
      return [];
    }
    const json = (await resp.json().catch(() => ({}))) as {
      data?: Array<{
        id: string;
        to?: string[] | string;
        from: string;
        subject: string;
        created_at: string;
      }>;
    };
    return (json.data ?? []).map((row) => ({
      id: row.id,
      // Resend returns `to` as either array-of-strings or string (depending on account).
      to: Array.isArray(row.to) ? row.to.join(', ') : row.to ?? '',
      from: row.from,
      subject: row.subject,
      text: '',
      sentAt: row.created_at,
      category: 'auto-reply',
    }));
  }
}

// --- Local file transport (dev fallback only) ----------------------------

class FileBackedEmailProvider implements EmailProvider {
  async send(email: Omit<OutboundEmail, 'id' | 'sentAt'>): Promise<OutboundEmail> {
    const record: OutboundEmail = {
      ...email,
      id: `em_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
      sentAt: new Date().toISOString(),
    };
    await appendOutbox(record);
    // eslint-disable-next-line no-console
    console.log(
      `[email:${record.category}] file_outbox -> ${record.to} | subject=${record.subject}`
    );
    return record;
  }

  /** Read-only helper used by the admin queue view. */
  async recent(limit = 50): Promise<OutboundEmail[]> {
    await ensureOutbox();
    const raw = await fs.readFile(OUTBOX_FILE, 'utf8');
    const list = JSON.parse(raw) as OutboundEmail[];
    return [...list].sort((a, b) => b.sentAt.localeCompare(a.sentAt)).slice(0, limit);
  }
}

async function ensureOutbox(): Promise<void> {
  await fs.mkdir(path.dirname(OUTBOX_FILE), { recursive: true });
  try {
    await fs.access(OUTBOX_FILE);
  } catch {
    await fs.writeFile(OUTBOX_FILE, '[]', 'utf8');
  }
}

async function appendOutbox(record: OutboundEmail): Promise<void> {
  await ensureOutbox();
  const raw = await fs.readFile(OUTBOX_FILE, 'utf8');
  const list = JSON.parse(raw) as OutboundEmail[];
  list.push(record);
  await fs.writeFile(OUTBOX_FILE, JSON.stringify(list, null, 2), 'utf8');
}

// --- Provider selection ---------------------------------------------------

function selectProvider(): EmailProvider {
  const apiKey = process.env.RESEND_API_KEY;
  if (apiKey && apiKey.length > 0) {
    return new ResendEmailProvider(apiKey);
  }
  // No Resend key: fall back to local outbox. On Workers this will throw on
  // the first send, which is what we want — ops sees it immediately instead
  // of emails silently disappearing.
  return new FileBackedEmailProvider();
}

export const email: EmailProvider = selectProvider();
export const ADMIN_EMAIL = ADMIN;
export const FROM_EMAIL = FROM;

/** Diagnostic helper: which transport is active in this environment. */
export function activeEmailProvider(): 'resend' | 'file' {
  return process.env.RESEND_API_KEY ? 'resend' : 'file';
}
