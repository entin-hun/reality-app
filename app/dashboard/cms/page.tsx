/**
 * /dashboard/cms — CMS landing page.
 *
 * The CMS page-editor ("pages") is intentionally hidden until the in-app
 * editor is ready. We render a placeholder rather than redirecting so the
 * landing URL still answers cleanly (no 404), and the operator who
 * accidentally bookmarks /dashboard/cms sees the same disabled state.
 */

export const dynamic = 'force-dynamic';

export default function CmsLandingPage() {
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
          Tartalom (CMS)
        </h1>
        <div className="card-dark rounded-2xl p-8 text-center">
          <div className="text-6xl mb-6">🚧</div>
          <h2 className="text-xl font-bold text-white mb-2">
            Az oldalszerkesztő jelenleg rejtett
          </h2>
          <p className="text-gray-400 text-sm max-w-md mx-auto">
            A CMS oldalszerkesztő a Tartalom (Tartalomkeszito) csapat belső
            szerkesztőfelülete, amíg nem végleges, nem jelenik meg a
            navigációban. A többi tartalomszakasz (Hírek, Videók, Fotók,
            Harcos profilok) továbbra is elérhető.
          </p>
        </div>
      </div>
    </main>
  );
}
