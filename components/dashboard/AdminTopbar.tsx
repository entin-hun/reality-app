'use client';

/**
 * AdminTopbar — top bar for /dashboard/*.
 *
 * - Mobile: hamburger to open the sidebar drawer + brand + locale + role.
 * - Desktop: only the locale switcher + role badge + logout are needed (the
 *   sidebar is always visible).
 * - Locale switch persists the choice to a `NEXT_LOCALE` cookie so the next
 *   server render reads it (matches how lib/i18n/pickLocale resolves).
 */

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { Locale } from '@/lib/i18n';
import { LOCALES, LOCALE_LABELS } from '@/lib/i18n';

interface AdminTopbarProps {
  locale: Locale;
  isRtl: boolean;
  roleLabel: string;
  pageTitle: string;
  shellTitle: string;
  languageLabel: string;
  selectLanguageLabel: string;
  logoutLabel: string;
  openMenuLabel: string;
  onOpenMobileMenu: () => void;
}

export function AdminTopbar({
  locale,
  isRtl,
  roleLabel,
  pageTitle,
  shellTitle,
  languageLabel,
  selectLanguageLabel,
  logoutLabel,
  openMenuLabel,
  onOpenMobileMenu,
}: AdminTopbarProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function setLocale(next: Locale) {
    setOpen(false);
    if (next === locale) return;
    // Persist to cookie (1 year). Server reads NEXT_LOCALE in app/layout.tsx.
    const oneYear = 60 * 60 * 24 * 365;
    document.cookie = `NEXT_LOCALE=${encodeURIComponent(next)}; path=/; max-age=${oneYear}; samesite=lax`;
    startTransition(() => {
      router.refresh();
    });
  }

  async function clearRole() {
    // Server-side logout clears the HttpOnly session cookie. We also clear
    // the legacy `efu_role` cookie in case anyone still has one set.
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // ignore — the refresh below will still show guest state
    }
    startTransition(() => {
      router.replace('/admin-login');
    });
  }

  return (
    <header className="sticky top-0 z-30 h-14 bg-brand-dark-card border-b border-brand-dark-border flex items-center px-3 sm:px-5 gap-3" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Mobile: menu toggle */}
      <button
        type="button"
        onClick={onOpenMobileMenu}
        aria-label={openMenuLabel}
        className="lg:hidden p-2 -ms-2 rounded-lg text-white hover:bg-brand-dark-muted"
      >
        <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
        </svg>
      </button>

      {/* Page title (mobile only — desktop has the sidebar hierarchy) */}
      <div className="flex-1 min-w-0">
        <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold leading-none">
          {shellTitle}
        </p>
        <h1 className="text-white font-bold text-sm sm:text-base truncate leading-tight mt-0.5">
          {pageTitle}
        </h1>
      </div>

      {/* Role badge (desktop only — mobile already shows it in the sidebar) */}
      <span
        className="hidden md:inline-flex items-center gap-1.5 text-[11px] uppercase tracking-widest font-bold px-2.5 py-1 rounded-full bg-brand-red/15 border border-brand-red/40 text-brand-red"
        title={roleLabel}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-brand-red" />
        {roleLabel}
      </span>

      {/* Locale switcher */}
      <div className="relative">
        <button
          type="button"
          aria-label={selectLanguageLabel}
          aria-haspopup="listbox"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-1.5 text-xs sm:text-sm text-gray-300 hover:text-white border border-brand-dark-border hover:border-gray-500 rounded-lg px-2.5 sm:px-3 py-1.5 transition-colors"
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="9" />
            <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
          </svg>
          <span className="hidden sm:inline">{languageLabel}:</span>
          <span className="font-semibold">{LOCALE_LABELS[locale]}</span>
        </button>
        {open && (
          <ul
            role="listbox"
            className="absolute end-0 mt-1 w-44 max-h-72 overflow-y-auto bg-brand-dark-card border border-brand-dark-border rounded-lg shadow-xl shadow-black/50 py-1 z-40"
            onMouseLeave={() => setOpen(false)}
          >
            {LOCALES.map((loc) => (
              <li key={loc}>
                <button
                  type="button"
                  role="option"
                  aria-selected={loc === locale}
                  onClick={() => setLocale(loc)}
                  className={`w-full text-start px-3 py-1.5 text-sm transition-colors ${
                    loc === locale
                      ? 'bg-brand-red/15 text-brand-red font-bold'
                      : 'text-gray-300 hover:bg-brand-dark-muted hover:text-white'
                  }`}
                >
                  {LOCALE_LABELS[loc]}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Logout / clear role */}
      <button
        type="button"
        onClick={clearRole}
        title={logoutLabel}
        className="text-xs sm:text-sm text-gray-400 hover:text-white border border-brand-dark-border hover:border-gray-500 rounded-lg px-2.5 sm:px-3 py-1.5 transition-colors"
      >
        <span className="hidden sm:inline">{logoutLabel}</span>
        <svg viewBox="0 0 24 24" className="w-4 h-4 sm:hidden" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M15 4h4v16h-4" strokeLinecap="round" />
          <path d="M3 12h12M11 8l-4 4 4 4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {pending && <span className="text-[10px] uppercase tracking-widest text-gray-600">…</span>}
    </header>
  );
}