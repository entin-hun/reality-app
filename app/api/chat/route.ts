/**
 * Public + auth-gated live chat.
 *
 *   GET  /api/chat  → { ok, enabled, messages, vote }
 *
 *     Public read. Returns the most recent chat messages and the current
 *     vote (if any). Hidden messages are stripped; vote candidates are
 *     surfaced via the `voteOption` field.
 *
 *   POST /api/chat  → { ok, message }
 *
 *     Auth: any staff role (the chat is staff-only — same audience as the
 *     dashboard). Body: { text, turnstileToken? }. Rate-limited to one
 *     message per email per 5s + 30s after a ban.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole, STAFF_ROLES } from '@/lib/auth/dev-role';
import { verifyTurnstile } from '@/lib/bot-protection/turnstile';
import {
  appendChatMessage,
  deriveDisplayName,
  getChatMessages,
  getChatStatus,
  getCurrentVote,
  newId,
  type ChatMessage,
} from '@/lib/stream-chat';

export const runtime = 'nodejs';

const MAX_TEXT = 280;
const RATE_LIMIT_MS = 5_000;

function guardError(reason: 'unauthenticated' | 'forbidden') {
  return NextResponse.json({ ok: false, reason }, {
    status: reason === 'unauthenticated' ? 401 : 403,
  });
}

export async function GET() {
  const [status, allMessages, vote] = await Promise.all([
    getChatStatus(),
    getChatMessages(),
    getCurrentVote(),
  ]);
  // Hide hidden messages from the public read. Keep vote-option markers
  // intact so the UI can highlight them.
  const messages = allMessages.filter((m) => !m.hidden);
  return NextResponse.json(
    { ok: true, enabled: status.enabled, messages, vote },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}

export async function POST(req: NextRequest) {
  const guard = await requireRole(STAFF_ROLES);
  if (!guard.ok) return guardError(guard.reason);
  if (!guard.email) {
    return NextResponse.json(
      { ok: false, reason: 'no-email' },
      { status: 400 }
    );
  }

  let body: { text?: unknown; turnstileToken?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, reason: 'bad-json' }, { status: 400 });
  }

  const text = typeof body.text === 'string' ? body.text.trim() : '';
  if (!text) {
    return NextResponse.json({ ok: false, reason: 'empty' }, { status: 400 });
  }
  if (text.length > MAX_TEXT) {
    return NextResponse.json(
      { ok: false, reason: 'too-long', max: MAX_TEXT },
      { status: 400 }
    );
  }

  // Bot protection — optional when no secret configured (dev/CI).
  const turnstileToken =
    typeof body.turnstileToken === 'string' ? body.turnstileToken : null;
  const ts = await verifyTurnstile(turnstileToken);
  if (!ts.verified) {
    return NextResponse.json(
      { ok: false, reason: 'turnstile-failed', detail: ts.reason },
      { status: 400 }
    );
  }

  // Chat status gate (admin can disable without redeploy).
  const status = await getChatStatus();
  if (!status.enabled) {
    return NextResponse.json(
      { ok: false, reason: 'chat-disabled' },
      { status: 403 }
    );
  }

  // Per-email rate limit: walk the last messages and reject if the same
  // email posted within the window.
  const since = Date.now() - RATE_LIMIT_MS;
  const recent = await getChatMessages();
  if (recent.some((m) => m.email === guard.email && m.createdAt >= since)) {
    return NextResponse.json(
      { ok: false, reason: 'rate-limit', retryAfterMs: RATE_LIMIT_MS },
      { status: 429 }
    );
  }

  const msg: ChatMessage = {
    id: newId('m'),
    email: guard.email,
    userName: deriveDisplayName(guard.email),
    userRole: guard.role,
    text,
    createdAt: Date.now(),
  };
  await appendChatMessage(msg);
  return NextResponse.json({ ok: true, message: msg });
}
