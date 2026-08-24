/**
 * /dashboard/audit-logs — read-only view over the audit ring buffer.
 *
 * The buffer is populated by admin API routes (cms-store mutations,
 * vote lifecycle, role grants) via lib/audit.ts. Local Node dev shows
 * an empty list (KV not bound); Workers/edge shows real entries.
 */

import { listAudit, countAudit, type AuditEntry } from '@/lib/audit';
import { currentRole } from '@/lib/auth/dev-role';
import { Forbidden } from '../components/Forbidden';

export const dynamic = 'force-dynamic';

const ACTION_LABELS: Record<string, string> = {
  'cms.create': 'Létrehozás',
  'cms.update': 'Módosítás',
  'cms.delete': 'Törlés',
  'vote.open': 'Szavazás indítása',
  'vote.close': 'Szavazás lezárása',
  'vote.delete': 'Szavazás törlése',
};

export default async function AuditLogsPage() {
  const role = await currentRole();
  if (role !== 'Rendszeradminisztrator' && role !== 'Producer') {
    return (
      <Forbidden message="Az audit napló megtekintéséhez Rendszeradminisztrátor / Producer szerepkör szükséges." />
    );
  }
  const [entries, total] = await Promise.all([listAudit(200), countAudit()]);

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
            📋 Audit napló
          </h1>
          <p className="text-gray-500 text-xs mt-1">
            {entries.length} bejegyzés megjelenítve · {total} összesen (max. 500
            tárolt)
          </p>
        </header>

        {entries.length === 0 ? (
          <div className="card-dark rounded-2xl p-8 text-center text-gray-500 text-sm">
            Még nincs audit bejegyzés. A CMS CRUD és szavazás műveletek
            automatikusan ide írnak. (Helyi fejlesztésnél az APPLICATIONS_KV
            nincs boundolva — ezért üres.)
          </div>
        ) : (
          <ul className="space-y-2">
            {entries.map((e) => (
              <li key={e.id} className="card-dark rounded-lg p-3 text-sm">
                <div className="flex items-baseline justify-between flex-wrap gap-2">
                  <span className="font-mono text-[11px] text-gray-500">
                    {new Date(e.at).toLocaleString('hu-HU')}
                  </span>
                  <ActionBadge action={e.action} />
                </div>
                <div className="mt-1">
                  <span className="text-brand-gold font-bold">{e.actor}</span>
                  <span className="text-gray-400 mx-2">→</span>
                  <code className="text-white text-xs bg-brand-dark px-2 py-0.5 rounded">
                    {e.target}
                  </code>
                </div>
                {e.meta && Object.keys(e.meta).length > 0 && (
                  <pre className="mt-2 text-[11px] text-gray-400 bg-brand-dark rounded p-2 overflow-x-auto">
                    {JSON.stringify(e.meta, null, 2)}
                  </pre>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}

function ActionBadge({ action }: { action: string }) {
  const label = ACTION_LABELS[action] ?? action;
  const variant =
    action.endsWith('.delete')
      ? 'bg-red-900/30 text-red-300 border-red-800'
      : action.endsWith('.create')
        ? 'bg-emerald-900/30 text-emerald-300 border-emerald-800'
        : action.endsWith('.update')
          ? 'bg-blue-900/30 text-blue-300 border-blue-800'
          : 'bg-brand-dark text-gray-300 border-brand-dark-border';
  return (
    <span className={`text-[11px] uppercase tracking-widest font-bold border rounded-md px-2 py-0.5 ${variant}`}>
      {label}
    </span>
  );
}
