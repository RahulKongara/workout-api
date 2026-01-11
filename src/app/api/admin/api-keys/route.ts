import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ApiKeyService } from '@/lib/services/apiKey.service';
import { SubscriptionService } from '@/lib/services/subscription.service';
import { TIER_LIMITS } from '@/lib/constants';

// Create new API key
export async function POST(request: NextRequest) {
    try {
        const supabase = createClient();
        const {
            data: { user },
        } = await (await supabase).auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { name } = await request.json();

        if (!name || !name.trim()) {
            return NextResponse.json(
                { error: 'Key name is required' },
                { status: 400 }
            );
        }

        // Get user's subscription
        const subscription = await SubscriptionService.getUserSubscription(user.id);

        if (!subscription) {
            return NextResponse.json(
                { error: 'No subscription found' },
                { status: 404 }
            );
        }

        // Check key limit
        const keyCount = await ApiKeyService.getKeyCount(user.id);
        const limits = TIER_LIMITS[subscription.tier];

        if (keyCount >= limits.maxApiKeys) {
            return NextResponse.json(
                { error: `Maximum ${limits.maxApiKeys} API keys allowed for ${subscription.tier} plan` },
                { status: 403 }
            );
        }

        // Create API key
        const { apiKey, id } = await ApiKeyService.generateKey(
            user.id,
            subscription.id,
            name
        );

        return NextResponse.json({ apiKey, id });
    } catch (error: any) {
        console.error('Create API key error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to create API key' },
            { status: 500 }
        );
    }
}

// Delete API key
export async function DELETE(request: NextRequest) {
    try {
        const supabase = createClient();
        const {
            data: { user },
        } = await (await supabase).auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { keyId } = await request.json();

        if (!keyId) {
            return NextResponse.json(
                { error: 'Key ID is required' },
                { status: 400 }
            );
        }

        await ApiKeyService.revokeKey(keyId, user.id);

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Delete API key error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to delete API key' },
            { status: 500 }
        );
    }
}

export const dynamic = 'force-dynamic';