/**
 * @fileoverview S3 storage service for handling file uploads, downloads, and deletions
 * Provides functions for uploading images to different storage buckets (private/protected)
 * and managing file access through signed URLs.
 * 
 * @author Danny Bernier
 * @version 1.0.0
 */

import { uploadData, getUrl, remove } from 'aws-amplify/storage';
import { logger } from '@/utils/logger';

// Create component-specific logger
const log = logger.forComponent('S3 Service');

/**
 * Upload a file to S3 with specified path and metadata
 * @param path - The S3 path where the file will be stored
 * @param file - The file to upload
 * @returns Promise resolving to the S3 path of the uploaded file
 * @throws Error if upload fails
 */
const uploadFile = async (path: string, file: File): Promise<string> => {
  try {
    log.devDebug('Upload details', { 
      path: path,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type
    });

    // Configure upload options
    const uploadOptions = {
      path: path,
      data: file,
      options: {
        contentType: file.type,
      }
    };

    log.debug('Starting file upload to storage');
    const result = await uploadData(uploadOptions).result;

    log.debug('Upload completed successfully');
    return result.path;
  } catch (error) {
    log.error('Upload failed', { 
      error,
      errorMessage: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  }
};

/**
 * Upload an original image file to the private storage bucket
 * @param file - The image file to upload
 * @param fileName - The unique filename for S3 storage
 * @returns Promise resolving to the S3 key of the uploaded file
 * @throws Error if upload fails
 */
export const uploadPrivateOriginal = async (file: File, fileName: string): Promise<string> => {
  const s3Key = `private/images/original/${fileName}`;
  log.debug('Uploading private original image');
  const result = await uploadFile(s3Key, file);
  log.info('Private original image uploaded successfully');
  return result;
};

/**
 * Upload a thumbnail image file to the private storage bucket
 * @param file - The thumbnail file to upload  
 * @param fileName - The unique filename for S3 storage
 * @returns Promise resolving to the S3 key of the uploaded thumbnail
 * @throws Error if upload fails
 */
export const uploadPrivateThumbnail = async (file: File, fileName: string): Promise<string> => {
  const s3Key = `private/images/thumbnail/${fileName}`;
  log.debug('Uploading private thumbnail');
  const result = await uploadFile(s3Key, file);
  log.info('Private thumbnail uploaded successfully');
  return result;
};

/**
 * Upload an edited image file to the private storage bucket  
 * @param file - The edited image file to upload
 * @param fileName - The unique filename for S3 storage
 * @returns Promise resolving to the S3 key of the uploaded edited image
 * @throws Error if upload fails
 */
export const uploadPrivateEdited = async (file: File, fileName: string): Promise<string> => {
  const s3Key = `private/images/edited/${fileName}`;
  log.debug('Uploading private edited image');
  const result = await uploadFile(s3Key, file);
  log.info('Private edited image uploaded successfully');
  return result;
};

/**
 * Generate a signed URL for accessing a file in S3
 * @param path - The S3 path to the file
 * @returns Promise resolving to a signed URL valid for 1 hour
 * @throws Error if URL generation fails
 */
export const getFileUrl = async (path: string): Promise<string> => {
  try {
    log.devDebug('URL generation request', { path: path });
    
    // Configure URL generation options for client-side access
    const urlOptions: any = {
      path: path,
      options: {
        expiresIn: 3600, // 1 hour
      }
    };

    log.debug('Generating signed URL');
    const result = await getUrl(urlOptions);

    log.info('Signed URL generated successfully');
    return result.url.toString();
  } catch (error) {
    log.error('Failed to get file URL', { 
      error,
      errorMessage: error instanceof Error ? error.message : 'Unknown error'
    });
    log.devDebug('Failed URL generation for path', { path: path });
    throw error;
  }
};

/**
 * Delete a file from S3 storage
 * @param path - The S3 path to the file to delete
 * @returns Promise that resolves when file is deleted
 * @throws Error if deletion fails
 */
export const deleteFile = async (path: string): Promise<void> => {
  try {
    log.devDebug('Delete request', { path: path });
    
    // Configure delete options for client-side access
    const deleteOptions: any = {
      path: path
    };

    log.debug('Deleting file from storage');
    await remove(deleteOptions);
    
    log.info('File deleted successfully');
  } catch (error) {
    log.error('Failed to delete file', { 
      error,
      errorMessage: error instanceof Error ? error.message : 'Unknown error'
    });
    log.devDebug('Failed deletion for path', { path: path });
    throw error;
  }
};