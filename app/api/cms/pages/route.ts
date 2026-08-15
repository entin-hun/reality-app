/**
 * CMS Pages API Route
 * 
 * GET /api/cms/pages - Összes oldal lekérése
 * POST /api/cms/pages - Új oldal létrehozása
 */

import { NextRequest, NextResponse } from 'next/server';
import { pagesStorage, initializeSeedData } from '@/lib/cms/storage';
import { requireRole } from '@/lib/auth/dev-role';
import type { Page } from '@/lib/cms/types';

/**
 * GET /api/cms/pages — public, no auth needed.
 * Serves published pages to the frontend.
 */
export async function GET() {
  try {
    await initializeSeedData();
    const pages = await pagesStorage.readAllPages();
    return NextResponse.json({ pages });
  } catch (error) {
    console.error('Error reading pages:', error);
    return NextResponse.json(
      { error: 'Failed to read pages' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/cms/pages — staff only (Rendszeradminisztrator, Tartalomkeszito).
 */
export async function POST(request: NextRequest) {
  const auth = await requireRole(['Rendszeradminisztrator', 'Tartalomkeszito']);
  if (!auth.ok) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const page: Page = {
      ...body,
      id: body.id || `page-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await pagesStorage.upsertPage(page);
    return NextResponse.json({ page });
  } catch (error) {
    console.error('Error creating page:', error);
    return NextResponse.json(
      { error: 'Failed to create page' },
      { status: 500 }
    );
  }
}
