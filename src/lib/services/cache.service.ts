import { getRedisClient } from '@/lib/redis';

/**
 * Generic caching service with TTL support
 * Uses Upstash Redis for serverless-compatible caching
 */
export class CacheService {
    private static get redis() {
        return getRedisClient();
    }

    /**
     * Get a cached value by key
     */
    static async get<T>(key: string): Promise<T | null> {
        try {
            const value = await this.redis.get<T>(key);
            return value;
        } catch (error) {
            console.error('Cache get error:', error);
            return null;
        }
    }

    /**
     * Set a cached value with TTL (in seconds)
     */
    static async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
        try {
            await this.redis.set(key, value, { ex: ttlSeconds });
        } catch (error) {
            console.error('Cache set error:', error);
        }
    }

    /**
     * Delete a cached value
     */
    static async del(key: string): Promise<void> {
        try {
            await this.redis.del(key);
        } catch (error) {
            console.error('Cache delete error:', error);
        }
    }

    /**
     * Delete multiple keys matching a pattern
     */
    static async delPattern(pattern: string): Promise<void> {
        try {
            // Upstash doesn't support SCAN, so we use KEYS (safe for Upstash's architecture)
            const keys = await this.redis.keys(pattern);
            if (keys.length > 0) {
                await this.redis.del(...keys);
            }
        } catch (error) {
            console.error('Cache delete pattern error:', error);
        }
    }

    /**
     * Cache-aside pattern: Get from cache, or fetch and cache
     */
    static async getOrSet<T>(
        key: string,
        fetcher: () => Promise<T>,
        ttlSeconds: number
    ): Promise<{ data: T; cached: boolean }> {
        try {
            const cached = await this.get<T>(key);
            if (cached !== null) {
                return { data: cached, cached: true };
            }

            const data = await fetcher();
            await this.set(key, data, ttlSeconds);
            return { data, cached: false };
        } catch (error) {
            console.error('Cache getOrSet error:', error);
            // Fallback to fetcher on cache failure
            const data = await fetcher();
            return { data, cached: false };
        }
    }

    /**
     * Increment a counter (for rate limiting)
     * Returns the new count
     */
    static async incr(key: string): Promise<number> {
        try {
            return await this.redis.incr(key);
        } catch (error) {
            console.error('Cache incr error:', error);
            return 0;
        }
    }

    /**
     * Set expiry on a key (in seconds)
     */
    static async expire(key: string, ttlSeconds: number): Promise<void> {
        try {
            await this.redis.expire(key, ttlSeconds);
        } catch (error) {
            console.error('Cache expire error:', error);
        }
    }

    /**
     * Get TTL remaining on a key (in seconds)
     */
    static async ttl(key: string): Promise<number> {
        try {
            return await this.redis.ttl(key);
        } catch (error) {
            console.error('Cache ttl error:', error);
            return -1;
        }
    }

    /**
     * Generate a cache key from parts
     */
    static generateKey(...parts: (string | number | undefined)[]): string {
        return parts.filter(Boolean).join(':');
    }

    /**
     * Generate a hash of query parameters for cache keys
     */
    static hashParams(params: Record<string, unknown>): string {
        const sorted = Object.keys(params)
            .sort()
            .reduce((acc, key) => {
                if (params[key] !== undefined && params[key] !== null) {
                    acc[key] = params[key];
                }
                return acc;
            }, {} as Record<string, unknown>);

        return Buffer.from(JSON.stringify(sorted)).toString('base64').substring(0, 16);
    }
}

// Cache TTL constants (in seconds)
export const CACHE_TTL = {
    API_KEY: 5 * 60,        // 5 minutes
    WORKOUT_LIST: 10 * 60,  // 10 minutes
    WORKOUT_SINGLE: 10 * 60, // 10 minutes
    CATEGORIES: 30 * 60,    // 30 minutes
} as const;
