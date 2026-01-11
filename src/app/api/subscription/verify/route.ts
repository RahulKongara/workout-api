import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyPaymentSignature, verifySubscriptionSignature } from '@/lib/razorpay/client';

export async function POST(request: NextRequest) {
    try {
        const supabase = createClient();
        const {
            data: { user },
        } = await (await supabase).auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { razorpay_payment_id, razorpay_subscription_id, razorpay_signature } =
            await request.json();

        if (!razorpay_payment_id || !razorpay_subscription_id || !razorpay_signature) {
            return NextResponse.json(
                { error: 'Missing payment details' },
                { status: 400 }
            );
        }

        // Verify signature
        const isValid = verifySubscriptionSignature(
            razorpay_subscription_id,
            razorpay_payment_id,
            razorpay_signature
        );

        if (!isValid) {
            return NextResponse.json(
                { error: 'Invalid payment signature' },
                { status: 400 }
            );
        }

        // Payment verified - webhook will handle subscription activation
        return NextResponse.json({
            success: true,
            message: 'Payment verified successfully',
        });
    } catch (error: any) {
        console.error('Verify payment error:', error);
        return NextResponse.json(
            { error: error.message || 'Payment verification failed' },
            { status: 500 }
        );
    }
}

export const dynamic = 'force-dynamic';