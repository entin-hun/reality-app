/**
 * /admin layout — server component.
 *
 * - Resolves locale + loads admin messages + flattens to a `t()` fn.
 * - Resolves the current role from the dev-role cookie.
 * - Filters `ADMIN_SECTIONS` by role so the sidebar client never sees links
 *   it shouldn't, then groups them for render.
 * - If the role isn't allowed to see ANY admin page, render a Forbidden view
 *   directly (no sidebar, no chrome — keeps it obvious).
 * - Otherwise renders <AdminShell> with role-filtered sidebar + topbar.
 *
 * Per-page role guards are repeated in each route handler. This layout
 * guards the chrome; the pages guard the data.
 */

import { cookies, headers } from 'next/headers';
import { AdminShell } from '@/components/dashboard/AdminShell';
import { currentRole, STAFF_ROLES } from '@/lib/auth/dev-role';
import {
  groupSections,
  sectionsForRole,
  ROLE_I18N_KEYS,
} from '@/lib/auth/role-sections';
import {
  flatten,
  isRtl,
  loadMessages,
  makeT,
  pickLocale,
  type Locale,
} from '@/lib/i18n';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const headerStore = await headers();
  const locale: Locale = pickLocale({
    cookieLocale: cookieStore.get('NEXT_LOCALE')?.value,
    acceptLanguage: headerStore.get('accept-language') ?? undefined,
  });

  const role = await currentRole();

  // Load admin namespace messages (HU/EN guaranteed; others fall back).
  const rawMessages = await loadMessages(locale, 'admin');
  const fallback = flatten((await loadMessages('en', 'admin')) as Record<string, unknown>);
  const messages = flatten(rawMessages);
  const t = makeT(messages, fallback);

  // Hard block: not a staff role -> no shell, no sidebar, just Forbidden.
  if (!STAFF_ROLES.has(role)) {
    return (
      <Forbidden
        title={t('forbidden.title')}
        code={t('forbidden.code')}
        body={t('forbidden.body')}
        hint={t('forbidden.hint')}
        isRtl={isRtl(locale)}
      />
    );
  }

  const visibleSections = sectionsForRole(role);
  const groups = groupSections(visibleSections).map((g) => ({
    group: g.group,
    label: t(`groups.${g.group}`),
    sections: g.sections.map((s) => ({
      ...s,
      i18nKey: t(`nav.${s.key === 'fight-cards' ? 'fightCards' : s.key === 'reality-triggers' ? 'realityTriggers' : s.key === 'audio-library' ? 'audioLibrary' : s.key === 'fighter-profiles' ? 'fighterProfiles' : s.key === 'social-links' ? 'socialLinks' : s.key === 'chat-moderation' ? 'chatModeration' : s.key === 'audit-logs' ? 'auditLogs' : s.key === 'system-settings' ? 'systemSettings' : s.key}`),
    })),
  }));

  const roleLabel = t(ROLE_I18N_KEYS[role]);

  return (
    <AdminShell
      roleLabel={roleLabel}
      sections={groups.flatMap((g) => g.sections)}
      groups={groups}
      tagline={t('shell.tagline')}
      backToSiteLabel={t('shell.backToSite')}
      pageTitle={t('dashboard.title')}
      shellTitle={t('shell.title')}
      languageLabel={t('common.language')}
      selectLanguageLabel={t('common.selectLanguage')}
      logoutLabel={t('common.logout')}
      openMenuLabel={t('shell.openMenu')}
      locale={locale}
    >
      {children}
    </AdminShell>
  );
}

function Forbidden({
  title,
  code,
  body,
  hint,
  isRtl,
}: {
  title: string;
  code: string;
  body: string;
  hint: string;
  isRtl: boolean;
}) {
  return (
    <main
      dir={isRtl ? 'rtl' : 'ltr'}
      className="min-h-screen flex items-center justify-center px-4 bg-brand-dark"
    >
      <div className="max-w-md text-center">
        <p className="text-brand-red text-sm uppercase tracking-widest font-bold mb-2">{code}</p>
        <h1
          className="text-4xl font-black text-white mb-3"
          style={{ fontFamily: 'Impact, Arial Black, sans-serif' }}
        >
          {title}
        </h1>
        <p className="text-gray-400 text-sm">{body}</p>
        <p className="text-gray-600 text-xs mt-6">
          <code className="text-brand-gold break-all">{hint}</code>
        </p>
        <p className="mt-6">
          <a href="/" className="text-brand-red text-sm underline hover:text-red-400">
            ← EFU
          </a>
        </p>
      </div>
    </main>
  );
}