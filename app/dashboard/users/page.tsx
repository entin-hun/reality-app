/**
 * /dashboard/users — admin-only CRUD for the email → role map.
 *
 * - Lists everyone grouped by role.
 * - Add: email + role → POST /api/admin/users.
 * - Change role: PUT /api/admin/users/[email].
 * - Remove: DELETE /api/admin/users/[email].
 *
 * Last-admin protection lives server-side in the route handlers.
 */

import { requireAdmin } from '@/lib/auth/dev-role';
import { readRoleMap, STAFF_ROLE_IDS, type RoleId } from '@/lib/db/kv-roles';
import { UsersAdmin } from '@/components/dashboard/UsersAdmin';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{ error?: string; ok?: string }>;
}

const ROLE_LABELS: Record<RoleId, string> = {
  Rendszeradminisztrator: 'Rendszeradminisztrátor',
  Producer: 'Producer',
  'Reality szerkeszto': 'Reality szerkesztő',
  Tartalomkeszito: 'Tartalomkészítő',
  Marketing: 'Marketing',
  Moderator: 'Moderátor',
};

const ROLE_COLORS: Record<RoleId, string> = {
  Rendszeradminisztrator: 'bg-red-500',
  Producer: 'bg-purple-500',
  'Reality szerkeszto': 'bg-blue-500',
  Tartalomkeszito: 'bg-emerald-500',
  Marketing: 'bg-yellow-500',
  Moderator: 'bg-gray-500',
};

const ERROR_TEXT: Record<string, string> = {
  invalid_email: 'Érvénytelen email cím.',
  invalid_role: 'Érvénytelen szerepkör.',
  last_admin_protected:
    'Az utolsó Rendszeradminisztrátort nem lehet eltávolítani vagy leváltani.',
  persistence_failed: 'A mentés nem sikerült. Próbáld újra.',
};

const OK_TEXT: Record<string, string> = {
  added: 'Új felhasználó hozzáadva.',
  role_changed: 'Szerepkör módosítva.',
  removed: 'Felhasználó eltávolítva.',
};

export default async function AdminUsersPage({ searchParams }: PageProps) {
  const guard = await requireAdmin();
  if (!guard.ok) {
    return (
      <main className="min-h-screen p-6">
        <div className="max-w-md mx-auto text-center">
          <p className="text-brand-red text-sm uppercase tracking-widest font-semibold mb-2">
            403 · Tiltott
          </p>
          <h1
            className="text-3xl font-black text-white mb-2"
            style={{ fontFamily: 'Impact, Arial Black, sans-serif' }}
          >
            Nincs hozzáférésed
          </h1>
          <p className="text-gray-400 text-sm">
            A felhasználókezelés csak Rendszeradminisztrátorok számára érhető el.
          </p>
        </div>
      </main>
    );
  }

  const sp = await searchParams;
  const map = await readRoleMap();
  const flashError = sp.error && ERROR_TEXT[sp.error];
  const flashOk = sp.ok && OK_TEXT[sp.ok];

  // Flatten into a single list for the client component.
  const users: Array<{ email: string; role: RoleId }> = [];
  for (const role of STAFF_ROLE_IDS) {
    for (const email of map[role] ?? []) {
      users.push({ email, role });
    }
  }
  users.sort((a, b) => a.email.localeCompare(b.email));

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-5xl">
      <header>
        <p className="text-brand-red text-[10px] uppercase tracking-widest font-bold mb-1">
          Rendszeradminisztrátor
        </p>
        <h1
          className="text-2xl sm:text-3xl font-black text-white"
          style={{ fontFamily: 'Impact, Arial Black, sans-serif' }}
        >
          Felhasználók és szerepkörök
        </h1>
        <p className="text-gray-500 text-xs mt-1">
          Itt kezelheted, hogy ki léphet be az admin felületre és milyen
          jogosultságokkal. A bejelentkezés email-alapú magic-link rendszerrel
          működik.
        </p>
      </header>

      {flashError && (
        <div className="rounded-lg border border-brand-red/40 bg-brand-red/10 px-4 py-3 text-sm text-brand-red">
          {flashError}
        </div>
      )}
      {flashOk && (
        <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">
          {flashOk}
        </div>
      )}

      <UsersAdmin
        users={users}
        roles={STAFF_ROLE_IDS.map((id) => ({
          id,
          label: ROLE_LABELS[id],
          color: ROLE_COLORS[id],
        }))}
        currentUserEmail={guard.email}
      />
    </div>
  );
}
