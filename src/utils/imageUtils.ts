/**
 * @fileoverview Image processing utilities for file validation and image operations
 * Provides image processing capabilities including dimension calculation, 
 * file type validation, and unique filename generation.
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
  HarborImage,
  S3Image,
} from '@/types/images';
import { logger } from '@/utils/logger';

// Create component-specific logger
const log = logger.forComponent('Image Utils');

/**
 * Comprehensive list of supported image file extensions
 * Includes standard formats (JPEG, PNG, TIFF) and professional RAW formats
 */
export const ACCEPTED_IMAGE_TYPES = [
  '.jpeg', '.jpg', '.png', '.tiff', '.tif',  // Standard formats
  '.cr2', '.cr3', '.nef', '.arw', '.orf',    // Canon, Nikon, Sony, Olympus RAW
  '.dng', '.raw', '.rwl', '.rw2',            // Adobe DNG and other RAW formats
  '.pef', '.srw', '.raf', '.3fr'             // Pentax, Samsung, Fuji, Hasselblad RAW
] as const;

// ========================= THUMBNAIL UTILITY FUNCTIONS ========================= //

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
 * Get the optimal thumbnail size for a target display size
 * Dynamically selects the best thumbnail size based on the target size,
 * returning null if no thumbnails are large enough (indicating original image should be used).
 * Future-proof: automatically adapts to changes in THUMBNAIL_SIZES.
 * 
 * @param targetSize - Target display size in pixels (width or height, whichever is larger)
 * @param devicePixelRatio - Optional device pixel ratio (defaults to window.devicePixelRatio)
 * @returns The optimal THUMBNAIL_SIZES entry, or null if original image should be used
 */
export function getThumbnailSizeForTargetSize(
  targetSize: number,
  devicePixelRatio?: number
): typeof THUMBNAIL_SIZES[keyof typeof THUMBNAIL_SIZES] | null {
  log.debug('Getting optimal thumbnail size for target size');
  log.devDebug('Thumbnail size selection request', {
    targetSize,
    devicePixelRatio
  });

  // Account for high DPI displays
  const dpr = devicePixelRatio ?? (typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1);
  const adjustedTargetSize = targetSize * dpr;

  // Get all available thumbnail sizes sorted by value (smallest to largest)
  const availableSizes = Object.values(THUMBNAIL_SIZES).sort((a, b) => a.value - b.value);

  // Find the smallest thumbnail that's larger than or equal to our target
  let selectedSize: typeof THUMBNAIL_SIZES[keyof typeof THUMBNAIL_SIZES] | null = null;
  let selectionReason = '';

  for (const size of availableSizes) {
    if (size.value >= adjustedTargetSize) {
      selectedSize = size;
      selectionReason = `optimal_${size.name.toLowerCase()}`;
      break;
    }
  }

  // If no thumbnail is large enough, return null (indicating original image should be used)
  if (!selectedSize) {
    selectionReason = 'target_size_larger_than_thumbnails_original_is_optimal';
  }

  log.debug('Selected optimal thumbnail size:', selectionReason);
  log.devDebug('Thumbnail size selection result', {
    targetSize,
    adjustedTargetSize,
    selectionReason,
    selectedSize: selectedSize ? `${selectedSize.name} (${selectedSize.value}px)` : 'null (use original)'
  });

  return selectedSize;
}

// ========================= IMAGE UTILITY FUNCTIONS ========================= //

/**
 * Generate a unique filename for S3 storage using UUID and preserving extension
 * @param originalFilename - The original filename from the uploaded file
 * @returns A unique filename with UUID and preserved extension
 */
export function generateImageFileName(originalFilename: string): string {
  log.devDebug('Generating filename', { originalFilename });

  const lastDotIndex = originalFilename.lastIndexOf('.');
  const fileExtension = lastDotIndex > 0 ? originalFilename.substring(lastDotIndex + 1) : '';

  // Use browser's crypto API for UUID generation
  const uuid = crypto.randomUUID();
  const generatedFilename = fileExtension ? `${uuid}.${fileExtension}` : uuid;

  log.debug('Generated unique filename with extension', fileExtension || 'none');
  log.devDebug('Generated filename details', {
    originalFilename,
    extractedExtension: fileExtension,
    uuid,
    generatedFilename
  });

  return generatedFilename;
}

