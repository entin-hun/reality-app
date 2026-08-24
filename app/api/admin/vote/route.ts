/**
 * Admin — open / close a live vote.
 *
 *   POST /api/admin/vote
 *     body: { action: 'open', question: string, options?: [{label}],
 *             durationSec?: number }
 *     body: { action: 'close', voteId?: string }
 *
 *   Auth: requireStreamsAdmin() (Rendszeradminisztrator or Producer).
 *
 * - 'open' replaces any existing vote. `options` is optional; if omitted
 *    the vote starts with zero options and admins can mark chat messages
 *    as candidates via /api/admin/chat/mark-for-vote.
 * - 'close' snapshots the tally into the vote record and marks it
 *    closed. The record stays in KV so the UI can render the result.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireStreamsAdmin } from '@/lib/auth/admin-streams';
import {
  closeVote,
  getCurrentVote,
  newId,
  setCurrentVote,
  type Vote,
  type VoteOption,
} from '@/lib/stream-chat';

export const runtime = 'nodejs';

const QUESTION_MAX = 200;
const LABEL_MAX = 140;
const DEFAULT_DURATION_SEC = 120;
const MAX_DURATION_SEC = 60 * 60; // 1h
const MIN_DURATION_SEC = 15;

function guardError(reason: 'unauthenticated' | 'forbidden') {
  return NextResponse.json({ ok: false, reason }, {
    status: reason === 'unauthenticated' ? 401 : 403,
  });
}

export async function POST(req: NextRequest) {
  const guard = await requireStreamsAdmin();
  if (!guard.ok) return guardError(guard.reason);

  let body: {
    action?: unknown;
    question?: unknown;
    options?: unknown;
    durationSec?: unknown;
    voteId?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, reason: 'bad-json' }, { status: 400 });
  }

  if (body.action === 'open') {
    const question =
      typeof body.question === 'string' ? body.question.trim() : '';
    if (!question) {
      return NextResponse.json(
        { ok: false, reason: 'missing-question' },
        { status: 400 }
      );
    }
    if (question.length > QUESTION_MAX) {
      return NextResponse.json(
        { ok: false, reason: 'question-too-long', max: QUESTION_MAX },
        { status: 400 }
      );
    }

    const rawOptions = Array.isArray(body.options) ? body.options : [];
    if (rawOptions.length > 16) {
      return NextResponse.json(
        { ok: false, reason: 'too-many-options', max: 16 },
        { status: 400 }
      );
    }
    const options: VoteOption[] = [];
    for (const o of rawOptions) {
      if (o && typeof o === 'object') {
        const label = String((o as { label?: unknown }).label ?? '').trim();
        if (!label) continue;
        options.push({
          id: newId('opt'),
          label: label.slice(0, LABEL_MAX),
        });
        if (options.length >= 16) break;
      }
    }

    const dur = Number(body.durationSec);
    const durationSec =
      Number.isFinite(dur) && dur > 0
        ? Math.max(MIN_DURATION_SEC, Math.min(MAX_DURATION_SEC, Math.floor(dur)))
        : DEFAULT_DURATION_SEC;

    const now = Date.now();
    const vote: Vote = {
      id: newId('vote'),
      question: question.slice(0, QUESTION_MAX),
      options,
      openedAt: now,
      closesAt: now + durationSec * 1000,
      status: 'open',
    };
    await setCurrentVote(vote);
    return NextResponse.json({ ok: true, vote });
  }

  if (body.action === 'close') {
    const voteId =
      typeof body.voteId === 'string' && body.voteId
        ? body.voteId
        : (await getCurrentVote())?.id ?? null;
    if (!voteId) {
      return NextResponse.json(
        { ok: false, reason: 'no-vote' },
        { status: 404 }
      );
    }
    const closed = await closeVote(voteId);
    if (!closed) {
      return NextResponse.json(
        { ok: false, reason: 'unknown-vote' },
        { status: 404 }
      );
    }
    return NextResponse.json({ ok: true, vote: closed });
  }

  return NextResponse.json(
    { ok: false, reason: 'unknown-action' },
    { status: 400 }
  );
}
