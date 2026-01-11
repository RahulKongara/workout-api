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

        const { planId } = await request.json();

        if (!planId) {
            return NextResponse.json({ error: 'Plan ID required' }, { status: 400 });
        }

        // Get user details
        const { data: userData } = await (await supabase)
            .from('users')
            .select('email, company_name')
            .eq('id', user.id)
            .single();

        // Create Razorpay subscription
        const subscription = await SubscriptionService.createSubscription(
            user.id,
            planId,
            userData?.email || user.email!,
            userData?.company_name
        );

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