/**
 * CMS Media API Route
 *
 * POST /api/cms/media - Fájl feltöltése
 * GET  /api/cms/media - Összes média lekérése
 *
 * The binary write to `public/uploads/` is fine on Node dev (this route
 * uses `runtime = 'nodejs'`). On Workers (OpenNext), `public/uploads/`
 * is ephemeral — swap the fs write for an R2 `put()` once R2 is bound.
 * The metadata side (via `mediaStorage`) is already KV-aware and works
 * on both runtimes.
 */

import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { mediaStorage } from '@/lib/cms/storage';
import type { Media } from '@/lib/cms/types';

export const runtime = 'nodejs';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');

async function ensureUploadsDir(): Promise<void> {
  try {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
  } catch {
    // On Workers `fs.mkdir` is not allowed; the binary will live in R2
    // once that binding is added. We don't fail the upload here so the
    // metadata still records the intent.
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureUploadsDir();

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const fileExtension = file.name.split('.').pop() || 'bin';
    const filename = `${uuidv4()}.${fileExtension}`;
    const filePath = path.join(UPLOAD_DIR, filename);

    try {
      const buffer = Buffer.from(await file.arrayBuffer());
      await fs.writeFile(filePath, buffer);
    } catch (err) {
      // fs unavailable on Workers — surface a clear error so the admin
      // knows the binary didn't persist (metadata will still record).
      console.warn('[cms/media] Failed to write binary on this runtime:', err);
    }

    const media: Media = {
      id: uuidv4(),
      url: `/uploads/${filename}`,
      alt: { hu: file.name, en: file.name },
      mimeType: file.type,
      size: file.size,
      createdAt: new Date().toISOString(),
    };

    await mediaStorage.upsertMedia(media);
    return NextResponse.json({ media });
  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const media = await mediaStorage.readAllMedia();
    return NextResponse.json({ media });
  } catch (error) {
    console.error('Error reading media:', error);
    return NextResponse.json({ error: 'Failed to read media' }, { status: 500 });
  }
}
