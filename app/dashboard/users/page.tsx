import { requireRole } from '@/lib/auth/dev-role';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

/**
 * Felhasználókezelő oldal - Rendszeradminisztrátor számára
 * Itt lehet szerkesztőket hozzáadni különböző szerepkörökkel
 */
export default async function AdminUsersPage() {
  const guard = await requireRole(['Rendszeradminisztrator']);
  if (!guard.ok) {
    redirect('/admin');
  }

  const roles = [
    {
      id: 'Rendszeradminisztrator',
      name: 'Rendszeradminisztrátor',
      description: 'Teljes hozzáférés mindenhez',
      color: 'bg-red-500',
      permissions: ['Minden jogosultság'],
    },
    {
      id: 'Producer',
      name: 'Producer',
      description: 'Harcosok és tartalmak szerkesztése',
      color: 'bg-purple-500',
      permissions: ['Harcosok kezelése', 'Tartalmak szerkesztése', 'CMS oldalak'],
    },
    {
      id: 'Reality szerkeszto',
      name: 'Reality szerkesztő',
      description: 'Reality tartalmak kezelése',
      color: 'bg-blue-500',
      permissions: ['Reality tartalmak', 'Harcosok kezelése'],
    },
    {
      id: 'Tartalomkeszito',
      name: 'Tartalomkészítő',
      description: 'CMS oldalak és média kezelése',
      color: 'bg-green-500',
      permissions: ['CMS oldalak', 'Média feltöltés'],
    },
    {
      id: 'Marketing',
      name: 'Marketing',
      description: 'Marketing tartalmak és analytics',
      color: 'bg-yellow-500',
      permissions: ['Analytics', 'Marketing tartalmak'],
    },
    {
      id: 'Moderator',
      name: 'Moderátor',
      description: 'Jelentkezések és kommentek kezelése',
      color: 'bg-gray-500',
      permissions: ['Jelentkezések kezelése'],
    },
  ];

  return (
    <main className="min-h-screen pt-24 pb-16 px-4">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8">
          <p className="text-brand-red text-sm uppercase tracking-widest font-semibold mb-2">
            Admin
          </p>
          <h1
            className="text-4xl sm:text-5xl font-black uppercase text-white mb-4"
            style={{ fontFamily: 'Impact, Arial Black, sans-serif' }}
          >
            Felhasználók kezelése
          </h1>
          <p className="text-gray-400 text-sm">
            Szerkesztők hozzáadása és szerepkörök kezelése
          </p>
        </header>

        {/* Utasítások */}
        <div className="card-dark rounded-2xl p-6 mb-8">
          <h2 className="text-xl font-bold text-white mb-3">
            📋 Hogyan adj hozzá szerkesztőt?
          </h2>
          <ol className="space-y-2 text-gray-300 text-sm">
            <li>
              <span className="text-brand-gold font-bold">1.</span> A szerkesztő nyissa meg a webhelyet
            </li>
            <li>
              <span className="text-brand-gold font-bold">2.</span> Nyomja meg az <kbd className="px-2 py-1 bg-brand-dark-muted rounded text-xs">F12</kbd> gombot a böngészőben
            </li>
            <li>
              <span className="text-brand-gold font-bold">3.</span> Válassza a <strong>Console</strong> fület
            </li>
            <li>
              <span className="text-brand-gold font-bold">4.</span> Illessze be a kívánt parancsot az alábbi listából
            </li>
            <li>
              <span className="text-brand-gold font-bold">5.</span> Nyomja meg az <kbd className="px-2 py-1 bg-brand-dark-muted rounded text-xs">Enter</kbd> gombot
            </li>
            <li>
              <span className="text-brand-gold font-bold">6.</span> Frissítse az oldalt (<kbd className="px-2 py-1 bg-brand-dark-muted rounded text-xs">Ctrl+R</kbd>)
            </li>
          </ol>
        </div>

        {/* Szerepkörök */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {roles.map((role) => (
            <div key={role.id} className="card-dark rounded-2xl p-6">
              <div className="flex items-start gap-4 mb-4">
                <div className={`${role.color} w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg`}>
                  {role.name.charAt(0)}
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-white mb-1">
                    {role.name}
                  </h3>
                  <p className="text-gray-400 text-sm">{role.description}</p>
                </div>
              </div>

              {/* Jogosultságok */}
              <div className="mb-4">
                <p className="text-xs uppercase tracking-widest text-gray-500 mb-2">
                  Jogosultságok
                </p>
                <ul className="space-y-1">
                  {role.permissions.map((perm, i) => (
                    <li key={i} className="text-sm text-gray-300 flex items-center gap-2">
                      <span className="text-green-400">✓</span>
                      {perm}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Parancs */}
              <div>
                <p className="text-xs uppercase tracking-widest text-gray-500 mb-2">
                  Aktiváló parancs
                </p>
                <div className="bg-brand-dark-muted rounded-lg p-3 font-mono text-xs text-brand-gold break-all">
                  document.cookie = "efu_role={role.id}; path=/; max-age=31536000"
                </div>
                <button
                  onClick={() => {
                    // Ez csak vizuális visszajelzés, a tényleges másolás a böngészőben történik
                  }}
                  className="mt-2 text-xs text-brand-red hover:text-red-400 transition-colors"
                >
                  📋 Parancs másolása
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Vissza gomb */}
        <div className="mt-8 text-center">
          <Link
            href="/admin"
            className="inline-block border border-brand-dark-border hover:border-gray-500 text-gray-300 hover:text-white font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            ← Vissza az Admin főoldalra
          </Link>
        </div>
      </div>
    </main>
  );
}