/**
 * Check if file type is supported for image processing
 * @param file - The file to validate
 * @returns True if file type is supported, false otherwise
 */
export function isValidImageType(file: File): boolean {
  log.devDebug('Validating file type', {
    fileName: file.name,
    fileType: file.type,
    fileSize: file.size
  });

  if (!file.type.startsWith('image/')) {
    log.debug('File rejected: not an image type');
    return false;
  }

  // Get file extension from filename
  const fileName = file.name.toLowerCase();
  const extension = fileName.substring(fileName.lastIndexOf('.'));

  // Check if extension is in accepted types
  const isValid = ACCEPTED_IMAGE_TYPES.includes(extension as any);

  log.debug('File type validation result:', isValid ? 'accepted' : 'rejected');
  log.devDebug('File validation details', {
    fileName: file.name,
    extension,
    isValid,
    acceptedTypes: ACCEPTED_IMAGE_TYPES.length
  });

  return isValid;
}

/**
 * Get image dimensions from a file without creating thumbnails
 * @param file - The image file to measure
 * @returns Promise resolving to width and height in pixels
 * @throws Error if image fails to load
 */
export async function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  log.debug('Getting image dimensions');
  log.devDebug('Dimension calculation request', { fileName: file.name, fileSize: file.size });

  try {
    const img = await createImageFromFile(file);

    try {
      const dimensions = {
        width: img.naturalWidth,
        height: img.naturalHeight,
      };

      log.debug('Image dimensions calculated successfully');
      log.devDebug('Calculated dimensions', {
        fileName: file.name,
        width: dimensions.width,
        height: dimensions.height
      });

      return dimensions;
    } finally {
      URL.revokeObjectURL(img.src);
    }
  } catch (error) {
    log.error('Failed to get image dimensions', {
      error,
      errorMessage: error instanceof Error ? error.message : 'Unknown error'
    });
    log.devDebug('Dimension calculation failed for file', { fileName: file.name });
    throw error;
  }
}

/**
 * Create an HTMLImageElement from a File object
 * @param file - The image file to load
 * @returns Promise resolving to loaded image element
 * @throws Error if image fails to load
 */
function createImageFromFile(file: File): Promise<HTMLImageElement> {
  log.debug('Creating image from file');
  log.devDebug('Image creation request', { fileName: file.name, fileType: file.type });

  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      log.debug('Image loaded successfully');
      resolve(img);
    };

    img.onerror = () => {
      log.error('Failed to load image for processing');
      log.devDebug('Image load failed for file', { fileName: file.name });
      URL.revokeObjectURL(img.src);
      reject(new Error('Failed to load image'));
    };

    img.src = URL.createObjectURL(file);
  });
}

/**
 * Returns the best S3Image (original or thumbnail) for a given target size and devicePixelRatio.
 * @param hImage - The HarborImage object
 * @param targetSize - Target display size in px
 * @param devicePixelRatio - Optional device pixel ratio
 * @returns The corresponding S3Image
 */
export function getImageForTargetSize(hImage: HarborImage, targetSize: number, devicePixelRatio ?: number): S3Image {
  const optimalSize = getThumbnailSizeForTargetSize(targetSize, devicePixelRatio);
  if (optimalSize && hImage.thumbnails && hImage.thumbnails[optimalSize.name]) {
    return hImage.thumbnails[optimalSize.name]!.image;
  }
  return hImage.s3image;
}

/**
 * Returns the thumbnail image for a given size, or the original image if not available.
 * @param hImage - The HarborImage object
 * @param thumbnailSize - The desired thumbnail size
 * @returns The corresponding S3Image
 */
export function getThumbnailOrOriginal(hImage: HarborImage, thumbnailSize: ThumbnailSize | null): S3Image {
  if (thumbnailSize && hImage.thumbnails && hImage.thumbnails[thumbnailSize.name]) {
    return hImage.thumbnails[thumbnailSize.name]!.image;
  }
  return hImage.s3image;
}