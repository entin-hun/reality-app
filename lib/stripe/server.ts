import Stripe from 'stripe';

/**
 * Centralised Stripe server-side client.
 *
 * Uses the Restricted API key (STRIPE_SECRET_KEY) — never the publishable key.
 * The publishable key (STRIPE_PUBLISHABLE_KEY) is only used client-side.
 *
 * Keys live in .env.local (not committed) or system environment.
 */
export function getStripe(): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error(
      'STRIPE_SECRET_KEY is not set. Add it to .env.local (Restricted key: rk_live_... or rk_test_...)'
    );
  }
  return new Stripe(secretKey, {
    apiVersion: '2026-07-29.dahlia',
    typescript: true,
  });
}

/**
 * The publishable key for client-side usage (Elements, Payment Element, etc.)
 */
export const STRIPE_PUBLISHABLE_KEY = process.env.STRIPE_PUBLISHABLE_KEY ?? '';
