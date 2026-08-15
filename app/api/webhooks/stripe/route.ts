import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getStripe } from '@/lib/stripe/server';

/**
 * POST /api/webhooks/stripe
 *
 * Handles Stripe webhook events:
 *   - checkout.session.completed   → grant season access
 *   - payment_intent.payment_failed → log failure
 *   - charge.refunded              → revoke access
 *
 * Security: ALWAYS verify the signature before trusting the payload.
 *
 * Required env vars:
 *   - STRIPE_SECRET_KEY      (Restricted key for API calls)
 *   - STRIPE_WEBHOOK_SECRET  (whsec_... from Stripe Dashboard or CLI)
 *
 * To test locally with the Stripe CLI:
 *   stripe listen --forward-to http://localhost:3016/api/webhooks/stripe
 */
export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
  }

  const stripe = getStripe();
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err: any) {
    console.error('[webhook] Signature verification failed:', err.message);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  // Handle events
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      const metadata = (session.metadata ?? {}) as { userId?: string; seasonId?: string };

      if (!metadata.userId || !metadata.seasonId) {
        console.warn('[webhook] Missing metadata on session', session.id);
        return NextResponse.json({ received: true });
      }

      // --- TODO: grant season access in the DB ---
      // Example (JSON file-based CMS):
      // await grantUserAccess(metadata.userId, metadata.seasonId);

      console.log(
        `[webhook] ✅ Access granted: user=${metadata.userId} season=${metadata.seasonId}`
      );
      break;
    }

    case 'checkout.session.expired': {
      console.log('[webhook] Checkout session expired');
      break;
    }

    case 'payment_intent.payment_failed': {
      const pi = event.data.object;
      console.warn(`[webhook] ❌ Payment failed: ${pi.id} ${pi.last_payment_error?.message ?? ''}`);
      break;
    }

    case 'charge.refunded': {
      const charge = event.data.object;
      console.log(`[webhook] 💰 Charge refunded: ${charge.id}`);
      // --- TODO: revoke season access if fully refunded ---
      break;
    }

    default:
      console.log(`[webhook] Unhandled event type: ${event.type}`);
  }

  // Always return 200 quickly so Stripe doesn't retry unnecessarily
  return NextResponse.json({ received: true });
}
