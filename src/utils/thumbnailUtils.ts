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
import { logger } from '@/utils/logger';

// Create component-specific logger
const log = logger.forComponent('Thumbnail Utils');

/**
 * Generate thumbnails for an image file in small, medium, and large sizes
 * @param file - The original image file
 * @param filename - Base filename for the thumbnails (without extension)
 * @returns Promise resolving to thumbnail generation results
 */
export async function generateThumbnails(
    file: File, 
    filename: string
): Promise<ThumbnailGenerationResult> {
    log.debug('Starting thumbnail generation for 3 sizes');
    log.devDebug('Thumbnail generation request', { 
        originalFileName: file.name, 
        baseFilename: filename, 
        fileSize: file.size 
    });

    try {
        // Validate file type
        if (!isValidImageType(file)) {
            throw new Error(`Unsupported image type: ${file.type}`);
        }

        // Create image element to work with
        const img = await createImageFromFile(file);

        try {
            // Generate all three thumbnail sizes in parallel
            log.debug('Generating thumbnails in parallel');
            const [small, medium, large] = await Promise.all([
                generateSingleThumbnail(img, THUMBNAIL_SIZES.SMALL, filename),
                generateSingleThumbnail(img, THUMBNAIL_SIZES.MEDIUM, filename),
                generateSingleThumbnail(img, THUMBNAIL_SIZES.LARGE, filename),
            ]);

            log.debug('All thumbnails generated successfully');
            log.devDebug('Generated thumbnail details', {
                originalFileName: file.name,
                small: { width: small.width, height: small.height },
                medium: { width: medium.width, height: medium.height },
                large: { width: large.width, height: large.height }
            });

            return { small, medium, large };
        } finally {
            // Clean up the image URL
            URL.revokeObjectURL(img.src);
        }
    } catch (error) {
        log.error('Failed to generate thumbnails', {
            error,
            errorMessage: error instanceof Error ? error.message : 'Unknown error'
        });
        log.devDebug('Thumbnail generation failed for file', { 
            originalFileName: file.name, 
            baseFilename: filename 
        });
        throw error;
    }
}

/**
 * Generate a single thumbnail at the specified size
 * @param img - The loaded image element to thumbnail
 * @param size - Size object which determines the maximum dimension
 * @param filename - Base filename for the thumbnail
 * @returns Promise resolving to thumbnail result with dimensions and file
 */
