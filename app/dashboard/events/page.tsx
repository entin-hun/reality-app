/**
 * /dashboard/events — CRUD for the events schedule.
 *
 * Backed by the generic CMS store (lib/db/cms-store.ts). Hardcoded events
 * in lib/events.ts remain the hero-countdown source-of-truth for now;
 * admin-curated events show up on this page only.
 */

import { GenericAdminList, type FieldDef } from '../components/GenericAdminList';
import { currentRole } from '@/lib/auth/dev-role';
import { Forbidden } from '../components/Forbidden';

export const dynamic = 'force-dynamic';

const FIELDS: FieldDef[] = [
  { key: 'title', label: 'Cím', type: 'text', required: true, placeholder: 'EFU Fight Night – Aug 2026' },
  { key: 'kind', label: 'Típus', type: 'select', options: ['reality', 'fight_night'], required: true },
  { key: 'startsAtIso', label: 'Kezdés', type: 'datetime', required: true },
  { key: 'venue', label: 'Helyszín', type: 'text', placeholder: 'Budapest Aréna' },
  { key: 'liveUrl', label: 'Élő URL', type: 'url', placeholder: 'https://www.youtube.com/...' },
];

export default async function EventsAdminPage() {
  const role = await currentRole();
  if (role !== 'Rendszeradminisztrator' && role !== 'Producer') {
    return (
      <Forbidden message="Az események kezeléséhez Rendszeradminisztrátor / Producer szerepkör szükséges." />
    );
  }
  return (
    <GenericAdminList
      kind="events"
      title="Események"
      icon="📅"
      description="A hero számláló és a landing CTA jelenleg a lib/events.ts-ből olvas — az itt felvitt elemek a belső naptárban jelennek meg."
      fields={FIELDS}
    />
  );
}
