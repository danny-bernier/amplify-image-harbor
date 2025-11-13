/**
 * @fileoverview Image processing utilities for file validation and image operations
 * Provides image processing capabilities including dimension calculation, 
 * file type validation, and unique filename generation.
 * 
 * @author Danny Bernier
 * @version 1.0.0
 */

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