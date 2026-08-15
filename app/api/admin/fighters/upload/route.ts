/**
 * POST /api/dashboard/fighters/upload
 *
 * Multipart photo upload. Accepts a single `file` field, writes the
 * binary to `public/uploads/fighters/<slug>-<timestamp>.<ext>` and
 * returns the public URL.
 *
 * Auth: ADMIN_ROLES.
 * Production swap: replace fs write with S3/R2 — same return shape.
 */

import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { requireFighterAdmin } from '@/lib/auth/admin';
import { slugify } from '@/lib/fighters';

export const runtime = 'nodejs';

const MAX_BYTES = 4 * 1024 * 1024; // 4MB — matches admin.hint
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);
const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export async function POST(req: NextRequest) {
  const guard = await requireFighterAdmin();
  if (!guard.ok) {
    return NextResponse.json(
      { ok: false, reason: guard.reason },
      { status: guard.reason === 'unauthenticated' ? 401 : 403 },
    );
  }

  const fd = await req.formData();
  const file = fd.get('file');
  const slugHint = (fd.get('slug') ?? '').toString();
  if (!(file instanceof File)) {
    return NextResponse.json(
      { ok: false, error: 'no_file' },
      { status: 400 },
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { ok: false, error: 'too_large', max: MAX_BYTES },
      { status: 413 },
    );
  }
  if (!ALLOWED_MIME.has(file.type)) {
    return NextResponse.json(
      { ok: false, error: 'unsupported_mime', mime: file.type },
      { status: 415 },
    );
  }

  const ext = EXT_BY_MIME[file.type];
  const slugPart = slugify(slugHint || 'harcos');
  const filename = `${slugPart}-${Date.now()}.${ext}`;
  const dir = path.join(process.cwd(), 'public', 'uploads', 'fighters');
  await fs.mkdir(dir, { recursive: true });
  const filepath = path.join(dir, filename);
  const buf = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(filepath, buf);

  const url = `/uploads/fighters/${filename}`;
  return NextResponse.json({ ok: true, url, bytes: buf.length });
}
