import { createAdminClient } from '@/lib/supabase/client';
import { CacheService } from '@/lib/services/cache.service';
import { TIER_LIMITS } from '@/lib/constants';
import { SubscriptionTier } from '@/types';
import { generateRequestId } from '@/lib/utils/helpers';

type RateLimitResult =
    | { allowed: true; remaining: number; limit: number; resetAt: Date }
    | { allowed: false; remaining: number; resetAt: Date; limitType: string; limit?: number };

export class RateLimitService {
    private static get supabase() {
        return createAdminClient();
    }

    /**
     * Check rate limits using Redis for fast, atomic operations
     */
    static async checkRateLimit(keyId: string, tier: SubscriptionTier): Promise<RateLimitResult | { allowed: false; error: string }> {
        try {
            const limits = TIER_LIMITS[tier];

            // Check per-minute rate limit (uses Redis)
            const minuteCheck = await this.checkRedisLimit(
                keyId,
                'per_minute',
                limits.perMinute,
                60
            );

            if (!minuteCheck.allowed) {
                return {
                    ...minuteCheck,
                    limit: limits.perMinute,
                };
            }

            // Check monthly limit if applicable (uses DB for persistence)
            if (limits.monthly !== -1) {
                const monthlyCheck = await this.checkMonthlyLimit(keyId, limits.monthly);

                if (!monthlyCheck.allowed) {
                    return monthlyCheck;
                }
            }

            return {
                allowed: true,
                remaining: minuteCheck.remaining,
                limit: limits.perMinute,
                resetAt: minuteCheck.resetAt,
            };
        } catch (error) {
            console.error('Rate limit check error:', error);
            return { allowed: false, error: 'Rate limit check failed' };
        }
    }

    /**
     * Redis-based sliding window rate limiting
     * Much faster than database queries (~1ms vs ~50-100ms)
     */
    private static async checkRedisLimit(
        keyId: string,
        limitType: string,
        maxRequests: number,
        windowSeconds: number
    ): Promise<
        | { allowed: true; remaining: number; resetAt: Date }
        | { allowed: false; remaining: number; resetAt: Date; limitType: string }
    > {
        const now = Date.now();
        const windowKey = CacheService.generateKey('ratelimit', keyId, limitType);

        try {
            // Atomic increment
            const count = await CacheService.incr(windowKey);

            // Set expiry on first request in window
            if (count === 1) {
                await CacheService.expire(windowKey, windowSeconds);
            }

            const ttl = await CacheService.ttl(windowKey);
            const resetAt = new Date(now + (ttl > 0 ? ttl * 1000 : windowSeconds * 1000));

            if (count > maxRequests) {
                return {
                    allowed: false,
                    remaining: 0,
                    resetAt,
                    limitType,
                };
            }

            return {
                allowed: true,
                remaining: Math.max(0, maxRequests - count),
                resetAt,
            };
        } catch (error) {
            console.error('Redis rate limit error, falling back to allow:', error);
            // On Redis failure, fail open (allow the request)
            return {
                allowed: true,
                remaining: maxRequests,
                resetAt: new Date(now + windowSeconds * 1000),
            };
        }
    }

    /**
     * Monthly limit check - uses database since we need persistence across months
     * Cached for 1 minute to reduce DB queries
     */
    private static async checkMonthlyLimit(
        keyId: string,
        maxMonthly: number
    ): Promise<
        | { allowed: true; remaining: number; resetAt: Date }
        | { allowed: false; remaining: number; resetAt: Date; limitType: string }
    > {
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const startOfNextMonth = new Date(startOfMonth);
        startOfNextMonth.setMonth(startOfNextMonth.getMonth() + 1);

        // Cache the monthly count for 1 minute
        const cacheKey = CacheService.generateKey('monthly_usage', keyId, startOfMonth.toISOString().slice(0, 7));

        const { data: count, cached } = await CacheService.getOrSet(
            cacheKey,
            async () => {
                const { count, error } = await this.supabase
                    .from('api_usage')
                    .select('*', { count: 'exact', head: true })
                    .eq('api_key_id', keyId)
                    .gte('created_at', startOfMonth.toISOString());

                if (error) throw error;
                return count || 0;
            },
            60 // Cache for 1 minute
        );

        if (count >= maxMonthly) {
            return {
                allowed: false,
                remaining: 0,
                resetAt: startOfNextMonth,
                limitType: 'monthly',
            };
        }

        return {
            allowed: true,
            remaining: maxMonthly - count,
            resetAt: startOfNextMonth,
        };
    }

    /**
     * Log API usage (still goes to database for analytics)
     */
    static async logUsage(
        keyId: string,
        endpoint: string,
        method: string,
        statusCode: number,
        responseTimeMs: number
    ) {
        try {
            const requestId = generateRequestId();

            await this.supabase.from('api_usage').insert({
                api_key_id: keyId,
                endpoint,
                method,
                status_code: statusCode,
                response_time_ms: responseTimeMs,
                request_id: requestId,
            });

            // Invalidate monthly usage cache on new request
            const startOfMonth = new Date();
            startOfMonth.setDate(1);
            startOfMonth.setHours(0, 0, 0, 0);
            const cacheKey = CacheService.generateKey('monthly_usage', keyId, startOfMonth.toISOString().slice(0, 7));
            await CacheService.del(cacheKey);

            return requestId;
        } catch (error) {
            console.error('Usage logging error:', error);
            return generateRequestId();
        }
    }

    static async getUsageStats(keyId: string, days: number = 30) {
        try {
            const since = new Date();
            since.setDate(since.getDate() - days);

            const { data, error } = await this.supabase
                .from('api_usage')
                .select('*')
                .eq('api_key_id', keyId)
                .gte('created_at', since.toISOString())
                .order('created_at', { ascending: false });

            if (error) throw error;

            const totalRequests = data.length;
            const successfulRequests = data.filter((r) => r.status_code < 400).length;
            const avgResponseTime =
                data.reduce((sum, r) => sum + (r.response_time_ms || 0), 0) / totalRequests || 0;

            return {
                totalRequests,
                successfulRequests,
                failedRequests: totalRequests - successfulRequests,
                avgResponseTime: Math.round(avgResponseTime),
                data,
            };
        } catch (error) {
            console.error('Get usage stats error:', error);
            throw error;
        }
    }

    static async getMonthlyUsage(keyId: string) {
        try {
            const startOfMonth = new Date();
            startOfMonth.setDate(1);
            startOfMonth.setHours(0, 0, 0, 0);

            const { count, error } = await this.supabase
                .from('api_usage')
                .select('*', { count: 'exact', head: true })
                .eq('api_key_id', keyId)
                .gte('created_at', startOfMonth.toISOString());

            if (error) throw error;
            return count || 0;
        } catch (error) {
            console.error('Get monthly usage error:', error);
            return 0;
        }
    }

    /**
     * Cleanup old rate limit records to prevent table bloat
     * (Less important now that we use Redis, but keeps DB clean)
     */
    static async cleanupOldRecords(): Promise<void> {
        try {
            // Delete rate limit records older than 2 days
            const cutoff = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);

            const { error } = await this.supabase
                .from('rate_limits')
                .delete()
                .lt('window_start', cutoff.toISOString());

            if (error) {
                console.error('Rate limit cleanup error:', error);
            }
        } catch (error) {
            console.error('Rate limit cleanup error:', error);
        }
    }
}