'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { sendGAEvent } from '@/components/GoogleAnalytics';

const QRCodeSVG = dynamic(
  () => import('qrcode.react').then((mod) => mod.QRCodeSVG),
  { ssr: false }
);

export default function SuccessPage() {
  const [watchUrl, setWatchUrl] = useState('https://elitefightuniverse.live/watch');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setWatchUrl(`${window.location.origin}/watch`);
      sendGAEvent('purchase', { value: 1, currency: 'EUR' });
    }
  }, []);

  return (
    <main className="min-h-screen pt-16 flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full text-center animate-fade-in">
        {/* Success Icon */}
        <div className="relative inline-flex mb-8">
          <div className="w-24 h-24 rounded-full bg-green-500/20 border-2 border-green-500/50 flex items-center justify-center">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <div className="absolute -top-1 -right-1 w-8 h-8 rounded-full bg-brand-gold flex items-center justify-center">
            <span className="text-black text-lg">🏆</span>
          </div>
        </div>

        <h1
          className="text-4xl sm:text-5xl font-black text-white uppercase mb-3"
          style={{ fontFamily: 'Impact, Arial Black, sans-serif' }}
        >
          SIKERES VÁSÁRLÁS!
        </h1>

        <p className="text-brand-gold font-semibold text-lg mb-2">
          A 2026-os szezonbérlet aktiválva
        </p>

        <p className="text-gray-400 text-sm mb-2">
          A <span className="text-white font-bold">2 500 HUF</span> összegű fizetés sikeres volt.
          A visszaigazolást elküldtük e-mailben.
        </p>

        <div className="card-dark rounded-xl p-4 my-6 text-left text-sm">
          <div className="flex justify-between mb-2">
            <span className="text-gray-500">Rendelés azonosító</span>
            <span className="text-white font-mono text-xs">pi_3mock_0001</span>
          </div>
          <div className="flex justify-between mb-2">
            <span className="text-gray-500">Termék</span>
            <span className="text-white">Elite Fight Universe 2026 Szezon</span>
          </div>
          <div className="flex justify-between mb-2">
            <span className="text-gray-500">Összeg</span>
            <span className="text-white font-bold">2 500 HUF</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Hozzáférés</span>
            <span className="text-green-400 font-medium">✓ Aktív — lejárat: 2026.12.31.</span>
          </div>
        </div>

        {/* Watch CTA */}
        <Link href="/watch" className="btn-primary w-full flex items-center justify-center gap-2 text-lg py-5 mb-4">
          <span>▶</span> Nézem élőben
        </Link>

        {/* QR for phone */}
        <div className="card-dark rounded-xl p-5">
          <p className="text-xs text-gray-500 uppercase tracking-widest mb-3">
            Folytasd telefonon
          </p>
          <div className="flex justify-center mb-3">
            <div className="bg-white p-3 rounded-lg">
              <QRCodeSVG
                value={watchUrl}
                size={120}
                bgColor="#FFFFFF"
                fgColor="#0A0A0A"
                level="M"
              />
            </div>
          </div>
          <p className="text-gray-600 text-xs">Olvasd be, és nézd telefonon vagy TV-n</p>
        </div>

        <p className="mt-6 text-gray-600 text-xs">
          Kérdés esetén: {' '}
          <a href="mailto:support@elitefightuniverse.live" className="text-gray-400 hover:text-white underline">
            support@elitefightuniverse.live
          </a>
        </p>
      </div>
    </main>
  );
}
