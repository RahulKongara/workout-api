'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, Zap } from 'lucide-react';
import { useRazorpay } from '@/lib/hooks/useRazorpay';
import { TIER_FEATURES, TIER_PRICES } from '@/lib/constants';
import { toast } from 'sonner';
import { Breadcrumbs } from '@/components/shared/Breadcrumbs';

export default function PricingPage() {
    const [loading, setLoading] = useState<string | null>(null);
    const router = useRouter();
    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { createSubscription } = useRazorpay();

    const handleSubscribe = async (tier: 'pro' | 'enterprise') => {
        setLoading(tier);

        try {
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                router.push('/login?redirect=/pricing');
                return;
            }

            const planId = tier === 'pro'
                ? process.env.NEXT_PUBLIC_RAZORPAY_PLAN_ID_PRO
                : process.env.NEXT_PUBLIC_RAZORPAY_PLAN_ID_ENTERPRISE;

            if (!planId) {
                toast.error('Plan ID not configured');
                setLoading(null);
                return;
            }

            // First, create subscription record on backend with tier info
            const createResponse = await fetch('/api/subscription/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ planId, tier }), // Pass tier to backend
            });

            if (!createResponse.ok) {
                throw new Error('Failed to create subscription');
            }

            const { subscriptionId, razorpayKeyId } = await createResponse.json();

            const { data: userData } = await supabase
                .from('users')
                .select('email, company_name')
                .eq('id', user.id)
                .single();

            // Open Razorpay checkout with the subscription ID
            if (!(window as any).Razorpay) {
                const script = document.createElement('script');
                script.src = 'https://checkout.razorpay.com/v1/checkout.js';
                script.async = true;
                document.body.appendChild(script);
                await new Promise((resolve) => (script.onload = resolve));
            }

            const rzpOptions = {
                key: razorpayKeyId,
                subscription_id: subscriptionId,
                name: 'WorkoutAPI',
                description: `${tier.charAt(0).toUpperCase() + tier.slice(1)} Plan Subscription`,
                image: '/logo.png',
                prefill: {
                    email: userData?.email || user.email!,
                    name: userData?.company_name,
                },
                theme: {
                    color: '#3B82F6',
                },
                handler: async (response: any) => {
                    try {
                        // Verify payment on backend
                        const verifyResponse = await fetch('/api/subscription/verify', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                razorpay_payment_id: response.razorpay_payment_id,
                                razorpay_subscription_id: response.razorpay_subscription_id,
                                razorpay_signature: response.razorpay_signature,
                            }),
                        });

                        if (!verifyResponse.ok) {
                            throw new Error('Payment verification failed');
                        }

                        // Success! Redirect to dashboard
                        router.push('/dashboard?success=true');
                    } catch (error) {
                        console.error('Payment verification error:', error);
                        toast.error('Payment verification failed. Please contact support.');
                        setLoading(null);
                    }
                },
                modal: {
                    ondismiss: () => {
                        setLoading(null);
                    },
                },
            };

            const rzp = new (window as any).Razorpay(rzpOptions);
            rzp.open();
        } catch (error) {
            console.error('Subscribe error:', error);
            toast.error('Failed to initiate subscription. Please try again.');
            setLoading(null);
        }
    };

    const plans = [
        {
            name: 'Free',
            price: TIER_PRICES.free.monthly,
            description: 'Perfect for trying out WorkoutAPI',
            features: TIER_FEATURES.free,
            buttonText: 'Get Started',
            buttonAction: () => router.push('/signup'),
            popular: false,
        },
        {
            name: 'Pro',
            price: TIER_PRICES.pro.monthly,
            description: 'For growing applications',
            features: TIER_FEATURES.pro,
            buttonText: 'Subscribe',
            buttonAction: () => handleSubscribe('pro'),
            popular: true,
        },
        {
            name: 'Enterprise',
            price: TIER_PRICES.enterprise.monthly,
            description: 'For large-scale production apps',
            features: TIER_FEATURES.enterprise,
            buttonText: 'Subscribe',
            buttonAction: () => handleSubscribe('enterprise'),
            popular: false,
        },
    ];

    return (
        <div className="min-h-screen bg-linear-to-b from-gray-50 to-white">
            {/* Navigation */}
            <nav className="border-b border-gray-200 bg-white">
                <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-8">
                        <Link href="/">
                            <h1 className="text-2xl font-bold text-gray-900">WorkoutAPI</h1>
                        </Link>
                        <div className="hidden md:flex gap-6">
                            <Link href="/docs" className="text-gray-600 hover:text-gray-900">
                                Documentation
                            </Link>
                            <Link href="/pricing" className="text-blue-600 font-medium">
                                Pricing
                            </Link>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <Link href="/login">
                            <Button variant="ghost">Sign In</Button>
                        </Link>
                        <Link href="/signup">
                            <Button>Get Started</Button>
                        </Link>
                    </div>
                </div>
            </nav>

            {/* Breadcrumbs */}
            <div className="bg-gray-50 border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 py-3">
                    <Breadcrumbs items={[{ label: 'Pricing' }]} />
                </div>
            </div>

            {/* Header */}
            <div className="max-w-7xl mx-auto px-4 py-16 text-center">
                <Badge className="mb-4">Pricing</Badge>
                <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
                    Simple, Transparent Pricing
                </h1>
                <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                    Choose the plan that fits your needs. All plans include access to our complete workout database.
                </p>
            </div>

            {/* Pricing Cards */}
            <div className="max-w-7xl mx-auto px-4 pb-16">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {plans.map((plan) => (
                        <Card
                            key={plan.name}
                            className={`relative ${plan.popular
                                ? 'border-2 border-blue-500 shadow-xl'
                                : 'border border-gray-200'
                                }`}
                        >
                            {plan.popular && (
                                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                                    <Badge className="bg-blue-500 text-white px-4 py-1">
                                        Most Popular
                                    </Badge>
                                </div>
                            )}

                            <CardHeader className="text-center pb-8 pt-8">
                                <CardTitle className="text-2xl font-bold mb-2">
                                    {plan.name}
                                </CardTitle>
                                <p className="text-gray-600 text-sm mb-4">{plan.description}</p>
                                <div className="flex items-baseline justify-center gap-1">
                                    <span className="text-4xl font-bold text-gray-900">
                                        ${plan.price}
                                    </span>
                                    <span className="text-gray-600">/month</span>
                                </div>
                            </CardHeader>

                            <CardContent className="space-y-6">
                                <Button
                                    onClick={plan.buttonAction}
                                    disabled={loading === plan.name.toLowerCase()}
                                    className={`w-full ${plan.popular
                                        ? 'bg-blue-500 hover:bg-blue-600'
                                        : 'bg-gray-900 hover:bg-gray-800'
                                        }`}
                                >
                                    {loading === plan.name.toLowerCase() ? (
                                        'Processing...'
                                    ) : (
                                        <>
                                            {plan.popular && <Zap className="w-4 h-4 mr-2" />}
                                            {plan.buttonText}
                                        </>
                                    )}
                                </Button>

                                <div className="space-y-3">
                                    {plan.features.map((feature, index) => (
                                        <div key={index} className="flex items-start gap-3">
                                            <Check className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                                            <span className="text-sm text-gray-700">{feature}</span>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>

            {/* FAQ Section */}
            <div className="max-w-4xl mx-auto px-4 py-16">
                <h2 className="text-3xl font-bold text-center mb-12">
                    Frequently Asked Questions
                </h2>
                <div className="space-y-6">
                    <div>
                        <h3 className="font-semibold text-lg mb-2">
                            Can I change plans later?
                        </h3>
                        <p className="text-gray-600">
                            Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately, and we'll prorate the charges.
                        </p>
                    </div>

                    <div>
                        <h3 className="font-semibold text-lg mb-2">
                            What happens if I exceed my rate limits?
                        </h3>
                        <p className="text-gray-600">
                            If you exceed your monthly quota, your API requests will return a 429 error. You can upgrade your plan or wait until the next billing cycle.
                        </p>
                    </div>

                    <div>
                        <h3 className="font-semibold text-lg mb-2">
                            Do you offer refunds?
                        </h3>
                        <p className="text-gray-600">
                            We offer a 14-day money-back guarantee on all paid plans. If you're not satisfied, contact us for a full refund.
                        </p>
                    </div>

                    <div>
                        <h3 className="font-semibold text-lg mb-2">
                            Is there a free trial?
                        </h3>
                        <p className="text-gray-600">
                            The Free plan is available forever with no credit card required. You can test the API and upgrade when you're ready.
                        </p>
                    </div>
                </div>
            </div>

            {/* CTA Section */}
            <div className="bg-blue-600 text-white py-16">
                <div className="max-w-4xl mx-auto px-4 text-center">
                    <h2 className="text-3xl font-bold mb-4">
                        Ready to get started?
                    </h2>
                    <p className="text-xl text-blue-100 mb-8">
                        Join hundreds of developers using WorkoutAPI to power their fitness applications
                    </p>
                    <Button
                        size="lg"
                        variant="secondary"
                        onClick={() => router.push('/signup')}
                    >
                        Start Building Today
                    </Button>
                </div>
            </div>
        </div>
    );
}