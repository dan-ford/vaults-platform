import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import Stripe from 'stripe';

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-09-30.clover',
    })
  : null;

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(request: NextRequest) {
  try {
    if (!stripe || !webhookSecret) {
      return NextResponse.json(
        { error: 'Stripe not configured' },
        { status: 500 }
      );
    }

    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      return NextResponse.json(
        { error: 'Missing stripe-signature header' },
        { status: 400 }
      );
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const orgId = session.metadata?.org_id;
        const planTier = session.metadata?.plan_tier;

        if (!orgId || !planTier) {
          console.error('Missing org_id or plan_tier in session metadata');
          break;
        }

        // Update subscription with Stripe subscription ID
        const { error: updateError } = await supabase
          .from('subscriptions')
          .update({
            stripe_subscription_id: session.subscription as string,
            status: 'active',
            plan_tier: planTier,
            updated_at: new Date().toISOString(),
          })
          .eq('org_id', orgId)
          .eq('stripe_customer_id', session.customer as string);

        if (updateError) {
          console.error('Error updating subscription:', updateError);
          break;
        }

        // Update organization plan_tier
        await supabase
          .from('organizations')
          .update({ plan_tier: planTier })
          .eq('id', orgId);

        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        // Access period properties from the subscription object
        const subscriptionData = subscription as any;

        const { error: updateError } = await supabase
          .from('subscriptions')
          .update({
            status: subscription.status,
            current_period_start: subscriptionData.current_period_start
              ? new Date(subscriptionData.current_period_start * 1000).toISOString()
              : null,
            current_period_end: subscriptionData.current_period_end
              ? new Date(subscriptionData.current_period_end * 1000).toISOString()
              : null,
            cancel_at_period_end: subscription.cancel_at_period_end,
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_customer_id', customerId)
          .eq('stripe_subscription_id', subscription.id);

        if (updateError) {
          console.error('Error updating subscription:', updateError);
        }

        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        // Update subscription status to canceled
        const { data: canceledSub, error: updateError } = await supabase
          .from('subscriptions')
          .update({
            status: 'canceled',
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_customer_id', customerId)
          .eq('stripe_subscription_id', subscription.id)
          .select('org_id')
          .single();

        if (updateError) {
          console.error('Error canceling subscription:', updateError);
          break;
        }

        // Downgrade organization to free tier
        if (canceledSub?.org_id) {
          await supabase
            .from('organizations')
            .update({ plan_tier: 'Small' })
            .eq('id', canceledSub.org_id);
        }

        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}
