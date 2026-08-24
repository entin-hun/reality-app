// Next.js App Router client instrumentation entry point.
// Loaded once on the client; initializes PostHog with the public project token.
// See: https://nextjs.org/docs/app/api-reference/file-conventions/instrumentation-client

import posthog from 'posthog-js';

const projectToken = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
const host = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com';

if (typeof window !== 'undefined' && projectToken) {
  posthog.init(projectToken, {
    api_host: host,
    // EU region: posthog-js will pick the right ingestion endpoint automatically
    // when ui_host is also set, but api_host alone is enough for the SDK.
    person_profiles: 'identified_only',
    capture_pageview: true,
    capture_pageleave: true,
    // Avoid sending dev traffic; tweak as needed.
    disable_session_recording: false,
    // Cross-domain tracking (single domain, so leave default).
    cross_subdomain_cookie: false,
    // Keep the bundle slim in dev.
    loaded: (ph) => {
      if (process.env.NODE_ENV === 'development') {
        ph.debug();
      }
    },
  });
}

export { posthog };