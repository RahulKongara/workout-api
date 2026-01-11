import { NextResponse } from 'next/server';
import { ApiError } from '@/types';
import { ERROR_CODES } from '@/lib/constants';
import { generateRequestId } from './helpers';

export class ApiErrorResponse extends Error {
    constructor(
        public code: string,
        public message: string,
        public statusCode: number,
        public details?: any
    ) {
        super(message);
        this.name = 'ApiErrorResponse';
    }
}

export function createErrorResponse(
    code: string,
    message: string,
    statusCode: number,
    details?: any,
    requestId?: string
): NextResponse<ApiError> {
    return NextResponse.json(
        {
            error: {
                code,
                message,
                details,
                docUrl: `https://docs.yourapi.com/errors#${code.toLowerCase().replace(/_/g, '-')}`,
            },
            meta: {
                requestId: requestId || generateRequestId(),
                timestamp: new Date().toISOString(),
            },
        },
        { status: statusCode }
    );
}

export const ErrorResponses = {
    missingApiKey: (requestId?: string) =>
        createErrorResponse(
            ERROR_CODES.MISSING_API_KEY,
            'API key is required. Include it in the Authorization header as: Bearer YOUR_API_KEY',
            401,
            undefined,
            requestId
        ),

    invalidApiKey: (requestId?: string) =>
        createErrorResponse(
            ERROR_CODES.INVALID_API_KEY,
            'The provided API key is invalid or has been revoked',
            401,
            undefined,
            requestId
        ),

    expiredApiKey: (requestId?: string) =>
        createErrorResponse(
            ERROR_CODES.EXPIRED_API_KEY,
            'Your API key has expired. Please generate a new one',
            401,
            undefined,
            requestId
        ),

    subscriptionInactive: (requestId?: string) =>
        createErrorResponse(
            ERROR_CODES.SUBSCRIPTION_INACTIVE,
            'Your subscription is inactive. Please update your payment method',
            402,
            undefined,
            requestId
        ),

    rateLimitExceeded: (
        limit: number,
        resetAt: Date,
        limitType: string,
        requestId?: string
    ) =>
        createErrorResponse(
            ERROR_CODES.RATE_LIMIT_EXCEEDED,
            `Rate limit exceeded. You can make ${limit} requests per ${limitType}`,
            429,
            { limit, resetAt: resetAt.toISOString(), limitType },
            requestId
        ),

    validationError: (details: any, requestId?: string) =>
        createErrorResponse(
            ERROR_CODES.VALIDATION_ERROR,
            'Validation failed',
            400,
            details,
            requestId
        ),

    notFound: (resource: string, requestId?: string) =>
        createErrorResponse(
            ERROR_CODES.NOT_FOUND,
            `${resource} not found`,
            404,
            undefined,
            requestId
        ),

    unauthorized: (message?: string, requestId?: string) =>
        createErrorResponse(
            ERROR_CODES.UNAUTHORIZED,
            message || 'Authentication required',
            401,
            undefined,
            requestId
        ),

    forbidden: (message?: string, requestId?: string) =>
        createErrorResponse(
            ERROR_CODES.FORBIDDEN,
            message || 'You do not have permission to perform this action',
            403,
            undefined,
            requestId
        ),

    internalError: (requestId?: string) =>
        createErrorResponse(
            ERROR_CODES.INTERNAL_ERROR,
            'An unexpected error occurred. Our team has been notified',
            500,
            undefined,
            requestId
        ),

    serviceUnavailable: (requestId?: string) =>
        createErrorResponse(
            ERROR_CODES.SERVICE_UNAVAILABLE,
            'Service temporarily unavailable. Please try again later',
            503,
            undefined,
            requestId
        ),
};