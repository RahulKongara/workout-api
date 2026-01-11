'use client';

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
    CreditCard,
    AlertTriangle,
    CheckCircle,
    Calendar,
    DollarSign,
    TrendingUp
} from 'lucide-react';
import { formatDate, formatCurrency } from '@/lib/utils/helpers';
import { TIER_PRICES, TIER_LIMITS } from '@/lib/constants';

export default function BillingPage() {
    const [subscription, setSubscription] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [canceling, setCanceling] = useState(false);

    const router = useRouter();
    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    useEffect(() => {
        fetchSubscription();
    }, []);

    const fetchSubscription = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.push('/login');
                return;
            }

            const { data, error } = await supabase
                .from('subscriptions')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            if (error) throw error;

            setSubscription(data);
        } catch (error) {
            console.error('Error fetching subscription:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCancelSubscription = async () => {
        if (!confirm('Are you sure you want to cancel your subscription? You will lose access to premium features at the end of your billing period.')) {
            return;
        }

        setCanceling(true);
        try {
            const response = await fetch('/api/subscription/cancel', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cancelAtPeriodEnd: true }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to cancel subscription');
            }

            alert('Subscription cancelled successfully. You will retain access until the end of your billing period.');
            fetchSubscription();
        } catch (error: any) {
            alert(error.message);
        } finally {
            setCanceling(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-gray-500">Loading billing information...</div>
            </div>
        );
    }

    const tier = subscription?.tier || 'free';
    const status = subscription?.status || 'active';
    const monthlyPrice = TIER_PRICES[tier as keyof typeof TIER_PRICES].monthly;
    const limits = TIER_LIMITS[tier as keyof typeof TIER_LIMITS];

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-4xl mx-auto px-4 py-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">Billing & Subscription</h1>
                    <p className="text-gray-500 mt-1">
                        Manage your subscription and payment details
                    </p>
                </div>

                {/* Status Alerts */}
                {subscription?.cancel_at_period_end && (
                    <Alert className="mb-6 border-orange-200 bg-orange-50">
                        <AlertTriangle className="h-4 w-4 text-orange-600" />
                        <AlertDescription className="text-orange-800">
                            Your subscription will be cancelled on{' '}
                            <strong>{formatDate(subscription.current_period_end)}</strong>.
                            You can reactivate it anytime before this date.
                        </AlertDescription>
                    </Alert>
                )}

                {status === 'past_due' && (
                    <Alert variant="destructive" className="mb-6">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                            Your payment failed. Please update your payment method to avoid service interruption.
                        </AlertDescription>
                    </Alert>
                )}

                {/* Current Plan */}
                <Card className="mb-6">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle className="flex items-center gap-2">
                                <CreditCard className="w-5 h-5" />
                                Current Plan
                            </CardTitle>
                            <Badge
                                variant={status === 'active' ? 'default' : 'destructive'}
                            >
                                {status}
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-3xl font-bold capitalize">{tier} Plan</p>
                                <p className="text-gray-600 mt-1">
                                    {formatCurrency(monthlyPrice)}/month
                                </p>
                            </div>
                            <div className="text-right">
                                {tier === 'free' ? (
                                    <Link href="/pricing">
                                        <Button>
                                            <TrendingUp className="w-4 h-4 mr-2" />
                                            Upgrade Plan
                                        </Button>
                                    </Link>
                                ) : (
                                    <Link href="/pricing">
                                        <Button variant="outline">Change Plan</Button>
                                    </Link>
                                )}
                            </div>
                        </div>

                        {/* Plan Features */}
                        <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                            <div>
                                <p className="text-sm text-gray-500 mb-1">Requests per Month</p>
                                <p className="text-lg font-semibold">
                                    {limits.monthly === -1 ? 'Unlimited' : limits.monthly.toLocaleString()}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 mb-1">Rate Limit</p>
                                <p className="text-lg font-semibold">
                                    {limits.perMinute}/minute
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 mb-1">API Keys</p>
                                <p className="text-lg font-semibold">
                                    Up to {limits.maxApiKeys}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 mb-1">Support</p>
                                <p className="text-lg font-semibold capitalize">
                                    {tier === 'free' ? 'Community' : tier === 'pro' ? 'Email' : 'Priority'}
                                </p>
                            </div>
                        </div>

                        {/* Billing Info */}
                        {tier !== 'free' && subscription?.current_period_end && (
                            <div className="pt-4 border-t">
                                <div className="flex items-center justify-between text-sm">
                                    <div className="flex items-center gap-2 text-gray-600">
                                        <Calendar className="w-4 h-4" />
                                        <span>Next billing date</span>
                                    </div>
                                    <span className="font-medium">
                                        {formatDate(subscription.current_period_end)}
                                    </span>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Available Plans */}
                <Card className="mb-6">
                    <CardHeader>
                        <CardTitle>Available Plans</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {(['free', 'pro', 'enterprise'] as const).map((planTier) => {
                                const price = TIER_PRICES[planTier].monthly;
                                const planLimits = TIER_LIMITS[planTier];
                                const isCurrent = tier === planTier;

                                return (
                                    <div
                                        key={planTier}
                                        className={`p-4 rounded-lg border-2 ${isCurrent
                                            ? 'border-blue-500 bg-blue-50'
                                            : 'border-gray-200 hover:border-gray-300'
                                            }`}
                                    >
                                        <div className="flex items-center justify-between mb-3">
                                            <h3 className="text-lg font-semibold capitalize">{planTier}</h3>
                                            {isCurrent && (
                                                <Badge className="bg-blue-500">Current</Badge>
                                            )}
                                        </div>
                                        <p className="text-2xl font-bold mb-4">
                                            ${price}
                                            <span className="text-sm text-gray-600 font-normal">/mo</span>
                                        </p>
                                        <ul className="space-y-2 text-sm text-gray-600 mb-4">
                                            <li className="flex items-center gap-2">
                                                <CheckCircle className="w-4 h-4 text-green-500" />
                                                {planLimits.monthly === -1
                                                    ? 'Unlimited requests'
                                                    : `${planLimits.monthly.toLocaleString()} requests/mo`}
                                            </li>
                                            <li className="flex items-center gap-2">
                                                <CheckCircle className="w-4 h-4 text-green-500" />
                                                {planLimits.perMinute}/min rate limit
                                            </li>
                                            <li className="flex items-center gap-2">
                                                <CheckCircle className="w-4 h-4 text-green-500" />
                                                {planLimits.maxApiKeys} API keys
                                            </li>
                                        </ul>
                                        {!isCurrent && (
                                            <Link href="/pricing">
                                                <Button variant="outline" size="sm" className="w-full">
                                                    {planTier === 'free' ? 'Downgrade' : 'Upgrade'}
                                                </Button>
                                            </Link>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>

                {/* Danger Zone */}
                {tier !== 'free' && !subscription?.cancel_at_period_end && (
                    <Card className="border-red-200">
                        <CardHeader>
                            <CardTitle className="text-red-600">Danger Zone</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-medium text-gray-900">Cancel Subscription</p>
                                    <p className="text-sm text-gray-600 mt-1">
                                        You will lose access to premium features at the end of your billing period
                                    </p>
                                </div>
                                <Button
                                    variant="destructive"
                                    onClick={handleCancelSubscription}
                                    disabled={canceling}
                                >
                                    {canceling ? 'Canceling...' : 'Cancel Plan'}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Help Section */}
                <Card className="mt-6 border-blue-200 bg-blue-50">
                    <CardContent className="pt-6">
                        <h3 className="font-semibold text-blue-900 mb-2">Need Help?</h3>
                        <p className="text-sm text-blue-700 mb-4">
                            Have questions about billing or want to discuss custom pricing?
                        </p>
                        <div className="flex gap-4">
                            <Link href="/docs">
                                <Button variant="outline" size="sm">
                                    View Documentation
                                </Button>
                            </Link>
                            <Button variant="outline" size="sm">
                                Contact Support
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}