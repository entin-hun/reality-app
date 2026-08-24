/**
 * /dashboard/videos — CRUD for the video gallery.
 *
 * Each video carries an external URL (YouTube, Cloudflare Stream uid)
 * plus metadata for the gallery tile. When L5 ships the public video
 * page, this is the source-of-truth.
 */

import { GenericAdminList, type FieldDef } from '../components/GenericAdminList';
import { currentRole } from '@/lib/auth/dev-role';
import { Forbidden } from '../components/Forbidden';

export const dynamic = 'force-dynamic';

const FIELDS: FieldDef[] = [
  { key: 'title', label: 'Cím', type: 'text', required: true },
  { key: 'url', label: 'Videó URL', type: 'url', required: true, placeholder: 'https://youtu.be/...' },
  { key: 'kind', label: 'Típus', type: 'select', options: ['youtube', 'cloudflare', 'vimeo', 'mp4'] },
  { key: 'thumbnail', label: 'Borítókép URL', type: 'url' },
  { key: 'durationSec', label: 'Hossz (mp)', type: 'number' },
  { key: 'description', label: 'Leírás', type: 'textarea' },
  { key: 'published', label: 'Publikálva', type: 'boolean' },
];

export default async function VideosAdminPage() {
  const role = await currentRole();
  if (role !== 'Rendszeradminisztrator' && role !== 'Tartalomkeszito') {
    return (
      <Forbidden message="A videók kezeléséhez Tartalomkeszítő / Rendszeradminisztrátor szerepkör szükséges." />
    );
  }
  return (
    <GenericAdminList
      kind="videos"
      title="Videók"
      icon="🎥"
      description="Videó galéria — YouTube / Cloudflare Stream hivatkozásokkal."
      fields={FIELDS}
    />
  );
}
