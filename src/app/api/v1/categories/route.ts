import { NextRequest, NextResponse } from 'next/server';
import { ApiKeyService } from '@/lib/services/apiKey.service';
import { WorkoutService } from '@/lib/services/workout.service';
import { ErrorResponses } from '@/lib/utils/errors';

export async function GET(request: NextRequest) {
    try {
        const apiKey = request.headers.get('authorization')?.replace('Bearer ', '');
        if (!apiKey) {
            return ErrorResponses.missingApiKey();
        }

        const validation = await ApiKeyService.validateKey(apiKey);
        if (!validation.valid) {
            if (validation.error?.includes('expired')) {
                return ErrorResponses.expiredApiKey();
            }
            if (validation.error?.includes('inactive')) {
                return ErrorResponses.subscriptionInactive();
            }
            return ErrorResponses.invalidApiKey();
        }

        const categories = await WorkoutService.getCategories();

        return NextResponse.json({
            data: categories,
            meta: {
                timestamp: new Date().toISOString(),
                version: 'v1',
            },
        });
    } catch (error) {
        console.error('Categories API error:', error);
        return ErrorResponses.internalError();
    }
}

export const dynamic = 'force-dynamic';