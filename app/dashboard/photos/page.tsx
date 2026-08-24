/**
 * /dashboard/photos — CRUD for the photo gallery.
 *
 * Each photo carries a hosted URL plus metadata (caption, photographer,
 * event). The public gallery reads this list.
 */

import { GenericAdminList, type FieldDef } from '../components/GenericAdminList';
import { currentRole } from '@/lib/auth/dev-role';
import { Forbidden } from '../components/Forbidden';

export const dynamic = 'force-dynamic';

const FIELDS: FieldDef[] = [
  { key: 'title', label: 'Cím', type: 'text', required: true },
  { key: 'url', label: 'Kép URL', type: 'url', required: true, placeholder: 'https://cdn.efutv.eu/...' },
  { key: 'eventId', label: 'Esemény ID', type: 'text', placeholder: 'efu-fight-night-2026-08' },
  { key: 'photographer', label: 'Fotós', type: 'text', placeholder: 'Kovács Anna' },
  { key: 'caption', label: 'Felirat / képaláírás', type: 'textarea' },
  { key: 'published', label: 'Publikálva', type: 'boolean' },
];

export default async function PhotosAdminPage() {
  const role = await currentRole();
  if (role !== 'Rendszeradminisztrator' && role !== 'Tartalomkeszito') {
    return (
      <Forbidden message="A fotók kezeléséhez Tartalomkeszítő / Rendszeradminisztrátor szerepkör szükséges." />
    );
  }
  return (
    <GenericAdminList
      kind="photos"
      title="Fotók"
      icon="📸"
      description="Fotó galéria — Cloudflare R2 / külső CDN URL-ekkel."
      fields={FIELDS}
    />
  );
}
