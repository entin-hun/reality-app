'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type PayMethod = 'card' | 'apple' | 'google';

export default function CheckoutPage() {
  const [step, setStep] = useState<'choose' | 'card' | 'processing' | 'done'>('choose');
  const [payMethod, setPayMethod] = useState<PayMethod>('card');
  const [legalAccepted, setLegalAccepted] = useState(false);
  const router = useRouter();

  const handleNativePay = async (method: 'apple' | 'google') => {
    if (!legalAccepted) return;
    setPayMethod(method);
    setStep('processing');
    await new Promise((r) => setTimeout(r, 2000));
    localStorage.setItem('cw_access', 'granted');
    localStorage.setItem('cw_logged_in', 'true');
    router.push('/success');
  };

  const handleCardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!legalAccepted) return;
    setStep('processing');
    await new Promise((r) => setTimeout(r, 2200));
    localStorage.setItem('cw_access', 'granted');
    localStorage.setItem('cw_logged_in', 'true');
    router.push('/success');
  };

  return (
    <main className="min-h-screen pt-16 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        {/* Stripe-style header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 text-gray-500 text-xs mb-4">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" />
            </svg>
            Stripe által védett fizetés
          </div>
          <div className="card-dark rounded-xl p-4 text-left mb-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white font-bold">Elite Fight Universe 2026 Szezonbérlet</p>
                <p className="text-gray-500 text-sm">Teljes szezon · minden esemény benne van</p>
              </div>
              <div className="text-right">
                <p className="text-white font-black text-xl">2 500 HUF</p>
                <p className="text-gray-600 text-xs">egyszeri díj</p>
              </div>
            </div>
          </div>
        </div>

        {step === 'choose' && (
          <div className="card-dark rounded-2xl p-6">
            <p className="text-xs text-gray-500 uppercase tracking-widest mb-4">Fizetési mód</p>

            <label className="mb-4 flex items-start gap-3 rounded-lg border border-brand-dark-border bg-black/20 p-3 text-sm leading-relaxed text-gray-300">
              <input checked={legalAccepted} onChange={(e) => setLegalAccepted(e.target.checked)} type="checkbox" className="mt-1" />
              <span>Elolvastam és elfogadom az <Link className="text-brand-red underline" href="/legal/terms" target="_blank">ÁSZF-et</Link>, valamint tudomásul veszem az <Link className="text-brand-red underline" href="/legal/privacy" target="_blank">adatkezelési tájékoztatót</Link>.</span>
            </label>

            {/* Apple Pay */}
            <button
              onClick={() => handleNativePay('apple')}
              disabled={!legalAccepted}
              className="w-full bg-white text-black font-bold py-4 rounded-xl flex items-center justify-center gap-2 text-base mb-3 hover:bg-gray-100 transition-colors active:scale-95"
            >
              <span className="text-lg"></span> Apple Pay
            </button>

            {/* Google Pay */}
            <button
              onClick={() => handleNativePay('google')}
              disabled={!legalAccepted}
              className="w-full bg-white text-black font-bold py-4 rounded-xl flex items-center justify-center gap-2 text-base mb-5 hover:bg-gray-100 transition-colors active:scale-95"
            >
              <span className="font-bold text-blue-600">G</span>
              <span className="font-bold text-red-500">o</span>
              <span className="font-bold text-yellow-500">o</span>
              <span className="font-bold text-blue-600">g</span>
              <span className="font-bold text-green-600">l</span>
              <span className="font-bold text-red-500">e</span>
              <span className="ml-1">Pay</span>
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="flex-1 h-px bg-brand-dark-border" />
              <span className="text-gray-600 text-xs uppercase tracking-wider">vagy fizess kártyával</span>
              <div className="flex-1 h-px bg-brand-dark-border" />
            </div>

            {/* Card form */}
            <form onSubmit={handleCardSubmit} className="flex flex-col gap-4">
              <div>
                <label className="text-xs text-gray-500 uppercase tracking-wider mb-1.5 block">
                  Kártyaszám
                </label>
                <input
                  type="text"
                  placeholder="4242 4242 4242 4242"
                  defaultValue="4242 4242 4242 4242"
                  className="w-full bg-brand-dark-muted border border-brand-dark-border rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-gray-500 text-base"
                  maxLength={19}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-wider mb-1.5 block">
                    Lejárat
                  </label>
                  <input
                    type="text"
                    placeholder="MM / YY"
                    defaultValue="12 / 28"
                    className="w-full bg-brand-dark-muted border border-brand-dark-border rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-gray-500"
                    maxLength={7}
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-wider mb-1.5 block">
                    CVC
                  </label>
                  <input
                    type="text"
                    placeholder="•••"
                    defaultValue="123"
                    className="w-full bg-brand-dark-muted border border-brand-dark-border rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-gray-500"
                    maxLength={4}
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 uppercase tracking-wider mb-1.5 block">
                  Kártyabirtokos neve
                </label>
                <input
                  type="text"
                  placeholder="Teljes név"
                  defaultValue="Demo Felhasználó"
                  className="w-full bg-brand-dark-muted border border-brand-dark-border rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-gray-500"
                />
              </div>
              <button type="submit" disabled={!legalAccepted} className="btn-primary w-full py-4 text-base mt-1 disabled:cursor-not-allowed disabled:opacity-50">
                Fizetés: 2 500 HUF
              </button>
            </form>
          </div>
        )}

        {step === 'processing' && (
          <div className="card-dark rounded-2xl p-12 text-center">
            <div className="flex justify-center mb-6">
              <svg className="animate-spin w-16 h-16 text-brand-red" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="60" strokeDashoffset="20" strokeOpacity="0.3" />
                <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
              </svg>
            </div>
            <p className="text-white font-bold text-xl mb-2">Fizetés feldolgozása...</p>
            <p className="text-gray-500 text-sm">
              {payMethod === 'apple' ? 'Apple Pay hitelesítése...' : payMethod === 'google' ? 'Google Pay hitelesítése...' : 'Kártya biztonságos terhelése...'}
            </p>
          </div>
        )}

        {/* Back link */}
        {step === 'choose' && (
          <Link href="/#pricing" className="block text-center text-gray-600 hover:text-gray-400 text-sm mt-4 transition-colors">
            ← Vissza az árakhoz
          </Link>
        )}
      </div>
    </main>
  );
}
