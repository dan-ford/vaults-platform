import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import Stripe from 'stripe';

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-09-30.clover',
    })
  : null;

export async function POST(request: NextRequest) {
  try {
    if (!stripe) {
      return NextResponse.json(
        { error: 'Stripe not configured' },
        { status: 500 }
      );
    }

    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { org_id, plan_tier } = await request.json();

    if (!org_id || !plan_tier) {
      return NextResponse.json(
        { error: 'Missing org_id or plan_tier' },
        { status: 400 }
      );
    }

    // Verify user is OWNER or ADMIN of this org
    const { data: membership, error: membershipError } = await supabase
      .from('org_memberships')
      .select('role')
      .eq('org_id', org_id)
      .eq('user_id', user.id)
      .single();

    if (membershipError || !membership || !['OWNER', 'ADMIN'].includes(membership.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Get organization details
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('name, slug')
      .eq('id', org_id)
      .single();

    if (orgError || !org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    // Check if subscription already exists
    const { data: existingSubscription } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id, stripe_subscription_id, status')
      .eq('org_id', org_id)
      .single();

    let customerId = existingSubscription?.stripe_customer_id;

    // Create Stripe customer if doesn't exist
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          org_id,
          org_name: org.name,
          org_slug: org.slug,
        },
      });
      customerId = customer.id;

      // Store customer ID
      await supabase.from('subscriptions').insert({
        org_id,
        stripe_customer_id: customerId,
        status: 'incomplete',
        plan_tier,
      });
    }

    // Map plan tier to Stripe price ID
    const priceIdMap: Record<string, string> = {
      small: process.env.STRIPE_PRICE_ID_SMALL!,
      medium: process.env.STRIPE_PRICE_ID_MEDIUM!,
      enterprise: process.env.STRIPE_PRICE_ID_ENTERPRISE!,
    };

    const priceId = priceIdMap[plan_tier.toLowerCase()];

    if (!priceId) {
      return NextResponse.json(
        { error: 'Invalid plan tier' },
        { status: 400 }
      );
    }

    // Create Checkout Session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?subscription=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings/billing?subscription=cancelled`,
      metadata: {
        org_id,
        plan_tier,
      },
    });

    return NextResponse.json({ checkout_url: session.url });
  } catch (error) {
    console.error('Stripe checkout error:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
