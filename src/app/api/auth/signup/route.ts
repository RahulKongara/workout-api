import { NextRequest, NextResponse } from 'next/server';
import { SubscriptionService } from '@/lib/services/subscription.service';

export async function POST(request: NextRequest) {
    try {
        const { userId } = await request.json();

        if (!userId) {
            return NextResponse.json(
                { error: 'User ID is required' },
                { status: 400 }
            );
        }

        // Create free subscription for the new user
        await SubscriptionService.createFreeSubscription(userId);

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Signup API error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to complete signup' },
            { status: 500 }
        );
    }
}
