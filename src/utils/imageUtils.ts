/**
 * @fileoverview Image processing utilities for thumbnail generation and file validation
 * Provides comprehensive image processing capabilities including thumbnail generation,
 * dimension calculation, file type validation, and unique filename generation.
 * 
 * @author Image Harbor Team
 * @version 1.0.0
 */

import { randomUUID } from 'crypto';

/**
 * Standard thumbnail size dimensions in pixels
 */
// Thumbnail size constants
export const THUMBNAIL_SIZES = {
  SMALL: 150,
  MEDIUM: 300,
  LARGE: 1200,
} as const;

/**
 * Output format for generated thumbnails (JPEG)
 */
// Thumbnail output format
export const THUMBNAIL_FORMAT = 'image/jpeg' as const;
export const THUMBNAIL_QUALITY = 0.85 as const; // JPEG quality (0.0 - 1.0)

/**
 * Comprehensive list of supported image file extensions
 * Includes standard formats (JPEG, PNG, TIFF) and professional RAW formats
 */
// Accepted image types
export const ACCEPTED_IMAGE_TYPES = [
  '.jpeg', '.jpg', '.png', '.tiff', '.tif',  // Standard formats
  '.cr2', '.cr3', '.nef', '.arw', '.orf',    // Canon, Nikon, Sony, Olympus RAW
  '.dng', '.raw', '.rwl', '.rw2',            // Adobe DNG and other RAW formats
  '.pef', '.srw', '.raf', '.3fr'             // Pentax, Samsung, Fuji, Hasselblad RAW
] as const;

/**
 * Result object for a single thumbnail generation
 */
export interface ThumbnailResult {
  size: 'small' | 'medium' | 'large';
  maxDimension: number;
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
  // Validate file type
  if (!isValidImageType(file)) {
    throw new Error(`Unsupported image type: ${file.type}`);
  }

  // Create image element to work with
  const img = await createImageFromFile(file);

  try {
    // Generate all three thumbnail sizes in parallel
    const [small, medium, large] = await Promise.all([
      generateSingleThumbnail(img, THUMBNAIL_SIZES.SMALL, 'small', filename),
      generateSingleThumbnail(img, THUMBNAIL_SIZES.MEDIUM, 'medium', filename),
      generateSingleThumbnail(img, THUMBNAIL_SIZES.LARGE, 'large', filename),
    ]);

    return { small, medium, large };
  } finally {
    // Clean up the image URL
    URL.revokeObjectURL(img.src);
  }
}

/**
 * Generate a single thumbnail at the specified maximum dimension
 * @param img - The loaded image element to thumbnail
 * @param maxDimension - Maximum width or height for the thumbnail
 * @param size - Size category for filename generation
 * @param filename - Base filename for the thumbnail
 * @returns Promise resolving to thumbnail result with dimensions and file
 */
async function generateSingleThumbnail(
  img: HTMLImageElement,
  maxDimension: number,
  size: 'small' | 'medium' | 'large',
  filename: string
): Promise<ThumbnailResult> {
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
  const thumbnailFilename = `${filename}_${size}.jpg`;
  const thumbnailFile = new File([blob], thumbnailFilename, {
    type: THUMBNAIL_FORMAT,
  });

  return {
    size,
    maxDimension,
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

/**
 * Generate a unique filename for S3 storage using UUID and preserving extension
 * @param originalFilename - The original filename from the uploaded file
 * @returns A unique filename with UUID and preserved extension
 */
export function generateImageFileName(originalFilename: string): string {
  const lastDotIndex = originalFilename.lastIndexOf('.');
  const fileExtension = lastDotIndex > 0 ? originalFilename.substring(lastDotIndex + 1) : '';
  const uuid = randomUUID();
  return fileExtension ? `${uuid}.${fileExtension}` : uuid;
}

/**
 * Check if file type is supported for image processing
 * @param file - The file to validate
 * @returns True if file type is supported, false otherwise
 */
export function isValidImageType(file: File): boolean {
  if (!file.type.startsWith('image/')) {
    return false;
  }

  // Get file extension from filename
  const fileName = file.name.toLowerCase();
  const extension = fileName.substring(fileName.lastIndexOf('.'));
  
  // Check if extension is in accepted types
  return ACCEPTED_IMAGE_TYPES.includes(extension as any);
}

/**
 * Get image dimensions from a file without creating thumbnails
 * @param file - The image file to measure
 * @returns Promise resolving to width and height in pixels
 * @throws Error if image fails to load
 */
export async function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  const img = await createImageFromFile(file);
  
  try {
    return {
      width: img.naturalWidth,
      height: img.naturalHeight,
    };
  } finally {
    URL.revokeObjectURL(img.src);
  }
}