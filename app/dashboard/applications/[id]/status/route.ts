import { NextRequest, NextResponse } from 'next/server';
import { redirect } from 'next/navigation';
import { store, type ApplicationStatus } from '@/lib/db';
import { currentRole } from '@/lib/auth/dev-role';

export const runtime = 'nodejs';

const ALLOWED: ApplicationStatus[] = ['new', 'contacted', 'approved', 'rejected'];

/**
 * POST /dashboard/applications/[id]/status — admin status transition.
 *
 * Today: form-submit handler on the admin queue page. When L6 ships,
 * this becomes an API + audit-logged mutation. Keep the URL stable.
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const role = await currentRole();
  if (
    role !== 'Rendszeradminisztrator' &&
    role !== 'Producer' &&
    role !== 'Reality szerkeszto'
  ) {
    return NextResponse.json({ ok: false, message: 'forbidden' }, { status: 403 });
  }

  const { id } = await context.params;
  const form = await request.formData();
  const status = String(form.get('status') ?? '');

  if (!ALLOWED.includes(status as ApplicationStatus)) {
    return NextResponse.json({ ok: false, message: 'invalid_status' }, { status: 400 });
  }

  try {
    await store.updateStatus(id, status as ApplicationStatus);
  } catch {
    return NextResponse.json({ ok: false, message: 'not_found' }, { status: 404 });
  }

  redirect(`/dashboard/applications?id=${id}`);
}
