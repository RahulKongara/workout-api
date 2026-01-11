import { NextRequest, NextResponse } from 'next/server';
import { ApiKeyService } from '@/lib/services/apiKey.service';
import { RateLimitService } from '@/lib/services/rateLimit.service';
import { WorkoutService } from '@/lib/services/workout.service';
import { ErrorResponses } from '@/lib/utils/errors';
import { WorkoutFilterSchema } from '@/lib/utils/validation';

export async function GET(request: NextRequest) {
    const startTime = Date.now();
    let keyId: string | undefined;

    try {
        // Extract API key
        const apiKey = request.headers.get('authorization')?.replace('Bearer ', '');
        if (!apiKey) {
            return ErrorResponses.missingApiKey();
        }

        // Validate API key
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

        // Check rate limits
        const rateLimit = await RateLimitService.checkRateLimit(
            validation.keyId!,
            validation.tier!
        );

        if (!rateLimit.allowed) {
            const limit = 'limit' in rateLimit ? rateLimit.limit : 0;
            const limitType = 'limitType' in rateLimit ? rateLimit.limitType : 'minute';
            const response = ErrorResponses.rateLimitExceeded(
                limit || 0,
                rateLimit.resetAt!,
                limitType || 'minute'
            );

            response.headers.set('X-RateLimit-Limit', String(limit || 0));
            response.headers.set('X-RateLimit-Remaining', '0');
            response.headers.set('X-RateLimit-Reset', rateLimit.resetAt!.toISOString());
            response.headers.set(
                'Retry-After',
                String(Math.ceil((rateLimit.resetAt!.getTime() - Date.now()) / 1000))
            );

            return response;
        }

        // Parse query parameters
        const searchParams = request.nextUrl.searchParams;
        const validationResult = WorkoutFilterSchema.safeParse({
            page: parseInt(searchParams.get('page') || '1'),
            limit: parseInt(searchParams.get('limit') || '20'),
            difficulty: searchParams.get('difficulty'),
            muscle_group: searchParams.get('muscle_group'),
            equipment: searchParams.get('equipment'),
            min_duration: searchParams.get('min_duration')
                ? parseInt(searchParams.get('min_duration')!)
                : undefined,
            max_duration: searchParams.get('max_duration')
                ? parseInt(searchParams.get('max_duration')!)
                : undefined,
            search: searchParams.get('search'),
        });

        if (!validationResult.success) {
            return ErrorResponses.validationError(validationResult.error.format());
        }

        const params = validationResult.data;

        // Fetch workouts
        const result = await WorkoutService.list({
            page: params.page,
            limit: params.limit,
            difficulty: params.difficulty,
            muscleGroup: params.muscle_group,
            equipment: params.equipment,
            tier: validation.tier!,
            search: params.search,
        });

        // Log usage
        const responseTime = Date.now() - startTime;
        const requestId = await RateLimitService.logUsage(
            validation.keyId!,
            '/api/v1/workouts',
            'GET',
            200,
            responseTime
        );

        const response = NextResponse.json({
            data: result.data,
            pagination: result.pagination,
            meta: {
                requestId,
                timestamp: new Date().toISOString(),
                version: 'v1',
            },
        });

        // Add rate limit headers
        const limitValue = 'limit' in rateLimit ? rateLimit.limit : 0;
        response.headers.set('X-RateLimit-Limit', String(limitValue));
        response.headers.set('X-RateLimit-Remaining', String(rateLimit.remaining));
        response.headers.set('X-RateLimit-Reset', rateLimit.resetAt!.toISOString());

        return response;
    } catch (error) {
        console.error('API Error:', error);

        // Log error
        if (keyId) {
            const responseTime = Date.now() - startTime;
            await RateLimitService.logUsage(keyId, '/api/v1/workouts', 'GET', 500, responseTime);
        }

        return ErrorResponses.internalError();
    }
}