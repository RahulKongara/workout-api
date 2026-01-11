import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import {
    LayoutDashboard,
    Key,
    CreditCard,
    BookOpen,
    LogOut,
    Menu
} from 'lucide-react';

export default async function CustomerLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const supabase = createClient();
    const {
        data: { user },
    } = await (await supabase).auth.getUser();

    if (!user) {
        redirect('/login');
    }

    const handleSignOut = async () => {
        'use server';
        const supabase = createClient();
        await (await supabase).auth.signOut();
        redirect('/login');
    };

    const navItems = [
        { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
        { href: '/api-keys', icon: Key, label: 'API Keys' },
        { href: '/billing', icon: CreditCard, label: 'Billing' },
        { href: '/docs', icon: BookOpen, label: 'Documentation' },
    ];

    return (
        <div className="flex h-screen bg-gray-50">
            {/* Sidebar - Desktop */}
            <aside className="hidden md:flex w-64 bg-white border-r border-gray-200 flex-col">
                <div className="p-6 border-b border-gray-200">
                    <Link href="/">
                        <h1 className="text-2xl font-bold text-gray-900">WorkoutAPI</h1>
                    </Link>
                    <p className="text-sm text-gray-500 mt-1">Developer Portal</p>
                </div>

                <nav className="flex-1 p-4 space-y-1">
                    {navItems.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className="flex items-center gap-3 px-4 py-3 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                            <item.icon className="w-5 h-5" />
                            <span className="font-medium">{item.label}</span>
                        </Link>
                    ))}
                </nav>

                <div className="p-4 border-t border-gray-200">
                    <div className="mb-3 px-4">
                        <p className="text-sm font-medium text-gray-900 truncate">
                            {user.email}
                        </p>
                        <p className="text-xs text-gray-500">Developer</p>
                    </div>
                    <form action={handleSignOut}>
                        <button
                            type="submit"
                            className="flex items-center gap-3 px-4 py-3 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors w-full"
                        >
                            <LogOut className="w-5 h-5" />
                            <span className="font-medium">Sign Out</span>
                        </button>
                    </form>
                </div>
            </aside>

            {/* Mobile Header */}
            <div className="md:hidden fixed top-0 left-0 right-0 bg-white border-b border-gray-200 z-10">
                <div className="flex items-center justify-between p-4">
                    <Link href="/">
                        <h1 className="text-xl font-bold text-gray-900">WorkoutAPI</h1>
                    </Link>
                    <button className="p-2 hover:bg-gray-100 rounded-lg">
                        <Menu className="w-6 h-6" />
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <main className="flex-1 overflow-auto md:pt-0 pt-16">
                {children}
            </main>
        </div>
    );
}