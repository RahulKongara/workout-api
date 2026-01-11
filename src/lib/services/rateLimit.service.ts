import { createAdminClient } from '@/lib/supabase/client';
import { TIER_LIMITS } from '@/lib/constants';
import { SubscriptionTier } from '@/types';
import { generateRequestId } from '@/lib/utils/helpers';

export class RateLimitService {
    private static get supabase() {
        return createAdminClient();
    }

    static async checkRateLimit(keyId: string, tier: SubscriptionTier) {
        try {
            const limits = TIER_LIMITS[tier];

            const minuteCheck = await this.checkLimit(
                keyId,
                'per_minute',
                limits.perMinute,
                60
            );

            if (!minuteCheck.allowed) {
                return minuteCheck;
            }

            if (limits.monthly !== -1) {
                const monthlyCheck = await this.checkLimit(
                    keyId,
                    'monthly',
                    limits.monthly,
                    30 * 24 * 60 * 60
                );

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

    private static async checkLimit(
        keyId: string,
        limitType: 'per_minute' | 'monthly',
        maxRequests: number,
        windowSeconds: number
    ) {
        const now = new Date();
        const windowStart = new Date(now.getTime() - windowSeconds * 1000);

        const { data: limitData } = await this.supabase
            .from('rate_limits')
            .select('*')
            .eq('api_key_id', keyId)
            .eq('limit_type', limitType)
            .gte('window_start', windowStart.toISOString())
            .maybeSingle();

        if (!limitData) {
            await this.supabase.from('rate_limits').insert({
                api_key_id: keyId,
                limit_type: limitType,
                window_start: now.toISOString(),
                request_count: 1,
            });

            return {
                allowed: true,
                remaining: maxRequests - 1,
                resetAt: new Date(now.getTime() + windowSeconds * 1000),
            };
        }

        if (limitData.request_count >= maxRequests) {
            const resetAt = new Date(
                new Date(limitData.window_start).getTime() + windowSeconds * 1000
            );
            return { allowed: false, remaining: 0, resetAt, limitType };
        }

        await this.supabase
            .from('rate_limits')
            .update({
                request_count: limitData.request_count + 1,
                updated_at: now.toISOString(),
            })
            .eq('id', limitData.id);

        return {
            allowed: true,
            remaining: maxRequests - (limitData.request_count + 1),
            resetAt: new Date(
                new Date(limitData.window_start).getTime() + windowSeconds * 1000
            ),
        };
    }

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
}