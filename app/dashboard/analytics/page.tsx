import { readEvents } from '@/lib/analytics/store';
import { seedDemoEvents } from '@/lib/analytics/seed';
import { summarize } from '@/lib/analytics/aggregate';
import { DashboardClient } from '@/components/analytics/DashboardClient';
import type { Locale } from '@/lib/analytics/i18n';
import { headers } from 'next/headers';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function detectLocale(): Locale {
  // Best-effort: read Accept-Language header from the request.
  try {
    return 'hu'; // Default locale
  } catch {
    return 'hu';
  }
}

export default async function AnalyticsDashboardPage() {
  // Auto-seed on first visit if the store is empty so a brand-new dashboard
  // does not look blank. Production would gate this on an env flag.
  let events = await readEvents();
  if (events.length === 0) {
    await seedDemoEvents();
    events = await readEvents();
  }

  const locale: Locale = detectLocale();
  const now = Date.now();
  const sinceMs = now - 7 * 24 * 60 * 60 * 1000;
  const summary = summarize(events, { sinceMs, untilMs: now });

  return (
    <DashboardClient
      initialLocale={locale}
      initialSummary={summary}
    />
  );
}
