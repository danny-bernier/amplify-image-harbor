/**
 * @fileoverview Core image type definitions
 * Provides TypeScript interfaces for image objects with dynamic thumbnail support.
 * 
 * @author Danny Bernier
 * @version 1.0.0
 */

/**
 * Enhanced thumbnail size enumeration with value and name properties
 */
export const THUMBNAIL_SIZES = {
    SMALL: { value: 100, name: 'SMALL' },
    MEDIUM: { value: 250, name: 'MEDIUM' },
    LARGE: { value: 500, name: 'LARGE' },
    HUGE: { value: 1920, name: 'HUGE' },
} as const;

export type ThumbnailSizeKey = keyof typeof THUMBNAIL_SIZES;
export type ThumbnailSize = typeof THUMBNAIL_SIZES[ThumbnailSizeKey];
export type ThumbnailSizeName = typeof THUMBNAIL_SIZES[ThumbnailSizeKey]['name'];

/**
 * Output format for generated thumbnails (JPEG)
 */
export const THUMBNAIL_FORMAT = 'image/jpeg' as const;
export const THUMBNAIL_QUALITY = 0.85 as const; // JPEG quality (0.0 - 1.0)

/**
 * Result object for a single thumbnail generation
 */
export interface ThumbnailResult {
    size: ThumbnailSize;
    file: File;
    width: number;
    height: number;
}

/**
 * Complete result object containing all three thumbnail sizes
 */
export type ThumbnailGenerationResult = { [K in ThumbnailSizeKey]: ThumbnailResult };

export class S3Image {
    /**
     * Represents an image stored in S3, with lazy URL loading.
     *
     * Example usage:
     * ```ts
     * const img = new S3Image({ s3Key: 'images/abc.jpg', url: null });
     * const url = await img.getUrl();
     * ```
     */
    s3Key: string;
    url: string | null;

    constructor(params: { s3Key: string; url: string | null }) {
        this.s3Key = params.s3Key;
        this.url = params.url;
    }

    /**
     * Returns the URL for this image. If not present, fetches it from S3 using s3Key.
     */
    async getUrl(): Promise<string> {
        if (this.url) {
            return this.url;
        }
        // Dynamically import s3Service to avoid circular dependency
        const { getFileUrl } = await import('@/services/s3Service');
        return getFileUrl(this.s3Key);
    }
}

/**
 * Thumbnail data representation
 *
 * Represents a thumbnail image with its size, ID, and a reference to the S3Image for lazy URL loading.
 */
export interface ThumbnailData {
    size: ThumbnailSize;
    thumbnailId: string;
    image: S3Image;
}

/**
 * Harbor image representation
 *
 * Represents an image with its ID, original S3 image, dimensions, and associated thumbnails.
 */
export interface HarborImage {
    // primary data
    id: string;
    s3image: S3Image;
    thumbnails: { [K in ThumbnailSizeKey]: ThumbnailData | null } | null;

    // additional metadata
    title: string | null | undefined;
    description: string | null | undefined;
    width: number;
    height: number;
    tags: string[] | null | undefined;
    jsonTags: Record<string, any> | null | undefined;
    created: string | null | undefined;
    lastUpdated: string | null | undefined;
}



// TODO remove legacy ImageData and ImageMetadata interfaces
/**
 * Core image data representation as a class
 *
 * Represents an image with its ID, original S3 image, dimensions, and associated thumbnails.
 */
export interface ImageData {
    id: string;
    image: S3Image;
    width: number;
    height: number;
    thumbnails: { [K in ThumbnailSizeKey]: ThumbnailData | null } | null;
}

/**
 * Metadata associated with an image
 */
export interface ImageMetadata {
    title: string | null;
    description: string | null;
    tags: string[] | null | undefined;
    jsonTags: Record<string, any> | null | undefined;
    created: string | null | undefined;
    lastUpdated: string | null | undefined;
}