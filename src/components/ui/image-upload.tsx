'use client';

import { useState, useRef, useCallback } from 'react';
import { Upload, X, Loader2, ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Image from 'next/image';

interface ImageUploadProps {
    value?: string;
    onChange: (url: string | null) => void;
    disabled?: boolean;
    folder?: string;
}

export function ImageUpload({
    value,
    onChange,
    disabled = false,
    folder = 'workouts'
}: ImageUploadProps) {
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [dragOver, setDragOver] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleUpload = useCallback(async (file: File) => {
        setError(null);
        setUploading(true);

        try {
            // Validate on client side first
            if (file.size > 5 * 1024 * 1024) {
                throw new Error('File size exceeds 5MB limit');
            }

            const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
            if (!allowedTypes.includes(file.type)) {
                throw new Error('Invalid file type. Allowed: JPEG, PNG, WebP, GIF');
            }

            const formData = new FormData();
            formData.append('file', file);
            formData.append('folder', folder);

            const response = await fetch('/api/admin/upload', {
                method: 'POST',
                body: formData,
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Upload failed');
            }

            onChange(data.url);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Upload failed');
        } finally {
            setUploading(false);
        }
    }, [folder, onChange]);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            handleUpload(file);
        }
    };

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);

        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
            handleUpload(file);
        }
    }, [handleUpload]);

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(true);
    };

    const handleDragLeave = () => {
        setDragOver(false);
    };

    const handleRemove = async () => {
        if (!value) return;

        try {
            await fetch(`/api/admin/upload?url=${encodeURIComponent(value)}`, {
                method: 'DELETE',
            });
        } catch (err) {
            console.error('Failed to delete image:', err);
        }

        onChange(null);
    };

    if (value) {
        return (
            <div className="relative">
                <div className="relative w-full h-48 rounded-lg overflow-hidden border border-gray-200">
                    <Image
                        src={value}
                        alt="Uploaded image"
                        fill
                        className="object-cover"
                    />
                </div>
                <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={handleRemove}
                    disabled={disabled}
                >
                    <X className="w-4 h-4" />
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-2">
            <div
                onClick={() => !disabled && !uploading && inputRef.current?.click()}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                className={`
          relative border-2 border-dashed rounded-lg p-8
          flex flex-col items-center justify-center gap-2
          transition-colors cursor-pointer
          ${dragOver
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-300 hover:border-gray-400'
                    }
          ${disabled || uploading ? 'opacity-50 cursor-not-allowed' : ''}
        `}
            >
                {uploading ? (
                    <>
                        <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
                        <p className="text-sm text-gray-500">Uploading...</p>
                    </>
                ) : (
                    <>
                        <div className="p-3 bg-gray-100 rounded-full">
                            <ImageIcon className="w-6 h-6 text-gray-500" />
                        </div>
                        <div className="text-center">
                            <p className="text-sm font-medium text-gray-700">
                                Drop an image here, or click to upload
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                                JPEG, PNG, WebP, GIF up to 5MB
                            </p>
                        </div>
                    </>
                )}

                <input
                    ref={inputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={handleFileSelect}
                    disabled={disabled || uploading}
                    className="hidden"
                />
            </div>

            {error && (
                <p className="text-sm text-red-500">{error}</p>
            )}
        </div>
    );
}
