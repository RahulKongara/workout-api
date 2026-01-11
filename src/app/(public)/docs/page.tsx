import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Code2,
    Key,
    Zap,
    AlertCircle,
    CheckCircle,
    ArrowRight
} from 'lucide-react';

export default function DocsPage() {
    const quickStart = `# Install your favorite HTTP client (example with axios)
npm install axios

# Import and configure
import axios from 'axios';

const api = axios.create({
  baseURL: 'https://api.workoutapi.com/v1',
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY'
  }
});

// Fetch all workouts
const workouts = await api.get('/workouts');
console.log(workouts.data);`;

    const endpoints = [
        {
            method: 'GET',
            path: '/workouts',
            description: 'List all workouts with optional filters',
            params: [
                { name: 'page', type: 'number', description: 'Page number (default: 1)' },
                { name: 'limit', type: 'number', description: 'Items per page (default: 20, max: 100)' },
                { name: 'difficulty', type: 'string', description: 'Filter by difficulty (beginner, intermediate, advanced)' },
                { name: 'muscle_group', type: 'string', description: 'Filter by muscle group' },
                { name: 'equipment', type: 'string', description: 'Filter by equipment' },
                { name: 'search', type: 'string', description: 'Search by name or description' },
            ],
        },
        {
            method: 'GET',
            path: '/workouts/:id',
            description: 'Get a specific workout by ID or slug',
            params: [
                { name: 'id', type: 'string', description: 'Workout UUID or slug' },
            ],
        },
        {
            method: 'GET',
            path: '/categories',
            description: 'Get all available muscle groups, equipment, and difficulties',
            params: [],
        },
    ];

    const errorCodes = [
        { code: 'MISSING_API_KEY', status: 401, description: 'API key not provided in Authorization header' },
        { code: 'INVALID_API_KEY', status: 401, description: 'API key is invalid or revoked' },
        { code: 'EXPIRED_API_KEY', status: 401, description: 'API key has expired' },
        { code: 'SUBSCRIPTION_INACTIVE', status: 402, description: 'Subscription is not active' },
        { code: 'RATE_LIMIT_EXCEEDED', status: 429, description: 'Rate limit exceeded' },
        { code: 'VALIDATION_ERROR', status: 400, description: 'Request validation failed' },
        { code: 'NOT_FOUND', status: 404, description: 'Resource not found' },
        { code: 'INTERNAL_ERROR', status: 500, description: 'Internal server error' },
    ];

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Navigation */}
            <nav className="border-b border-gray-200 bg-white">
                <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-8">
                        <Link href="/">
                            <h1 className="text-2xl font-bold text-gray-900">WorkoutAPI</h1>
                        </Link>
                        <div className="hidden md:flex gap-6">
                            <Link href="/docs" className="text-blue-600 font-medium">
                                Documentation
                            </Link>
                            <Link href="/pricing" className="text-gray-600 hover:text-gray-900">
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

            <div className="max-w-7xl mx-auto px-4 py-12">
                {/* Header */}
                <div className="mb-12 text-center">
                    <Badge className="mb-4">API Documentation</Badge>
                    <h1 className="text-5xl font-bold text-gray-900 mb-4">
                        Build Amazing Fitness Apps
                    </h1>
                    <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                        Complete API reference and integration guide for WorkoutAPI
                    </p>
                </div>

                {/* Quick Start */}
                <Card className="mb-12">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Zap className="w-5 h-5" />
                            Quick Start
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <p className="text-gray-600">
                                Get started with WorkoutAPI in 3 simple steps:
                            </p>
                            <ol className="list-decimal list-inside space-y-2 text-gray-700">
                                <li>
                                    <Link href="/signup" className="text-blue-600 hover:underline">
                                        Sign up
                                    </Link>{' '}
                                    for a free account
                                </li>
                                <li>Get your API key from the dashboard</li>
                                <li>Start making requests!</li>
                            </ol>
                        </div>

                        <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
                            <pre className="text-sm">
                                <code>{quickStart}</code>
                            </pre>
                        </div>
                    </CardContent>
                </Card>

                {/* Authentication */}
                <Card className="mb-12">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Key className="w-5 h-5" />
                            Authentication
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-gray-600">
                            All API requests must include your API key in the Authorization header:
                        </p>

                        <div className="bg-gray-900 text-gray-100 p-4 rounded-lg">
                            <pre className="text-sm">
                                <code>{`Authorization: Bearer wa_live_your_api_key_here`}</code>
                            </pre>
                        </div>

                        <Alert className="border-orange-200 bg-orange-50">
                            <AlertCircle className="h-4 w-4 text-orange-600" />
                            <AlertDescription className="text-orange-800">
                                <strong>Keep your API key secure!</strong> Never expose it in client-side code or commit it to version control.
                            </AlertDescription>
                        </Alert>
                    </CardContent>
                </Card>

                {/* Endpoints */}
                <Card className="mb-12">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Code2 className="w-5 h-5" />
                            API Endpoints
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-8">
                        <div className="text-gray-600">
                            <p className="mb-2">Base URL:</p>
                            <code className="bg-gray-100 px-3 py-1 rounded text-sm">
                                https://api.workoutapi.com/v1
                            </code>
                        </div>

                        {endpoints.map((endpoint, index) => (
                            <div key={index} className="border-t pt-6">
                                <div className="flex items-center gap-3 mb-3">
                                    <Badge variant="outline" className="font-mono">
                                        {endpoint.method}
                                    </Badge>
                                    <code className="text-lg font-semibold">{endpoint.path}</code>
                                </div>
                                <p className="text-gray-600 mb-4">{endpoint.description}</p>

                                {endpoint.params.length > 0 && (
                                    <div>
                                        <p className="font-medium mb-2">Parameters:</p>
                                        <div className="space-y-2">
                                            {endpoint.params.map((param, i) => (
                                                <div key={i} className="flex gap-4 text-sm">
                                                    <code className="bg-gray-100 px-2 py-1 rounded text-blue-600 min-w-30">
                                                        {param.name}
                                                    </code>
                                                    <span className="text-gray-500">{param.type}</span>
                                                    <span className="text-gray-600">{param.description}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Example Response */}
                                <div className="mt-4">
                                    <p className="font-medium mb-2">Example Response:</p>
                                    <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
                                        <pre className="text-sm">
                                            <code>{JSON.stringify({
                                                data: endpoint.path === '/categories' ? {
                                                    muscleGroups: ['chest', 'back', 'shoulders'],
                                                    equipment: ['dumbbells', 'barbell'],
                                                    difficulties: ['beginner', 'intermediate', 'advanced']
                                                } : endpoint.path.includes(':id') ? {
                                                    id: '550e8400-e29b-41d4-a716-446655440000',
                                                    name: 'Bench Press',
                                                    slug: 'bench-press',
                                                    difficulty: 'intermediate',
                                                    duration: 45,
                                                    muscle_groups: ['chest', 'triceps'],
                                                    equipment: ['barbell', 'bench'],
                                                    instructions: ['Step 1...', 'Step 2...']
                                                } : [{
                                                    id: '550e8400-e29b-41d4-a716-446655440000',
                                                    name: 'Bench Press',
                                                    difficulty: 'intermediate'
                                                }],
                                                ...(endpoint.path === '/workouts' && {
                                                    pagination: {
                                                        page: 1,
                                                        limit: 20,
                                                        total: 500,
                                                        totalPages: 25
                                                    }
                                                }),
                                                meta: {
                                                    requestId: 'req_123',
                                                    timestamp: '2024-01-15T10:30:00Z',
                                                    version: 'v1'
                                                }
                                            }, null, 2)}</code>
                                        </pre>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>

                {/* Rate Limiting */}
                <Card className="mb-12">
                    <CardHeader>
                        <CardTitle>Rate Limiting</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-gray-600">
                            Rate limits vary by subscription tier. All responses include these headers:
                        </p>

                        <div className="space-y-2 text-sm">
                            <div className="flex gap-4">
                                <code className="bg-gray-100 px-2 py-1 rounded min-w-50">
                                    X-RateLimit-Limit
                                </code>
                                <span className="text-gray-600">Your rate limit for this tier</span>
                            </div>
                            <div className="flex gap-4">
                                <code className="bg-gray-100 px-2 py-1 rounded min-w-50">
                                    X-RateLimit-Remaining
                                </code>
                                <span className="text-gray-600">Requests remaining</span>
                            </div>
                            <div className="flex gap-4">
                                <code className="bg-gray-100 px-2 py-1 rounded min-w-50">
                                    X-RateLimit-Reset
                                </code>
                                <span className="text-gray-600">When the limit resets</span>
                            </div>
                        </div>

                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                            <p className="text-sm text-blue-900">
                                <strong>Pro tip:</strong> Monitor these headers to implement client-side rate limiting and avoid 429 errors.
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {/* Error Codes */}
                <Card className="mb-12">
                    <CardHeader>
                        <CardTitle>Error Codes</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {errorCodes.map((error, index) => (
                                <div
                                    key={index}
                                    className="flex items-start gap-4 p-3 bg-gray-50 rounded-lg"
                                >
                                    <Badge variant="outline" className="mt-1">
                                        {error.status}
                                    </Badge>
                                    <div className="flex-1">
                                        <code className="text-sm font-semibold text-red-600">
                                            {error.code}
                                        </code>
                                        <p className="text-sm text-gray-600 mt-1">{error.description}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* CTA */}
                <div className="bg-blue-600 text-white rounded-xl p-8 text-center">
                    <h2 className="text-3xl font-bold mb-4">Ready to Start Building?</h2>
                    <p className="text-xl text-blue-100 mb-6">
                        Get your free API key and start integrating in minutes
                    </p>
                    <Link href="/signup">
                        <Button size="lg" variant="secondary" className="gap-2">
                            Get Started Free
                            <ArrowRight className="w-4 h-4" />
                        </Button>
                    </Link>
                </div>
            </div>
        </div>
    );
}

// Alert component for docs (if not already using shadcn Alert)
function Alert({ children, className }: { children: React.ReactNode; className?: string }) {
    return (
        <div className={`rounded-lg border p-4 ${className}`}>
            {children}
        </div>
    );
}

function AlertDescription({ children, className }: { children: React.ReactNode; className?: string }) {
    return <div className={className}>{children}</div>;
}