async function generateSingleThumbnail(
    img: HTMLImageElement, 
    size: ThumbnailSize, 
    filename: string
): Promise<ThumbnailResult> {
    log.debug('Generating single thumbnail for size', size.name);
    log.devDebug('Single thumbnail generation details', {
        sizeName: size.name,
        maxDimension: size.value,
        originalDimensions: { width: img.naturalWidth, height: img.naturalHeight },
        baseFilename: filename
    });

    // Get the maximum dimension from the size object
    const maxDimension = size.value;

    // Calculate new dimensions while maintaining aspect ratio
    const { width, height } = calculateThumbnailDimensions(
        img.naturalWidth,
        img.naturalHeight,
        maxDimension
    );

    log.debug('Calculated thumbnail dimensions', width, 'x', height);

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

    log.debug('Canvas rendering completed for', size.name);

    // Convert canvas to blob
    log.debug('Converting canvas to blob for', size.name);
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

    log.debug('Single thumbnail created successfully for', size.name);
    log.devDebug('Created thumbnail file details', {
        sizeName: size.name,
        filename: thumbnailFilename,
        dimensions: { width, height },
        fileSize: thumbnailFile.size
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
function calculateThumbnailDimensions(
    originalWidth: number, 
    originalHeight: number, 
    maxDimension: number
): { width: number; height: number } {
    log.devDebug('Calculating thumbnail dimensions', {
        original: { width: originalWidth, height: originalHeight },
        maxDimension
    });

    // If image is already smaller than max dimension, don't upscale
    if (originalWidth <= maxDimension && originalHeight <= maxDimension) {
        log.debug('Image smaller than max dimension, using original size');
        return { width: originalWidth, height: originalHeight };
    }

    // Calculate scale factor to fit within max dimension
    const scaleFactor = maxDimension / Math.max(originalWidth, originalHeight);
    const result = {
        width: Math.round(originalWidth * scaleFactor),
        height: Math.round(originalHeight * scaleFactor),
    };

    log.debug('Calculated scaled dimensions using scale factor', scaleFactor.toFixed(3));
    log.devDebug('Dimension calculation result', {
        original: { width: originalWidth, height: originalHeight },
        calculated: result,
        scaleFactor
    });

    return result;
}

/**
 * Create an HTMLImageElement from a File object
 * @param file - The image file to load
 * @returns Promise resolving to loaded image element
 * @throws Error if image fails to load
 */
function createImageFromFile(file: File): Promise<HTMLImageElement> {
    log.debug('Creating image element for thumbnail processing');
    log.devDebug('Image creation for thumbnails', { fileName: file.name, fileType: file.type });

    return new Promise((resolve, reject) => {
        const img = new Image();

        img.onload = () => {
            log.debug('Image loaded successfully for thumbnail generation');
            resolve(img);
        };
        
        img.onerror = () => {
            log.error('Failed to load image for thumbnail generation');
            log.devDebug('Image load failed during thumbnail processing', { fileName: file.name });
            URL.revokeObjectURL(img.src);
            reject(new Error('Failed to load image for thumbnail generation'));
        };

        img.src = URL.createObjectURL(file);
    });
}

/**
 * Determine optimal thumbnail size based on target display dimensions
 * @param displayWidth - The target display width in pixels
 * @param devicePixelRatio - Optional device pixel ratio (defaults to window.devicePixelRatio)
 * @returns The optimal thumbnail size name
 */
export function getOptimalThumbnailSize(
    displayWidth: number, 
    devicePixelRatio?: number
): string {
    log.debug('Calculating optimal thumbnail size for display width');
    log.devDebug('Optimal thumbnail size calculation', { 
        displayWidth, 
        devicePixelRatio 
    });

    // Add buffer for high DPI displays
    const dpr = devicePixelRatio ?? (typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1);
    const targetWidth = displayWidth * dpr;
    
    let optimalSize: string;
    if (targetWidth <= THUMBNAIL_SIZES.SMALL.value * 1.2) {
        optimalSize = THUMBNAIL_SIZES.SMALL.name;
    } else if (targetWidth <= THUMBNAIL_SIZES.MEDIUM.value * 1.2) {
        optimalSize = THUMBNAIL_SIZES.MEDIUM.name;
    } else {
        optimalSize = THUMBNAIL_SIZES.LARGE.name;
    }

    log.debug('Optimal thumbnail size determined:', optimalSize);
    log.devDebug('Thumbnail size calculation result', {
        displayWidth,
        devicePixelRatio: dpr,
        targetWidth,
        optimalSize
    });
    
    return optimalSize;
}

/**
 * Get the best available thumbnail for an image based on target size
 * @param image - The image object with potential thumbnail properties
 * @param targetSize - The target thumbnail size name (optional, determines optimal if not provided)
 * @param displayWidth - Optional display width to calculate optimal size
 * @returns The best available thumbnail object with url property
 */
export function getBestThumbnail(
    image: any, 
    targetSize?: string, 
    displayWidth?: number
): { url: string } {
    log.debug('Getting best available thumbnail for image');
    log.devDebug('Best thumbnail selection request', { 
        imageId: image?.id, 
        targetSize, 
        displayWidth,
        availableThumbnails: {
            small: !!image?.smallThumbnail,
            medium: !!image?.mediumThumbnail,
            large: !!image?.largeThumbnail
        }
    });

    let optimalSize = targetSize;
    
    // If no target size provided but display width is available, calculate optimal size
    if (!optimalSize && displayWidth) {
        optimalSize = getOptimalThumbnailSize(displayWidth);
        log.debug('Calculated optimal size from display width:', optimalSize);
    }
    
    let selectedThumbnail: { url: string };
    let selectionReason: string;

    // Try to use the optimal size, fall back to available thumbnails
    if (optimalSize === THUMBNAIL_SIZES.LARGE.name && image.largeThumbnail) {
        selectedThumbnail = image.largeThumbnail;
        selectionReason = 'optimal_large';
    } else if (optimalSize === THUMBNAIL_SIZES.MEDIUM.name && image.mediumThumbnail) {
        selectedThumbnail = image.mediumThumbnail;
        selectionReason = 'optimal_medium';
    } else if (image.mediumThumbnail) {
        selectedThumbnail = image.mediumThumbnail;
        selectionReason = 'fallback_medium';
    } else if (image.smallThumbnail) {
        selectedThumbnail = image.smallThumbnail;
        selectionReason = 'fallback_small';
    } else {
        // Fallback to original image
        selectedThumbnail = { url: image.url };
        selectionReason = 'fallback_original';
    }

    log.debug('Selected thumbnail:', selectionReason);
    log.devDebug('Thumbnail selection result', {
        imageId: image?.id,
        optimalSize,
        selectionReason,
        selectedUrl: selectedThumbnail.url?.substring(0, 50) + '...'
    });
    
    return selectedThumbnail;
}

/**
 * Get thumbnail for a specific target display size
 * Convenience function that combines optimal size calculation and thumbnail selection
 * @param image - The image object with potential thumbnail properties  
 * @param targetDisplayWidth - The target display width in pixels
 * @param devicePixelRatio - Optional device pixel ratio
 * @returns The best available thumbnail object with url property
 */
export function getThumbnailForTargetSize(
    image: any, 
    targetDisplayWidth: number, 
    devicePixelRatio?: number
): { url: string } {
    log.debug('Getting thumbnail for target display size');
    log.devDebug('Target size thumbnail request', { 
        imageId: image?.id, 
        targetDisplayWidth, 
        devicePixelRatio 
    });

    const optimalSize = getOptimalThumbnailSize(targetDisplayWidth, devicePixelRatio);
    const result = getBestThumbnail(image, optimalSize);

    log.debug('Thumbnail for target size selected');
    log.devDebug('Target size thumbnail result', {
        imageId: image?.id,
        targetDisplayWidth,
        optimalSize,
        resultUrl: result.url?.substring(0, 50) + '...'
    });

    return result;
}