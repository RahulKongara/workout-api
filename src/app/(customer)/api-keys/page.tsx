'use client';

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    Plus,
    Copy,
    Trash2,
    Eye,
    EyeOff,
    AlertTriangle,
    CheckCircle
} from 'lucide-react';
import { maskApiKey, formatDateTime } from '@/lib/utils/helpers';
import { TIER_LIMITS, SubscriptionTier } from '@/lib/constants';
import { toast } from 'sonner';

export default function ApiKeysPage() {
    const [apiKeys, setApiKeys] = useState<any[]>([]);
    const [subscription, setSubscription] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [newKeyName, setNewKeyName] = useState('');
    const [newApiKey, setNewApiKey] = useState('');
    const [showKey, setShowKey] = useState<Record<string, boolean>>({});
    const [copied, setCopied] = useState<string | null>(null);
    const [dialogOpen, setDialogOpen] = useState(false);

    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
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
                .eq('is_active', true)
                .order('created_at', { ascending: false });

            setApiKeys(keysData || []);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateKey = async () => {
        if (!newKeyName.trim()) return;

        setCreating(true);
        try {
            const response = await fetch('/api/admin/api-keys', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newKeyName }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to create API key');
            }

            setNewApiKey(data.apiKey);
            setNewKeyName('');
            fetchData();
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setCreating(false);
        }
    };

    const handleDeleteKey = async (keyId: string, name: string) => {
        if (!confirm(`Are you sure you want to delete "${name}"? This action cannot be undone.`)) {
            return;
        }

        try {
            const response = await fetch('/api/admin/api-keys', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ keyId }),
            });

            if (!response.ok) {
                throw new Error('Failed to delete API key');
            }

            fetchData();
            toast.success('API key deleted successfully');
        } catch (error: any) {
            toast.error(error.message);
        }
    };

    const copyToClipboard = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopied(id);
        setTimeout(() => setCopied(null), 2000);
    };

    const toggleShowKey = (id: string) => {
        setShowKey(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const tier = (subscription?.tier || 'free') as SubscriptionTier;
    const limits = TIER_LIMITS[tier];
    const canCreateMore = apiKeys.length < limits.maxApiKeys;

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-gray-500">Loading...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-5xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">API Keys</h1>
                        <p className="text-gray-500 mt-1">
                            Manage your API keys ({apiKeys.length}/{limits.maxApiKeys})
                        </p>
                    </div>

                    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                        <DialogTrigger asChild>
                            <Button disabled={!canCreateMore}>
                                <Plus className="w-4 h-4 mr-2" />
                                Create Key
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Create New API Key</DialogTitle>
                                <DialogDescription>
                                    Give your API key a descriptive name to help you remember where it's used
                                </DialogDescription>
                            </DialogHeader>

                            {newApiKey ? (
                                <div className="space-y-4">
                                    <Alert className="bg-green-50 border-green-200">
                                        <CheckCircle className="h-4 w-4 text-green-600" />
                                        <AlertDescription className="text-green-800">
                                            API key created successfully! Copy it now - you won't see it again.
                                        </AlertDescription>
                                    </Alert>

                                    <div>
                                        <Label>Your API Key</Label>
                                        <div className="flex gap-2 mt-1">
                                            <Input value={newApiKey} readOnly className="font-mono text-sm" />
                                            <Button
                                                variant="outline"
                                                onClick={() => copyToClipboard(newApiKey, 'new')}
                                            >
                                                {copied === 'new' ? (
                                                    <CheckCircle className="w-4 h-4" />
                                                ) : (
                                                    <Copy className="w-4 h-4" />
                                                )}
                                            </Button>
                                        </div>
                                    </div>

                                    <Button
                                        onClick={() => {
                                            setNewApiKey('');
                                            setDialogOpen(false);
                                        }}
                                        className="w-full"
                                    >
                                        Done
                                    </Button>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div>
                                        <Label htmlFor="keyName">Key Name</Label>
                                        <Input
                                            id="keyName"
                                            value={newKeyName}
                                            onChange={(e) => setNewKeyName(e.target.value)}
                                            placeholder="e.g., Production, Development, Mobile App"
                                            className="mt-1"
                                        />
                                    </div>

                                    <Button
                                        onClick={handleCreateKey}
                                        disabled={creating || !newKeyName.trim()}
                                        className="w-full"
                                    >
                                        {creating ? 'Creating...' : 'Create API Key'}
                                    </Button>
                                </div>
                            )}
                        </DialogContent>
                    </Dialog>
                </div>

                {/* Limit Warning */}
                {!canCreateMore && (
                    <Alert className="mb-6 border-orange-200 bg-orange-50">
                        <AlertTriangle className="h-4 w-4 text-orange-600" />
                        <AlertDescription className="text-orange-800">
                            You've reached the maximum number of API keys for your {tier} plan.
                            {tier === 'free' && ' Upgrade to create more keys.'}
                        </AlertDescription>
                    </Alert>
                )}

                {/* API Keys List */}
                <div className="space-y-4">
                    {apiKeys.length === 0 ? (
                        <Card>
                            <CardContent className="py-12 text-center">
                                <div className="text-gray-400 mb-4">
                                    <Plus className="w-12 h-12 mx-auto" />
                                </div>
                                <h3 className="text-lg font-medium text-gray-900 mb-2">
                                    No API keys yet
                                </h3>
                                <p className="text-gray-500 mb-4">
                                    Create your first API key to start using the WorkoutAPI
                                </p>
                            </CardContent>
                        </Card>
                    ) : (
                        apiKeys.map((key) => (
                            <Card key={key.id}>
                                <CardHeader>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <CardTitle className="text-lg">{key.name}</CardTitle>
                                            <Badge variant="outline">Active</Badge>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleDeleteKey(key.id, key.name)}
                                        >
                                            <Trash2 className="w-4 h-4 text-red-500" />
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <div>
                                        <Label className="text-xs text-gray-500">API Key</Label>
                                        <div className="flex gap-2 mt-1">
                                            <Input
                                                value={showKey[key.id] ? key.key_prefix + '...' : maskApiKey(key.key_prefix)}
                                                readOnly
                                                className="font-mono text-sm"
                                            />
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => toggleShowKey(key.id)}
                                            >
                                                {showKey[key.id] ? (
                                                    <EyeOff className="w-4 h-4" />
                                                ) : (
                                                    <Eye className="w-4 h-4" />
                                                )}
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => copyToClipboard(key.key_prefix, key.id)}
                                            >
                                                {copied === key.id ? (
                                                    <CheckCircle className="w-4 h-4 text-green-600" />
                                                ) : (
                                                    <Copy className="w-4 h-4" />
                                                )}
                                            </Button>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between text-sm text-gray-500">
                                        <span>Created {formatDateTime(key.created_at)}</span>
                                        {key.last_used_at && (
                                            <span>Last used {formatDateTime(key.last_used_at)}</span>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    )}
                </div>

                {/* Security Notice */}
                <Card className="mt-8 border-blue-200 bg-blue-50">
                    <CardContent className="pt-6">
                        <h3 className="font-semibold text-blue-900 mb-2">Security Best Practices</h3>
                        <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
                            <li>Never share your API keys publicly or commit them to version control</li>
                            <li>Use environment variables to store API keys in your applications</li>
                            <li>Rotate your keys regularly for enhanced security</li>
                            <li>Delete unused keys immediately</li>
                        </ul>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}