/**
 * /dashboard/news — CRUD for the news section.
 *
 * Simple article record: title, slug, body (markdown), hero image url,
 * publish flag, locale. When the public news page is wired up, it will
 * fetch this list and filter by `published === true`.
 */

import { GenericAdminList, type FieldDef } from '../components/GenericAdminList';
import { currentRole } from '@/lib/auth/dev-role';
import { Forbidden } from '../components/Forbidden';

export const dynamic = 'force-dynamic';

const FIELDS: FieldDef[] = [
  { key: 'title', label: 'Cím', type: 'text', required: true },
  { key: 'slug', label: 'Slug', type: 'text', required: true, placeholder: 'uj-harcos-bejelentes' },
  { key: 'locale', label: 'Nyelv', type: 'select', options: ['hu', 'en', 'de', 'ro', 'hr', 'sr', 'sl', 'sk', 'ar'] },
  { key: 'heroImage', label: 'Borítókép URL', type: 'url' },
  { key: 'body', label: 'Tartalom (markdown)', type: 'textarea' },
  { key: 'published', label: 'Publikálva', type: 'boolean' },
];

export default async function NewsAdminPage() {
  const role = await currentRole();
  if (
    role !== 'Rendszeradminisztrator' &&
    role !== 'Tartalomkeszito' &&
    role !== 'Marketing'
  ) {
    return (
      <Forbidden message="A hírek kezeléséhez Tartalomkeszítő / Marketing / Rendszeradminisztrátor szerepkör szükséges." />
    );
  }
  return (
    <GenericAdminList
      kind="news"
      title="Hírek"
      icon="📰"
      description="Hírek / cikkek kezelése. A publikált (published=true) elemek a publikus híroldalon jelennek meg."
      fields={FIELDS}
    />
  );
}
