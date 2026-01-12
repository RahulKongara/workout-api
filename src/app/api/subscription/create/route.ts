import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { SubscriptionService } from '@/lib/services/subscription.service';

export async function POST(request: NextRequest) {
    try {
        const supabase = createClient();
        const {
            data: { user },
        } = await (await supabase).auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { planId, tier } = await request.json();

        if (!planId || !tier) {
            return NextResponse.json({ error: 'Plan ID and tier required' }, { status: 400 });
        }

        // Validate tier
        if (!['pro', 'enterprise'].includes(tier)) {
            return NextResponse.json({ error: 'Invalid tier' }, { status: 400 });
        }

        // Get user details
        const { data: userData } = await (await supabase)
            .from('users')
            .select('email, company_name')
            .eq('id', user.id)
            .single();

        // Create Razorpay subscription with metadata
        const subscription = await SubscriptionService.createSubscription(
            user.id,
            planId,
            userData?.email || user.email!,
            userData?.company_name
        );

        // Store pending subscription info for webhook to complete
        // This helps track which tier the user is subscribing to
        const { error: insertError } = await (await supabase)
            .from('subscriptions')
            .upsert({
                user_id: user.id,
                stripe_subscription_id: subscription.id,
                tier: tier, // Store the tier they're subscribing to
                status: 'incomplete', // Will be updated by webhook to 'active'
                stripe_customer_id: subscription.customer_id,
            }, {
                onConflict: 'user_id',
                ignoreDuplicates: false,
            });

        if (insertError) {
            console.error('Error creating subscription record:', insertError);
        }

        return NextResponse.json({
            subscriptionId: subscription.id,
            razorpayKeyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        });
    } catch (error: any) {
        console.error('Create subscription error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to create subscription' },
            { status: 500 }
        );
    }
}

export const dynamic = 'force-dynamic';