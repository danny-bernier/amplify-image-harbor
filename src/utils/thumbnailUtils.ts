/**
 * @fileoverview Thumbnail generation utilities
 * Provides thumbnail generation functions including canvas-based image resizing,
 * dimension calculation, and batch thumbnail processing.
 * 
 * @author Danny Bernier
 * @version 1.0.0
 */

import {
    THUMBNAIL_SIZES,
    THUMBNAIL_FORMAT,
    THUMBNAIL_QUALITY,
    ThumbnailSize,
    ThumbnailResult,
    ThumbnailGenerationResult,
} from '@/types/thumbnail';
import { isValidImageType } from './imageUtils';

/**
 * Generate thumbnails for an image file in small, medium, and large sizes
 * @param file - The original image file
 * @param filename - Base filename for the thumbnails (without extension)
 * @returns Promise resolving to thumbnail generation results
 */
export async function generateThumbnails(file: File, filename: string): Promise<ThumbnailGenerationResult> {

    // Validate file type
    if (!isValidImageType(file)) {
        throw new Error(`Unsupported image type: ${file.type}`);
    }

    // Create image element to work with
    const img = await createImageFromFile(file);

    try {
        // Generate all three thumbnail sizes in parallel
        const [small, medium, large] = await Promise.all([
            generateSingleThumbnail(img, THUMBNAIL_SIZES.SMALL, filename),
            generateSingleThumbnail(img, THUMBNAIL_SIZES.MEDIUM, filename),
            generateSingleThumbnail(img, THUMBNAIL_SIZES.LARGE, filename),
        ]);

        return { small, medium, large };
    } finally {
        // Clean up the image URL
        URL.revokeObjectURL(img.src);
    }
}

/**
 * Generate a single thumbnail at the specified size
 * @param img - The loaded image element to thumbnail
 * @param size - Size object which determines the maximum dimension
 * @param filename - Base filename for the thumbnail
 * @returns Promise resolving to thumbnail result with dimensions and file
 */
async function generateSingleThumbnail(img: HTMLImageElement, size: ThumbnailSize, filename: string): Promise<ThumbnailResult> {

    // Get the maximum dimension from the size object
    const maxDimension = size.value;

    // Calculate new dimensions while maintaining aspect ratio
    const { width, height } = calculateThumbnailDimensions(
        img.naturalWidth,
        img.naturalHeight,
        maxDimension
    );

    // Create canvas and draw resized image
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
        throw new Error('Failed to get canvas 2D context');
    }

    canvas.width = width;
    canvas.height = height;

    // Draw the image with high quality scaling
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, width, height);

    // Convert canvas to blob
    const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
            (blob) => {
                if (blob) {
                    resolve(blob);
                } else {
                    reject(new Error('Failed to create thumbnail blob'));
                }
            },
            THUMBNAIL_FORMAT,
            THUMBNAIL_QUALITY
        );
    });

    // Create file with appropriate naming
    const thumbnailFilename = `${filename}_${size.name.toLowerCase()}.jpg`;
    const thumbnailFile = new File([blob], thumbnailFilename, {
        type: THUMBNAIL_FORMAT,
    });

    return {
        size,
        file: thumbnailFile,
        width,
        height,
    };
}

/**
 * Calculate thumbnail dimensions while maintaining aspect ratio
 * @param originalWidth - Original image width in pixels
 * @param originalHeight - Original image height in pixels
 * @param maxDimension - Maximum allowed width or height
 * @returns Object with calculated width and height
 */
function calculateThumbnailDimensions(originalWidth: number, originalHeight: number, maxDimension: number): { width: number; height: number } {
    // If image is already smaller than max dimension, don't upscale

    if (originalWidth <= maxDimension && originalHeight <= maxDimension) {
        return { width: originalWidth, height: originalHeight };
    }

    // Calculate scale factor to fit within max dimension
    const scaleFactor = maxDimension / Math.max(originalWidth, originalHeight);

    return {
        width: Math.round(originalWidth * scaleFactor),
        height: Math.round(originalHeight * scaleFactor),
    };
}

/**
 * Create an HTMLImageElement from a File object
 * @param file - The image file to load
 * @returns Promise resolving to loaded image element
 * @throws Error if image fails to load
 */
function createImageFromFile(file: File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image();

        img.onload = () => resolve(img);
        img.onerror = () => {
            URL.revokeObjectURL(img.src);
            reject(new Error('Failed to load image for thumbnail generation'));
        };

        img.src = URL.createObjectURL(file);
    });
}