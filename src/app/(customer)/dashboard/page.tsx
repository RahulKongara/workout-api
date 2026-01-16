'use client';

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import Link from 'next/link';
import {
    Key,
    Activity,
    TrendingUp,
    AlertCircle,
    CreditCard,
    Zap
} from 'lucide-react';
import { formatNumber, calculatePercentage } from '@/lib/utils/helpers';
import { TIER_LIMITS, SubscriptionTier } from '@/lib/constants';
import { toast } from 'sonner';

export default function DashboardPage() {
    const [loading, setLoading] = useState(true);
    const [subscription, setSubscription] = useState<any>(null);
    const [apiKeys, setApiKeys] = useState<any[]>([]);
    const [usage, setUsage] = useState({ total: 0, thisMonth: 0 });

    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Fetch subscription
            const { data: subData } = await supabase
                .from('subscriptions')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            setSubscription(subData);

            // Fetch API keys
            const { data: keysData } = await supabase
                .from('api_keys')
                .select('*')
                .eq('user_id', user.id)
                .eq('is_active', true);

            setApiKeys(keysData || []);

            // Fetch usage stats
            if (keysData && keysData.length > 0) {
                const keyIds = keysData.map(k => k.id);

                // Total requests
                const { count: totalCount } = await supabase
                    .from('api_usage')
                    .select('*', { count: 'exact', head: true })
                    .in('api_key_id', keyIds);

                // This month requests
                const startOfMonth = new Date();
                startOfMonth.setDate(1);
                startOfMonth.setHours(0, 0, 0, 0);

                const { count: monthCount } = await supabase
                    .from('api_usage')
                    .select('*', { count: 'exact', head: true })
                    .in('api_key_id', keyIds)
                    .gte('created_at', startOfMonth.toISOString());

                setUsage({
                    total: totalCount || 0,
                    thisMonth: monthCount || 0,
                });
            }
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSyncSubscription = async () => {
        try {
            const response = await fetch('/api/subscription/sync', {
                method: 'POST',
            });

            if (response.ok) {
                // Refresh dashboard data
                setLoading(true);
                await fetchDashboardData();
                toast.success('Subscription synced successfully!');
            } else {
                throw new Error('Sync failed');
            }
        } catch (error) {
            console.error('Sync error:', error);
            toast.error('Failed to sync subscription. Please try again.');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-gray-500">Loading dashboard...</div>
            </div>
        );
    }

    const tier: SubscriptionTier = subscription?.tier || 'free';
    const limits = TIER_LIMITS[tier];
    const monthlyLimit = limits.monthly === -1 ? '∞' : formatNumber(limits.monthly);
    const usagePercentage =
        limits.monthly === -1
            ? 0
            : calculatePercentage(usage.thisMonth, limits.monthly);

    const isNearLimit = usagePercentage >= 80;

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
                    <p className="text-gray-500 mt-1">
                        Monitor your API usage and manage your subscription
                    </p>
                </div>

                {/* Subscription Status */}
                <Card className="mb-6">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle className="flex items-center gap-2">
                                <CreditCard className="w-5 h-5" />
                                Subscription
                            </CardTitle>
                            <div className="flex items-center gap-2">
                                <Badge
                                    variant={subscription?.status === 'active' ? 'default' : 'destructive'}
                                >
                                    {subscription?.status || 'No subscription'}
                                </Badge>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleSyncSubscription}
                                    title="Sync subscription status"
                                >
                                    <Activity className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-2xl font-bold capitalize">{tier} Plan</p>
                                <p className="text-sm text-gray-500 mt-1">
                                    {limits.monthly === -1
                                        ? 'Unlimited requests'
                                        : `${formatNumber(limits.monthly)} requests/month`}
                                </p>
                            </div>
                            {tier === 'free' && (
                                <Link href="/pricing">
                                    <Button>
                                        <Zap className="w-4 h-4 mr-2" />
                                        Upgrade
                                    </Button>
                                </Link>
                            )}
                            {tier !== 'free' && (
                                <Link href="/billing">
                                    <Button variant="outline">Manage Subscription</Button>
                                </Link>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    {/* Monthly Usage */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm font-medium text-gray-500">
                                This Month
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                <div>
                                    <p className="text-3xl font-bold">
                                        {formatNumber(usage.thisMonth)}
                                    </p>
                                    <p className="text-sm text-gray-500">
                                        of {monthlyLimit} requests
                                    </p>
                                </div>
                                {limits.monthly !== -1 && (
                                    <>
                                        <Progress value={usagePercentage} />
                                        {isNearLimit && (
                                            <div className="flex items-center gap-2 text-orange-600 text-sm">
                                                <AlertCircle className="w-4 h-4" />
                                                <span>Approaching limit</span>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Total Requests */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm font-medium text-gray-500">
                                Total Requests
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center gap-3">
                                <Activity className="w-8 h-8 text-blue-500" />
                                <div>
                                    <p className="text-3xl font-bold">
                                        {formatNumber(usage.total)}
                                    </p>
                                    <p className="text-sm text-gray-500">All time</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Active API Keys */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm font-medium text-gray-500">
                                API Keys
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center gap-3">
                                <Key className="w-8 h-8 text-purple-500" />
                                <div>
                                    <p className="text-3xl font-bold">{apiKeys.length}</p>
                                    <p className="text-sm text-gray-500">
                                        of {limits.maxApiKeys} available
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* API Keys Card */}
                    <Card>
                        <CardHeader>
                            <CardTitle>API Keys</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-gray-600 mb-4">
                                Manage your API keys to access the WorkoutAPI
                            </p>
                            <Link href="/api-keys">
                                <Button variant="outline" className="w-full">
                                    View API Keys
                                </Button>
                            </Link>
                        </CardContent>
                    </Card>

                    {/* Documentation Card */}
                    <Card>
                        <CardHeader>
                            <CardTitle>API Documentation</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-gray-600 mb-4">
                                Learn how to integrate WorkoutAPI into your application
                            </p>
                            <Link href="/docs">
                                <Button variant="outline" className="w-full">
                                    Read Docs
                                </Button>
                            </Link>
                        </CardContent>
                    </Card>
                </div>

                {/* Getting Started */}
                {apiKeys.length === 0 && (
                    <Card className="mt-6 border-blue-200 bg-blue-50">
                        <CardContent className="pt-6">
                            <div className="flex items-start gap-4">
                                <TrendingUp className="w-6 h-6 text-blue-600 mt-1" />
                                <div className="flex-1">
                                    <h3 className="font-semibold text-blue-900 mb-2">
                                        Get Started with WorkoutAPI
                                    </h3>
                                    <p className="text-blue-700 text-sm mb-4">
                                        Create your first API key to start making requests to the WorkoutAPI
                                    </p>
                                    <Link href="/api-keys">
                                        <Button size="sm">
                                            Create API Key
                                        </Button>
                                    </Link>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}