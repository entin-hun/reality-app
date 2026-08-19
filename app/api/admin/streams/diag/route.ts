/**
 * Admin Cloudflare Stream — diagnostic endpoint.
 *
 *   GET /api/admin/streams/diag
 *     → {
 *         ok: true,
 *         configured: true | false,
 *         missing: string[] | undefined,
 *         pinged: true,
 *         status: number,
 *         cfResult: 'success' | 'auth_error' | 'permission_error' | 'not_found' | 'unknown',
 *         cfMessage: string,
 *         sampleErrors: CfApiError[] | undefined,
 *         hint: string,
 *       }
 *
 * Use this when /api/admin/streams/inputs returns 502 — it makes the raw
 * CF Stream API response visible to the admin without exposing the
 * API token to the browser. Auth is still required.
 *
 * Auth: producer/admin via requireStreamsAdmin().
 */

import { NextResponse } from 'next/server';
import { requireStreamsAdmin } from '@/lib/auth/admin-streams';
import {
  isStreamConfigured,
  readEnvVar,
} from '@/lib/cf-stream';

export const runtime = 'nodejs';

interface CfApiError {
  code?: number;
  message?: string;
}

export async function GET() {
  const guard = await requireStreamsAdmin();
  if (!guard.ok) {
    return NextResponse.json({ ok: false, reason: guard.reason }, {
      status: guard.reason === 'unauthenticated' ? 401 : 403,
    });
  }

  const cfg = isStreamConfigured();
  if (!cfg.ok) {
    return NextResponse.json({
      ok: true,
      configured: false,
      missing: cfg.missing,
      hint: `Set the missing secret(s) via: npx wrangler secret put <NAME>. Replace <NAME> with each item in the 'missing' array.`,
    });
  }

  const accountId = readEnvVar('CLOUDFLARE_STREAM_ACCOUNT_ID') ?? '';
  const apiToken = readEnvVar('CLOUDFLARE_STREAM_API_TOKEN') ?? '';

  // Ping the same endpoint the inputs route calls.
  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/live_inputs?per_page=1`;
  let status = 0;
  let body: { success?: boolean; result?: unknown; errors?: CfApiError[] } = {};
  let fetchErr: string | undefined;
  try {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
    });
    status = res.status;
    try {
      body = await res.json();
    } catch {
      /* non-JSON body */
    }
  } catch (e) {
    fetchErr = e instanceof Error ? e.message : String(e);
  }

  // Map common CF error codes to a hint the admin can act on.
  const errors = body.errors ?? [];
  const firstCode = errors[0]?.code;
  let cfResult: 'success' | 'auth_error' | 'permission_error' | 'not_found' | 'unknown' = 'unknown';
  let hint = '';
  if (status >= 200 && status < 300 && body.success) {
    cfResult = 'success';
    hint = 'CF Stream API is reachable and the token has the right permissions.';
  } else if (status === 401 || firstCode === 10000) {
    cfResult = 'auth_error';
    hint = 'The API token is invalid. Re-create it in the Cloudflare dashboard (My Profile → API Tokens) and update CLOUDFLARE_STREAM_API_TOKEN with: npx wrangler secret put CLOUDFLARE_STREAM_API_TOKEN';
  } else if (status === 403 || firstCode === 10001) {
    cfResult = 'permission_error';
    hint = 'The API token is valid but lacks Account.Stream:Edit. Edit the token in the Cloudflare dashboard and add that permission.';
  } else if (status === 404) {
    cfResult = 'not_found';
    hint = `Account ${accountId} not found. Re-check CLOUDFLARE_STREAM_ACCOUNT_ID — it must be a 32-hex account id, NOT the customer subdomain.`;
  } else if (fetchErr) {
    hint = `Network error reaching CF Stream: ${fetchErr}`;
  } else {
    hint = `CF returned ${status} — check the sampleErrors array.`;
  }

  return NextResponse.json({
    ok: true,
    configured: true,
    pinged: true,
    status,
    cfResult,
    cfMessage: errors[0]?.message ?? (fetchErr ?? ''),
    sampleErrors: errors.length > 0 ? errors : undefined,
    hint,
  });
}