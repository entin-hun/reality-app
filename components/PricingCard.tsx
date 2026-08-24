'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { sendGAEvent } from './GoogleAnalytics';

const QRCodeSVG = dynamic(
  () => import('qrcode.react').then((mod) => mod.QRCodeSVG),
  { ssr: false }
);

const CHECKOUT_URL =
  typeof window !== 'undefined'
    ? `${window.location.origin}/checkout`
    : 'https://elitefightuniverse.live/checkout';

const features = [
  '✓ Az összes meccs a 2026-os szezonban',
  '✓ Élő HD + 4K stream',
  '✓ Azonnali visszanézés minden meccs után',
  '✓ Több eszközön (TV, telefon, laptop)',
  '✓ Magyar kommentár sáv',
];

export function PricingCard() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [hasPurchased, setHasPurchased] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [checkoutUrl, setCheckoutUrl] = useState('https://elitefightuniverse.live/checkout');
  const router = useRouter();

  useEffect(() => {
    setIsLoggedIn(localStorage.getItem('cw_logged_in') === 'true');
    setHasPurchased(localStorage.getItem('cw_access') === 'granted');
    if (typeof window !== 'undefined') {
      setCheckoutUrl(`${window.location.origin}/checkout`);
    }
  }, []);

  const handleCheckout = async () => {
    if (!isLoggedIn) {
      localStorage.setItem('cw_logged_in', 'true');
      setIsLoggedIn(true);
    }
    setLoading(true);
    // Simulate API call to /api/checkout
    await new Promise((r) => setTimeout(r, 1200));
    setLoading(false);
    sendGAEvent('checkout_start', { source: 'pricing_card' });
    router.push('/checkout');
  };

  if (hasPurchased) {
    return (
      <div className="max-w-lg mx-auto card-dark rounded-2xl p-8 text-center border-brand-gold/30 border">
        <div className="text-5xl mb-4">🏆</div>
        <h3 className="text-2xl font-black text-brand-gold mb-2" style={{ fontFamily: 'Impact' }}>
          BÉRLET AKTÍV
        </h3>
        <p className="text-gray-400 mb-6">Teljes hozzáférésed van a 2026-os szezon összes meccséhez.</p>
        <a
          href="/watch"
          className="btn-primary inline-flex items-center gap-2 text-lg"
        >
          <span>▶</span> Nézem élőben
        </a>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto relative">
      {/* Glow */}
      <div className="absolute -inset-px bg-gradient-to-b from-brand-red via-brand-red/20 to-transparent rounded-2xl blur-sm" />

      <div className="relative card-dark rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="gradient-red px-6 py-5 text-center">
          <p className="text-red-200 text-xs uppercase tracking-widest mb-1 font-semibold">
            2026-os Szezonbérlet
          </p>
          <div className="flex items-baseline justify-center gap-2">
            <span
              className="text-6xl sm:text-7xl font-black text-white"
              style={{ fontFamily: 'Impact, Arial Black, sans-serif' }}
            >
              2 500
            </span>
            <span className="text-2xl font-bold text-red-200">HUF</span>
          </div>
          <p className="text-red-200 text-sm mt-1">Egyszeri díj · Teljes szezon hozzáférés</p>
        </div>

        {/* Features */}
        <div className="px-6 py-6">
          <ul className="flex flex-col gap-3 mb-8">
            {features.map((f) => (
              <li key={f} className="flex items-center gap-2 text-gray-300 text-sm">
                <span className="text-brand-gold">{f.slice(0, 1)}</span>
                <span className="text-brand-gold">{f.slice(2, 3)}</span>
                <span>{f.slice(3)}</span>
              </li>
            ))}
          </ul>

          {/* Main CTA Button */}
          <button
            onClick={handleCheckout}
            disabled={loading}
            className="btn-primary w-full text-lg py-5 flex items-center justify-center gap-2 disabled:opacity-70"
          >
            {loading ? (
              <>
                <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="3" strokeDasharray="60" strokeDashoffset="20" />
                </svg>
                Feldolgozás...
              </>
            ) : (
              'Szezonbérlet kérése'
            )}
          </button>

          {/* Payment icons */}
          <div className="flex items-center justify-center gap-3 mt-4 flex-wrap">
            <span className="bg-white rounded px-2 py-1 text-black text-xs font-bold">VISA</span>
            <span className="bg-white rounded px-2 py-1 text-black text-xs font-bold">MC</span>
            <span className="bg-[#000000] border border-gray-700 rounded px-2 py-1 text-white text-xs font-medium flex items-center gap-1">
               Apple Pay
            </span>
            <span className="bg-white rounded px-2 py-1 text-gray-800 text-xs font-medium flex items-center gap-1">
              <span className="text-blue-500">G</span> Pay
            </span>
          </div>

          <p className="text-center text-gray-600 text-xs mt-3">
            Stripe által titkosítva és védve
          </p>
        </div>

        {/* QR Code Section */}
        <div className="border-t border-brand-dark-border px-6 py-5">
          <button
            onClick={() => setShowQR(!showQR)}
            className="w-full flex items-center justify-between text-sm text-gray-400 hover:text-white transition-colors"
          >
            <div className="flex items-center gap-2">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="3" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
                <path d="M14 14h7v7" />
                <path d="M14 14v3" />
                <path d="M17 14h1" />
              </svg>
              <span className="font-medium">Fizess azonnal telefonnal — QR-kód beolvasás</span>
            </div>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className={`transition-transform ${showQR ? 'rotate-180' : ''}`}
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>

          {showQR && (
            <div className="mt-5 flex flex-col items-center gap-4 animate-slide-up">
              <p className="text-xs text-gray-500 text-center">
                Olvasd be a telefonoddal, és fizess azonnal Google Pay vagy Apple Pay segítségével.
              </p>
              <div className="bg-white p-4 rounded-xl inline-block">
                <QRCodeSVG
                  value={checkoutUrl}
                  size={180}
                  bgColor="#FFFFFF"
                  fgColor="#0A0A0A"
                  level="M"
                />
              </div>
              <div className="flex gap-3 text-xs text-gray-500">
                <span>Beolvasás →</span>
                <span className="text-brand-gold">Apple Pay / G Pay →</span>
                <span>Kész ✓</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
