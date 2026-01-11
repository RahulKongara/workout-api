import { TierLimits, SubscriptionTier } from '@/types';

export const TIER_LIMITS: Record<SubscriptionTier, TierLimits> = {
    free: {
        perMinute: 10,
        monthly: 1000,
        maxApiKeys: 1,
    },
    pro: {
        perMinute: 100,
        monthly: 50000,
        maxApiKeys: 3,
    },
    enterprise: {
        perMinute: 500,
        monthly: -1, // unlimited
        maxApiKeys: 10,
    },
};

export const TIER_PRICES = {
    free: { monthly: 0, yearly: 0 },
    pro: { monthly: 29, yearly: 290 },
    enterprise: { monthly: 99, yearly: 990 },
};

export const MUSCLE_GROUPS = [
    'chest',
    'back',
    'shoulders',
    'biceps',
    'triceps',
    'forearms',
    'abs',
    'obliques',
    'quads',
    'hamstrings',
    'calves',
    'glutes',
    'full body',
];

export const EQUIPMENT_OPTIONS = [
    'none',
    'dumbbells',
    'barbell',
    'kettlebell',
    'resistance bands',
    'pull-up bar',
    'bench',
    'cable machine',
    'squat rack',
    'treadmill',
    'stationary bike',
    'rowing machine',
    'medicine ball',
    'foam roller',
];

export const DIFFICULTY_LEVELS = ['beginner', 'intermediate', 'advanced'] as const;

export const API_VERSION = 'v1';

export const ERROR_CODES = {
    MISSING_API_KEY: 'MISSING_API_KEY',
    INVALID_API_KEY: 'INVALID_API_KEY',
    EXPIRED_API_KEY: 'EXPIRED_API_KEY',
    SUBSCRIPTION_INACTIVE: 'SUBSCRIPTION_INACTIVE',
    RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    NOT_FOUND: 'NOT_FOUND',
    INTERNAL_ERROR: 'INTERNAL_ERROR',
    SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
    UNAUTHORIZED: 'UNAUTHORIZED',
    FORBIDDEN: 'FORBIDDEN',
} as const;

export const TIER_FEATURES = {
    free: [
        '1,000 requests/month',
        '10 requests/minute',
        'Basic workout database',
        '1 API key',
        'Community support',
    ],
    pro: [
        '50,000 requests/month',
        '100 requests/minute',
        'Full workout database',
        '3 API keys',
        'Email support',
        'Advanced filtering',
    ],
    enterprise: [
        'Unlimited requests',
        '500 requests/minute',
        'Full workout database + early access',
        '10 API keys',
        'Priority support',
        'Advanced filtering',
        'Webhook support',
        'Custom integrations',
    ],
};

export const GRACE_PERIOD_DAYS = 7; // Days before deactivating after payment failure
export const API_KEY_ROTATION_GRACE_HOURS = 24; // Hours old key remains valid after regeneration

export type { SubscriptionTier };
