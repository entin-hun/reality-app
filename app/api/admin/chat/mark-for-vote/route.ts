/**
 * Admin — promote a chat message as a vote option.
 *
 *   POST /api/admin/chat/mark-for-vote
 *     body: { messageId: string, voteId?: string, label?: string }
 *
 *   Auth: requireStreamsAdmin() (Rendszeradminisztrator or Producer).
 *
 * Behaviour:
 *   - If `voteId` is omitted, the helper looks up the currently-open vote
 *     and adds the option to it.
 *   - `label` defaults to the message text (truncated to 140 chars).
 *   - The chat message gets a `voteOption` field so the UI can render it
 *     as a vote candidate badge.
 *   - Refuses to add to a closed/missing vote (returns 409).
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireStreamsAdmin } from '@/lib/auth/admin-streams';
import {
  addVoteOption,
  getCurrentVote,
  newId,
  updateChatMessage,
} from '@/lib/stream-chat';
import { getChatMessages } from '@/lib/stream-chat';

export const runtime = 'nodejs';

const LABEL_MAX = 140;

function guardError(reason: 'unauthenticated' | 'forbidden') {
  return NextResponse.json({ ok: false, reason }, {
    status: reason === 'unauthenticated' ? 401 : 403,
  });
}

export async function POST(req: NextRequest) {
  const guard = await requireStreamsAdmin();
  if (!guard.ok) return guardError(guard.reason);

  let body: { messageId?: unknown; voteId?: unknown; label?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, reason: 'bad-json' }, { status: 400 });
  }
  if (typeof body.messageId !== 'string' || !body.messageId) {
    return NextResponse.json(
      { ok: false, reason: 'missing-messageId' },
      { status: 400 }
    );
  }

  const messages = await getChatMessages();
  const msg = messages.find((m) => m.id === body.messageId);
  if (!msg) {
    return NextResponse.json(
      { ok: false, reason: 'unknown-message' },
      { status: 404 }
    );
  }

  // Resolve the target vote.
  let voteId = typeof body.voteId === 'string' ? body.voteId : null;
  if (!voteId) {
    const current = await getCurrentVote();
    if (!current || current.status !== 'open') {
      return NextResponse.json(
        { ok: false, reason: 'no-active-vote' },
        { status: 409 }
      );
    }
    voteId = current.id;
  } else {
    const current = await getCurrentVote();
    if (!current || current.id !== voteId) {
      return NextResponse.json(
        { ok: false, reason: 'unknown-vote' },
        { status: 404 }
      );
    }
    if (current.status !== 'open') {
      return NextResponse.json(
        { ok: false, reason: 'vote-closed' },
        { status: 409 }
      );
    }
  }

  const label =
    typeof body.label === 'string' && body.label.trim().length > 0
      ? body.label.trim().slice(0, LABEL_MAX)
      : msg.text.slice(0, LABEL_MAX);

  const optionId = newId('opt');
  const updated = await addVoteOption(voteId, {
    id: optionId,
    label,
    messageId: msg.id,
  });
  if (!updated) {
    return NextResponse.json(
      { ok: false, reason: 'vote-not-mutable' },
      { status: 409 }
    );
  }

  // Tag the chat message so the UI can render it as a vote candidate.
  await updateChatMessage(msg.id, {
    voteOption: { voteId, optionId, label },
  });

  return NextResponse.json({ ok: true, voteId, optionId, vote: updated });
}
