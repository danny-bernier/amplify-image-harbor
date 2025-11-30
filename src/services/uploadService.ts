/**
 * @fileoverview Upload service for handling batch file uploads with atomic operations
 * Provides business logic for file uploads including validation, S3 storage, database
 * persistence, and automatic rollback on failures.
 * 
 * @author Danny Bernier
 * @version 1.0.0
 */

import { 
  createImage, 
  CreateImageInput, 
  createThumbnail, 
  deleteImage, 
  deleteThumbnail 
} from '@/services/dbService';

import { 
  getImageDimensions, 
  isValidImageType, 
  generateImageFileName 
} from '@/utils/imageUtils';

import { 
  THUMBNAIL_SIZES, 
  S3Image, 
  ThumbnailData, 
  ImageData, 
  ImageMetadata,
} from '@/types/images';

import { 
  uploadPrivateOriginal, 
  uploadPrivateThumbnail, 
  deleteFile 
} from '@/services/s3Service';

import { generateThumbnails } from '@/utils/imageUtils';
import { logger } from '@/utils/logger';

// Create component-specific logger
const log = logger.forComponent('Upload Service');


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
  results: ImageData[];
  errors?: UploadError[];
}

/**
 * Service class for handling file uploads with atomic operations and rollback capabilities
 */
