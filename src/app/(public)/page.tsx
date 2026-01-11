import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function HomePage() {
    return (
        <div className="min-h-screen flex flex-col">
            {/* Header */}
            <header className="bg-white border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <Link href="/">
                            <h1 className="text-2xl font-bold text-gray-900">WorkoutAPI</h1>
                        </Link>
                        <div className="flex items-center gap-4">
                            <Link href="/login">
                                <Button variant="ghost">Sign in</Button>
                            </Link>
                            <Link href="/signup">
                                <Button>Get Started</Button>
                            </Link>
                        </div>
                    </div>
                </div>
            </header>

            {/* Hero Section */}
            <main className="flex-1 flex items-center justify-center">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6">
                        The Ultimate Workout API
                    </h2>
                    <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
                        Access thousands of workouts, exercises, and fitness data through our
                        simple and powerful REST API. Build amazing fitness applications.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Link href="/signup">
                            <Button size="lg" className="w-full sm:w-auto">
                                Start for Free
                            </Button>
                        </Link>
                        <Link href="/login">
                            <Button size="lg" variant="outline" className="w-full sm:w-auto">
                                View Documentation
                            </Button>
                        </Link>
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="bg-white border-t border-gray-200 py-8">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-gray-600">
                    <p>&copy; 2026 WorkoutAPI. All rights reserved.</p>
                </div>
            </footer>
        </div>
    );
}