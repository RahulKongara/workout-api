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
    const [topWorkouts, setTopWorkouts] = useState<any[]>([]);
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

            // Top workouts by API requests
            const { data: usageData } = await supabase
                .from('api_usage')
                .select('endpoint')
                .gte('created_at', startDate.toISOString());

            // Extract workout IDs from endpoints
            const workoutRequests: Record<string, number> = {};
            usageData?.forEach((usage: any) => {
                const match = usage.endpoint.match(/\/workouts\/([a-f0-9-]+)/);
                if (match) {
                    const id = match[1];
                    workoutRequests[id] = (workoutRequests[id] || 0) + 1;
                }
            });

            // Get top 5 workout IDs
            const topWorkoutIds = Object.entries(workoutRequests)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 5)
                .map(([id]) => id);

            // Fetch workout details
            if (topWorkoutIds.length > 0) {
                const { data: workoutsData } = await supabase
                    .from('workouts')
                    .select('id, name, difficulty')
                    .in('id', topWorkoutIds);

                const topWorkoutsWithCount = workoutsData?.map((w: { id: string | number; }) => ({
                    ...w,
                    requests: workoutRequests[w.id],
                })).sort((a: { requests: number; }, b: { requests: number; }) => b.requests - a.requests) || [];

                setTopWorkouts(topWorkoutsWithCount);
            }

            // Recent activity
            const { data: recentUsage } = await supabase
                .from('api_usage')
                .select(`
          id,
          endpoint,
          method,
          status_code,
          created_at,
          api_keys (
            name,
            users (
              email
            )
          )
        `)
                .order('created_at', { ascending: false })
                .limit(10);

            setRecentActivity(recentUsage || []);

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

            {/* Top Workouts */}
            <Card>
                <CardHeader>
                    <CardTitle>Most Requested Workouts</CardTitle>
                </CardHeader>
                <CardContent>
                    {topWorkouts.length === 0 ? (
                        <p className="text-center text-gray-500 py-8">
                            No workout requests in this period
                        </p>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Rank</TableHead>
                                    <TableHead>Workout</TableHead>
                                    <TableHead>Difficulty</TableHead>
                                    <TableHead className="text-right">Requests</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {topWorkouts.map((workout, index) => (
                                    <TableRow key={workout.id}>
                                        <TableCell className="font-medium">#{index + 1}</TableCell>
                                        <TableCell>{workout.name}</TableCell>
                                        <TableCell>
                                            <Badge variant="outline">{workout.difficulty}</Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {formatNumber(workout.requests)}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
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
                                            {(activity.api_keys as any)?.users?.email || 'Unknown'}
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