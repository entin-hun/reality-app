'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { DEFAULT_LOCALE, type Locale, LOCALES } from '@/lib/i18n';
import { LiveNowIndicator } from '@/components/LiveNowIndicator';

/**
 * Rólunk link label per locale. Kept inline (rather than loading an
 * entire namespace) because it's a single short string and the navbar
 * already reads locale for routing purposes.
 */
const ABOUT_LABELS: Record<Locale, string> = {
  hu: 'Rólunk',
  en: 'About',
  de: 'Über uns',
  ar: 'من نحن',
  sk: 'O nás',
  ro: 'Despre noi',
  hr: 'O nama',
  sr: 'O nama',
  sl: 'O nas',
};

function readLocale(): Locale {
  if (typeof document === 'undefined') return DEFAULT_LOCALE;
  const m = document.cookie.match(/(?:^|;\s*)NEXT_LOCALE=([^;]+)/);
  const fromCookie = m?.[1];
  if (fromCookie && (LOCALES as readonly string[]).includes(fromCookie)) {
    return fromCookie as Locale;
  }
  if (typeof navigator !== 'undefined' && navigator.language) {
    const lang = navigator.language.toLowerCase();
    for (const loc of LOCALES) {
      if (lang.includes(loc)) return loc;
    }
  }
  return DEFAULT_LOCALE;
}

export function Navbar() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [hasPurchased, setHasPurchased] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [locale, setLocale] = useState<Locale>(DEFAULT_LOCALE);
  const pathname = usePathname();

  useEffect(() => {
    setIsLoggedIn(localStorage.getItem('cw_logged_in') === 'true');
    setHasPurchased(localStorage.getItem('cw_access') === 'granted');
    setLocale(readLocale());
  }, [pathname]);

  const handleLogin = () => {
    localStorage.setItem('cw_logged_in', 'true');
    setIsLoggedIn(true);
    setMenuOpen(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('cw_logged_in');
    localStorage.removeItem('cw_access');
    setIsLoggedIn(false);
    setHasPurchased(false);
    setMenuOpen(false);
    window.location.href = '/';
  };

  const aboutLabel = ABOUT_LABELS[locale] ?? ABOUT_LABELS[DEFAULT_LOCALE];
  // RTL: padding/margin on the open menu should match the layout direction
  const isRtl = locale === 'ar';

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-brand-dark/90 backdrop-blur-sm border-b border-brand-dark-border">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <div className="relative w-8 h-8">
            <Image
              src="/logos/efu-logo.webp"
              alt="EFU"
              fill
              className="object-contain"
              priority
            />
          </div>
          <span
            className="text-white font-black text-xl uppercase tracking-wider hidden sm:block"
            style={{ fontFamily: 'Impact, Arial Black, sans-serif' }}
          >
            ELITE FIGHT UNIVERSE
          </span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden sm:flex items-center gap-6">
          <Link
            href="/rolunk"
            className="text-gray-400 hover:text-white text-sm font-medium transition-colors"
          >
            {aboutLabel}
          </Link>
          <Link href="/#pricing" className="text-gray-400 hover:text-white text-sm font-medium transition-colors">
            Bérlet
          </Link>
          <Link href="/#fight-card" className="text-gray-400 hover:text-white text-sm font-medium transition-colors">
            Mérkőzés
          </Link>
          <Link href="/reality" className="text-gray-400 hover:text-white text-sm font-medium transition-colors">
            Reality
          </Link>
          {/* Live indicator — always visible (even pre-purchase) so visitors
              can find /watch during the promotional window. Renders a
              pulsing red pill when something is on air; otherwise a
              neutral "Média" link. */}
          <LiveNowIndicator variant="pill" />
          {isLoggedIn ? (
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-500 border border-brand-dark-border rounded px-2 py-1">
                {hasPurchased ? '✅ Bérlet aktív' : '⚠ Nincs bérlet'}
              </span>
              <button
                onClick={handleLogout}
                className="text-sm text-gray-400 hover:text-white transition-colors"
              >
                Kijelentkezés
              </button>
            </div>
          ) : (
            <Link
              href="/jelentkezz"
              className="btn-primary text-sm px-4 py-2"
            >
              Jelentkezz
            </Link>
          )}
        </div>

        {/* Mobile Burger */}
        <button
          className="sm:hidden text-white p-2"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Menu"
        >
          <div className="w-6 flex flex-col gap-1.5">
            <span className={`h-0.5 bg-white transition-all ${menuOpen ? 'rotate-45 translate-y-2' : ''}`} />
            <span className={`h-0.5 bg-white transition-all ${menuOpen ? 'opacity-0' : ''}`} />
            <span className={`h-0.5 bg-white transition-all ${menuOpen ? '-rotate-45 -translate-y-2' : ''}`} />
          </div>
        </button>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div
          dir={isRtl ? 'rtl' : 'ltr'}
          className="sm:hidden bg-brand-dark-card border-t border-brand-dark-border px-4 py-4 flex flex-col gap-4"
        >
          <Link
            href="/rolunk"
            onClick={() => setMenuOpen(false)}
            className="text-gray-300 font-medium"
          >
            {aboutLabel}
          </Link>
          <Link href="/#pricing" className="text-gray-300 font-medium" onClick={() => setMenuOpen(false)}>
            Bérlet
          </Link>
          <Link href="/reality" className="text-gray-300 font-medium" onClick={() => setMenuOpen(false)}>
            Reality
          </Link>
          {/* Mobile: always-visible live indicator */}
          <LiveNowIndicator variant="pill" />
          {isLoggedIn ? (
            <button onClick={handleLogout} className="text-sm text-gray-400 text-left">
              Kijelentkezés
            </button>
          ) : (
            <Link
              href="/jelentkezz"
              onClick={() => setMenuOpen(false)}
              className="btn-primary text-sm px-4 py-2 text-center"
            >
              Jelentkezz
            </Link>
          )}
        </div>
      )}
    </nav>
  );
}