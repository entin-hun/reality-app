/**
 * /dashboard/sponsors — CRUD for sponsor logos and metadata.
 *
 * Each sponsor carries a name, tier (sponsor placement level), logo URL,
 * and an optional website. The public /szponzorok page reads this list.
 */

import { GenericAdminList, type FieldDef } from '../components/GenericAdminList';
import { currentRole } from '@/lib/auth/dev-role';
import { Forbidden } from '../components/Forbidden';

export const dynamic = 'force-dynamic';

const FIELDS: FieldDef[] = [
  { key: 'name', label: 'Név', type: 'text', required: true, placeholder: 'Acme Kft.' },
  { key: 'tier', label: 'Szint', type: 'select', options: ['platinum', 'gold', 'silver', 'bronze', 'partner'], required: true },
  { key: 'logoUrl', label: 'Logo URL', type: 'url', placeholder: 'https://cdn.efutv.eu/sponsors/...' },
  { key: 'website', label: 'Weboldal', type: 'url' },
  { key: 'sortOrder', label: 'Sorrend', type: 'number' },
  { key: 'description', label: 'Leírás', type: 'textarea' },
];

export default async function SponsorsAdminPage() {
  const role = await currentRole();
  if (role !== 'Rendszeradminisztrator' && role !== 'Marketing') {
    return (
      <Forbidden message="A szponzorok kezeléséhez Marketing / Rendszeradminisztrátor szerepkör szükséges." />
    );
  }
  return (
    <GenericAdminList
      kind="sponsors"
      title="Szponzorok"
      icon="🤝"
      description="Szponzor logók és metadata. A publikus /szponzorok oldal ezt a listát olvassa."
      fields={FIELDS}
    />
  );
}
