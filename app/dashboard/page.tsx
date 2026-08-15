/**
 * /admin — landing page (server component).
 *
 * Recent-activity dashboard. Three panels:
 *   1) Latest 5 applications (tappable, links to detail)
 *   2) Latest 5 outbound emails (admin notifications + auto-replies)
 *   3) Analytics overview (7-day summary, links to /dashboard/analytics)
 *
 * Plus a stats strip at the top: total apps, new apps, events last 7d,
 * current viewers on the live stream.
 *
 * Visible to every staff role (already gated by layout).
 */

import Link from 'next/link';
import { cookies, headers } from 'next/headers';
import { store } from '@/lib/db';
import { email } from '@/lib/email';
import { currentRole } from '@/lib/auth/dev-role';
import { readEvents, seedDemoEvents } from '@/lib/analytics/store';
import { summarize } from '@/lib/analytics/aggregate';
import { flatten, loadMessages, makeT, pickLocale, type Locale } from '@/lib/i18n';

export const dynamic = 'force-dynamic';

const STATUS_LABEL_HU = {
  new: 'Új',
  contacted: 'Kapcsolatfelvétel',
  approved: 'Jóváhagyott',
  rejected: 'Elutasított',
} as const;

const STATUS_COLOR = {
  new: 'bg-brand-red text-white',
  contacted: 'bg-brand-gold text-black',
  approved: 'bg-emerald-500 text-black',
  rejected: 'bg-gray-700 text-gray-200',
} as const;

