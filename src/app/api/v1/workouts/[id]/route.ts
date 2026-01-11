import { NextRequest, NextResponse } from 'next/server';
import { ApiKeyService } from '@/lib/services/apiKey.service';
import { RateLimitService } from '@/lib/services/rateLimit.service';
import { WorkoutService } from '@/lib/services/workout.service';
import { ErrorResponses } from '@/lib/utils/errors';

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    const startTime = Date.now();
    let keyId: string | undefined;

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

        keyId = validation.keyId;

        const rateLimit = await RateLimitService.checkRateLimit(
            validation.keyId!,
            validation.tier!
        );

        if (!rateLimit.allowed) {
            const limit = 'limit' in rateLimit ? rateLimit.limit : 0;
            const response = ErrorResponses.rateLimitExceeded(
                limit || 0,
                rateLimit.resetAt!,
                ('limitType' in rateLimit && rateLimit.limitType) || 'minute'
            );

            response.headers.set('X-RateLimit-Limit', String(limit || 0));
            response.headers.set('X-RateLimit-Remaining', '0');
            response.headers.set('X-RateLimit-Reset', rateLimit.resetAt!.toISOString());

            return response;
        }

        const workout = await WorkoutService.getById(params.id, validation.tier!);

        if (!workout) {
            const responseTime = Date.now() - startTime;
            await RateLimitService.logUsage(
                validation.keyId!,
                `/api/v1/workouts/${params.id}`,
                'GET',
                404,
                responseTime
            );
            return ErrorResponses.notFound('Workout');
        }

        const responseTime = Date.now() - startTime;
        const requestId = await RateLimitService.logUsage(
            validation.keyId!,
            `/api/v1/workouts/${params.id}`,
            'GET',
            200,
            responseTime
        );

        const response = NextResponse.json({
            data: workout,
            meta: {
                requestId,
                timestamp: new Date().toISOString(),
                version: 'v1',
            },
        });

        response.headers.set('X-RateLimit-Limit', String((rateLimit as { limit?: number }).limit || 0));
        response.headers.set('X-RateLimit-Remaining', String(rateLimit.remaining));
        response.headers.set('X-RateLimit-Reset', rateLimit.resetAt!.toISOString());

        return response;
    } catch (error) {
        console.error('API Error:', error);

        if (keyId) {
            const responseTime = Date.now() - startTime;
            await RateLimitService.logUsage(
                keyId,
                `/api/v1/workouts/${params.id}`,
                'GET',
                500,
                responseTime
            );
        }

        return ErrorResponses.internalError();
    }
}