/**
 * /dashboard/fighter-profiles — landing for fighter-profile management.
 *
 * Sources of truth:
 *   - Applications (lib/db) — the queue of accepted Applicants.
 *   - Fighters (lib/fighters) — the public fighter roster.
 *
 * Workflow implemented here (per user ask "Fighter profiles should start from
 * accepted Applicants"):
 *
 *   1. List every application with status === 'approved' that has NOT yet
 *      been promoted to a fighter (matched by email — applicants are
 *      recruited one fighter at a time so email is a stable key).
 *   2. Each row exposes a "Létrehozás harcos profilként" button that links
 *      to /dashboard/fighters/new?from=<application_id>. The new-fighter
 *      page reads that query param and pre-fills the editor with the
 *      applicant's name, age, city, sport history, motivation, etc.
 *   3. Existing fighters are listed below so the admin has both views on
 *      one screen.
 *
 * Role gating: Tartalomkeszito / Rendszeradminisztrator (same as fighters).
 * The link below still works for Tartalomkeszito because /dashboard/fighters
 * uses the same role guard.
 */

import Link from 'next/link';
import { store, type ApplicationRecord } from '@/lib/db';
import { readAllFighters } from '@/lib/fighters';
import { Forbidden } from '../components/Forbidden';
import { requireFighterAdmin } from '@/lib/auth/admin';

export const dynamic = 'force-dynamic';

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

function buildPrefillHref(app: ApplicationRecord): string {
  const params = new URLSearchParams({
    from: app.id,
    name: app.name ?? '',
    age: app.age ? String(app.age) : '',
    city: app.city ?? '',
    weightClass: app.testSuly ?? '',
    intro: app.motivation?.slice(0, 240) ?? '',
    story:
      [app.sportMult, app.motivation].filter(Boolean).join('\n\n').slice(0, 2000) ?? '',
    videoUrl: app.videoOrSocialUrl ?? '',
    email: app.email ?? '',
    phone: app.phone ?? '',
    slug: slugify(app.name ?? `fighter-${app.id.slice(-6)}`),
  });
  return `/dashboard/fighters/new?${params.toString()}`;
}

