'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    TrendingUp,
    Users,
    Activity,
    DollarSign,
    Dumbbell,
    Calendar
} from 'lucide-react';
import { formatNumber, formatCurrency } from '@/lib/utils/helpers';

export default function AnalyticsPage() {
    const [loading, setLoading] = useState(true);
    const [timeRange, setTimeRange] = useState('7');
    const [stats, setStats] = useState({
        totalRequests: 0,
        totalUsers: 0,
        activeSubscriptions: 0,
        totalRevenue: 0,
        totalWorkouts: 0,
    });
    const [popularFilters, setPopularFilters] = useState<{
        difficulties: { name: string; count: number }[];
        muscleGroups: { name: string; count: number }[];
        searches: { name: string; count: number }[];
    }>({ difficulties: [], muscleGroups: [], searches: [] });
    const [recentActivity, setRecentActivity] = useState<any[]>([]);
    const [subscriptionBreakdown, setSubscriptionBreakdown] = useState({
        free: 0,
        pro: 0,
        enterprise: 0,
    });

    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    useEffect(() => {
        fetchAnalytics();
    }, [timeRange]);

    const fetchAnalytics = async () => {
        setLoading(true);
        try {
            const daysAgo = parseInt(timeRange);
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - daysAgo);

            // Total users
            const { count: userCount } = await supabase
                .from('users')
                .select('*', { count: 'exact', head: true });

            // Total workouts
            const { count: workoutCount } = await supabase
                .from('workouts')
                .select('*', { count: 'exact', head: true })
                .eq('is_deleted', false);

            // Total API requests
            const { count: requestCount } = await supabase
                .from('api_usage')
                .select('*', { count: 'exact', head: true })
                .gte('created_at', startDate.toISOString());

            // Active subscriptions
            const { count: activeSubCount } = await supabase
                .from('subscriptions')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'active');

            // Subscription breakdown
            const { data: allSubs } = await supabase
                .from('subscriptions')
                .select('tier')
                .eq('status', 'active');

            const breakdown = {
                free: allSubs?.filter((s: { tier: string; }) => s.tier === 'free').length || 0,
                pro: allSubs?.filter((s: { tier: string; }) => s.tier === 'pro').length || 0,
                enterprise: allSubs?.filter((s: { tier: string; }) => s.tier === 'enterprise').length || 0,
            };

            // Calculate revenue (rough estimate)
            const revenue = (breakdown.pro * 29) + (breakdown.enterprise * 99);

            // Top filters by API requests
            const { data: usageData } = await supabase
                .from('api_usage')
                .select('endpoint')
                .like('endpoint', '%/api/v1/workouts%')
                .gte('created_at', startDate.toISOString());

            // Parse query parameters from endpoints
            const difficultyCount: Record<string, number> = {};
            const muscleGroupCount: Record<string, number> = {};
            const searchCount: Record<string, number> = {};

            usageData?.forEach((usage: any) => {
                try {
                    const url = new URL('http://localhost:3000' + usage.endpoint);
                    const difficulty = url.searchParams.get('difficulty');
                    const muscleGroup = url.searchParams.get('muscle_group');
                    const search = url.searchParams.get('search');

                    if (difficulty) {
                        difficultyCount[difficulty] = (difficultyCount[difficulty] || 0) + 1;
                    }
                    if (muscleGroup) {
                        muscleGroupCount[muscleGroup] = (muscleGroupCount[muscleGroup] || 0) + 1;
                    }
                    if (search) {
                        searchCount[search] = (searchCount[search] || 0) + 1;
                    }
                } catch (e) {
                    // Ignore malformed URLs
                    console.error('Error parsing URL:', e);
                }
            });

            // Convert to sorted arrays
            const sortedDifficulties = Object.entries(difficultyCount)
                .map(([name, count]) => ({ name, count }))
                .sort((a, b) => b.count - a.count)
                .slice(0, 5);

            const sortedMuscleGroups = Object.entries(muscleGroupCount)
                .map(([name, count]) => ({ name, count }))
                .sort((a, b) => b.count - a.count)
                .slice(0, 5);

            const sortedSearches = Object.entries(searchCount)
                .map(([name, count]) => ({ name, count }))
                .sort((a, b) => b.count - a.count)
                .slice(0, 5);

            setPopularFilters({
                difficulties: sortedDifficulties,
                muscleGroups: sortedMuscleGroups,
                searches: sortedSearches,
            });

            // Recent activity - just get basic usage data
            const { data: recentUsage, error: usageError } = await supabase
                .from('api_usage')
                .select('id, endpoint, method, status_code, created_at, api_key_id')
                .order('created_at', { ascending: false })
                .limit(10);

            if (usageError) {
                console.error('Usage error:', usageError);
            }

            // Get unique API key IDs
            const apiKeyIds = [...new Set(recentUsage?.map((u: any) => u.api_key_id).filter(Boolean) || [])];

            let apiKeyMap: Record<string, { name: string; user_id: string }> = {};
            let userMap: Record<string, string> = {};

            if (apiKeyIds.length > 0) {
                // Fetch API keys
                const { data: apiKeysData, error: apiKeysError } = await supabase
                    .from('api_keys')
                    .select('id, name, user_id')
                    .in('id', apiKeyIds);

                if (apiKeysError) {
                    console.error('API keys error:', apiKeysError);
                }

                apiKeysData?.forEach((key: any) => {
                    apiKeyMap[key.id] = { name: key.name, user_id: key.user_id };
                });

                // Get user IDs from API keys
                const userIds = [...new Set(apiKeysData?.map((k: any) => k.user_id).filter(Boolean) || [])];

                if (userIds.length > 0) {
                    // Fetch users
                    const { data: usersData, error: usersError } = await supabase
                        .from('users')
                        .select('id, email')
                        .in('id', userIds);

                    if (usersError) {
                        console.error('Users error:', usersError);
                    }

                    usersData?.forEach((user: any) => {
                        userMap[user.id] = user.email;
                    });
                }
            }

            // Add user email to recent activity
            const activityWithUsers = recentUsage?.map((activity: any) => {
                const apiKey = activity.api_key_id ? apiKeyMap[activity.api_key_id] : null;
                const userEmail = apiKey?.user_id ? userMap[apiKey.user_id] : null;
                return {
                    ...activity,
                    apiKeyName: apiKey?.name || null,
                    userEmail: userEmail,
                };
            }) || [];

            setRecentActivity(activityWithUsers);

            setStats({
                totalRequests: requestCount || 0,
                totalUsers: userCount || 0,
                activeSubscriptions: activeSubCount || 0,
                totalRevenue: revenue,
                totalWorkouts: workoutCount || 0,
            });

            setSubscriptionBreakdown(breakdown);
        } catch (error) {
            console.error('Error fetching analytics:', error);
        } finally {
            setLoading(false);
        }
    };

    const StatCard = ({ icon: Icon, title, value, subtitle, trend }: any) => (
        <Card>
            <CardContent className="p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm text-gray-500 mb-1">{title}</p>
                        <p className="text-3xl font-bold">{value}</p>
                        {subtitle && (
                            <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
                        )}
                    </div>
                    <div className={`p-3 rounded-full ${trend === 'up' ? 'bg-green-100' : 'bg-blue-100'
                        }`}>
                        <Icon className={`w-6 h-6 ${trend === 'up' ? 'text-green-600' : 'text-blue-600'
                            }`} />
                    </div>
                </div>
            </CardContent>
        </Card>
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-gray-500">Loading analytics...</div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
                    <p className="text-gray-500 mt-1">
                        Monitor your API performance and usage
                    </p>
                </div>
                <Select value={timeRange} onValueChange={setTimeRange}>
                    <SelectTrigger className="w-40">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="7">Last 7 days</SelectItem>
                        <SelectItem value="30">Last 30 days</SelectItem>
                        <SelectItem value="90">Last 90 days</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    icon={Activity}
                    title="API Requests"
                    value={formatNumber(stats.totalRequests)}
                    subtitle={`Last ${timeRange} days`}
                    trend="up"
                />
                <StatCard
                    icon={Users}
                    title="Total Users"
                    value={formatNumber(stats.totalUsers)}
                    subtitle={`${stats.activeSubscriptions} active`}
                />
                <StatCard
                    icon={DollarSign}
                    title="Monthly Revenue"
                    value={formatCurrency(stats.totalRevenue)}
                    subtitle="Estimated MRR"
                    trend="up"
                />
                <StatCard
                    icon={Dumbbell}
                    title="Total Workouts"
                    value={formatNumber(stats.totalWorkouts)}
                    subtitle="In database"
                />
            </div>

            {/* Subscription Breakdown */}
            <Card>
                <CardHeader>
                    <CardTitle>Subscription Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-3 gap-4">
                        <div className="text-center p-4 bg-blue-50 rounded-lg">
                            <p className="text-sm text-gray-600 mb-1">Free</p>
                            <p className="text-3xl font-bold text-blue-600">
                                {subscriptionBreakdown.free}
                            </p>
                        </div>
                        <div className="text-center p-4 bg-purple-50 rounded-lg">
                            <p className="text-sm text-gray-600 mb-1">Pro</p>
                            <p className="text-3xl font-bold text-purple-600">
                                {subscriptionBreakdown.pro}
                            </p>
                        </div>
                        <div className="text-center p-4 bg-orange-50 rounded-lg">
                            <p className="text-sm text-gray-600 mb-1">Enterprise</p>
                            <p className="text-3xl font-bold text-orange-600">
                                {subscriptionBreakdown.enterprise}
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Popular Filters */}
            <Card>
                <CardHeader>
                    <CardTitle>Most Popular Filters</CardTitle>
                </CardHeader>
                <CardContent>
                    {popularFilters.difficulties.length === 0 &&
                        popularFilters.muscleGroups.length === 0 &&
                        popularFilters.searches.length === 0 ? (
                        <p className="text-center text-gray-500 py-8">
                            No filter usage in this period
                        </p>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* Difficulty Levels */}
                            <div>
                                <h4 className="font-medium text-gray-700 mb-3">Difficulty Levels</h4>
                                {popularFilters.difficulties.length === 0 ? (
                                    <p className="text-sm text-gray-400">No data</p>
                                ) : (
                                    <div className="space-y-2">
                                        {popularFilters.difficulties.map((item, idx) => (
                                            <div key={item.name} className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm text-gray-500">#{idx + 1}</span>
                                                    <Badge variant="outline" className="capitalize">{item.name}</Badge>
                                                </div>
                                                <span className="text-sm font-medium">{item.count}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Muscle Groups */}
                            <div>
                                <h4 className="font-medium text-gray-700 mb-3">Muscle Groups</h4>
                                {popularFilters.muscleGroups.length === 0 ? (
                                    <p className="text-sm text-gray-400">No data</p>
                                ) : (
                                    <div className="space-y-2">
                                        {popularFilters.muscleGroups.map((item, idx) => (
                                            <div key={item.name} className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm text-gray-500">#{idx + 1}</span>
                                                    <Badge variant="outline" className="capitalize">{item.name}</Badge>
                                                </div>
                                                <span className="text-sm font-medium">{item.count}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Search Terms */}
                            <div>
                                <h4 className="font-medium text-gray-700 mb-3">Search Terms</h4>
                                {popularFilters.searches.length === 0 ? (
                                    <p className="text-sm text-gray-400">No data</p>
                                ) : (
                                    <div className="space-y-2">
                                        {popularFilters.searches.map((item, idx) => (
                                            <div key={item.name} className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm text-gray-500">#{idx + 1}</span>
                                                    <span className="text-sm font-mono bg-gray-100 px-2 py-0.5 rounded">{item.name}</span>
                                                </div>
                                                <span className="text-sm font-medium">{item.count}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
                <CardHeader>
                    <CardTitle>Recent API Activity</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>User</TableHead>
                                <TableHead>Endpoint</TableHead>
                                <TableHead>Method</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Time</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {recentActivity.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center text-gray-500 py-8">
                                        No recent activity
                                    </TableCell>
                                </TableRow>
                            ) : (
                                recentActivity.map((activity) => (
                                    <TableRow key={activity.id}>
                                        <TableCell className="text-sm">
                                            {activity.userEmail || activity.apiKeyName || 'Unknown'}
                                        </TableCell>
                                        <TableCell className="text-sm font-mono">
                                            {activity.endpoint}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline">{activity.method}</Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Badge
                                                variant={activity.status_code < 400 ? 'default' : 'destructive'}
                                            >
                                                {activity.status_code}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-sm text-gray-500">
                                            {new Date(activity.created_at).toLocaleString()}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}