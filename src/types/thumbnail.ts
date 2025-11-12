/**
 * @fileoverview Thumbnail types and constants
 * Contains all thumbnail-related type definitions, size configurations, 
 * and result interfaces used throughout the image processing system.
 * 
 * @author Danny Bernier
 * @version 1.0.0
 */

/**
 * Enhanced thumbnail size enumeration with value and name properties
 */
export const THUMBNAIL_SIZES = {
    SMALL: { value: 150, name: 'SMALL' },
    MEDIUM: { value: 300, name: 'MEDIUM' },
    LARGE: { value: 1200, name: 'LARGE' }
} as const;

export type ThumbnailSizeKey = keyof typeof THUMBNAIL_SIZES;
export type ThumbnailSize = typeof THUMBNAIL_SIZES[ThumbnailSizeKey];

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
export interface ThumbnailGenerationResult {
    small: ThumbnailResult;
    medium: ThumbnailResult;
    large: ThumbnailResult;
}
