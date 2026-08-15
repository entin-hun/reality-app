'use client';

/**
 * AdminSidebar — role-aware navigation for /dashboard/*.
 *
 * - Server pre-filters sections via `sectionsForRole` and passes only the
 *   ones the current role can see. The client never sees or hides sections
 *   it shouldn't (no leak via DevTools).
 * - Desktop: collapsible to icons-only (persists to localStorage).
 * - Mobile: full-screen drawer, controlled by `open` prop from layout.
 * - Active link styling via `usePathname`.
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  ADMIN_SECTIONS,
  type AdminSectionDef,
} from '@/lib/auth/role-sections';
import type { Locale } from '@/lib/i18n';

interface IconProps {
  className?: string;
}

// Inline SVG icons so we don't add a heavy icon dependency for the admin shell.
// lucide-react is in package.json but using it here would couple the sidebar
// to the lucide import path; these tiny glyphs keep the bundle small.
const Icon: Record<AdminSectionDef['icon'], (p: IconProps) => JSX.Element> = {
  home: (p) => (
    <svg viewBox="0 0 24 24" className={p.className} fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 12L12 3l9 9" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 10v10h14V10" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  inbox: (p) => (
    <svg viewBox="0 0 24 24" className={p.className} fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 13l3-8h12l3 8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 13v6h18v-6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 13h5l1 2h6l1-2h5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  chart: (p) => (
    <svg viewBox="0 0 24 24" className={p.className} fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 19h16" strokeLinecap="round" />
      <rect x="6" y="11" width="3" height="6" rx="0.5" />
      <rect x="11" y="7" width="3" height="10" rx="0.5" />
      <rect x="16" y="13" width="3" height="4" rx="0.5" />
    </svg>
  ),
  calendar: (p) => (
    <svg viewBox="0 0 24 24" className={p.className} fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18" strokeLinecap="round" />
      <path d="M8 3v4M16 3v4" strokeLinecap="round" />
    </svg>
  ),
  swords: (p) => (
    <svg viewBox="0 0 24 24" className={p.className} fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14.5 17.5L20 12l-2-2-5.5 5.5" strokeLinecap="round" />
      <path d="M13 16l-3 3-3-3 3-3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M19 13l3-3-3-3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  trophy: (p) => (
    <svg viewBox="0 0 24 24" className={p.className} fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M8 21h8M12 17v4" strokeLinecap="round" />
      <path d="M7 4h10v5a5 5 0 0 1-10 0V4z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 6H3a3 3 0 0 0 3 3M19 6h2a3 3 0 0 1-3 3" strokeLinecap="round" />
    </svg>
  ),
  vote: (p) => (
    <svg viewBox="0 0 24 24" className={p.className} fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
    </svg>
  ),
  zap: (p) => (
    <svg viewBox="0 0 24 24" className={p.className} fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M13 2L3 14h7l-1 8 11-13h-7l1-7z" strokeLinejoin="round" />
    </svg>
  ),
  music: (p) => (
    <svg viewBox="0 0 24 24" className={p.className} fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 18V5l12-2v13" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </svg>
  ),
  file: (p) => (
    <svg viewBox="0 0 24 24" className={p.className} fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9l-6-6z" strokeLinejoin="round" />
      <path d="M14 3v6h6" strokeLinejoin="round" />
    </svg>
  ),
  news: (p) => (
    <svg viewBox="0 0 24 24" className={p.className} fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="5" width="18" height="14" rx="1.5" />
      <path d="M7 9h6M7 13h10M7 17h10" strokeLinecap="round" />
    </svg>
  ),
  video: (p) => (
    <svg viewBox="0 0 24 24" className={p.className} fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="6" width="14" height="12" rx="2" />
      <path d="M17 10l4-2v8l-4-2v-4z" strokeLinejoin="round" />
    </svg>
  ),
  image: (p) => (
    <svg viewBox="0 0 24 24" className={p.className} fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="9" cy="10" r="2" />
      <path d="M3 18l5-5 4 4 3-3 6 6" strokeLinejoin="round" />
    </svg>
  ),
  user: (p) => (
    <svg viewBox="0 0 24 24" className={p.className} fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" strokeLinecap="round" />
    </svg>
  ),
  handshake: (p) => (
    <svg viewBox="0 0 24 24" className={p.className} fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 12l4-4 5 5-4 4-5-5zM21 12l-4-4-5 5 4 4 5-5z" strokeLinejoin="round" />
      <path d="M9 14l3-3 3 3" strokeLinecap="round" />
    </svg>
  ),
  link: (p) => (
    <svg viewBox="0 0 24 24" className={p.className} fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1" strokeLinecap="round" />
      <path d="M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1" strokeLinecap="round" />
    </svg>
  ),
  shield: (p) => (
    <svg viewBox="0 0 24 24" className={p.className} fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 3l8 3v6c0 5-3.5 8.5-8 9-4.5-.5-8-4-8-9V6l8-3z" strokeLinejoin="round" />
    </svg>
  ),
  users: (p) => (
    <svg viewBox="0 0 24 24" className={p.className} fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2 21a7 7 0 0 1 14 0" strokeLinecap="round" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M16 21a5 5 0 0 1 6 0" strokeLinecap="round" />
    </svg>
  ),
  key: (p) => (
    <svg viewBox="0 0 24 24" className={p.className} fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="8" cy="14" r="4" />
      <path d="M11 11l9-9M16 6l3 3" strokeLinecap="round" />
    </svg>
  ),
  scroll: (p) => (
    <svg viewBox="0 0 24 24" className={p.className} fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M5 3h11a3 3 0 0 1 3 3v11a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V5a2 2 0 0 1 2-2z" strokeLinejoin="round" />
      <path d="M9 8h7M9 12h7" strokeLinecap="round" />
    </svg>
  ),
  settings: (p) => (
    <svg viewBox="0 0 24 24" className={p.className} fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h.1a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v.1a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" strokeLinejoin="round" />
    </svg>
  ),
};

interface GroupRender {
  group: AdminSectionDef['group'];
  label: string;
  sections: AdminSectionDef[];
}

export interface AdminSidebarProps {
  roleLabel: string; // i18n key path -> already resolved string from server
  sections: AdminSectionDef[]; // server-filtered
  groups: GroupRender[]; // server-grouped, with labels
  tagline: string;
  backToSiteLabel: string;
  openMobile: boolean;
  onCloseMobile: () => void;
  locale: Locale;
}

/**
 * Sidebar root. `collapsed` is local state (desktop only).
 * On mobile, `openMobile` controls the full-screen overlay drawer.
 */
