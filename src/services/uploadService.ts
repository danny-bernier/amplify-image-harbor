/**
 * @fileoverview Upload service for handling batch file uploads with atomic operations
 * Provides business logic for file uploads including validation, S3 storage, database
 * persistence, and automatic rollback on failures.
 * 
 * @author Image Harbor Team
 * @version 1.0.0
 */

import { uploadPrivateOriginal, uploadPrivateThumbnail } from '@/services/s3Service';
import { createImage, CreateImageInput, createThumbnail, CreateThumbnailInput } from '@/services/dbService';
import { getImageDimensions, isValidImageType, generateImageFileName, generateThumbnails, THUMBNAIL_SIZES } from '@/utils/imageUtils';

/**
 * Metadata associated with file uploads
 */
export interface FileMetadata {
  title?: string;
  description?: string;
  tags?: string | string[];
}

/**
 * Result object for successful file uploads
 */
export interface UploadResult {
  success: boolean;
  fileName: string;
  s3Key: string;
  imageId?: string;
  title: string;
  tags: string[];
  dimensions: { width: number; height: number };
  thumbnails: {
    small: { s3Key: string; dbId?: string };
    medium: { s3Key: string; dbId?: string };
    large: { s3Key: string; dbId?: string };
  };
}

/**
 * Error information for failed file uploads
 */
export interface UploadError {
  fileName: string;
  error: string;
}

/**
 * Result object for batch upload operations
 */
export interface BatchUploadResult {
  totalFiles: number;
  successful: number;
  failed: number;
  results: UploadResult[];
  errors?: UploadError[];
}

/**
 * Service class for handling file uploads with atomic operations and rollback capabilities
 */
