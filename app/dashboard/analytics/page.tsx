/**
 * /dashboard/analytics — server entry that mounts <GaDashboard />.
 *
 * The previous version of this page aggregated events from the in-house
 * KV/JSON store (lib/analytics/store.ts). That store seeded demo data
 * for visual testing and never reflected real visitor numbers, which is
 * why the surface looked "mock".
 *
 * This rewrite delegates the entire UX to the GA Data API-backed
 * <GaDashboard /> component. The gtag.js tracker is wired globally via
 * the root layout (see components/GoogleAnalytics.tsx); pageviews and
 * events land in the GA4 property identified by NEXT_PUBLIC_GA_MEASUREMENT_ID.
 *
 * The server component does no fetching itself: the data is auth-gated
 * client-side and the API route handles the Data API call.
 */

import { GaDashboard } from '@/components/analytics/GaDashboard';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function AnalyticsDashboardPage() {
  return <GaDashboard />;
}