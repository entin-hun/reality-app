import { NextRequest, NextResponse } from 'next/server';
import {
  validate,
  isOk,
  type ApplicationFormInput,
} from '@/lib/validation';
import { store, type ApplicationRecord } from '@/lib/db';
import { verifyTurnstile, hashIp } from '@/lib/bot-protection/turnstile';
import { email, ADMIN_EMAIL, FROM_EMAIL } from '@/lib/email';

export const runtime = 'nodejs'; // need fs for JSON store; swap to edge when Prisma lands

interface IncomingPayload extends ApplicationFormInput {
  locale?: string;
  turnstileToken?: string | null;
}

/**
 * POST /api/applications
 *
 * - Re-runs the shared validator (server is source of truth).
 * - Verifies Turnstile (skip when secret absent in dev; accepts dummy fail-token).
 * - Persists via the pluggable ApplicationStore.
 * - Sends two emails: admin notification + applicant auto-reply.
 * - Returns { ok, id } on success or { ok:false, errors, message } on failure.
 */
export async function POST(request: NextRequest) {
  let body: IncomingPayload;
  try {
    body = (await request.json()) as IncomingPayload;
  } catch {
    return NextResponse.json(
      { ok: false, message: 'Invalid JSON body' },
      { status: 400 }
    );
  }

  const errors = validate(body);
  if (!isOk(errors)) {
    return NextResponse.json(
      { ok: false, errors, message: 'validation_failed' },
      { status: 422 }
    );
  }

  // Anti-bot layer.
  const ts = await verifyTurnstile(body.turnstileToken);
  if (!ts.verified) {
    return NextResponse.json(
      {
        ok: false,
        errors: [
          {
            field: 'videoOrSocialUrl', // arbitrary; client surfaces summary only
            code: 'invalid_video_url',
            message: 'turnstile_failed',
          },
        ],
        message: 'turnstile_failed',
        reason: ts.reason,
      },
      { status: 403 }
    );
  }

  // GDPR consent must be true (validator enforces it, double-check here).
  if (body.gdprConsent !== true) {
    return NextResponse.json(
      { ok: false, message: 'gdpr_consent_required' },
      { status: 422 }
    );
  }

  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    '0.0.0.0';
  const ipHash = await hashIp(ip);
  const userAgent = request.headers.get('user-agent') ?? undefined;

  let record: ApplicationRecord;
  try {
    record = await store.create({
      locale: body.locale ?? 'hu',
      name: body.name.trim(),
      age: Number(body.age),
      city: body.city.trim(),
      testSuly: body.testSuly,
      sportMult: body.sportMult.trim(),
      motivation: body.motivation.trim(),
      videoOrSocialUrl: body.videoOrSocialUrl.trim(),
      email: body.email.trim(),
      phone: body.phone.trim(),
      contact: `${body.email.trim()} | ${body.phone.trim()}`,
      gdprConsent: true,
      gdprConsentAt: new Date().toISOString(),
      ipHash,
      userAgent,
      honeypotTriggered: false,
      turnstileVerified: true,
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, message: 'persistence_failed', detail: (err as Error).message },
      { status: 500 }
    );
  }

  // Fire-and-await the notifications so the operator sees failures in logs.
  // In production, move these to a background queue.
  const contactKind = /@/.test(record.contact) ? 'email' : 'phone';
  try {
    await email.send({
      to: ADMIN_EMAIL,
      from: FROM_EMAIL,
      subject: `[EFU] Új harcos-jelentkezés: ${record.name} (${record.city})`,
      category: 'admin-notification',
      relatedApplicationId: record.id,
      text: [
        `Új jelentkezés érkezett az EFU reality-be.`,
        ``,
        `Név: ${record.name}`,
        `Kor: ${record.age}`,
        `Város: ${record.city}`,
        `Testsúly kategória: ${record.testSuly}`,
        `Sportmúlt: ${record.sportMult}`,
        `Elérhetőség (${contactKind}): ${record.contact}`,
        `Videó / social: ${record.videoOrSocialUrl}`,
        ``,
        `Motiváció:`,
        record.motivation,
        ``,
        `Locale: ${record.locale}`,
        `IP-hash: ${record.ipHash ?? '-'}`,
        `ID: ${record.id}`,
      ].join('\n'),
    });

    if (contactKind === 'email') {
      await email.send({
        to: record.contact,
        from: FROM_EMAIL,
        subject: 'Köszönjük a jelentkezésedet az EFU Reality-be',
        category: 'auto-reply',
        relatedApplicationId: record.id,
        text: [
          `Szia ${record.name}!`,
          ``,
          'Köszönjük, hogy jelentkeztél az Elite Fight Universe (EFU) Reality 2026-os szezonjába.',
          'Csapatunk a héten átnézi a pályázatodat, és hamarosan jelentkezünk a részletekért.',
          ``,
          'Hajrá,',
          'EFU csapat',
          '',
          '— referencia: ' + record.id,
        ].join('\n'),
      });
    }
  } catch (err) {
    // Persisted but emails failed — surface for retry but do not lose the submission.
    // eslint-disable-next-line no-console
    console.error('[applications] email_outbound_failed', err);
  }

  return NextResponse.json({ ok: true, id: record.id }, { status: 201 });
}

/**
 * GET /api/applications — list (admin only).
 * Mirrors the GET behavior used by the admin queue page, so curl tests work.
 */
export async function GET(request: NextRequest) {
  const c = request.cookies.get('efu_role')?.value;
  if (
    c !== 'Rendszeradminisztrator' &&
    c !== 'Producer' &&
    c !== 'Reality szerkeszto'
  ) {
    return NextResponse.json({ ok: false, message: 'forbidden' }, { status: 403 });
  }
  const status = request.nextUrl.searchParams.get('status');
  const list = await store.list(
    status ? { status: status as 'new' | 'contacted' | 'approved' | 'rejected' } : undefined
  );
  return NextResponse.json({ ok: true, items: list });
}
