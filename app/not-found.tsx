import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-brand-dark flex items-center justify-center px-4">
      <div className="text-center max-w-2xl">
        <div className="mb-8">
          <div className="inline-block p-6 bg-brand-red/10 rounded-full border-2 border-brand-red/30">
            <svg
              className="w-24 h-24 text-brand-red"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
        </div>

        <h1 className="text-6xl font-black text-white mb-4 uppercase tracking-tight">
          404
        </h1>

        <h2 className="text-2xl font-bold text-white mb-4">
          Az oldal nem található
        </h2>

        <p className="text-gray-400 mb-8 text-lg">
          A keresett oldal nem létezik, vagy átkerült egy másik helyre.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/"
            className="btn-primary px-8 py-4 text-lg font-bold uppercase tracking-wide"
          >
            Vissza a főoldalra
          </Link>
          <Link
            href="/jelentkezz"
            className="btn-secondary px-8 py-4 text-lg font-bold uppercase tracking-wide"
          >
            Jelentkezz harcosnak
          </Link>
        </div>

        <div className="mt-12 text-sm text-gray-500">
          <p>
            Ha úgy érzed, hogy az oldalnak itt kellene lennie,{' '}
            <Link href="/kapcsolat" className="text-brand-red hover:underline">
              vedd fel velünk a kapcsolatot
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
