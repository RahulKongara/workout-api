export type UserRole = "admin" | "customer";
export type SubscriptionStatus =
    | "active"
    | "past_due"
    | "canceled"
    | "incomplete"
    | "trialing";
export type SubscriptionTier = "free" | "pro" | "enterprise";
export type DifficultyLevel = "beginner" | "intermediate" | "advanced";

export interface User {
    id: string;
    email: string;
    role: UserRole;
    company_name?: string;
    use_case?: string;
    created_at: string;
    updated_at: string;
}


export interface Subscription {
    id: string;
    user_id: string;
    razorpay_subscription_id: string | null;
    razorpay_customer_id: string | null;
    tier: SubscriptionTier;
    status: SubscriptionStatus;
    current_period_start: string | null;
    current_period_end: string | null;
    cancel_at_period_end: boolean;
    created_at: string;
    updated_at: string;
}

export interface ApiKey {
    id: string;
    user_id: string;
    subscription_id: string;
    key_hash: string;
    key_prefix: string;
    name: string;
    is_active: boolean;
    last_used_at: string | null;
    created_at: string;
    expires_at: string | null;
}

export interface Workout {
    id: string;
    name: string;
    slug: string;
    description: string;
    difficulty: DifficultyLevel;
    duration: number;
    muscle_groups: string[];
    equipment: string[];
    instructions: string[];
    video_url: string | null;
    image_url: string | null;
    calories_burned: number | null;
    tier_access: SubscriptionTier;
    is_deleted: boolean;
    created_by: string;
    created_at: string;
    updated_at: string;
}

export interface ApiUsage {
    id: string;
    api_key_id: string;
    endpoint: string;
    method: string;
    status_code: number;
    response_time_ms: number | null;
    request_id: string | null;
    created_at: string;
}

export interface RateLimit {
    id: string;
    api_key_id: string;
    window_start: string;
    request_count: number;
    limit_type: 'per_minute' | 'monthly';
    updated_at: string;
}

export interface PaginationParams {
    page?: number;
    limit?: number;
}

export interface PaginationMeta {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

export interface ApiResponse<T> {
    data: T;
    pagination?: PaginationMeta;
    meta: {
        requestId: string;
        timestamp: string;
        version?: string;
    };
}

export interface ApiError {
    error: {
        code: string;
        message: string;
        details?: any;
        docUrl?: string;
    };
    meta: {
        requestId: string;
        timestamp: string;
    };
}

export interface WorkoutFilters {
    difficulty?: DifficultyLevel;
    muscleGroup?: string;
    equipment?: string;
    minDuration?: number;
    maxDuration?: number;
    tier?: SubscriptionTier;
}

export interface TierLimits {
    perMinute: number;
    monthly: number;
    maxApiKeys: number;
}