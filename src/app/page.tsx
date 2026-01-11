import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Zap,
  Shield,
  Code2,
  TrendingUp,
  CheckCircle,
  ArrowRight,
  Database
} from 'lucide-react';

export default function HomePage() {
  const features = [
    {
      icon: Database,
      title: 'Comprehensive Database',
      description: '500+ workouts across all difficulty levels and muscle groups',
    },
    {
      icon: Zap,
      title: 'Lightning Fast',
      description: 'Sub-200ms response times with global CDN distribution',
    },
    {
      icon: Shield,
      title: 'Secure & Reliable',
      description: '99.9% uptime SLA with enterprise-grade security',
    },
    {
      icon: Code2,
      title: 'Developer Friendly',
      description: 'RESTful API with comprehensive documentation and SDKs',
    },
  ];

  const useCases = [
    'Fitness mobile apps',
    'Workout planning platforms',
    'Personal trainer dashboards',
    'Health & wellness websites',
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <h1 className="text-2xl font-bold text-gray-900">WorkoutAPI</h1>
            <div className="hidden md:flex gap-6">
              <Link href="/docs" className="text-gray-600 hover:text-gray-900">
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

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 py-20 text-center">
        <Badge className="mb-4">Workout Database API</Badge>
        <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
          Power Your Fitness App
          <br />
          <span className="text-blue-600">With World-Class Data</span>
        </h1>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
          Access a comprehensive workout database through our simple REST API.
          From beginner to advanced, we've got every exercise you need.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link href="/signup">
            <Button size="lg" className="gap-2">
              Start Free
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
          <Link href="/docs">
            <Button size="lg" variant="outline">
              View Docs
            </Button>
          </Link>
        </div>

        {/* Code Example */}
        <div className="mt-16 max-w-3xl mx-auto">
          <Card className="text-left">
            <CardContent className="p-6">
              <pre className="text-sm overflow-x-auto">
                <code className="language-bash">
                  {`# Get all chest workouts
curl -X GET "https://api.workoutapi.com/v1/workouts?muscle_group=chest" \\
  -H "Authorization: Bearer YOUR_API_KEY"

# Response
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Bench Press",
      "difficulty": "intermediate",
      "duration": 45,
      "muscle_groups": ["chest", "triceps"],
      ...
    }
  ],
  "pagination": { ... }
}`}
                </code>
              </pre>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Features Grid */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Everything You Need
            </h2>
            <p className="text-xl text-gray-600">
              Built for developers, designed for scale
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <Card key={index}>
                <CardContent className="p-6">
                  <feature.icon className="w-12 h-12 text-blue-600 mb-4" />
                  <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                  <p className="text-gray-600">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl font-bold text-gray-900 mb-6">
                Perfect For Any Fitness Application
              </h2>
              <p className="text-lg text-gray-600 mb-8">
                Whether you're building a mobile app, web platform, or enterprise solution,
                WorkoutAPI provides the data foundation you need.
              </p>
              <div className="space-y-4">
                {useCases.map((useCase, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <CheckCircle className="w-6 h-6 text-green-500 shrink-0" />
                    <span className="text-gray-700">{useCase}</span>
                  </div>
                ))}
              </div>
            </div>

            <Card className="p-8 bg-linear-to-br from-blue-50 to-purple-50 border-2 border-blue-100">
              <div className="space-y-6">
                <div>
                  <TrendingUp className="w-8 h-8 text-blue-600 mb-2" />
                  <h3 className="text-2xl font-bold mb-2">Start Free</h3>
                  <p className="text-gray-600">
                    1,000 requests per month, no credit card required
                  </p>
                </div>
                <div className="border-t pt-6">
                  <p className="text-sm text-gray-600 mb-4">
                    Join developers from:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">Startups</Badge>
                    <Badge variant="outline">Agencies</Badge>
                    <Badge variant="outline">Enterprises</Badge>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-blue-600 text-white py-20">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold mb-4">
            Ready to Build Amazing Fitness Apps?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Get your API key in seconds. No credit card required for free tier.
          </p>
          <Link href="/signup">
            <Button size="lg" variant="secondary" className="gap-2">
              Get Started Free
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <div className="space-y-2 text-sm text-gray-600">
                <Link href="/pricing" className="block hover:text-gray-900">
                  Pricing
                </Link>
                <Link href="/docs" className="block hover:text-gray-900">
                  Documentation
                </Link>
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <div className="space-y-2 text-sm text-gray-600">
                <a href="#" className="block hover:text-gray-900">About</a>
                <a href="#" className="block hover:text-gray-900">Contact</a>
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <div className="space-y-2 text-sm text-gray-600">
                <a href="#" className="block hover:text-gray-900">Privacy</a>
                <a href="#" className="block hover:text-gray-900">Terms</a>
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Connect</h4>
              <div className="space-y-2 text-sm text-gray-600">
                <a href="#" className="block hover:text-gray-900">Twitter</a>
                <a href="#" className="block hover:text-gray-900">GitHub</a>
              </div>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t border-gray-200 text-center text-sm text-gray-600">
            <p>© 2026 WorkoutAPI by SusEyez Inc. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}