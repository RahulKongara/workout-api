'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Dumbbell,
    Users,
    Activity,
    TrendingUp,
    Plus,
    ArrowRight
} from 'lucide-react';
import { formatNumber } from '@/lib/utils/helpers';

export default function AdminDashboardPage() {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        totalWorkouts: 0,
        totalUsers: 0,
        totalRequests: 0,
        activeSubscriptions: 0,
    });
    const [recentWorkouts, setRecentWorkouts] = useState<any[]>([]);

    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            // Total workouts
            const { count: workoutCount } = await supabase
                .from('workouts')
                .select('*', { count: 'exact', head: true })
                .eq('is_deleted', false);

            // Total users
            const { count: userCount } = await supabase
                .from('users')
                .select('*', { count: 'exact', head: true });

            // Total API requests (last 30 days)
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            const { count: requestCount } = await supabase
                .from('api_usage')
                .select('*', { count: 'exact', head: true })
                .gte('created_at', thirtyDaysAgo.toISOString());

            // Active subscriptions
            const { count: activeSubCount } = await supabase
                .from('subscriptions')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'active');

            // Recent workouts
            const { data: recentData } = await supabase
                .from('workouts')
                .select('id, name, difficulty, created_at')
                .eq('is_deleted', false)
                .order('created_at', { ascending: false })
                .limit(5);

            setStats({
                totalWorkouts: workoutCount || 0,
                totalUsers: userCount || 0,
                totalRequests: requestCount || 0,
                activeSubscriptions: activeSubCount || 0,
            });

            setRecentWorkouts(recentData || []);
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    const QuickAction = ({ href, icon: Icon, title, description }: any) => (
        <Link href={href}>
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                        <div className="p-3 bg-blue-100 rounded-lg">
                            <Icon className="w-6 h-6 text-blue-600" />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-semibold text-gray-900 mb-1">{title}</h3>
                            <p className="text-sm text-gray-600">{description}</p>
                        </div>
                        <ArrowRight className="w-5 h-5 text-gray-400" />
                    </div>
                </CardContent>
            </Card>
        </Link>
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-gray-500">Loading dashboard...</div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
                <p className="text-gray-500 mt-1">
                    Welcome back! Here's what's happening with your API.
                </p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500 mb-1">Total Workouts</p>
                                <p className="text-3xl font-bold">{formatNumber(stats.totalWorkouts)}</p>
                            </div>
                            <div className="p-3 bg-purple-100 rounded-full">
                                <Dumbbell className="w-6 h-6 text-purple-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500 mb-1">Total Users</p>
                                <p className="text-3xl font-bold">{formatNumber(stats.totalUsers)}</p>
                            </div>
                            <div className="p-3 bg-blue-100 rounded-full">
                                <Users className="w-6 h-6 text-blue-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500 mb-1">API Requests</p>
                                <p className="text-3xl font-bold">{formatNumber(stats.totalRequests)}</p>
                                <p className="text-xs text-gray-500 mt-1">Last 30 days</p>
                            </div>
                            <div className="p-3 bg-green-100 rounded-full">
                                <Activity className="w-6 h-6 text-green-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500 mb-1">Active Subscriptions</p>
                                <p className="text-3xl font-bold">{formatNumber(stats.activeSubscriptions)}</p>
                            </div>
                            <div className="p-3 bg-orange-100 rounded-full">
                                <TrendingUp className="w-6 h-6 text-orange-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Quick Actions */}
            <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <QuickAction
                        href="/admin/workouts/new"
                        icon={Plus}
                        title="Add New Workout"
                        description="Create a new workout in the database"
                    />
                    <QuickAction
                        href="/admin/workouts"
                        icon={Dumbbell}
                        title="Manage Workouts"
                        description="View and edit all workouts"
                    />
                    <QuickAction
                        href="/admin/customers"
                        icon={Users}
                        title="View Customers"
                        description="Manage your customer base"
                    />
                    <QuickAction
                        href="/admin/analytics"
                        icon={Activity}
                        title="View Analytics"
                        description="Detailed usage and performance metrics"
                    />
                </div>
            </div>

            {/* Recent Workouts */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle>Recently Added Workouts</CardTitle>
                        <Link href="/admin/workouts">
                            <Button variant="outline" size="sm">
                                View All
                            </Button>
                        </Link>
                    </div>
                </CardHeader>
                <CardContent>
                    {recentWorkouts.length === 0 ? (
                        <div className="text-center py-8">
                            <Dumbbell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                            <p className="text-gray-500 mb-4">No workouts yet</p>
                            <Link href="/admin/workouts/new">
                                <Button>
                                    <Plus className="w-4 h-4 mr-2" />
                                    Add First Workout
                                </Button>
                            </Link>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {recentWorkouts.map((workout) => (
                                <div
                                    key={workout.id}
                                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                                >
                                    <div>
                                        <p className="font-medium text-gray-900">{workout.name}</p>
                                        <p className="text-sm text-gray-500">
                                            {new Date(workout.created_at).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Badge variant="outline">{workout.difficulty}</Badge>
                                        <Link href={`/admin/workouts/${workout.id}/edit`}>
                                            <Button variant="ghost" size="sm">
                                                Edit
                                            </Button>
                                        </Link>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* System Status */}
            <Card className="border-green-200 bg-green-50">
                <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                        <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                        <div>
                            <p className="font-semibold text-green-900">System Operational</p>
                            <p className="text-sm text-green-700">
                                All services are running normally. API uptime: 99.9%
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}