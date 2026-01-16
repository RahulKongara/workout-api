import { createAdminClient } from '@/lib/supabase/client';
import { Subscription, SubscriptionTier } from '@/types';
import { getRazorpayInstance as razorpayInstance } from '@/lib/razorpay/client';
import { ApiKeyService } from './apiKey.service';

export class SubscriptionService {
    private static supabase = createAdminClient();

    // Handle Razorpay subscription creation/activation
    static async handleSubscriptionActivated(webhookData: any) {
        try {
            const subscription = webhookData.payload.subscription.entity;
            const userId = subscription.notes?.userId;

            if (!userId) {
                console.error('No userId in subscription notes');
                return;
            }

            const tier = this.getTierFromPlanId(subscription.plan_id);

            const subscriptionData = {
                user_id: userId,
                stripe_subscription_id: subscription.id, // Reusing field name for Razorpay ID
                stripe_customer_id: subscription.customer_id, // Reusing field name
                tier,
                status: this.mapRazorpayStatus(subscription.status),
                current_period_start: new Date(subscription.current_start * 1000).toISOString(),
                current_period_end: new Date(subscription.current_end * 1000).toISOString(),
                cancel_at_period_end: false,
            };

            const { data: existing } = await this.supabase
                .from('subscriptions')
                .select('*')
                .eq('stripe_subscription_id', subscription.id)
                .maybeSingle();

            if (existing) {
                await this.supabase
                    .from('subscriptions')
                    .update(subscriptionData)
                    .eq('id', existing.id);
            } else {
                const { data: newSub } = await this.supabase
                    .from('subscriptions')
                    .insert(subscriptionData)
                    .select()
                    .single();

                // Create initial API key
                if (newSub) {
                    await ApiKeyService.generateKey(userId, newSub.id, 'Default API Key');
                }
            }
        } catch (error) {
            console.error('Handle subscription activated error:', error);
            throw error;
        }
    }

    // Handle subscription charged (successful payment)
    static async handleSubscriptionCharged(webhookData: any) {
        try {
            const payment = webhookData.payload.payment.entity;
            const subscriptionId = payment.subscription_id;

            if (!subscriptionId) return;

            console.log('Processing subscription charged for:', subscriptionId);

            // Fetch subscription details from Razorpay to get actual billing period
            let periodStart = new Date().toISOString();
            let periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // Default 30 days

            try {
                const rzpSubscription = await this.fetchSubscription(subscriptionId);
                if (rzpSubscription.current_start) {
                    periodStart = new Date(rzpSubscription.current_start * 1000).toISOString();
                }
                if (rzpSubscription.current_end) {
                    periodEnd = new Date(rzpSubscription.current_end * 1000).toISOString();
                }
            } catch (fetchError) {
                console.warn('Could not fetch subscription details, using defaults:', fetchError);
            }

            // Update subscription to active status with actual billing period
            const { error } = await this.supabase
                .from('subscriptions')
                .update({
                    status: 'active',
                    current_period_start: periodStart,
                    current_period_end: periodEnd,
                })
                .eq('stripe_subscription_id', subscriptionId);

            if (error) {
                console.error('Error updating subscription on payment:', error);
            } else {
                console.log('Successfully updated subscription to active');
            }
        } catch (error) {
            console.error('Handle subscription charged error:', error);
            throw error;
        }
    }

    // Handle subscription cancelled
    static async handleSubscriptionCancelled(webhookData: any) {
        try {
            const subscription = webhookData.payload.subscription.entity;

            await this.supabase
                .from('subscriptions')
                .update({ status: 'canceled' })
                .eq('stripe_subscription_id', subscription.id);

            // Deactivate API keys
            const { data: sub } = await this.supabase
                .from('subscriptions')
                .select('id')
                .eq('stripe_subscription_id', subscription.id)
                .single();

            if (sub) {
                await this.supabase
                    .from('api_keys')
                    .update({ is_active: false })
                    .eq('subscription_id', sub.id);
            }
        } catch (error) {
            console.error('Handle subscription cancelled error:', error);
            throw error;
        }
    }

