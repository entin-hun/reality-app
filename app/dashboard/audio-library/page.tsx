/**
 * /dashboard/audio-library — CRUD for audio cues used by the live show.
 *
 * Track metadata (title, kind, url, duration) — the audio layer
 * resolves `url` against Cloudflare Stream or R2 at playback time.
 */

import { GenericAdminList, type FieldDef } from '../components/GenericAdminList';
import { currentRole } from '@/lib/auth/dev-role';
import { Forbidden } from '../components/Forbidden';

export const dynamic = 'force-dynamic';

const FIELDS: FieldDef[] = [
  { key: 'title', label: 'Cím', type: 'text', required: true, placeholder: 'Főcímzene' },
  { key: 'kind', label: 'Típus', type: 'select', options: ['intro', 'outro', 'sting', 'walkin', 'walkout', 'background', 'other'], required: true },
  { key: 'url', label: 'Hang URL', type: 'url', required: true },
  { key: 'durationSec', label: 'Hossz (mp)', type: 'number' },
  { key: 'license', label: 'Licenc', type: 'text', placeholder: 'belső / CC-BY' },
  { key: 'notes', label: 'Megjegyzés', type: 'textarea' },
];

export default async function AudioLibraryAdminPage() {
  const role = await currentRole();
  if (role !== 'Rendszeradminisztrator' && role !== 'Reality szerkeszto') {
    return (
      <Forbidden message="Az audio könyvtárhoz Rendszeradminisztrátor / Reality szerkesztő szerepkör szükséges." />
    );
  }
  return (
    <GenericAdminList
      kind="audio-library"
      title="Audio könyvtár"
      icon="🎵"
      description="Élő adásban használt zenei és hang-effekt elemek."
      fields={FIELDS}
    />
  );
}
