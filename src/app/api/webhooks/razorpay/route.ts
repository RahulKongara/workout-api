import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { SubscriptionService } from '@/lib/services/subscription.service';
import { verifyWebhookSignature, getRazorpayWebhookSecret } from '@/lib/razorpay/client';

export async function POST(req: Request) {
    try {
        const body = await req.text();
        const headersList = await headers();
        const signature = headersList.get('x-razorpay-signature');
        const eventId = headersList.get('x-razorpay-event-id');

        if (!signature) {
            console.error('No Razorpay signature found');
            return NextResponse.json({ error: 'No signature' }, { status: 400 });
        }

        // Get webhook secret with validation
        let webhookSecret: string;
        try {
            webhookSecret = getRazorpayWebhookSecret();
        } catch (error) {
            console.error('Webhook secret not configured:', error);
            return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
        }

        // Verify webhook signature
        const isValid = verifyWebhookSignature(body, signature, webhookSecret);

        if (!isValid) {
            console.error('Invalid Razorpay webhook signature');
            return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
        }

        const webhookData = JSON.parse(body);
        const event = webhookData.event;

        console.log('Received Razorpay webhook:', event, eventId ? `(Event ID: ${eventId})` : '');

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