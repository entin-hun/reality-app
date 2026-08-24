/**
 * Admin — chat moderation primitives.
 *
 *   POST /api/admin/chat/moderate
 *     body: { action: 'toggle', enabled: boolean }
 *     body: { action: 'hide', messageId: string, hidden: boolean }
 *
 * Auth: requireStreamsAdmin().
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireStreamsAdmin } from '@/lib/auth/admin-streams';
import {
  setChatStatus,
  updateChatMessage,
} from '@/lib/stream-chat';

export const runtime = 'nodejs';

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
    enabled?: unknown;
    messageId?: unknown;
    hidden?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, reason: 'bad-json' }, { status: 400 });
  }

  if (body.action === 'toggle') {
    const enabled = body.enabled !== false; // default to true when not specified
    await setChatStatus({ enabled });
    return NextResponse.json({ ok: true, enabled });
  }

  if (body.action === 'hide') {
    if (typeof body.messageId !== 'string' || !body.messageId) {
      return NextResponse.json(
        { ok: false, reason: 'missing-messageId' },
        { status: 400 }
      );
    }
    const hidden = body.hidden !== false;
    const updated = await updateChatMessage(body.messageId, { hidden });
    if (!updated) {
      return NextResponse.json(
        { ok: false, reason: 'unknown-message' },
        { status: 404 }
      );
    }
    return NextResponse.json({ ok: true, message: updated });
  }

  return NextResponse.json(
    { ok: false, reason: 'unknown-action' },
    { status: 400 }
  );
}
