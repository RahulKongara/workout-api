import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/client';

// Manual sync endpoint to check subscription status
// Useful if webhooks are delayed or fail
export async function POST(request: NextRequest) {
    try {
        const supabase = createClient();
        const {
            data: { user },
        } = await (await supabase).auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const adminSupabase = createAdminClient();

        // Get user's subscription
        const { data: subscription, error: subError } = await adminSupabase
            .from('subscriptions')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (subError) {
            console.error('Error fetching subscription:', subError);
            return NextResponse.json(
                { error: 'Failed to fetch subscription' },
                { status: 500 }
            );
        }

        if (!subscription) {
            return NextResponse.json(
                { error: 'No subscription found' },
                { status: 404 }
            );
        }

        // If subscription exists and has a Razorpay ID, fetch latest status from Razorpay
        if (subscription.stripe_subscription_id) {
            try {
                const razorpay = require('razorpay');
                const razorpayInstance = new razorpay({
                    key_id: process.env.RAZORPAY_KEY_ID!,
                    key_secret: process.env.RAZORPAY_KEY_SECRET!,
                });

                const rzpSubscription = await razorpayInstance.subscriptions.fetch(
                    subscription.stripe_subscription_id
                );

                // Update local subscription with Razorpay data
                const statusMap: Record<string, any> = {
                    created: 'incomplete',
                    authenticated: 'active',
                    active: 'active',
                    pending: 'past_due',
                    halted: 'past_due',
                    cancelled: 'canceled',
                    completed: 'canceled',
                    expired: 'canceled',
                };

                const updatedStatus = statusMap[rzpSubscription.status] || 'incomplete';

                await adminSupabase
                    .from('subscriptions')
                    .update({
                        status: updatedStatus,
                        current_period_start: new Date(rzpSubscription.current_start * 1000).toISOString(),
                        current_period_end: new Date(rzpSubscription.current_end * 1000).toISOString(),
                    })
                    .eq('id', subscription.id);

                return NextResponse.json({
                    message: 'Subscription synced successfully',
                    subscription: {
                        tier: subscription.tier,
                        status: updatedStatus,
                        razorpayStatus: rzpSubscription.status,
                    },
                });
            } catch (razorpayError: any) {
                console.error('Razorpay API error:', razorpayError);
                return NextResponse.json(
                    { error: 'Failed to sync with Razorpay' },
                    { status: 500 }
                );
            }
        }

        // Return current subscription if no Razorpay ID
        return NextResponse.json({
            message: 'Subscription retrieved',
            subscription: {
                tier: subscription.tier,
                status: subscription.status,
            },
        });
    } catch (error: any) {
        console.error('Subscription sync error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to sync subscription' },
            { status: 500 }
        );
    }
}

export const dynamic = 'force-dynamic';