export default async function FighterProfilesPage() {
  const guard = await requireFighterAdmin();
  if (!guard.ok) {
    return (
      <Forbidden message="A harcos profilok kezeléséhez a Rendszeradminisztrátor / Producer / Tartalomkeszítő szerepkör szükséges." />
    );
  }

  const [allApps, fighters] = await Promise.all([
    store.list(),
    readAllFighters(),
  ]);

  // Promote candidates: approved applications whose email is not yet bound
  // to an existing fighter. Email match is conservative — name collisions
  // are possible across seasons but an admin will notice in the preview.
  const fighterEmails = new Set(
    fighters
      .map((f) => (f as { email?: string }).email?.toLowerCase())
      .filter((e): e is string => Boolean(e))
  );

  const accepted = allApps.filter((a) => a.status === 'approved');
  const promoteCandidates = accepted.filter(
    (a) => !fighterEmails.has(a.email.toLowerCase())
  );
  const alreadyPromoted = accepted.filter((a) =>
    fighterEmails.has(a.email.toLowerCase())
  );

  return (
    <main className="min-h-screen pt-24 pb-16 px-4">
      <div className="max-w-6xl mx-auto space-y-10">
        <header>
          <p className="text-brand-red text-sm uppercase tracking-widest font-semibold mb-1">
            Admin
          </p>
          <h1
            className="text-3xl sm:text-4xl font-black text-white uppercase"
            style={{ fontFamily: 'Impact, Arial Black, sans-serif' }}
          >
            Harcos profilok
          </h1>
          <p className="text-gray-500 text-xs mt-1">
            Bejelentkezve mint: {guard.role} · {fighters.length} harcos a
            rendszerben · {accepted.length} elfogadott jelentkező
          </p>
        </header>

        {/* ─── Section 1: Accepted Applicants awaiting promotion ────── */}
        <section>
          <div className="flex items-baseline justify-between flex-wrap gap-2 mb-3">
            <h2 className="text-white font-bold uppercase tracking-widest text-sm">
              🥊 Elfogadott jelentkezők ({promoteCandidates.length})
            </h2>
            <p className="text-xs text-gray-500">
              Ezekből a jelentkezőkből lehet harcos profilt létrehozni.
            </p>
          </div>

          {promoteCandidates.length === 0 ? (
            <div className="card-dark rounded-2xl p-8 text-center text-gray-500 text-sm">
              Nincs függőben lévő elfogadott jelentkező. ({alreadyPromoted.length}{' '}
              jelentkező már harcos profillá lett előléptetve.)
            </div>
          ) : (
            <ul className="space-y-3">
              {promoteCandidates.map((app) => (
                <li
                  key={app.id}
                  className="card-dark rounded-xl px-4 py-4 flex items-start gap-4 flex-wrap"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-white truncate">{app.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {app.email} · {app.phone || '—'}
                    </p>
                    <p className="text-[11px] text-gray-600 mt-0.5">
                      {app.city} · {app.testSuly} · {app.age} éves · jött:{' '}
                      {new Date(app.createdAt).toLocaleDateString('hu-HU')}
                    </p>
                    {app.motivation && (
                      <p className="text-xs text-gray-400 mt-2 line-clamp-2 italic">
                        „{app.motivation}"
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col gap-2 shrink-0">
                    <Link
                      href={buildPrefillHref(app)}
                      className="gradient-red text-white text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-lg hover:opacity-90 transition-opacity whitespace-nowrap"
                    >
                      + Létrehozás harcosként
                    </Link>
                    <Link
                      href={`/dashboard/applications?id=${app.id}`}
                      className="text-[11px] uppercase tracking-widest text-gray-400 hover:text-white border border-brand-dark-border hover:border-gray-500 rounded-lg px-3 py-1.5 text-center transition-colors"
                    >
                      Jelentkezés megtekintése
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* ─── Section 2: Existing fighters ─────────────────────────── */}
        <section>
          <div className="flex items-baseline justify-between flex-wrap gap-2 mb-3">
            <h2 className="text-white font-bold uppercase tracking-widest text-sm">
              🗂️ Meglévő harcos profilok ({fighters.length})
            </h2>
            <div className="flex gap-2">
              <Link
                href="/dashboard/fighters/new"
                className="text-xs uppercase tracking-widest font-bold text-gray-300 hover:text-white border border-brand-dark-border hover:border-gray-500 rounded-lg px-3 py-1.5 transition-colors"
              >
                + Üres harcos profil
              </Link>
              <Link
                href="/dashboard/fighters"
                className="text-xs uppercase tracking-widest font-bold text-gray-300 hover:text-white border border-brand-dark-border hover:border-gray-500 rounded-lg px-3 py-1.5 transition-colors"
              >
                Teljes lista
              </Link>
            </div>
          </div>

          {fighters.length === 0 ? (
            <div className="card-dark rounded-2xl p-8 text-center text-gray-500 text-sm">
              Még nincs harcos a rendszerben.
            </div>
          ) : (
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {fighters.slice(0, 12).map((f) => (
                <li
                  key={f.slug}
                  className="card-dark rounded-xl px-4 py-3 flex items-center gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-white truncate">{f.name.hu ?? f.name.en ?? f.slug}</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      /{f.slug} · {f.country}
                    </p>
                  </div>
                  <Link
                    href={`/dashboard/fighters/${f.slug}`}
                    className="text-[11px] uppercase tracking-widest font-bold text-gray-300 hover:text-white border border-brand-dark-border hover:border-gray-500 rounded-lg px-3 py-1.5 transition-colors"
                  >
                    Szerkeszt
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