export default async function AdminDashboardPage() {
  const role = await currentRole();

  const locale: Locale = pickLocale({
    cookieLocale: (await cookies()).get('NEXT_LOCALE')?.value,
    acceptLanguage: (await headers()).get('accept-language') ?? undefined,
  });
  const adminRaw = flatten(await loadMessages(locale, 'admin'));
  const enRaw = flatten(await loadMessages('en', 'admin'));
  const t = makeT(adminRaw, enRaw);

  // --- data ---
  const allApplications = await store.list();
  const newApplications = allApplications.filter((a) => a.status === 'new');
  const latestApplications = allApplications.slice(0, 5);
  const recentEmails = await email.recent(5);

  // Analytics (best-effort; auto-seed on empty)
  let events = await readEvents();
  if (events.length === 0) {
    try {
      await seedDemoEvents();
      events = await readEvents();
    } catch {
      events = [];
    }
  }
  const now = Date.now();
  const sinceMs = now - 7 * 24 * 60 * 60 * 1000;
  const summary = summarize(events, { sinceMs, untilMs: now });

  const showApplications = role !== 'Marketing' && role !== 'Moderator';
  const showAnalytics = role !== 'Moderator';

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Greeting */}
      <section className="flex items-end justify-between flex-wrap gap-2">
        <div>
          <p className="text-brand-red text-[10px] uppercase tracking-widest font-bold mb-1">EFU Admin</p>
          <h1
            className="text-2xl sm:text-3xl font-black text-white"
            style={{ fontFamily: 'Impact, Arial Black, sans-serif' }}
          >
            {t('dashboard.welcome')}
          </h1>
        </div>
        <span className="text-xs text-gray-500">
          {role} · {new Date().toLocaleString(locale === 'hu' ? 'hu-HU' : locale)}
        </span>
      </section>

      {/* Stats strip */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {showApplications && (
          <StatTile
            label={t('dashboard.stats.totalApplications')}
            value={allApplications.length}
            accent="red"
            href="/dashboard/applications"
          />
        )}
        {showApplications && (
          <StatTile
            label={t('dashboard.stats.newApplications')}
            value={newApplications.length}
            accent="gold"
            href="/dashboard/applications?status=new"
          />
        )}
        {showAnalytics && (
          <StatTile
            label={t('dashboard.stats.eventsLast7d')}
            value={summary.activity.signups}
            accent="muted"
            href="/dashboard/analytics"
          />
        )}
        {showAnalytics && (
          <StatTile
            label={t('dashboard.stats.viewersNow')}
            value={summary.viewership.overallPeak}
            accent="muted"
            href="/dashboard/analytics"
          />
        )}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Latest applications */}
        {showApplications && (
          <section className="card-dark rounded-2xl p-5">
            <header className="flex items-baseline justify-between mb-4">
              <h2 className="text-white font-bold text-sm uppercase tracking-widest">
                {t('dashboard.latestApplications')}
              </h2>
              <Link href="/dashboard/applications" className="text-xs text-brand-red hover:underline">
                {t('dashboard.seeAllApplications')} →
              </Link>
            </header>
            {latestApplications.length === 0 ? (
              <p className="text-gray-500 text-sm">{t('dashboard.noApplications')}</p>
            ) : (
              <ul className="space-y-2">
                {latestApplications.map((a) => (
                  <li key={a.id}>
                    <Link
                      href={`/dashboard/applications?id=${a.id}`}
                      className="flex items-center justify-between gap-2 hover:bg-brand-dark-muted -mx-2 px-2 py-2 rounded-lg transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="text-white text-sm font-medium truncate">{a.name}</p>
                        <p className="text-gray-500 text-[11px]">
                          {a.city} · {new Date(a.createdAt).toLocaleDateString(locale === 'hu' ? 'hu-HU' : locale)}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 text-[10px] font-bold uppercase px-2 py-0.5 rounded ${STATUS_COLOR[a.status]}`}
                      >
                        {STATUS_LABEL_HU[a.status]}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {/* Latest emails */}
        <section className={`card-dark rounded-2xl p-5 ${showApplications ? '' : 'lg:col-span-2'}`}>
          <header className="flex items-baseline justify-between mb-4">
            <h2 className="text-white font-bold text-sm uppercase tracking-widest">
              {t('dashboard.latestEmails')}
            </h2>
          </header>
          {recentEmails.length === 0 ? (
            <p className="text-gray-500 text-sm">{t('dashboard.noEmails')}</p>
          ) : (
            <ul className="space-y-2">
              {recentEmails.map((e) => (
                <li key={e.id} className="border-b border-brand-dark-border pb-2 last:border-b-0">
                  <p className="text-gray-400 text-xs">
                    <span className="text-brand-gold">[{e.category}]</span> {e.subject}
                  </p>
                  <p className="text-gray-500 text-[11px] mt-0.5">
                    {e.to} · {new Date(e.sentAt).toLocaleString(locale === 'hu' ? 'hu-HU' : locale)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Analytics overview */}
        {showAnalytics && (
          <section className="card-dark rounded-2xl p-5">
            <header className="flex items-baseline justify-between mb-4">
              <h2 className="text-white font-bold text-sm uppercase tracking-widest">
                {t('dashboard.analyticsOverview')}
              </h2>
              <Link href="/dashboard/analytics" className="text-xs text-brand-red hover:underline">
                {t('dashboard.seeAnalytics')} →
              </Link>
            </header>
            {summary.visitors.pageViews === 0 ? (
              <p className="text-gray-500 text-sm">{t('dashboard.noAnalytics')}</p>
            ) : (
              <dl className="grid grid-cols-2 gap-3 text-xs">
                <OverviewStat label="Visitors" value={summary.visitors.uniqueVisitors} />
                <OverviewStat label="Sign-ups" value={summary.activity.signups} />
                <OverviewStat label="Votes" value={summary.votes.freeCount + summary.votes.paidCount} />
                <OverviewStat label="Subs" value={summary.subscriptions.newCount} />
              </dl>
            )}
          </section>
        )}
      </div>
    </div>
  );
}

function StatTile({
  label,
  value,
  accent,
  href,
}: {
  label: string;
  value: number;
  accent: 'red' | 'gold' | 'muted';
  href: string;
}) {
  const accentCls =
    accent === 'red'
      ? 'border-brand-red/60 bg-brand-red/10 hover:border-brand-red'
      : accent === 'gold'
        ? 'border-brand-gold/60 bg-brand-gold/10 hover:border-brand-gold'
        : 'border-brand-dark-border bg-brand-dark-card hover:border-gray-600';
  return (
    <Link
      href={href}
      className={`block rounded-xl border ${accentCls} p-4 transition-colors`}
    >
      <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold leading-none">{label}</p>
      <p className="text-2xl sm:text-3xl font-black text-white tabular-nums mt-2">
        {value.toLocaleString('hu-HU')}
      </p>
    </Link>
  );
}

function OverviewStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="border border-brand-dark-border rounded-lg p-2">
      <dt className="text-[10px] uppercase tracking-widest text-gray-500">{label}</dt>
      <dd className="text-white font-black text-lg tabular-nums">{value.toLocaleString('hu-HU')}</dd>
    </div>
  );
}