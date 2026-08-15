'use client';

/**
 * AdminShell — client wrapper that owns the mobile-drawer state.
 *
 * The sidebar and topbar are siblings inside the server layout, so they
 * can't share React state directly. We bundle them inside this client
 * component to give them a single source of truth for `mobileOpen`.
 */

import { useState } from 'react';
import { AdminSidebar, type AdminSidebarProps } from './AdminSidebar';
import { AdminTopbar } from './AdminTopbar';

interface AdminShellProps
  extends Omit<AdminSidebarProps, 'openMobile' | 'onCloseMobile'> {
  pageTitle: string;
  shellTitle: string;
  languageLabel: string;
  selectLanguageLabel: string;
  logoutLabel: string;
  openMenuLabel: string;
  children: React.ReactNode;
}

export function AdminShell({
  pageTitle,
  shellTitle,
  languageLabel,
  selectLanguageLabel,
  logoutLabel,
  openMenuLabel,
  children,
  ...sidebarProps
}: AdminShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen flex">
      <AdminSidebar
        {...sidebarProps}
        openMobile={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />
      <div className="flex-1 min-w-0 flex flex-col">
        <AdminTopbar
          locale={sidebarProps.locale}
          isRtl={sidebarProps.locale === 'ar'}
          roleLabel={sidebarProps.roleLabel}
          pageTitle={pageTitle}
          shellTitle={shellTitle}
          languageLabel={languageLabel}
          selectLanguageLabel={selectLanguageLabel}
          logoutLabel={logoutLabel}
          openMenuLabel={openMenuLabel}
          onOpenMobileMenu={() => setMobileOpen(true)}
        />
        <main className="flex-1 min-w-0 text-gray-900">{children}</main>
      </div>
    </div>
  );
}