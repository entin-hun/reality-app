'use client';

/**
 * Google Analytics 4 — global page-view + event tracker.
 *
 * Renders the standard gtag.js snippet when NEXT_PUBLIC_GA_MEASUREMENT_ID
 * is set. Disabled in dev when no ID is configured, so local development
 * never accidentally tracks the developer's localhost hits.
 *
 * Pageviews:
 *   gtag.js auto-tracks the initial pageview via the `config` call below.
 *   For client-side route changes (Next.js App Router), we call
 *   `gtag('event', 'page_view', { page_path, page_location })` whenever
 *   the pathname changes. This is the standard pattern for Next 15+
 *   because the initial config only fires once.
 *
 * Custom events: emit from any client component via `window.gtag('event',
 * 'name', { ...params })` or use the typed `sendGAEvent` helper exported
 * below for compile-time safety.
 */

import { usePathname, useSearchParams } from 'next/navigation';
import Script from 'next/script';
import { useEffect } from 'react';

const MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

export type GAEventName =
  | 'login'
  | 'sign_up'
  | 'subscribe'
  | 'vote_cast'
  | 'chat_message_sent'
  | 'stream_start'
  | 'stream_end'
  | 'application_submit'
  | 'contact_submit'
  | 'checkout_start'
  | 'purchase';

export function sendGAEvent(
  name: GAEventName,
  params: Record<string, string | number | boolean | undefined> = {},
): void {
  if (typeof window === 'undefined') return;
  if (!MEASUREMENT_ID) return;
  if (typeof window.gtag !== 'function') return;
  window.gtag('event', name, params);
}

export function GoogleAnalytics() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Track SPA route changes
  useEffect(() => {
    if (!MEASUREMENT_ID) return;
    if (typeof window.gtag !== 'function') return;
    const url = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : '');
    window.gtag('event', 'page_view', {
      page_path: url,
      page_location: window.location.origin + url,
      page_title: document.title,
    });
  }, [pathname, searchParams]);

  if (!MEASUREMENT_ID) return null;

  return (
    <>
      <Script
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`}
      />
      <Script id="ga-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${MEASUREMENT_ID}', { send_page_view: true });
        `}
      </Script>
    </>
  );
}