export class UploadService {
  /**
   * Process multiple file uploads with their metadata including thumbnail generation
   * Each file upload is processed atomically - complete success or complete failure with rollback
   * @param files - Array of image files to upload
   * @param fileMetadata - Array of metadata objects corresponding to each file (can be sparse)
   * @param batchMetadata - Optional object containing per-file metadata keyed by filename
   * @returns Promise resolving to batch upload results with success/failure counts and detailed results
   * @throws Error if critical batch processing fails (individual file failures are captured in results)
   */
  async processImageUploads(
    files: File[], 
    fileMetadata: FileMetadata[], 
    batchMetadata: Record<string, any> = {}
  ): Promise<BatchUploadResult> {
    const results: UploadResult[] = [];
    const errors: UploadError[] = [];

    // Process each file
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      let metadata = fileMetadata[i] || {};
      
      // If batch metadata includes per-file data, merge it
      if (batchMetadata[file.name]) {
        metadata = { ...metadata, ...batchMetadata[file.name] };
      }

      try {
        const result = await this.processSingleFile(file, metadata);
        results.push(result);
      } catch (error) {
        const errorInfo: UploadError = {
          fileName: file.name,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
        errors.push(errorInfo);
        console.error(`Upload failed for ${file.name}:`, error);
      }
    }

    return {
      totalFiles: files.length,
      successful: results.length,
      failed: errors.length,
      results,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  /**
   * Process a single file upload with atomic rollback on failure
   * @param file - The file to upload
   * @param metadata - Optional metadata for the file
   * @returns Promise resolving to upload result
   * @throws Error if upload fails after rollback
   */
  private async processSingleFile(file: File, metadata: FileMetadata = {}): Promise<UploadResult> {
    let s3Key: string | null = null;
    let dbRecordId: string | null = null;
    let thumbnailS3Keys: { small?: string; medium?: string; large?: string } = {};
    let thumbnailDbIds: { small?: string; medium?: string; large?: string } = {};

    try {
      // Validate file type using centralized utility
      if (!isValidImageType(file)) {
        throw new Error(`File ${file.name}: Unsupported image type. Supported formats include JPEG, PNG, TIFF, and various RAW formats.`);
      }

      // Generate unique filename with UUID and preserve extension
      const fileName = generateImageFileName(file.name);
      
      // Step 1: Upload original to S3 first (can be easily rolled back)
      s3Key = await uploadPrivateOriginal(file, fileName);

      // Step 2: Get image dimensions using centralized utility
      const dimensions = await getImageDimensions(file);

      // Step 3: Parse metadata (no side effects)
      const title = metadata.title || file.name.replace(/\.[^/.]+$/, '');
      const description = metadata.description || '';
      const tags = this.parseTags(metadata.tags);

      // Step 4: Save original image to database
      const imageData: CreateImageInput = {
        title,
        description,
        s3Key,
        tags: tags.length > 0 ? tags : undefined,
        width: dimensions.width,
        height: dimensions.height,
      };

      const dbResult = await createImage(imageData);
      dbRecordId = dbResult?.id || null;

      if (!dbRecordId) {
        throw new Error('Failed to create database record for image');
      }

      // Step 5: Generate thumbnails
      const baseFilename = fileName.replace(/\.[^/.]+$/, ''); // Remove extension for thumbnail naming
      const thumbnailResults = await generateThumbnails(file, baseFilename);

      // Step 6: Upload thumbnails to S3
      const [smallS3Key, mediumS3Key, largeS3Key] = await Promise.all([
        uploadPrivateThumbnail(thumbnailResults.small.file, thumbnailResults.small.file.name),
        uploadPrivateThumbnail(thumbnailResults.medium.file, thumbnailResults.medium.file.name),
        uploadPrivateThumbnail(thumbnailResults.large.file, thumbnailResults.large.file.name),
      ]);

      thumbnailS3Keys = {
        small: smallS3Key,
        medium: mediumS3Key,
        large: largeS3Key
      };

      // Step 7: Create thumbnail database records
      const smallThumbnailData: CreateThumbnailInput = {
        imageId: dbRecordId,
        s3Key: smallS3Key,
        size: THUMBNAIL_SIZES.SMALL.name
      };

      const mediumThumbnailData: CreateThumbnailInput = {
        imageId: dbRecordId,
        s3Key: mediumS3Key,
        size: THUMBNAIL_SIZES.MEDIUM.name
      };

      const largeThumbnailData: CreateThumbnailInput = {
        imageId: dbRecordId,
        s3Key: largeS3Key,
        size: THUMBNAIL_SIZES.LARGE.name
      };

      const [smallDbResult, mediumDbResult, largeDbResult] = await Promise.all([
        createThumbnail(smallThumbnailData),
        createThumbnail(mediumThumbnailData),
        createThumbnail(largeThumbnailData)
      ]);

      thumbnailDbIds = {
        small: smallDbResult?.id || undefined,
        medium: mediumDbResult?.id || undefined,
        large: largeDbResult?.id || undefined
      };

      // Success - return complete result
      return {
        success: true,
        fileName: file.name,
        s3Key,
        imageId: dbRecordId,
        title,
        tags,
        dimensions,
        thumbnails: {
          small: { s3Key: smallS3Key, dbId: thumbnailDbIds.small },
          medium: { s3Key: mediumS3Key, dbId: thumbnailDbIds.medium },
          large: { s3Key: largeS3Key, dbId: thumbnailDbIds.large }
        }
      };

    } catch (error) {
      // Rollback logic: clean up any successful operations
      await this.rollbackFileUpload(s3Key, dbRecordId, thumbnailS3Keys, thumbnailDbIds);
      
      // Re-throw the original error
      throw error;
    }
  }

  /**
   * Rollback partial uploads by cleaning up S3 and DB records including thumbnails
   * @param s3Key - The original image S3 key to delete (if upload succeeded)
   * @param dbRecordId - The original image database record ID to delete (if creation succeeded)
   * @param thumbnailS3Keys - Object containing thumbnail S3 keys to delete
   * @param thumbnailDbIds - Object containing thumbnail database IDs to delete
   * @returns Promise that resolves when cleanup is complete
   */
  private async rollbackFileUpload(
    s3Key: string | null, 
    dbRecordId: string | null,
    thumbnailS3Keys: { small?: string; medium?: string; large?: string } = {},
    thumbnailDbIds: { small?: string; medium?: string; large?: string } = {}
  ): Promise<void> {
    const cleanupPromises: Promise<void>[] = [];

    // Clean up original image S3 file if it was uploaded
    if (s3Key) {
      cleanupPromises.push(this.deleteS3File(s3Key));
    }

    // Clean up original image database record if it was created
    if (dbRecordId) {
      cleanupPromises.push(this.deleteDbRecord(dbRecordId));
    }

    // Clean up thumbnail S3 files
    Object.values(thumbnailS3Keys).forEach(thumbnailS3Key => {
      if (thumbnailS3Key) {
        cleanupPromises.push(this.deleteS3File(thumbnailS3Key));
      }
    });

    // Clean up thumbnail database records
    Object.values(thumbnailDbIds).forEach(thumbnailDbId => {
      if (thumbnailDbId) {
        cleanupPromises.push(this.deleteThumbnailRecord(thumbnailDbId));
      }
    });

    // Execute cleanup operations in parallel, but don't fail if cleanup fails
    if (cleanupPromises.length > 0) {
      try {
        await Promise.allSettled(cleanupPromises);
        console.log('Rollback completed successfully');
      } catch (rollbackError) {
        console.error('Rollback failed - manual cleanup may be required:', {
          s3Key,
          dbRecordId,
          thumbnailS3Keys,
          thumbnailDbIds,
          error: rollbackError
        });
      }
    }
  }

  /**
   * Delete file from S3 storage (used for rollback operations)
   * @param s3Key - The S3 key of the file to delete
   * @returns Promise that resolves when file is deleted
   * @throws Error if deletion fails
   */
  private async deleteS3File(s3Key: string): Promise<void> {
    try {
      const { deleteFile } = await import('@/services/s3Service');
      await deleteFile(s3Key);
      console.log(`Rollback: Deleted S3 file ${s3Key}`);
    } catch (error) {
      console.error(`Failed to delete S3 file during rollback: ${s3Key}`, error);
      throw error;
    }
  }

  /**
   * Delete record from database (used for rollback operations)
   * @param recordId - The database record ID to delete
   * @returns Promise that resolves when record is deleted
   * @throws Error if deletion fails
   */
  private async deleteDbRecord(recordId: string): Promise<void> {
    try {
      const { deleteImage } = await import('@/services/dbService');
      await deleteImage(recordId);
      console.log(`Rollback: Deleted DB record ${recordId}`);
    } catch (error) {
      console.error(`Failed to delete DB record during rollback: ${recordId}`, error);
      throw error;
    }
  }

  /**
   * Delete thumbnail record from database (used for rollback operations)
   * @param thumbnailId - The thumbnail database record ID to delete
   * @returns Promise that resolves when record is deleted
   * @throws Error if deletion fails
   */
  private async deleteThumbnailRecord(thumbnailId: string): Promise<void> {
    try {
      const { deleteThumbnail } = await import('@/services/dbService');
      await deleteThumbnail(thumbnailId);
      console.log(`Rollback: Deleted thumbnail DB record ${thumbnailId}`);
    } catch (error) {
      console.error(`Failed to delete thumbnail DB record during rollback: ${thumbnailId}`, error);
      throw error;
    }
  }

  /**
   * Parse tags from various input formats (array, JSON string, or comma-separated string)
   * @param tags - Tags in any supported format
   * @returns Array of parsed tag strings
   */
  private parseTags(tags?: string | string[]): string[] {
    if (!tags) return [];
    
    if (Array.isArray(tags)) {
      return tags;
    }
    
    if (typeof tags === 'string') {
      try {
        // Try to parse as JSON array first
        const parsed = JSON.parse(tags);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      } catch {
        // If JSON parsing fails, treat as comma-separated string
        return tags.split(',').map((tag: string) => tag.trim()).filter(Boolean);
      }
    }
    
    return [];
  }
}

/**
 * Singleton instance of the UploadService for application-wide use
 */
export const uploadService = new UploadService();