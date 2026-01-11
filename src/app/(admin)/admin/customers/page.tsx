'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
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
import { Search, TrendingUp, Users, DollarSign } from 'lucide-react';
import { formatDate, formatNumber } from '@/lib/utils/helpers';

export default function CustomersPage() {
    const [customers, setCustomers] = useState<any[]>([]);
    const [filteredCustomers, setFilteredCustomers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [tierFilter, setTierFilter] = useState('all');
    const [stats, setStats] = useState({
        total: 0,
        free: 0,
        pro: 0,
        enterprise: 0,
    });

    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    useEffect(() => {
        fetchCustomers();
    }, []);

    useEffect(() => {
        filterCustomers();
    }, [search, tierFilter, customers]);

    const fetchCustomers = async () => {
        try {
            const { data, error } = await supabase
                .from('users')
                .select(`
          id,
          email,
          company_name,
          created_at,
          subscriptions (
            tier,
            status,
            current_period_end
          )
        `)
                .eq('role', 'customer')
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Get API usage for each user
            const customersWithUsage = await Promise.all(
                (data || []).map(async (customer) => {
                    const subscription = (customer.subscriptions as any)?.[0];

                    // Get API keys
                    const { data: apiKeys } = await supabase
                        .from('api_keys')
                        .select('id')
                        .eq('user_id', customer.id)
                        .eq('is_active', true);

                    // Get usage count
                    let usageCount = 0;
                    if (apiKeys && apiKeys.length > 0) {
                        const keyIds = apiKeys.map(k => k.id);
                        const { count } = await supabase
                            .from('api_usage')
                            .select('*', { count: 'exact', head: true })
                            .in('api_key_id', keyIds);

                        usageCount = count || 0;
                    }

                    return {
                        ...customer,
                        subscription,
                        apiKeyCount: apiKeys?.length || 0,
                        totalRequests: usageCount,
                    };
                })
            );

            setCustomers(customersWithUsage);

            // Calculate stats
            const stats = {
                total: customersWithUsage.length,
                free: customersWithUsage.filter(c => c.subscription?.tier === 'free').length,
                pro: customersWithUsage.filter(c => c.subscription?.tier === 'pro').length,
                enterprise: customersWithUsage.filter(c => c.subscription?.tier === 'enterprise').length,
            };
            setStats(stats);
        } catch (error) {
            console.error('Error fetching customers:', error);
        } finally {
            setLoading(false);
        }
    };

    const filterCustomers = () => {
        let filtered = customers;

        // Search filter
        if (search) {
            filtered = filtered.filter(
                (c) =>
                    c.email.toLowerCase().includes(search.toLowerCase()) ||
                    c.company_name?.toLowerCase().includes(search.toLowerCase())
            );
        }

        // Tier filter
        if (tierFilter !== 'all') {
            filtered = filtered.filter(
                (c) => c.subscription?.tier === tierFilter
            );
        }

        setFilteredCustomers(filtered);
    };

    const getTierColor = (tier: string) => {
        switch (tier) {
            case 'free':
                return 'bg-blue-100 text-blue-800';
            case 'pro':
                return 'bg-purple-100 text-purple-800';
            case 'enterprise':
                return 'bg-orange-100 text-orange-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active':
                return 'bg-green-100 text-green-800';
            case 'past_due':
                return 'bg-yellow-100 text-yellow-800';
            case 'canceled':
                return 'bg-red-100 text-red-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-gray-500">Loading customers...</div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Customers</h1>
                <p className="text-gray-500 mt-1">
                    Manage and monitor your customer base
                </p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500">Total Customers</p>
                                <p className="text-3xl font-bold">{stats.total}</p>
                            </div>
                            <Users className="w-8 h-8 text-blue-500" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500">Free Tier</p>
                                <p className="text-3xl font-bold text-blue-600">{stats.free}</p>
                            </div>
                            <div className="p-3 bg-blue-100 rounded-full">
                                <TrendingUp className="w-5 h-5 text-blue-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500">Pro Tier</p>
                                <p className="text-3xl font-bold text-purple-600">{stats.pro}</p>
                            </div>
                            <div className="p-3 bg-purple-100 rounded-full">
                                <DollarSign className="w-5 h-5 text-purple-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500">Enterprise</p>
                                <p className="text-3xl font-bold text-orange-600">{stats.enterprise}</p>
                            </div>
                            <div className="p-3 bg-orange-100 rounded-full">
                                <DollarSign className="w-5 h-5 text-orange-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <div className="flex gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <Input
                        type="text"
                        placeholder="Search by email or company..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-10"
                    />
                </div>

                <Select value={tierFilter} onValueChange={setTierFilter}>
                    <SelectTrigger className="w-40">
                        <SelectValue placeholder="All tiers" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Tiers</SelectItem>
                        <SelectItem value="free">Free</SelectItem>
                        <SelectItem value="pro">Pro</SelectItem>
                        <SelectItem value="enterprise">Enterprise</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Customers Table */}
            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Email</TableHead>
                                <TableHead>Company</TableHead>
                                <TableHead>Tier</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>API Keys</TableHead>
                                <TableHead>Requests</TableHead>
                                <TableHead>Joined</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredCustomers.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                                        {search || tierFilter !== 'all'
                                            ? 'No customers found matching filters'
                                            : 'No customers yet'}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredCustomers.map((customer) => (
                                    <TableRow key={customer.id}>
                                        <TableCell className="font-medium">
                                            {customer.email}
                                        </TableCell>
                                        <TableCell>
                                            {customer.company_name || (
                                                <span className="text-gray-400">-</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Badge className={getTierColor(customer.subscription?.tier || 'free')}>
                                                {customer.subscription?.tier || 'free'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Badge className={getStatusColor(customer.subscription?.status || 'active')}>
                                                {customer.subscription?.status || 'active'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>{customer.apiKeyCount}</TableCell>
                                        <TableCell>{formatNumber(customer.totalRequests)}</TableCell>
                                        <TableCell className="text-gray-500">
                                            {formatDate(customer.created_at)}
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