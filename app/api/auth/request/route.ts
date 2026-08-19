/**
 * POST /api/auth/request
 *
 * Body: { email: string, locale?: string }
 *
 * Behaviour:
 *   - Always rate-limits (per-IP and per-email) before doing anything.
 *   - If the email is in the role map, generates a one-time token, stores
 *     it in AUTH_KV (15 min TTL) and emails the user a magic link.
 *   - If the email is NOT in the role map, we respond 200 with the SAME
 *     "ok" message — we never reveal whether an email is registered.
 *
 * This is the only safe behaviour for login forms: probing whether an
 * email is registered would let attackers enumerate the team.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  roleForEmail,
  storeToken,
  checkRateLimit,
} from '@/lib/db/kv-roles';
import { generateToken, buildMagicLinkUrl } from '@/lib/auth/magic-link';
import { email as mail, FROM_EMAIL } from '@/lib/email';

export const runtime = 'nodejs'; // matches the email + KV access pattern

interface Body {
  email?: string;
  locale?: string;
}

export async function POST(request: NextRequest) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json(
      { ok: false, message: 'invalid_body' },
      { status: 400 }
    );
  }

  const email = (body.email ?? '').trim().toLowerCase();
  if (!email || !email.includes('@') || email.length > 254) {
    // Treat bad inputs as if nothing happened — no information leak.
    return NextResponse.json({ ok: true, message: 'if_eligible_sent' });
  }

  // Per-IP rate limit (covers anonymous flooding).
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    '0.0.0.0';
  const ipLimit = await checkRateLimit('ip', ip);
  if (!ipLimit.allowed) {
    return NextResponse.json(
      { ok: false, message: 'rate_limited' },
      { status: 429 }
    );
  }

  // Per-email rate limit (covers targeted email-bombing).
  const emailLimit = await checkRateLimit('email', email);
  if (!emailLimit.allowed) {
    return NextResponse.json(
      { ok: false, message: 'rate_limited' },
      { status: 429 }
    );
  }

  // Look up role. Always respond 200 — don't leak whether the email is
  // registered. If the email IS registered, send the magic link.
  const role = await roleForEmail(email);

  if (role) {
    const token = generateToken();
    await storeToken(token, email);
    const link = buildMagicLinkUrl(token, body.locale ?? 'hu');

    try {
      await mail.send({
        to: email,
        from: FROM_EMAIL,
        subject: 'EFU Admin — Belépési link',
        category: 'auto-reply',
        text: [
          'Szia!',
          '',
          'Az EFU adminisztrációs felületére való belépéshez kattints az alábbi linkre:',
          '',
          link,
          '',
          'A link 15 percig érvényes, és csak egyszer használható.',
          'Ha nem te kérted, hagyd figyelmen kívül ezt az emailt.',
          '',
          '— EFU',
        ].join('\n'),
      });
    } catch (err) {
      // Loud structured log so ops sees transport failures in real time.
      // Note: we still return the SAME response below — never leak to the
      // requester whether the email was actually sent, to avoid account
      // enumeration and signal "we tried and failed". The token is left
      // valid for 15 minutes, so a retry after Resend recovers will work.
      const message = err instanceof Error ? err.message : String(err);
      const stack = err instanceof Error ? err.stack : undefined;
      // eslint-disable-next-line no-console
      console.error('[auth/request] mail_failed', {
        to: email.replace(/(.{2}).*(@.*)/, '$1***$2'),
        subject: 'EFU Admin — Belépési link',
        provider:
          mail.constructor.name === 'ResendEmailProvider' ? 'resend' : 'file',
        error: message,
        stack,
      });
    }
  } else {
    // Unknown email — log for ops visibility, but don't tell the requester.
    // eslint-disable-next-line no-console
    console.log(
      `[auth/request] unknown_email ip=${ip} email=${email.replace(/(.{2}).*(@.*)/, '$1***$2')}`
    );
  }

  return NextResponse.json({ ok: true, message: 'if_eligible_sent' });
}
