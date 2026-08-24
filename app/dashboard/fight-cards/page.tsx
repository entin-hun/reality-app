/**
 * /dashboard/fight-cards — CRUD for fight cards (the matched bouts).
 *
 * The fight-card wire-up here is intentionally simple: each record
 * captures the slug, two fighter slugs (joined with `data/fighters.json`),
 * an event reference, the scheduled time, and an outcome. When L5
 * integrates with the live-stream pipeline, this is the surface to
 * extend.
 */

import { GenericAdminList, type FieldDef } from '../components/GenericAdminList';
import { currentRole } from '@/lib/auth/dev-role';
import { Forbidden } from '../components/Forbidden';

export const dynamic = 'force-dynamic';

const FIELDS: FieldDef[] = [
  { key: 'title', label: 'Cím', type: 'text', required: true, placeholder: 'Főmeccs: X vs Y' },
  { key: 'eventId', label: 'Esemény ID', type: 'text', placeholder: 'efu-fight-night-2026-08' },
  { key: 'fighterA', label: 'Harcos A (slug)', type: 'text', placeholder: 'kozak-peter' },
  { key: 'fighterB', label: 'Harcos B (slug)', type: 'text', placeholder: 'varga-bence' },
  { key: 'scheduledAt', label: 'Időpont', type: 'datetime' },
  { key: 'weightClass', label: 'Súlycsoport', type: 'text', placeholder: 'könnyűsúly' },
  { key: 'rounds', label: 'Menetek', type: 'number', placeholder: '3' },
  { key: 'status', label: 'Státusz', type: 'select', options: ['upcoming', 'live', 'closed'] },
  { key: 'winner', label: 'Győztes (slug)', type: 'text', placeholder: 'kozak-peter' },
  { key: 'method', label: 'Befejezés módja', type: 'text', placeholder: 'KO / 2. menet' },
  { key: 'notes', label: 'Megjegyzés', type: 'textarea' },
];

export default async function FightCardsAdminPage() {
  const role = await currentRole();
  if (role !== 'Rendszeradminisztrator' && role !== 'Producer') {
    return (
      <Forbidden message="A mérkőzéskártyák kezeléséhez Rendszeradminisztrátor / Producer szerepkör szükséges." />
    );
  }
  return (
    <GenericAdminList
      kind="fight-cards"
      title="Mérkőzéskártyák"
      icon="🥊"
      description="Fight card összeállítása, sorrend és eredmény admin. A nyilvános FightCard komponens a slug alapján keres."
      fields={FIELDS}
    />
  );
}
