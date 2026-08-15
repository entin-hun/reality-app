import Link from 'next/link';
import Image from 'next/image';
import { readAllFighters, pickLocalized } from '@/lib/fighters';
import { DEFAULT_LOCALE, loadMessages, flatten } from '@/lib/i18n';
import { Forbidden } from '../components/Forbidden';
import { requireFighterAdmin } from '@/lib/auth/admin';
import { DeleteButton } from './DeleteButton';

export const dynamic = 'force-dynamic';

export default async function AdminFightersPage() {
  const guard = await requireFighterAdmin();
  if (!guard.ok) {
    return (
      <Forbidden
        message="Az EFU harcosok szerkesztéséhez a Rendszeradminisztrátor / Producer / Reality szerkesztő szerepkör szükséges (L1-AUTH-RBAC)."
      />
    );
  }

  const fighters = await readAllFighters();
  const tRaw = await loadMessages(DEFAULT_LOCALE, 'application');
  const messages = flatten(tRaw);

  return (
    <main className="min-h-screen pt-24 pb-16 px-4">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8 flex items-baseline justify-between flex-wrap gap-4">
          <div>
            <p className="text-brand-red text-sm uppercase tracking-widest font-semibold mb-1">
              Admin
            </p>
            <h1
              className="text-3xl sm:text-4xl font-black text-white uppercase"
              style={{ fontFamily: 'Impact, Arial Black, sans-serif' }}
            >
              Harcosok kezelése
            </h1>
            <p className="text-gray-500 text-xs mt-1">
              Bejelentkezve mint: {guard.role} · {fighters.length} db harcos a rendszerben
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/dashboard/fighters/new"
              className="gradient-red text-white text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
            >
              + Új harcos
            </Link>
          </div>
        </header>

        {fighters.length === 0 ? (
          <div className="card-dark rounded-2xl p-8 text-center text-gray-500 text-sm">
            Még nincs harcos a rendszerben. Hozz létre egyet a &ldquo;+ Új
            harcos&rdquo; gombbal.
          </div>
        ) : (
          <ul className="space-y-3">
            {fighters.map((f) => (
              <li
                key={f.slug}
                className="card-dark rounded-xl px-4 py-3 flex items-center gap-4"
              >
                <div className="relative w-14 h-14 rounded-lg overflow-hidden bg-brand-dark-muted shrink-0">
                  <Image
                    src={f.photo}
                    alt={pickLocalized(f.name, DEFAULT_LOCALE)}
                    fill
                    sizes="56px"
                    className="object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-white truncate">
                    {pickLocalized(f.name, DEFAULT_LOCALE)}
                  </p>
                  <p className="text-xs text-gray-500">
                    /{f.slug} · {f.country} · {f.weightClass.hu ?? f.weightClass.en ?? ''}
                  </p>
                  <p className="text-[10px] text-gray-600 mt-0.5">
                    Mérleg {f.record.wins}-{f.record.losses}-{f.record.draws} ·
                    sorrend {f.sortOrder} ·
                    {f.published ? (
                      <span className="text-emerald-400"> publikálva</span>
                    ) : (
                      <span className="text-gray-500"> vázlat</span>
                    )}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Link
                    href={`/dashboard/fighters/${f.slug}`}
                    className="text-xs uppercase tracking-widest font-bold text-gray-300 hover:text-white border border-brand-dark-border hover:border-gray-500 rounded-lg px-3 py-1.5 transition-colors"
                  >
                    Szerkesztés
                  </Link>
                  <DeleteButton slug={f.slug} />
                </div>
              </li>
            ))}
          </ul>
        )}

        <p className="text-xs text-gray-600 mt-8 max-w-md">
          A teljes adminisztrációs felület (rich-text szerkesztő, médiakezelő,
          audit log) az L6-os kártyánál készül el. Ez a nézet L3 szintű
          &ldquo;basic CRUD&rdquo;: név, történet, EFU út, mérleg, videók.
        </p>
      </div>
    </main>
  );
}
