/**
 * Auth-gated — cast a vote.
 *
 *   POST /api/vote/cast
 *     body: { voteId: string, optionId: string }
 *
 * Auth: any staff role (chat audience). One vote per email per voteId.
 * Returns the snapshot tally so the UI can show the running count.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole, STAFF_ROLES } from '@/lib/auth/dev-role';
import {
  castBallot,
  getCurrentVote,
  hasVoted,
} from '@/lib/stream-chat';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const guard = await requireRole(STAFF_ROLES);
  if (!guard.ok) {
    return NextResponse.json(
      { ok: false, reason: guard.reason },
      { status: guard.reason === 'unauthenticated' ? 401 : 403 }
    );
  }
  if (!guard.email) {
    return NextResponse.json(
      { ok: false, reason: 'no-email' },
      { status: 400 }
    );
  }

  let body: { voteId?: unknown; optionId?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, reason: 'bad-json' }, { status: 400 });
  }
  if (typeof body.voteId !== 'string' || !body.voteId) {
    return NextResponse.json(
      { ok: false, reason: 'missing-voteId' },
      { status: 400 }
    );
  }
  if (typeof body.optionId !== 'string' || !body.optionId) {
    return NextResponse.json(
      { ok: false, reason: 'missing-optionId' },
      { status: 400 }
    );
  }

  const vote = await getCurrentVote();
  if (!vote || vote.id !== body.voteId) {
    return NextResponse.json(
      { ok: false, reason: 'no-vote' },
      { status: 404 }
    );
  }

  if (await hasVoted(vote.id, guard.email)) {
    return NextResponse.json(
      { ok: false, reason: 'already-voted', vote },
      { status: 409 }
    );
  }

  const result = await castBallot(vote.id, guard.email, body.optionId);
  if (!result.ok) {
    const status =
      result.reason === 'closed'
        ? 409
        : result.reason === 'unknown-option'
        ? 400
        : result.reason === 'duplicate'
        ? 409
        : 400;
    return NextResponse.json(
      { ok: false, reason: result.reason, vote: result.vote },
      { status }
    );
  }

  return NextResponse.json({
    ok: true,
    vote: result.vote,
    tally: result.tally,
  });
}
