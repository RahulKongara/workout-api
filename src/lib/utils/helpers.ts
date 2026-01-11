import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function generateSlug(text: string): string {
    return text
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

export async function generateUniqueSlug(
    name: string,
    checkExists: (slug: string) => Promise<boolean>
): Promise<string> {
    let slug = generateSlug(name);
    let counter = 1;

    while (await checkExists(slug)) {
        slug = `${generateSlug(name)}-${counter}`;
        counter++;
    }

    return slug;
}

export function formatDate(date: string | Date): string {
    return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    }).format(new Date(date));
}

export function formatDateTime(date: string | Date): string {
    return new Intl.DateTimeFormat('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(new Date(date));
}

export function formatNumber(num: number): string {
    return new Intl.NumberFormat('en-US').format(num);
}

export function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
    }).format(amount);
}

export function calculatePercentage(current: number, total: number): number {
    if (total === 0) return 0;
    return Math.round((current / total) * 100);
}

export function truncate(str: string, length: number): string {
    if (str.length <= length) return str;
    return str.substring(0, length) + '...';
}

export function generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export function maskApiKey(apiKey: string): string {
    if (apiKey.length <= 12) return apiKey;
    return `${apiKey.substring(0, 12)}...${apiKey.substring(apiKey.length - 4)}`;
}