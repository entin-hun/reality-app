/**
 * /dashboard/roles — read-only registry of every email→role assignment.
 *
 * Reads directly from AUTH_KV["role_map"]. Mutations happen via
 * /dashboard/users (the proper management surface); this page is a
 * bird's-eye view with a hard copy-back reminder.
 */

import { readRoleMap, STAFF_ROLE_IDS, type RoleId } from '@/lib/db/kv-roles';
import { currentRole } from '@/lib/auth/dev-role';
import { Forbidden } from '../components/Forbidden';

export const dynamic = 'force-dynamic';

const ROLE_DESCRIPTIONS: Record<RoleId, string> = {
  Rendszeradminisztrator: 'Teljes hozzáférés minden modulhoz.',
  Producer: 'Események, fight cards, eredmények, valamint audit nézet.',
  'Reality szerkeszto': 'Reality triggerek, audio könyvtár.',
  Tartalomkeszito: 'Hírek, videók, fotók (CMS).',
  Marketing: 'Hírek, szponzorok, social linkek.',
  Moderator: 'Chat moderation és nézet.',
};

export default async function RolesPage() {
  const role = await currentRole();
  if (role !== 'Rendszeradminisztrator') {
    return (
      <Forbidden message="A szerepkör-nyilvántartáshoz Rendszeradminisztrátor szerepkör szükséges." />
    );
  }
  const map = await readRoleMap();

  const totalEmails = Object.values(map).reduce((acc, list) => acc + (list?.length ?? 0), 0);

  return (
    <main className="min-h-screen pt-24 pb-16 px-4">
      <div className="max-w-5xl mx-auto space-y-6">
        <header>
          <p className="text-brand-red text-sm uppercase tracking-widest font-semibold mb-1">
            Admin
          </p>
          <h1
            className="text-3xl sm:text-4xl font-black text-white uppercase"
            style={{ fontFamily: 'Impact, Arial Black, sans-serif' }}
          >
            🔐 Szerepkörök
          </h1>
          <p className="text-gray-500 text-xs mt-1">
            {totalEmails} email · {STAFF_ROLE_IDS.length} szerepkör · forrás:
            <code className="text-gray-400 ml-1">AUTH_KV["role_map"]</code>
          </p>
          <p className="text-amber-400 text-xs mt-2">
            ⚠️ Ez egy read-only nézet. A szerepkörök kiosztását és
            visszavonását a <a href="/dashboard/users" className="underline hover:text-white">/dashboard/users</a> oldalon
            lehet elvégezni.
          </p>
        </header>

        <div className="grid gap-4 md:grid-cols-2">
          {STAFF_ROLE_IDS.map((roleId) => {
            const emails = map[roleId] ?? [];
            return (
              <section key={roleId} className="card-dark rounded-2xl p-5">
                <div className="flex items-baseline justify-between">
                  <h2 className="text-white font-bold text-base">{roleId}</h2>
                  <span className="text-brand-gold text-xs font-bold">
                    {emails.length} fő
                  </span>
                </div>
                <p className="text-gray-500 text-xs mt-1">
                  {ROLE_DESCRIPTIONS[roleId]}
                </p>
                {emails.length === 0 ? (
                  <p className="text-gray-600 italic text-sm mt-3">
                    Nincs hozzárendelt felhasználó.
                  </p>
                ) : (
                  <ul className="mt-3 space-y-1.5">
                    {emails.map((email) => (
                      <li
                        key={email}
                        className="bg-brand-dark border border-brand-dark-border rounded-lg px-3 py-2 text-sm text-white font-mono break-all"
                      >
                        {email}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      </div>
    </main>
  );
}
