/**
 * @fileoverview Image processing utilities for file validation and image operations
 * Provides image processing capabilities including dimension calculation, 
 * file type validation, and unique filename generation.
 * 
 * @author Danny Bernier
 * @version 1.0.0
 */

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
  const lastDotIndex = originalFilename.lastIndexOf('.');
  const fileExtension = lastDotIndex > 0 ? originalFilename.substring(lastDotIndex + 1) : '';
  
  // Use browser's crypto API for UUID generation
  const uuid = crypto.randomUUID();
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
      reject(new Error('Failed to load image'));
    };

    img.src = URL.createObjectURL(file);
  });
}