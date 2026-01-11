import Razorpay from 'razorpay';
import crypto from 'crypto';

// Lazy-initialized Razorpay instance
let _razorpayInstance: Razorpay | null = null;

export function getRazorpayInstance(): Razorpay {
    if (!_razorpayInstance) {
        const key_id = process.env.RAZORPAY_KEY_ID;
        const key_secret = process.env.RAZORPAY_KEY_SECRET;

        if (!key_id || !key_secret) {
            throw new Error(
                'Missing Razorpay credentials. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET environment variables.'
            );
        }

        _razorpayInstance = new Razorpay({
            key_id,
            key_secret,
        });
    }
    return _razorpayInstance;
}

// Verify Razorpay webhook signature
export function verifyWebhookSignature(
    body: string,
    signature: string,
    secret: string
): boolean {
    try {
        const expectedSignature = crypto
            .createHmac('sha256', secret)
            .update(body)
            .digest('hex');

        return expectedSignature === signature;
    } catch (error) {
        console.error('Signature verification failed:', error);
        return false;
    }
}

// Verify Razorpay payment signature
export function verifyPaymentSignature(
    orderId: string,
    paymentId: string,
    signature: string
): boolean {
    try {
        const text = `${orderId}|${paymentId}`;
        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
            .update(text)
            .digest('hex');

        return expectedSignature === signature;
    } catch (error) {
        console.error('Payment signature verification failed:', error);
        return false;
    }
}

// Verify subscription signature
export function verifySubscriptionSignature(
    subscriptionId: string,
    paymentId: string,
    signature: string
): boolean {
    try {
        const text = `${subscriptionId}|${paymentId}`;
        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
            .update(text)
            .digest('hex');

        return expectedSignature === signature;
    } catch (error) {
        console.error('Subscription signature verification failed:', error);
        return false;
    }
}