export function AdminSidebar({
  roleLabel,
  sections,
  groups,
  tagline,
  backToSiteLabel,
  openMobile,
  onCloseMobile,
  locale,
}: AdminSidebarProps) {
  const pathname = usePathname() ?? '';
  const [collapsed, setCollapsed] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // Read collapsed preference once on mount.
  useEffect(() => {
    try {
      const saved = localStorage.getItem('efu_admin_sidebar_collapsed');
      if (saved === '1') setCollapsed(true);
    } catch {
      /* localStorage unavailable */
    }
    setHydrated(true);
  }, []);

  // Persist collapsed preference.
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem('efu_admin_sidebar_collapsed', collapsed ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, [collapsed, hydrated]);

  // Lock body scroll when the mobile drawer is open.
  useEffect(() => {
    if (!openMobile) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [openMobile]);

  const isActive = (href: string): boolean => {
    if (href === '/admin') return pathname === '/admin' || pathname === `/${locale}/admin`;
    return pathname === href || pathname.startsWith(href + '/');
  };

  // Sidebar contents shared between desktop (in-flow) and mobile (overlay).
  const SidebarInner = (
    <div className="flex h-full flex-col bg-brand-dark-card border-brand-dark-border">
      {/* Header / brand */}
      <div className={`flex items-center gap-3 border-b border-brand-dark-border px-4 ${collapsed ? 'h-16 justify-center' : 'h-16'}`}>
        <Link
          href="/"
          onClick={onCloseMobile}
          className="flex items-center gap-2 shrink-0"
          aria-label={backToSiteLabel}
        >
          <div className="w-8 h-8 gradient-red rounded flex items-center justify-center">
            <span className="text-white font-black text-sm" style={{ fontFamily: 'Impact' }}>EFU</span>
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-white font-black uppercase text-sm leading-tight truncate">EFU Admin</p>
              <p className="text-gray-500 text-[10px] leading-tight truncate">{tagline}</p>
            </div>
          )}
        </Link>
      </div>

      {/* Role badge */}
      <div className={`px-4 py-3 border-b border-brand-dark-border ${collapsed ? 'flex justify-center' : ''}`}>
        {collapsed ? (
          <span
            title={roleLabel}
            className="w-8 h-8 rounded-full bg-brand-red/15 border border-brand-red/40 flex items-center justify-center text-brand-red text-xs font-black"
          >
            {roleLabel.charAt(0).toUpperCase()}
          </span>
        ) : (
          <div>
            <p className="text-[10px] uppercase tracking-widest text-gray-500 font-semibold">Bejelentkezve</p>
            <p className="text-brand-red font-bold text-sm leading-tight truncate">{roleLabel}</p>
          </div>
        )}
      </div>

      {/* Nav scroll area */}
      <nav className="flex-1 overflow-y-auto py-2" aria-label="Admin navigation">
        {groups.map((g) => (
          <div key={g.group} className="mb-2">
            {!collapsed && (
              <p className="px-4 py-2 text-[10px] uppercase tracking-widest text-gray-600 font-bold">
                {g.label}
              </p>
            )}
            <ul className="space-y-0.5">
              {g.sections.map((s) => {
                const IconComp = Icon[s.icon];
                const active = isActive(s.href);
                const linkCls = active
                  ? 'bg-brand-red text-white'
                  : 'text-gray-400 hover:bg-brand-dark-muted hover:text-white';
                return (
                  <li key={s.key}>
                    <Link
                      href={s.href}
                      onClick={onCloseMobile}
                      title={collapsed ? s.i18nKey : undefined}
                      aria-current={active ? 'page' : undefined}
                      className={`flex items-center gap-3 mx-2 rounded-lg transition-colors text-sm font-medium ${linkCls} ${collapsed ? 'justify-center h-10 w-10' : 'px-3 py-2'}`}
                    >
                      <IconComp className="w-5 h-5 shrink-0" />
                      {!collapsed && <span className="truncate">{s.i18nKey}</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Collapse toggle (desktop only) */}
      <div className="hidden lg:block border-t border-brand-dark-border p-2">
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          aria-label={collapsed ? 'expand sidebar' : 'collapse sidebar'}
          className={`w-full flex items-center gap-2 rounded-lg text-xs text-gray-500 hover:text-white hover:bg-brand-dark-muted transition-colors ${collapsed ? 'justify-center h-10' : 'px-3 py-2'}`}
        >
          <svg viewBox="0 0 24 24" className={`w-4 h-4 transition-transform ${collapsed ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {!collapsed && <span>{collapsed ? '»' : '«'}</span>}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={`hidden lg:flex shrink-0 border-r border-brand-dark-border transition-[width] duration-200 ${collapsed ? 'w-16' : 'w-64'}`}
        data-testid="admin-sidebar-desktop"
      >
        {SidebarInner}
      </aside>

      {/* Mobile drawer */}
      <div
        className={`lg:hidden fixed inset-0 z-50 ${openMobile ? '' : 'pointer-events-none'}`}
        aria-hidden={!openMobile}
      >
        {/* Backdrop */}
        <div
          onClick={onCloseMobile}
          className={`absolute inset-0 bg-black transition-opacity ${openMobile ? 'opacity-70' : 'opacity-0'}`}
        />
        {/* Drawer */}
        <aside
          className={`absolute inset-y-0 start-0 w-72 max-w-[85vw] transition-transform ${openMobile ? 'translate-x-0' : '-translate-x-full rtl:translate-x-full'}`}
          data-testid="admin-sidebar-mobile"
        >
          {SidebarInner}
        </aside>
      </div>
    </>
  );
}

// Re-export the icon type for any test that wants to iterate icons.
export type { IconProps };
// Reference ADMIN_SECTIONS to satisfy "value is never read" if any tree-shake
// happens to drop it. Keeps the sidebar testable in isolation.
export const __ADMIN_SECTIONS_REF = ADMIN_SECTIONS.length;