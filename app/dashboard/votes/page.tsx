/**
 * /dashboard/votes — full CRUD for live audience votes.
 *
 * Endpoints consumed:
 *   GET  /api/admin/vote         → { current, history }
 *   POST /api/admin/vote open    → open new vote (auto-archives prev)
 *   POST /api/admin/vote close   → close current / specified vote
 *   POST /api/admin/vote delete  → drop a vote from history
 *
 * Authorization gate (also enforced server-side):
 *   Rendszeradminisztrator / Producer / Reality szerkeszto
 *   (matches the section's `requiredRoles` in role-sections.ts).
 *
 * Rendering: server component reads role + initial state; the actual
 * interactive table is a small client component that re-fetches on every
 * action so the operator always sees the latest tally.
 */

import { currentRole } from '@/lib/auth/dev-role';
import { Forbidden } from '../components/Forbidden';
import { VotesAdmin } from './VotesAdmin';

export const dynamic = 'force-dynamic';

const ALLOWED: ReadonlyArray<string> = [
  'Rendszeradminisztrator',
  'Producer',
  'Reality szerkeszto',
];

export default async function VotesPage() {
  const role = await currentRole();
  if (!ALLOWED.includes(role)) {
    return (
      <Forbidden message="A szavazások kezeléséhez a Rendszeradminisztrátor / Producer / Reality szerkesztő szerepkör szükséges." />
    );
  }
  return <VotesAdmin role={role} />;
}
