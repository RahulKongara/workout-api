import { createAdminClient } from '@/lib/supabase/client';

const BUCKET_NAME = 'workout-images';
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export class StorageService {
    private static get supabase() {
        return createAdminClient();
    }

    /**
     * Upload an image to Supabase Storage
     * @param file - The file buffer or Blob
     * @param fileName - Original filename
     * @param folder - Optional folder path (e.g., 'workouts')
     * @returns Public URL of the uploaded image
     */
    static async uploadImage(
        file: Buffer | Blob,
        fileName: string,
        folder: string = 'workouts'
    ): Promise<{ url: string; path: string }> {
        // Generate unique filename
        const timestamp = Date.now();
        const randomId = Math.random().toString(36).substring(2, 8);
        const extension = fileName.split('.').pop()?.toLowerCase() || 'jpg';
        const uniqueName = `${timestamp}_${randomId}.${extension}`;
        const filePath = `${folder}/${uniqueName}`;

        // Upload to Supabase Storage
        const { data, error } = await this.supabase.storage
            .from(BUCKET_NAME)
            .upload(filePath, file, {
                cacheControl: '3600',
                upsert: false,
            });

        if (error) {
            console.error('Storage upload error:', error);
            throw new Error(`Failed to upload image: ${error.message}`);
        }

        // Get public URL
        const { data: urlData } = this.supabase.storage
            .from(BUCKET_NAME)
            .getPublicUrl(data.path);

        return {
            url: urlData.publicUrl,
            path: data.path,
        };
    }

    /**
     * Delete an image from Supabase Storage
     * @param urlOrPath - Public URL or storage path
     */
    static async deleteImage(urlOrPath: string): Promise<boolean> {
        try {
            // Extract path from URL if full URL provided
            let path = urlOrPath;
            if (urlOrPath.includes(BUCKET_NAME)) {
                const parts = urlOrPath.split(`${BUCKET_NAME}/`);
                path = parts[1] || urlOrPath;
            }

            const { error } = await this.supabase.storage
                .from(BUCKET_NAME)
                .remove([path]);

            if (error) {
                console.error('Storage delete error:', error);
                return false;
            }

            return true;
        } catch (error) {
            console.error('Delete image error:', error);
            return false;
        }
    }

    /**
     * Validate file before upload
     */
    static validateFile(file: { size: number; type: string }): { valid: boolean; error?: string } {
        if (file.size > MAX_FILE_SIZE) {
            return { valid: false, error: 'File size exceeds 5MB limit' };
        }

        if (!ALLOWED_TYPES.includes(file.type)) {
            return { valid: false, error: 'Invalid file type. Allowed: JPEG, PNG, WebP, GIF' };
        }

        return { valid: true };
    }

    /**
     * Get public URL for a storage path
     */
    static getPublicUrl(path: string): string {
        const { data } = this.supabase.storage
            .from(BUCKET_NAME)
            .getPublicUrl(path);

        return data.publicUrl;
    }
}

export { BUCKET_NAME, MAX_FILE_SIZE, ALLOWED_TYPES };
