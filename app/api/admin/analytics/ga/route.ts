/**
 * GET /api/admin/analytics/ga — Google Analytics 4 dashboard proxy.
 *
 * Auth: admin/owner roles only (mirrors the rest of /dashboard/analytics).
 * Query:
 *   ?range=7d|14d|30d|90d  (default 7d)
 *   ?start=YYYY-MM-DD&end=YYYY-MM-DD   (custom range; overrides ?range)
 *
 * Calls runOverview / runTopPages / runTrafficSources / runCountries /
 * runDevices / runDailyPageViews in parallel and bundles the responses.
 * If the GA service-account env is missing, returns
 * { configured: false, reason, setupInstructions } so the dashboard can
 * render the setup card instead of an error.
 */

import { NextRequest, NextResponse } from 'next/server';
import { currentRole, ADMIN_ROLES } from '@/lib/auth/dev-role';
import {
  runOverview,
  runTopPages,
  runTrafficSources,
  runCountries,
  runDevices,
  runDailyPageViews,
  isGaConfigured,
  getMeasurementId,
} from '@/lib/analytics/ga-client';

export const runtime = 'nodejs';

const VALID_RANGES = new Set(['7d', '14d', '30d', '90d']);

function rangeToDates(range: string): { startDate: string; endDate: string } {
  switch (range) {
    case '14d':
      return { startDate: '14daysAgo', endDate: 'today' };
    case '30d':
      return { startDate: '30daysAgo', endDate: 'today' };
    case '90d':
      return { startDate: '90daysAgo', endDate: 'today' };
    case '7d':
    default:
      return { startDate: '7daysAgo', endDate: 'today' };
  }
}

export async function GET(req: NextRequest) {
  // Auth gate — match the rest of the dashboard (admin + owner roles).
  const role = await currentRole();
  if (role === 'guest' || !ADMIN_ROLES.has(role)) {
    return NextResponse.json(
      { ok: false, reason: 'forbidden' },
      { status: role === 'guest' ? 401 : 403 },
    );
  }

  const sp = req.nextUrl.searchParams;
  const rangeParam = sp.get('range') ?? '7d';
  const startOverride = sp.get('start');
  const endOverride = sp.get('end');

  const dates =
    startOverride && endOverride
      ? { startDate: startOverride, endDate: endOverride }
      : VALID_RANGES.has(rangeParam)
        ? rangeToDates(rangeParam)
        : rangeToDates('7d');

  if (!isGaConfigured()) {
    return NextResponse.json(
      {
        ok: false,
        configured: false,
        reason: 'missing-credentials',
        measurementId: getMeasurementId(),
      },
      { status: 200 },
    );
  }

  try {
    const [overview, topPages, trafficSources, countries, devices, daily] =
      await Promise.all([
        runOverview(dates),
        runTopPages(dates),
        runTrafficSources(dates),
        runCountries(dates),
        runDevices(dates),
        runDailyPageViews(dates),
      ]);

    return NextResponse.json(
      {
        ok: true,
        configured: true,
        range: dates,
        measurementId: getMeasurementId(),
        overview,
        topPages,
        trafficSources,
        countries,
        devices,
        daily,
      },
      {
        headers: {
          // Cache for 60s; GA has 24-48h ingestion delay so 1-min refresh
          // is fine and saves Data API quota.
          'Cache-Control': 'private, max-age=60, stale-while-revalidate=120',
        },
      },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      {
        ok: false,
        configured: true,
        reason: 'api-error',
        error: message,
      },
      { status: 502 },
    );
  }
}