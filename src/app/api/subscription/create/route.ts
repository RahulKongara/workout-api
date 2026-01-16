import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/client';
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

        const adminSupabase = createAdminClient();

        // Check for existing active subscription to prevent accidental overwrites
        const { data: existingSubscription } = await adminSupabase
            .from('subscriptions')
            .select('id, status, tier, stripe_subscription_id')
            .eq('user_id', user.id)
            .in('status', ['active', 'trialing'])
            .maybeSingle();

        if (existingSubscription) {
            return NextResponse.json(
                {
                    error: 'Active subscription already exists',
                    currentTier: existingSubscription.tier,
                    hint: 'Cancel your current subscription first or upgrade via the dashboard'
                },
                { status: 409 } // Conflict
            );
        }

        // Get user details
        const { data: userData } = await adminSupabase
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
        const { error: insertError } = await adminSupabase
            .from('subscriptions')
            .upsert({
                user_id: user.id,
                stripe_subscription_id: subscription.id,
                tier: tier,
                status: 'incomplete', // Will be updated by webhook to 'active'
                stripe_customer_id: subscription.customer_id,
            }, {
                onConflict: 'user_id',
                ignoreDuplicates: false,
            });

        if (insertError) {
            console.error('Error creating subscription record:', insertError);
            // Return error instead of continuing silently
            return NextResponse.json(
                { error: 'Failed to create subscription record' },
                { status: 500 }
            );
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