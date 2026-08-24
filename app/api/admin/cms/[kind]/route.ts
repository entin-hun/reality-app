/**
 * Admin — generic CMS CRUD.
 *
 *   GET    /api/admin/cms/<kind>           → list
 *   POST   /api/admin/cms/<kind>           → create (body = record)
 *   PUT    /api/admin/cms/<kind>?id=<id>   → update (body = partial)
 *   DELETE /api/admin/cms/<kind>?id=<id>   → delete
 *
 * `kind` is one of CmsKind (lib/db/cms-store.ts). The handler enforces
 * role-by-kind using the role-sections permission map; new kinds added
 * there automatically get a route here.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  createItem,
  deleteItem,
  getItem,
  listItems,
  updateItem,
  type CmsKind,
} from '@/lib/db/cms-store';
import { requireRole, type Role } from '@/lib/auth/dev-role';
import { recordAudit } from '@/lib/audit';

export const runtime = 'nodejs';

const ALLOWED: ReadonlyArray<Role> = [
  'Rendszeradminisztrator',
  'Producer',
  'Reality szerkeszto',
  'Tartalomkeszito',
  'Marketing',
  'Moderator',
];

const KIND_ROLES: Record<CmsKind, ReadonlyArray<Role>> = {
  events: ['Rendszeradminisztrator', 'Producer'],
  'fight-cards': ['Rendszeradminisztrator', 'Producer'],
  news: ['Rendszeradminisztrator', 'Tartalomkeszito', 'Marketing'],
  videos: ['Rendszeradminisztrator', 'Tartalomkeszito'],
  photos: ['Rendszeradminisztrator', 'Tartalomkeszito'],
  sponsors: ['Rendszeradminisztrator', 'Marketing'],
  'social-links': ['Rendszeradminisztrator', 'Marketing'],
  results: ['Rendszeradminisztrator', 'Producer'],
  'reality-triggers': ['Rendszeradminisztrator', 'Producer', 'Reality szerkeszto'],
  'audio-library': ['Rendszeradminisztrator', 'Reality szerkeszto'],
};

function isCmsKind(s: string): s is CmsKind {
  return s in KIND_ROLES;
}

function bad(reason: string, status = 400) {
  return NextResponse.json({ ok: false, reason }, { status });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ kind: string }> }
) {
  const guard = await requireRole([...ALLOWED]);
  if (!guard.ok) return bad(guard.reason, guard.reason === 'unauthenticated' ? 401 : 403);
  const { kind } = await params;
  if (!isCmsKind(kind)) return bad('unknown-kind', 404);
  if (!KIND_ROLES[kind].includes(guard.role)) {
    return bad('forbidden', 403);
  }
  const items = await listItems(kind);
  return NextResponse.json({ ok: true, items });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ kind: string }> }
) {
  const guard = await requireRole([...ALLOWED]);
  if (!guard.ok) return bad(guard.reason, guard.reason === 'unauthenticated' ? 401 : 403);
  const { kind } = await params;
  if (!isCmsKind(kind)) return bad('unknown-kind', 404);
  if (!KIND_ROLES[kind].includes(guard.role)) return bad('forbidden', 403);
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return bad('bad-json');
  }
  if (!body || typeof body !== 'object') return bad('bad-body');
  const created = await createItem(kind, body as Record<string, unknown>);
  await recordAudit({
    actor: guard.email || guard.role,
    action: `cms.create`,
    target: `${kind}:${created.id}`,
    meta: { kind },
  });
  return NextResponse.json({ ok: true, item: created });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ kind: string }> }
) {
  const guard = await requireRole([...ALLOWED]);
  if (!guard.ok) return bad(guard.reason, guard.reason === 'unauthenticated' ? 401 : 403);
  const { kind } = await params;
  if (!isCmsKind(kind)) return bad('unknown-kind', 404);
  if (!KIND_ROLES[kind].includes(guard.role)) return bad('forbidden', 403);
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return bad('missing-id');
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return bad('bad-json');
  }
  if (!body || typeof body !== 'object') return bad('bad-body');
  const existing = await getItem(kind, id);
  if (!existing) return bad('not-found', 404);
  const next = await updateItem(kind, id, body as Record<string, unknown>);
  await recordAudit({
    actor: guard.email || guard.role,
    action: `cms.update`,
    target: `${kind}:${id}`,
    meta: { kind, keys: Object.keys(body as Record<string, unknown>) },
  });
  return NextResponse.json({ ok: true, item: next });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ kind: string }> }
) {
  const guard = await requireRole([...ALLOWED]);
  if (!guard.ok) return bad(guard.reason, guard.reason === 'unauthenticated' ? 401 : 403);
  const { kind } = await params;
  if (!isCmsKind(kind)) return bad('unknown-kind', 404);
  if (!KIND_ROLES[kind].includes(guard.role)) return bad('forbidden', 403);
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return bad('missing-id');
  const removed = await deleteItem(kind, id);
  if (!removed) return bad('not-found', 404);
  await recordAudit({
    actor: guard.email || guard.role,
    action: `cms.delete`,
    target: `${kind}:${id}`,
    meta: { kind },
  });
  return NextResponse.json({ ok: true });
}