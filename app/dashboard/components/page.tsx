/**
 * /dashboard/components — landing page for the component library.
 *
 * Hidden from the sidebar (see lib/auth/role-sections.ts). Kept as a
 * 200-OK landing for any stale bookmarks so the URL doesn't 404. Real
 * admin work lives in /dashboard/cms for content and /dashboard/fighters
 * for fighter profiles.
 */

export const dynamic = 'force-dynamic';

export default function ComponentsLandingPage() {
  return (
    <main className="min-h-screen pt-24 pb-16 px-4">
      <div className="max-w-2xl mx-auto">
        <p className="text-brand-red text-sm uppercase tracking-widest font-semibold mb-1">
          Admin
        </p>
        <h1
          className="text-3xl sm:text-4xl font-black text-white uppercase mb-3"
          style={{ fontFamily: 'Impact, Arial Black, sans-serif' }}
        >
          Komponenskönyvtár
        </h1>
        <div className="card-dark rounded-2xl p-8 text-center">
          <div className="text-6xl mb-6">🧩</div>
          <h2 className="text-xl font-bold text-white mb-2">
            A komponenskönyvtár rejtett
          </h2>
          <p className="text-gray-400 text-sm max-w-md mx-auto">
            Ez a felület jelenleg nem aktív — a fejlesztői UI könyvtárat
            közvetlenül a kódból kezeljük. A tartalmi admin
            (Hírek/Videók/Fotók/Harcosok) a Tartalom csoportban érhető el.
          </p>
        </div>
      </div>
    </main>
  );
}