export class UploadService {
  /**
   * Process batch uploads for images with atomic operations and automatic rollback
   * Each file upload is processed atomically - complete success or complete failure with rollback
   * @param files - Array of image files to upload
   * @param fileMetadata - Array of metadata objects corresponding to each file (can be sparse)
   * @param batchMetadata - Optional object containing per-file metadata keyed by filename
   * @returns Promise resolving to batch upload results with success/failure counts and detailed results
   * @throws Error if critical batch processing fails (individual file failures are captured in results)
   */
  async processImageUploads(
    files: File[],
    fileMetadata: ImageMetadata[],
    batchMetadata: Record<string, any> = {}
  ): Promise<BatchUploadResult> {
    const results: ImageData[] = [];
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
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const errorInfo: UploadError = {
          fileName: file.name,
          error: errorMessage
        };
        errors.push(errorInfo);
        log.error('Upload failed for file:', errorMessage);
        log.devDebug('Failed upload file details', { fileName: file.name });
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
  private async processSingleFile(
    file: File,
    metadata: ImageMetadata = {
      title: null,
      description: null,
      tags: null,
      jsonTags: null,
      created: null,
      lastUpdated: null
    }
  ): Promise<ImageData> {
    let s3Key: string | null = null;
    let dbRecordId: string | null = null;
    let thumbnailS3Keys: Partial<Record<keyof typeof THUMBNAIL_SIZES, string>> = {};
    let thumbnailDbIds: Partial<Record<keyof typeof THUMBNAIL_SIZES, string>> = {};

    try {
      log.devDebug('Processing file for client-side upload', { fileName: file.name });

      // Validate file type using centralized utility
      if (!isValidImageType(file)) {
        throw new Error(`Unsupported image type`);
      }
      // Generate unique filename with UUID and preserve extension
      const fileName = generateImageFileName(file.name);

      // Step 1: Upload original to S3 first (can be easily rolled back)
      s3Key = await uploadPrivateOriginal(file, fileName);

      // Step 2: Get image dimensions using centralized utility
      const dimensions = await getImageDimensions(file);

      // Step 3: Parse metadata (no side effects)
      log.debug('Processing metadata for file');
      log.devDebug('Raw metadata received', {
        fileName: file.name,
        metadata,
        metadataType: typeof metadata,
        hasTitle: !!metadata.title,
        hasDescription: !!metadata.description,
        hasTags: !!metadata.tags,
        hasJsonTags: !!metadata.jsonTags,
        tagsType: typeof metadata.tags,
        jsonTagsType: typeof metadata.jsonTags
      });

      // Step 4: Save original image to database
      const imageData: CreateImageInput = {
        title: metadata.title || file.name.replace(/\.[^/.]+$/, ''),
        description: metadata.description || '',
        s3Key,
        tags: metadata.tags as string[] | undefined,
        jsonTags: metadata.jsonTags && Object.keys(metadata.jsonTags).length > 0 ? metadata.jsonTags : undefined,
        width: dimensions.width,
        height: dimensions.height,
      };

      log.devDebug('Final imageData for database', {
        imageData,
        imageDataStringified: JSON.stringify(imageData, null, 2)
      });

      log.debug('Calling createImage...');
      const dbResult = await createImage(imageData);
      dbRecordId = dbResult?.id || null;

      if (!dbRecordId) {
        throw new Error('Failed to create database record for image');
      }

      // Step 5: Generate thumbnails
      const baseFilename = fileName.replace(/\.[^/.]+$/, ''); // Remove extension for thumbnail naming
      const thumbnailResults = await generateThumbnails(file, baseFilename);


      // Step 6: Upload thumbnails to S3 for all configured sizes (order preserved from THUMBNAIL_SIZES)
      const sizeKeys = Object.keys(THUMBNAIL_SIZES) as (keyof typeof THUMBNAIL_SIZES)[];
      const uploadResults = await Promise.all(sizeKeys.map(k => {
        const thumb = (thumbnailResults as any)[k];
        return uploadPrivateThumbnail(thumb.file, thumb.file.name);
      }));

      // Map upload results back to keys
      sizeKeys.forEach((k, idx) => {
        thumbnailS3Keys[k] = uploadResults[idx];
      });

      // Step 7: Create thumbnail database records for each size in parallel
      const createThumbnailPromises = sizeKeys.map(k => {
        const s3k = thumbnailS3Keys[k]!;
        const payload = {
          imageId: dbRecordId!,
          s3Key: s3k,
          size: THUMBNAIL_SIZES[k].name
        };
        return createThumbnail(payload);
      });

      const createdDbResults = await Promise.all(createThumbnailPromises);
      createdDbResults.forEach((res, idx) => {
        const k = sizeKeys[idx];
        thumbnailDbIds[k] = res?.id || undefined;
      });

      // Step 8: Construct S3Image and ThumbnailData objects
      const s3Image = new S3Image({ s3Key, url: null });
      const thumbnails = Object.fromEntries(
        (Object.keys(THUMBNAIL_SIZES) as (keyof typeof THUMBNAIL_SIZES)[]).map(k => {
          const s3k = thumbnailS3Keys[k];
          return [
            k,
            s3k ? {
              size: THUMBNAIL_SIZES[k],
              thumbnailId: thumbnailDbIds[k] || '',
              image: new S3Image({ s3Key: s3k, url: null })
            } : null
          ];
        })
      ) as { [K in keyof typeof THUMBNAIL_SIZES]: ThumbnailData | null };

      // Success - return ImageData
      log.info('File upload completed successfully');
      return {
        id: dbRecordId,
        image: s3Image,
        width: dimensions.width,
        height: dimensions.height,
        thumbnails
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
    thumbnailS3Keys: Partial<Record<keyof typeof THUMBNAIL_SIZES, string>> = {},
    thumbnailDbIds: Partial<Record<keyof typeof THUMBNAIL_SIZES, string>> = {}
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
        log.info('Rollback completed successfully');
      } catch (rollbackError) {
        log.error('Rollback failed - manual cleanup may be required', { error: rollbackError });
        log.devDebug('Rollback failure details', {
          s3Key,
          dbRecordId,
          thumbnailS3Keys,
          thumbnailDbIds
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
      await deleteFile(s3Key);
      log.debug('Rollback: Deleted S3 file');
      log.devDebug('Rollback: S3 file deleted', { s3Key });
    } catch (error) {
      log.error('Failed to delete S3 file during rollback', error);
      log.devDebug('Failed S3 rollback details', { s3Key });
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
      await deleteImage(recordId);
      log.debug('Rollback: Deleted DB record');
      log.devDebug('Rollback: DB record deleted', { recordId });
    } catch (error) {
      log.error('Failed to delete DB record during rollback', error);
      log.devDebug('Failed DB rollback details', { recordId });
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
      await deleteThumbnail(thumbnailId);
      log.debug('Rollback: Deleted thumbnail DB record');
      log.devDebug('Rollback: Thumbnail record deleted', { thumbnailId });
    } catch (error) {
      log.error('Failed to delete thumbnail DB record during rollback', error);
      log.devDebug('Failed thumbnail rollback details', { thumbnailId });
      throw error;
    }
  }
}

/**
 * Singleton instance of the UploadService for application-wide use
 */
export const uploadService = new UploadService();