    // Handle payment failed
    static async handlePaymentFailed(webhookData: any) {
        try {
            const payment = webhookData.payload.payment.entity;
            const subscriptionId = payment.subscription_id;

            if (!subscriptionId) return;

            await this.supabase
                .from('subscriptions')
                .update({ status: 'past_due' })
                .eq('stripe_subscription_id', subscriptionId);
        } catch (error) {
            console.error('Handle payment failed error:', error);
            throw error;
        }
    }

    // Handle subscription paused
    static async handleSubscriptionPaused(webhookData: any) {
        try {
            const subscription = webhookData.payload.subscription.entity;

            await this.supabase
                .from('subscriptions')
                .update({ status: 'past_due' })
                .eq('stripe_subscription_id', subscription.id);
        } catch (error) {
            console.error('Handle subscription paused error:', error);
            throw error;
        }
    }

    // Handle subscription resumed
    static async handleSubscriptionResumed(webhookData: any) {
        try {
            const subscription = webhookData.payload.subscription.entity;

            await this.supabase
                .from('subscriptions')
                .update({ status: 'active' })
                .eq('stripe_subscription_id', subscription.id);
        } catch (error) {
            console.error('Handle subscription resumed error:', error);
            throw error;
        }
    }

    // Get user's subscription
    static async getUserSubscription(userId: string): Promise<Subscription | null> {
        try {
            const { data, error } = await this.supabase
                .from('subscriptions')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Get user subscription error:', error);
            return null;
        }
    }

    // Create free subscription
    static async createFreeSubscription(userId: string) {
        try {
            const { data } = await this.supabase
                .from('subscriptions')
                .insert({
                    user_id: userId,
                    tier: 'free',
                    status: 'active',
                })
                .select()
                .single();

            if (data) {
                await ApiKeyService.generateKey(userId, data.id, 'Default API Key');
            }

            return data;
        } catch (error) {
            console.error('Create free subscription error:', error);
            throw error;
        }
    }

    // Create Razorpay subscription
    static async createSubscription(
        userId: string,
        planId: string,
        userEmail: string,
        userName?: string
    ) {
        try {
            const subscription = await razorpayInstance().subscriptions.create({
                plan_id: planId,
                customer_notify: 1,
                total_count: 12, // 12 billing cycles (1 year for monthly plan)
                notes: {
                    userId,
                    email: userEmail,
                },
            });

            return subscription;
        } catch (error) {
            console.error('Create Razorpay subscription error:', error);
            throw error;
        }
    }

    // Cancel subscription
    static async cancelSubscription(subscriptionId: string, cancelAtCycleEnd: boolean = true) {
        try {
            if (cancelAtCycleEnd) {
                // Update database to mark for cancellation at period end
                await this.supabase
                    .from('subscriptions')
                    .update({ cancel_at_period_end: true })
                    .eq('stripe_subscription_id', subscriptionId);
            } else {
                // Cancel immediately in Razorpay
                await razorpayInstance().subscriptions.cancel(subscriptionId);
            }

            return true;
        } catch (error) {
            console.error('Cancel subscription error:', error);
            throw error;
        }
    }

    // Fetch subscription from Razorpay
    static async fetchSubscription(subscriptionId: string) {
        try {
            const subscription = await razorpayInstance().subscriptions.fetch(subscriptionId);
            return subscription;
        } catch (error) {
            console.error('Fetch subscription error:', error);
            throw error;
        }
    }

    // Helper: Map Razorpay status to our status
    private static mapRazorpayStatus(razorpayStatus: string): any {
        const statusMap: Record<string, any> = {
            created: 'incomplete',
            authenticated: 'incomplete',
            active: 'active',
            pending: 'past_due',
            halted: 'past_due',
            cancelled: 'canceled',
            completed: 'canceled',
            expired: 'canceled',
        };

        return statusMap[razorpayStatus] || 'incomplete';
    }

    // Helper: Get tier from plan ID
    private static getTierFromPlanId(planId: string): SubscriptionTier {
        if (planId === process.env.RAZORPAY_PLAN_ID_PRO) return 'pro';
        if (planId === process.env.RAZORPAY_PLAN_ID_ENTERPRISE) return 'enterprise';
        return 'free';
    }
}