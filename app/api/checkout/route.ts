import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getStripe } from '@/lib/stripe/server';

/**
 * POST /api/checkout
 *
 * Creates a Stripe Checkout Session for a seasonal pass purchase.
 *
 * Required env vars:
 *   - STRIPE_SECRET_KEY  (Restricted: rk_live_... or rk_test_...)
 *   - STRIPE_PRICE_ID    (price_... for the pass product)
 *   - NEXT_PUBLIC_BASE_URL (e.g. https://efutv.eu)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const userId = (body.userId as string) ?? 'guest';
    const seasonId = (body.seasonId as string) ?? 'Season_2026_1';
    const locale = (body.locale as string) ?? 'hu';
    const email = body.email as string | undefined;

    // Validate inputs at the boundary
    if (typeof userId !== 'string' || typeof seasonId !== 'string') {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://efutv.eu';
    const stripe = getStripe();

    // If STRIPE_PRICE_ID is not configured yet, fall back to inline price
    const priceId = process.env.STRIPE_PRICE_ID;
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = priceId
      ? [{ price: priceId, quantity: 1 }]
      : [
          {
            price_data: {
              currency: 'huf',
              unit_amount: 9900, // 9 900 HUF = 99 Ft × 100
              product_data: {
                name: `${seasonId} — EFU Season Pass`,
                description: 'Évszakos bérlet az EFU élő közvetítésekhez és visszanézhető tartalmakhoz.',
              },
            },
            quantity: 1,
          },
        ];

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      locale: locale === 'en' ? 'en' : 'hu',
      line_items: lineItems,
      metadata: { userId, seasonId },
      customer_email: email,
      success_url: `${baseUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/?checkout=cancelled`,
      payment_method_types: ['card'],
      allow_promotion_codes: true,
    });

    return NextResponse.json({ url: session.url, sessionId: session.id });
  } catch (error: any) {
    console.error('[checkout] Stripe error:', error.message);
    return NextResponse.json(
      { error: error.message || 'Checkout failed' },
      { status: 500 }
    );
  }
}
