/**
 * /dashboard/social-links — CRUD for social-media account registry.
 *
 * Centralised list of every official EFU account. The hero / footer /
 * contact components each pull from this registry so adding a new
 * channel is one admin form.
 */

import { GenericAdminList, type FieldDef } from '../components/GenericAdminList';
import { currentRole } from '@/lib/auth/dev-role';
import { Forbidden } from '../components/Forbidden';

export const dynamic = 'force-dynamic';

const FIELDS: FieldDef[] = [
  { key: 'platform', label: 'Platform', type: 'select', options: ['instagram', 'tiktok', 'youtube', 'facebook', 'x', 'threads', 'linkedin', 'twitch', 'telegram', 'other'], required: true },
  { key: 'handle', label: 'Handle', type: 'text', required: true, placeholder: '@elitefightuniverse' },
  { key: 'url', label: 'URL', type: 'url', required: true },
  { key: 'label', label: 'Megjelenített címke', type: 'text', placeholder: 'Instagram' },
  { key: 'sortOrder', label: 'Sorrend', type: 'number' },
  { key: 'active', label: 'Aktív', type: 'boolean' },
];

export default async function SocialLinksAdminPage() {
  const role = await currentRole();
  if (role !== 'Rendszeradminisztrator' && role !== 'Marketing') {
    return (
      <Forbidden message="A social linkek kezeléséhez Marketing / Rendszeradminisztrátor szerepkör szükséges." />
    );
  }
  return (
    <GenericAdminList
      kind="social-links"
      title="Social linkek"
      icon="🔗"
      description="A weboldal social-media regisztere. A hero és footer komponensek innen olvasnak."
      fields={FIELDS}
    />
  );
}
