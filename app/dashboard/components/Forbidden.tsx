/**
 * Shared 403 page for admin routes.
 *
 * Centralizes the copy + dev-role hint so every admin page renders
 * the same "you don't have access" screen. When L1-AUTH-RBAC ships,
 * the dev role hint fades out and the page presents a real login CTA.
 */

export function Forbidden({ message }: { message?: string }) {
  return (
    <main className="min-h-screen pt-24 px-4">
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
          {message ??
            'Az EFU adminisztrációs felületéhez bejelentkezés szükséges. A fejlesztői környezetben a hozzáférést az efu_role süti határozza meg (L1-AUTH-RBAC).'}
        </p>
        <p className="text-gray-600 text-xs mt-6">
          Bejelentkezés szimulálása fejlesztéshez: böngésző konzolban{' '}
          <code className="text-brand-gold">
            document.cookie = &quot;efu_role=Rendszeradminisztrator&quot;
          </code>
        </p>
      </div>
    </main>
  );
}
