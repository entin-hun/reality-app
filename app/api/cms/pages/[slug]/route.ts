/**
 * CMS Single Page API Route
 * 
 * GET /api/cms/pages/[slug] - Egy oldal lekérése
 * PUT /api/cms/pages/[slug] - Egy oldal frissítése
 * DELETE /api/cms/pages/[slug] - Egy oldal törlése
 */

import { NextRequest, NextResponse } from 'next/server';
import { pagesStorage } from '@/lib/cms/storage';
import { requireRole } from '@/lib/auth/dev-role';

/**
 * GET /api/cms/pages/[slug] — public, no auth needed.
 * Serves a single published page to the frontend.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const page = await pagesStorage.readPage(slug);
    
    if (!page) {
      return NextResponse.json(
        { error: 'Page not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ page });
  } catch (error) {
    console.error('Error reading page:', error);
    return NextResponse.json(
      { error: 'Failed to read page' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/cms/pages/[slug] — staff only (Rendszeradminisztrator, Tartalomkeszito).
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const auth = await requireRole(['Rendszeradminisztrator', 'Tartalomkeszito']);
  if (!auth.ok) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { slug } = await params;
    const existingPage = await pagesStorage.readPage(slug);

    if (!existingPage) {
      return NextResponse.json(
        { error: 'Page not found' },
        { status: 404 }
      );
    }

    const updatedPage = {
      ...existingPage,
      ...body,
      slug: slug, // slug nem változhat
      updatedAt: new Date().toISOString(),
    };

    await pagesStorage.upsertPage(updatedPage);
    return NextResponse.json({ page: updatedPage });
  } catch (error) {
    console.error('Error updating page:', error);
    return NextResponse.json(
      { error: 'Failed to update page' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/cms/pages/[slug] — staff only (Rendszeradminisztrator, Tartalomkeszito).
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const auth = await requireRole(['Rendszeradminisztrator', 'Tartalomkeszito']);
  if (!auth.ok) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { slug } = await params;
    const existingPage = await pagesStorage.readPage(slug);

    if (!existingPage) {
      return NextResponse.json(
        { error: 'Page not found' },
        { status: 404 }
      );
    }

    await pagesStorage.deletePage(slug);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting page:', error);
    return NextResponse.json(
      { error: 'Failed to delete page' },
      { status: 500 }
    );
  }
}
