import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';

/**
 * Integration tests for Redis caching layer
 * 
 * These tests verify:
 * 1. CacheService basic operations (get, set, del)
 * 2. Cache-aside pattern (getOrSet)
 * 3. Rate limiting with Redis counters
 * 4. Cache key generation and hashing
 * 
 * Note: These tests require valid Upstash Redis credentials in .env
 */

// Mock the Redis client for unit tests
vi.mock('@/lib/redis', () => {
    const store = new Map<string, { value: unknown; expiry: number | null }>();

    return {
        getRedisClient: () => ({
            get: vi.fn(async (key: string) => {
                const item = store.get(key);
                if (!item) return null;
                if (item.expiry && Date.now() > item.expiry) {
                    store.delete(key);
                    return null;
                }
                return item.value;
            }),
            set: vi.fn(async (key: string, value: unknown, options?: { ex?: number }) => {
                store.set(key, {
                    value,
                    expiry: options?.ex ? Date.now() + options.ex * 1000 : null,
                });
                return 'OK';
            }),
            del: vi.fn(async (...keys: string[]) => {
                keys.forEach(key => store.delete(key));
                return keys.length;
            }),
            incr: vi.fn(async (key: string) => {
                const item = store.get(key);
                const newValue = (typeof item?.value === 'number' ? item.value : 0) + 1;
                store.set(key, { value: newValue, expiry: item?.expiry ?? null });
                return newValue;
            }),
            expire: vi.fn(async (key: string, seconds: number) => {
                const item = store.get(key);
                if (item) {
                    store.set(key, { ...item, expiry: Date.now() + seconds * 1000 });
                    return 1;
                }
                return 0;
            }),
            ttl: vi.fn(async (key: string) => {
                const item = store.get(key);
                if (!item || !item.expiry) return -1;
                const remaining = Math.ceil((item.expiry - Date.now()) / 1000);
                return remaining > 0 ? remaining : -2;
            }),
            keys: vi.fn(async (pattern: string) => {
                const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
                return Array.from(store.keys()).filter(key => regex.test(key));
            }),
        }),
        resetRedisClient: vi.fn(),
    };
});

// Import after mocking
import { CacheService, CACHE_TTL } from '@/lib/services/cache.service';

describe('CacheService', () => {
    beforeAll(() => {
        vi.clearAllMocks();
    });

    afterAll(() => {
        vi.restoreAllMocks();
    });

    describe('Basic operations', () => {
        it('should set and get a value', async () => {
            const key = 'test:basic';
            const value = { name: 'Test Workout', id: 1 };

            await CacheService.set(key, value, 60);
            const result = await CacheService.get<typeof value>(key);

            expect(result).toEqual(value);
        });

        it('should return null for non-existent keys', async () => {
            const result = await CacheService.get('test:nonexistent');
            expect(result).toBeNull();
        });

        it('should delete a key', async () => {
            const key = 'test:delete';
            await CacheService.set(key, 'value', 60);
            await CacheService.del(key);
            const result = await CacheService.get(key);

            expect(result).toBeNull();
        });
    });

    describe('getOrSet (cache-aside pattern)', () => {
        it('should fetch from fetcher on cache miss', async () => {
            const key = 'test:getorset:miss';
            const fetchedData = { fromDb: true };
            const fetcher = vi.fn().mockResolvedValue(fetchedData);

            const { data, cached } = await CacheService.getOrSet(key, fetcher, 60);

            expect(data).toEqual(fetchedData);
            expect(cached).toBe(false);
            expect(fetcher).toHaveBeenCalledTimes(1);
        });

        it('should return cached data on cache hit', async () => {
            const key = 'test:getorset:hit';
            const cachedData = { cached: true };

            // Pre-populate cache
            await CacheService.set(key, cachedData, 60);

            const fetcher = vi.fn().mockResolvedValue({ shouldNotSee: true });
            const { data, cached } = await CacheService.getOrSet(key, fetcher, 60);

            expect(data).toEqual(cachedData);
            expect(cached).toBe(true);
            expect(fetcher).not.toHaveBeenCalled();
        });
    });

    describe('Rate limiting helpers', () => {
        it('should increment a counter', async () => {
            const key = 'test:ratelimit:counter';

            const count1 = await CacheService.incr(key);
            const count2 = await CacheService.incr(key);
            const count3 = await CacheService.incr(key);

            expect(count1).toBe(1);
            expect(count2).toBe(2);
            expect(count3).toBe(3);
        });

        it('should set expiry on a key', async () => {
            const key = 'test:ratelimit:expiry';
            await CacheService.incr(key);
            await CacheService.expire(key, 60);

            const ttl = await CacheService.ttl(key);
            expect(ttl).toBeGreaterThan(0);
            expect(ttl).toBeLessThanOrEqual(60);
        });
    });

    describe('Key generation', () => {
        it('should generate consistent cache keys', () => {
            const key1 = CacheService.generateKey('workouts', 'list', 'abc123');
            const key2 = CacheService.generateKey('workouts', 'list', 'abc123');

            expect(key1).toBe(key2);
            expect(key1).toBe('workouts:list:abc123');
        });

        it('should filter out undefined values', () => {
            const key = CacheService.generateKey('workouts', undefined, 'test');
            expect(key).toBe('workouts:test');
        });

        it('should hash params consistently', () => {
            const params1 = { page: 1, limit: 20, tier: 'free' };
            const params2 = { tier: 'free', limit: 20, page: 1 }; // Different order

            const hash1 = CacheService.hashParams(params1);
            const hash2 = CacheService.hashParams(params2);

            expect(hash1).toBe(hash2); // Should be same regardless of key order
        });

        it('should produce different hashes for different params', () => {
            const hash1 = CacheService.hashParams({ page: 1 });
            const hash2 = CacheService.hashParams({ page: 2 });

            expect(hash1).not.toBe(hash2);
        });
    });

    describe('Cache TTL constants', () => {
        it('should have correct TTL values', () => {
            expect(CACHE_TTL.API_KEY).toBe(300); // 5 minutes
            expect(CACHE_TTL.WORKOUT_LIST).toBe(600); // 10 minutes
            expect(CACHE_TTL.WORKOUT_SINGLE).toBe(600); // 10 minutes
            expect(CACHE_TTL.CATEGORIES).toBe(1800); // 30 minutes
        });
    });
});
