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

        const { cancelAtPeriodEnd = true } = await request.json();

        // Get user's subscription
        const subscription = await SubscriptionService.getUserSubscription(user.id);

        if (!subscription || !subscription.razorpay_subscription_id) {
            return NextResponse.json(
                { error: 'No active subscription found' },
                { status: 404 }
            );
        }

        // Cancel subscription
        await SubscriptionService.cancelSubscription(
            subscription.razorpay_subscription_id,
            cancelAtPeriodEnd
        );

        return NextResponse.json({
            success: true,
            message: cancelAtPeriodEnd
                ? 'Subscription will be cancelled at the end of billing period'
                : 'Subscription cancelled immediately',
        });
    } catch (error: any) {
        console.error('Cancel subscription error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to cancel subscription' },
            { status: 500 }
        );
    }
}

export const dynamic = 'force-dynamic';