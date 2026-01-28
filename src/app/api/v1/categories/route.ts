import { NextRequest, NextResponse } from 'next/server';
import { ApiKeyService } from '@/lib/services/apiKey.service';
import { RateLimitService } from '@/lib/services/rateLimit.service';
import { WorkoutService } from '@/lib/services/workout.service';
import { ApiLoggerService } from '@/lib/services/apiLogger.service';
import { ErrorResponses } from '@/lib/utils/errors';
import { generateRequestId } from '@/lib/utils/helpers';

export async function GET(request: NextRequest) {
    const startTime = Date.now();
    const requestId = generateRequestId();
    let keyId: string | undefined;
    let tier: string | undefined;

    try {
        const apiKey = request.headers.get('authorization')?.replace('Bearer ', '');
        if (!apiKey) {
            return ErrorResponses.missingApiKey(requestId);
        }

        const validation = await ApiKeyService.validateKey(apiKey);
        if (!validation.valid) {
            if (validation.error?.includes('expired')) {
                return ErrorResponses.expiredApiKey(requestId);
            }
            if (validation.error?.includes('inactive')) {
                return ErrorResponses.subscriptionInactive(requestId);
            }
            return ErrorResponses.invalidApiKey(requestId);
        }

        keyId = validation.keyId;
        tier = validation.tier;

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
                limitType || 'minute',
                requestId
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

        const categories = await WorkoutService.getCategories();

        const responseTime = Date.now() - startTime;

        // Log the successful request
        await ApiLoggerService.logRequest({
            requestId,
            apiKeyId: keyId,
            endpoint: '/api/v1/categories',
            method: 'GET',
            statusCode: 200,
            responseTimeMs: responseTime,
            tier,
            userAgent: request.headers.get('user-agent') || undefined,
        });

        const response = NextResponse.json({
            data: categories,
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
        console.error('Categories API error:', error);

        const responseTime = Date.now() - startTime;

        // Log the error
        await ApiLoggerService.logError({
            requestId,
            apiKeyId: keyId,
            endpoint: '/api/v1/categories',
            method: 'GET',
            statusCode: 500,
            responseTimeMs: responseTime,
            error: error instanceof Error ? error : { code: 'INTERNAL_ERROR', message: 'Unknown error' },
            tier,
        });

        return ErrorResponses.internalError(requestId);
    }
}

export const dynamic = 'force-dynamic';
