import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { SubscriptionService } from '@/lib/services/subscription.service';
import { verifyWebhookSignature } from '@/lib/razorpay/client';

export async function POST(req: Request) {
    try {
        const body = await req.text();
        const signature = (await headers()).get('x-razorpay-signature');

        if (!signature) {
            console.error('No Razorpay signature found');
            return NextResponse.json({ error: 'No signature' }, { status: 400 });
        }

        // Verify webhook signature
        const isValid = verifyWebhookSignature(
            body,
            signature,
            process.env.RAZORPAY_WEBHOOK_SECRET!
        );

        if (!isValid) {
            console.error('Invalid Razorpay webhook signature');
            return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
        }

        const webhookData = JSON.parse(body);
        const event = webhookData.event;

        console.log('Received Razorpay webhook:', event);

        // Handle different webhook events
        switch (event) {
            case 'subscription.activated':
                await SubscriptionService.handleSubscriptionActivated(webhookData);
                break;

            case 'subscription.charged':
                await SubscriptionService.handleSubscriptionCharged(webhookData);
                break;

            case 'subscription.cancelled':
                await SubscriptionService.handleSubscriptionCancelled(webhookData);
                break;

            case 'subscription.paused':
                await SubscriptionService.handleSubscriptionPaused(webhookData);
                break;

            case 'subscription.resumed':
                await SubscriptionService.handleSubscriptionResumed(webhookData);
                break;

            case 'payment.failed':
                await SubscriptionService.handlePaymentFailed(webhookData);
                break;

            default:
                console.log(`Unhandled Razorpay event: ${event}`);
        }

        return NextResponse.json({ status: 'success' });
    } catch (error) {
        console.error('Razorpay webhook error:', error);
        return NextResponse.json(
            { error: 'Webhook processing failed' },
            { status: 500 }
        );
    }
}

export const dynamic = 'force-dynamic';