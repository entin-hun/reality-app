'use client';

import Link from 'next/link';
import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Application error:', error);
  }, [error]);

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
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
        </div>

        <h1 className="text-6xl font-black text-white mb-4 uppercase tracking-tight">
          Hiba történt
        </h1>

        <h2 className="text-2xl font-bold text-white mb-4">
          Valami nem működik
        </h2>

        <p className="text-gray-400 mb-8 text-lg">
          Elnézést kérünk a kellemetlenségért. Kérjük, próbáld újra, vagy térj vissza a főoldalra.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={reset}
            className="btn-primary px-8 py-4 text-lg font-bold uppercase tracking-wide"
          >
            Újrapróbálom
          </button>
          <Link
            href="/"
            className="btn-secondary px-8 py-4 text-lg font-bold uppercase tracking-wide"
          >
            Vissza a főoldalra
          </Link>
        </div>

        <div className="mt-12 text-sm text-gray-500">
          <p>
            Ha a probléma továbbra is fennáll,{' '}
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
