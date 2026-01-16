import Razorpay from 'razorpay';
import crypto from 'crypto';

// Lazy-initialized Razorpay instance
let _razorpayInstance: Razorpay | null = null;

// Helper: Timing-safe string comparison to prevent timing attacks
function timingSafeEqual(a: string, b: string): boolean {
    try {
        const bufA = Buffer.from(a, 'hex');
        const bufB = Buffer.from(b, 'hex');
        if (bufA.length !== bufB.length) {
            return false;
        }
        return crypto.timingSafeEqual(bufA, bufB);
    } catch {
        return false;
    }
}

// Helper: Validate required environment variable
function requireEnv(name: string): string {
    const value = process.env[name];
    if (!value) {
        throw new Error(`Missing required environment variable: ${name}`);
    }
    return value;
}

export function getRazorpayInstance(): Razorpay {
    if (!_razorpayInstance) {
        const key_id = requireEnv('RAZORPAY_KEY_ID');
        const key_secret = requireEnv('RAZORPAY_KEY_SECRET');

        _razorpayInstance = new Razorpay({
            key_id,
            key_secret,
        });
    }
    return _razorpayInstance;
}

// Get Razorpay key secret with validation
export function getRazorpayKeySecret(): string {
    return requireEnv('RAZORPAY_KEY_SECRET');
}

// Get Razorpay webhook secret with validation
export function getRazorpayWebhookSecret(): string {
    return requireEnv('RAZORPAY_WEBHOOK_SECRET');
}

// Verify Razorpay webhook signature (timing-safe)
export function verifyWebhookSignature(
    body: string,
    signature: string,
    secret: string
): boolean {
    try {
        if (!body || !signature || !secret) {
            return false;
        }
        const expectedSignature = crypto
            .createHmac('sha256', secret)
            .update(body)
            .digest('hex');

        return timingSafeEqual(expectedSignature, signature);
    } catch (error) {
        console.error('Signature verification failed:', error);
        return false;
    }
}

// Verify Razorpay payment signature (timing-safe)
export function verifyPaymentSignature(
    orderId: string,
    paymentId: string,
    signature: string
): boolean {
    try {
        if (!orderId || !paymentId || !signature) {
            return false;
        }
        const text = `${orderId}|${paymentId}`;
        const expectedSignature = crypto
            .createHmac('sha256', getRazorpayKeySecret())
            .update(text)
            .digest('hex');

        return timingSafeEqual(expectedSignature, signature);
    } catch (error) {
        console.error('Payment signature verification failed:', error);
        return false;
    }
}

// Verify subscription signature (timing-safe)
export function verifySubscriptionSignature(
    subscriptionId: string,
    paymentId: string,
    signature: string
): boolean {
    try {
        if (!subscriptionId || !paymentId || !signature) {
            return false;
        }
        const text = `${subscriptionId}|${paymentId}`;
        const expectedSignature = crypto
            .createHmac('sha256', getRazorpayKeySecret())
            .update(text)
            .digest('hex');

        return timingSafeEqual(expectedSignature, signature);
    } catch (error) {
        console.error('Subscription signature verification failed:', error);
        return false;
    }
}