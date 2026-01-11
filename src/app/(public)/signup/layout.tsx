import { Suspense } from 'react';

export const metadata = {
    title: 'Sign Up - WorkoutAPI',
    description: 'Create your WorkoutAPI account',
};

export default function SignupLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="animate-pulse text-gray-500">Loading...</div>
            </div>
        }>
            {children}
        </Suspense>
    );
}