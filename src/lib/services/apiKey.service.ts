import { createAdminClient } from '@/lib/supabase/client';
import { CacheService, CACHE_TTL } from '@/lib/services/cache.service';
import { SubscriptionTier } from '@/types';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

type ApiKeyValidationResult =
    | { valid: true; keyId: string; userId: string; tier: SubscriptionTier }
    | { valid: false; error: string };

export class ApiKeyService {
    private static get supabase() {
        return createAdminClient();
    }

    static async validateKey(apiKey: string): Promise<ApiKeyValidationResult> {
        try {
            if (!apiKey || !apiKey.startsWith('wa_')) {
                return { valid: false, error: 'Invalid API key format' };
            }

            const prefix = apiKey.substring(0, 12);
            const cacheKey = CacheService.generateKey('apikey', prefix);

            // Check cache first
            const cached = await CacheService.get<ApiKeyValidationResult>(cacheKey);
            if (cached && cached.valid) {
                // Update last_used_at in background (fire and forget)
                this.updateLastUsed(cached.keyId).catch(() => { });
                return cached;
            }


            const { data: keyData, error } = await this.supabase
                .from('api_keys')
                .select(`
          id,
          key_hash,
          is_active,
          user_id,
          subscription_id,
          expires_at,
          subscriptions (
            status,
            tier,
            current_period_end
          )
        `)
                .eq('key_prefix', prefix)
                .eq('is_active', true)
                .single();

            if (error || !keyData) {
                console.log('API key not found. Error:', error);
                console.log('Searched for prefix:', prefix);
                return { valid: false, error: 'API key not found' };
            }

            console.log('Found API key:', keyData.id);

            // Check expiration
            if (keyData.expires_at && new Date(keyData.expires_at) < new Date()) {
                console.log('API key expired');
                return { valid: false, error: 'API key expired' };
            }

            const isValid = await bcrypt.compare(apiKey, keyData.key_hash);
            if (!isValid) {
                console.log('API key hash mismatch');
                return { valid: false, error: 'Invalid API key' };
            }

            const subscription = keyData.subscriptions as any;
            if (!subscription) {
                console.log('No subscription found for API key');
                return { valid: false, error: 'No subscription found' };
            }

            console.log('Subscription status:', subscription.status, 'tier:', subscription.tier);

            if (subscription.status !== 'active' && subscription.status !== 'trialing') {
                console.log('Subscription not active:', subscription.status);
                return { valid: false, error: 'Subscription inactive' };
            }

            // Update last_used_at
            await this.updateLastUsed(keyData.id);

            const result: ApiKeyValidationResult = {
                valid: true,
                keyId: keyData.id,
                userId: keyData.user_id,
                tier: subscription.tier,
            };

            // Cache the successful validation
            await CacheService.set(cacheKey, result, CACHE_TTL.API_KEY);

            return result;
        } catch (error) {
            console.error('API key validation error:', error);
            return { valid: false, error: 'Validation failed' };
        }
    }

    private static async updateLastUsed(keyId: string): Promise<void> {
        try {
            await this.supabase
                .from('api_keys')
                .update({ last_used_at: new Date().toISOString() })
                .eq('id', keyId);
        } catch (error) {
            // Non-critical, just log
            console.error('Failed to update last_used_at:', error);
        }
    }

    /**
     * Invalidate cache for an API key
     */
    static async invalidateCache(keyPrefix: string): Promise<void> {
        const cacheKey = CacheService.generateKey('apikey', keyPrefix);
        await CacheService.del(cacheKey);
    }

    static async generateKey(userId: string, subscriptionId: string, name: string) {
        try {
            const environment = process.env.NODE_ENV === 'production' ? 'live' : 'test';
            const randomString = crypto.randomBytes(16).toString('hex');
            const apiKey = `wa_${environment}_${randomString}`;
            const prefix = apiKey.substring(0, 12);
            const hash = await bcrypt.hash(apiKey, 10);

            const { data, error } = await this.supabase
                .from('api_keys')
                .insert({
                    user_id: userId,
                    subscription_id: subscriptionId,
                    key_hash: hash,
                    key_prefix: prefix,
                    name,
                })
                .select()
                .single();

            if (error) throw error;

            return { apiKey, id: data.id };
        } catch (error) {
            console.error('API key generation error:', error);
            throw error;
        }
    }

    static async regenerateKey(keyId: string, userId: string) {
        try {
            const { data: oldKey } = await this.supabase
                .from('api_keys')
                .select('subscription_id, name')
                .eq('id', keyId)
                .eq('user_id', userId)
                .single();

            if (!oldKey) throw new Error('API key not found');

            const expiresAt = new Date();
            expiresAt.setHours(expiresAt.getHours() + 24);

            // Get the old key prefix before updating
            const { data: keyPrefixData } = await this.supabase
                .from('api_keys')
                .select('key_prefix')
                .eq('id', keyId)
                .single();

            await this.supabase
                .from('api_keys')
                .update({ expires_at: expiresAt.toISOString() })
                .eq('id', keyId);

            // Invalidate cache for old key
            if (keyPrefixData?.key_prefix) {
                await this.invalidateCache(keyPrefixData.key_prefix);
            }

            return await this.generateKey(userId, oldKey.subscription_id, oldKey.name);
        } catch (error) {
            console.error('API key regeneration error:', error);
            throw error;
        }
    }

    static async revokeKey(keyId: string, userId: string) {
        try {
            // Get the key prefix before revoking
            const { data: keyData } = await this.supabase
                .from('api_keys')
                .select('key_prefix')
                .eq('id', keyId)
                .eq('user_id', userId)
                .single();

            const { error } = await this.supabase
                .from('api_keys')
                .update({ is_active: false })
                .eq('id', keyId)
                .eq('user_id', userId);

            if (error) throw error;

            // Invalidate cache
            if (keyData?.key_prefix) {
                await this.invalidateCache(keyData.key_prefix);
            }

            return true;
        } catch (error) {
            console.error('API key revocation error:', error);
            throw error;
        }
    }

    static async getUserKeys(userId: string) {
        try {
            const { data, error } = await this.supabase
                .from('api_keys')
                .select('*')
                .eq('user_id', userId)
                .eq('is_active', true)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Get user keys error:', error);
            throw error;
        }
    }

    static async getKeyCount(userId: string): Promise<number> {
        try {
            const { count, error } = await this.supabase
                .from('api_keys')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', userId)
                .eq('is_active', true);

            if (error) throw error;
            return count || 0;
        } catch (error) {
            console.error('Get key count error:', error);
            return 0;
        }
    }
}