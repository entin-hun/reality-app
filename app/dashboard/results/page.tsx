/**
 * /dashboard/results — CRUD for match outcomes.
 *
 * Lightweight record: event + fighter + placement + method. Fights
 * already carry a `winner` field on the fight-card record; this list
 * gives the operator a higher-level "leaderboard / season recap" view.
 */

import { GenericAdminList, type FieldDef } from '../components/GenericAdminList';
import { currentRole } from '@/lib/auth/dev-role';
import { Forbidden } from '../components/Forbidden';

export const dynamic = 'force-dynamic';

const FIELDS: FieldDef[] = [
  { key: 'eventId', label: 'Esemény ID', type: 'text', placeholder: 'efu-fight-night-2026-08' },
  { key: 'fighterSlug', label: 'Harcos (slug)', type: 'text', required: true },
  { key: 'placement', label: 'Helyezés', type: 'number', placeholder: '1' },
  { key: 'method', label: 'Befejezés', type: 'text', placeholder: 'KO / 2. menet' },
  { key: 'opponent', label: 'Ellenfél', type: 'text', placeholder: 'Varga Bence' },
  { key: 'round', label: 'Menet', type: 'number' },
  { key: 'notes', label: 'Megjegyzés', type: 'textarea' },
];

export default async function ResultsAdminPage() {
  const role = await currentRole();
  if (role !== 'Rendszeradminisztrator' && role !== 'Producer') {
    return (
      <Forbidden message="Az eredmények kezeléséhez Rendszeradminisztrátor / Producer szerepkör szükséges." />
    );
  }
  return (
    <GenericAdminList
      kind="results"
      title="Eredmények"
      icon="🏆"
      description="Hivatalos eredmények és tabella frissítése. A fight-cards rekordok winner/mezője átfedésben van ezzel."
      fields={FIELDS}
    />
  );
}
