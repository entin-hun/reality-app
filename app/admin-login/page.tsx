'use client';

/**
 * Admin login — magic-link email flow.
 *
 * Two stages:
 *   1. User enters their email → POST /api/auth/request → if the email is
 *      in the role map, an email with a one-time 15-minute link is sent.
 *   2. User clicks the link → GET /api/auth/verify → session cookie set,
 *      redirect to /dashboard.
 *
 * The login form NEVER reveals whether an email is registered — both
 * "registered" and "unknown" cases show the same "check your email" state
 * after submission. This blocks account enumeration.
 */

import { useEffect, useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

type Status =
  | { kind: 'idle' }
  | { kind: 'submitting' }
  | { kind: 'sent'; email: string }
  | { kind: 'error'; message: string };

const ERROR_TEXT: Record<string, string> = {
  invalid_token: 'A belépési link érvénytelen. Kérj újat.',
  expired_or_used: 'A link lejárt vagy már felhasználtad. Kérj újat.',
  no_role: 'A linked érvényes, de a szerepköröd közben megváltozott. Kérj újat.',
};

export default function AdminLoginPage() {
  const router = useRouter();
  const params = useSearchParams();
  const errorParam = params.get('error');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const [, startTransition] = useTransition();

  // Already signed in? Bounce straight to /dashboard.
  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((data) => {
        if (data.authenticated) {
          startTransition(() => router.replace('/dashboard'));
        }
      })
      .catch(() => {});
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.includes('@')) {
      setStatus({ kind: 'error', message: 'Adj meg egy érvényes email címet.' });
      return;
    }
    setStatus({ kind: 'submitting' });
    try {
      const locale = document.documentElement.lang || 'hu';
      const res = await fetch('/api/auth/request', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, locale }),
      });
      if (res.status === 429) {
        setStatus({
          kind: 'error',
          message:
            'Túl sok próbálkozás. Próbáld újra 10 perc múlva.',
        });
        return;
      }
      if (!res.ok) {
        setStatus({ kind: 'error', message: 'Váratlan hiba. Próbáld újra.' });
        return;
      }
      setStatus({ kind: 'sent', email });
    } catch {
      setStatus({ kind: 'error', message: 'Hálózati hiba. Próbáld újra.' });
    }
  }

  return (
    <div className="min-h-screen bg-brand-dark flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1
            className="text-4xl sm:text-5xl font-black uppercase text-white mb-3"
            style={{ fontFamily: 'Impact, Arial Black, sans-serif' }}
          >
            EFU Admin
          </h1>
          <p className="text-gray-400 text-sm sm:text-base">
            Add meg az emailed, és küldünk egy belépési linket.
          </p>
        </div>

        {errorParam && ERROR_TEXT[errorParam] && (
          <div className="mb-4 rounded-lg border border-brand-red/40 bg-brand-red/10 px-4 py-3 text-sm text-brand-red">
            {ERROR_TEXT[errorParam]}
          </div>
        )}

        {status.kind === 'sent' ? (
          <div className="card-dark rounded-2xl p-6 text-center">
            <div className="mb-4 inline-block p-4 rounded-full bg-emerald-500/10 border border-emerald-500/30">
              <svg
                viewBox="0 0 24 24"
                className="w-10 h-10 text-emerald-400"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  d="M3 8l9 6 9-6M3 8v10a2 2 0 002 2h14a2 2 0 002-2V8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-white mb-2">
              Nézd meg a postaládádat
            </h2>
            <p className="text-gray-400 text-sm mb-4">
              Küldtünk egy belépési linket a(z){' '}
              <span className="text-brand-gold font-semibold">{status.email}</span>{' '}
              címre. A link 15 percig érvényes.
            </p>
            <p className="text-gray-500 text-xs">
              Ha nem találod, nézd meg a spam mappát is.
            </p>
            <button
              type="button"
              onClick={() => {
                setStatus({ kind: 'idle' });
                setEmail('');
              }}
              className="mt-6 text-xs text-gray-400 hover:text-white underline transition-colors"
            >
              Másik email cím megadása
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="card-dark rounded-2xl p-6 space-y-4">
            <label className="block">
              <span className="text-xs uppercase tracking-widest text-gray-500 font-bold">
                Email cím
              </span>
              <input
                type="email"
                required
                autoComplete="email"
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="te@pelda.hu"
                className="mt-2 w-full rounded-lg border border-brand-dark-border bg-brand-dark-muted px-4 py-3 text-white placeholder:text-gray-600 focus:border-brand-red focus:outline-none transition-colors"
              />
            </label>

            {status.kind === 'error' && (
              <p className="text-sm text-brand-red">{status.message}</p>
            )}

            <button
              type="submit"
              disabled={status.kind === 'submitting' || !email.includes('@')}
              className="w-full py-3 rounded-lg font-bold uppercase tracking-wider transition-all bg-brand-red hover:bg-red-700 text-white disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed"
            >
              {status.kind === 'submitting' ? 'Küldés…' : 'Belépési link küldése'}
            </button>
          </form>
        )}

        <div className="mt-6 text-center">
          <a
            href="/"
            className="text-gray-400 hover:text-white text-sm transition-colors"
          >
            ← Vissza a főoldalra
          </a>
        </div>
      </div>
    </div>
  );
}
