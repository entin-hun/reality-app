/**
 * /dashboard/reality-triggers — CRUD for scripted reality-show cues.
 *
 * A "trigger" is a timestamped live cue: a text-to-show overlay, a
 * music sting, a vote prompt, etc. The L5 streaming layer eventually
 * schedules these against the broadcast; for now we just capture the
 * schedule so the producer can plan ahead.
 */

import { GenericAdminList, type FieldDef } from '../components/GenericAdminList';
import { currentRole } from '@/lib/auth/dev-role';
import { Forbidden } from '../components/Forbidden';

export const dynamic = 'force-dynamic';

const FIELDS: FieldDef[] = [
  { key: 'label', label: 'Címke', type: 'text', required: true, placeholder: 'Főcím zene' },
  { key: 'kind', label: 'Típus', type: 'select', options: ['overlay', 'music', 'vote', 'cut', 'lower-third'], required: true },
  { key: 'atIso', label: 'Időpont', type: 'datetime' },
  { key: 'eventId', label: 'Esemény ID', type: 'text', placeholder: 'efu-reality-2026-s1' },
  { key: 'text', label: 'Szöveg / prompt', type: 'textarea' },
  { key: 'durationSec', label: 'Időtartam (mp)', type: 'number' },
  { key: 'notes', label: 'Megjegyzés', type: 'textarea' },
];

export default async function RealityTriggersAdminPage() {
  const role = await currentRole();
  if (
    role !== 'Rendszeradminisztrator' &&
    role !== 'Producer' &&
    role !== 'Reality szerkeszto'
  ) {
    return (
      <Forbidden message="A reality triggerek kezeléséhez Rendszeradminisztrátor / Producer / Reality szerkesztő szerepkör szükséges." />
    );
  }
  return (
    <GenericAdminList
      kind="reality-triggers"
      title="Reality triggerek"
      icon="⚡"
      description="Élő adás során az operátor által indítható overlay-ek, zenék, szavazás-promptok."
      fields={FIELDS}
    />
  );
}
