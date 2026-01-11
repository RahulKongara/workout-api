import { z } from 'zod';
import { MUSCLE_GROUPS, EQUIPMENT_OPTIONS, DIFFICULTY_LEVELS } from '@/lib/constants';

export const WorkoutSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    description: z.string().min(1, 'Description is required'),
    difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
    duration: z.number().min(1, 'Duration must be at least 1 minute'),
    muscle_groups: z.array(z.string()).min(1, 'Select at least one muscle group'),
    equipment: z.array(z.string()).default([]),
    instructions: z.array(z.string()).min(1, 'Add at least one instruction'),
    tier_access: z.enum(['free', 'pro', 'enterprise']).default('free'),
    video_url: z.string().url().optional().or(z.literal('')),
    image_url: z.string().url().optional().or(z.literal('')),
    calories_burned: z.number().optional(),
});

export const ApiKeySchema = z.object({
    name: z.string().min(1, 'Name is required').max(50),
});

export const LoginSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const SignupSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    company_name: z.string().optional(),
    use_case: z.string().optional(),
});

export const WorkoutFilterSchema = z.object({
    page: z.number().min(1).default(1),
    limit: z.number().min(1).max(100).default(20),
    difficulty: z.enum(DIFFICULTY_LEVELS).optional(),
    muscle_group: z.string().optional(),
    equipment: z.string().optional(),
    min_duration: z.number().min(0).optional(),
    max_duration: z.number().max(300).optional(),
    search: z.string().optional(),
});

export type WorkoutFormData = z.infer<typeof WorkoutSchema>;
export type ApiKeyFormData = z.infer<typeof ApiKeySchema>;
export type LoginFormData = z.infer<typeof LoginSchema>;
export type SignupFormData = z.infer<typeof SignupSchema>;
export type WorkoutFilterData = z.infer<typeof WorkoutFilterSchema>;