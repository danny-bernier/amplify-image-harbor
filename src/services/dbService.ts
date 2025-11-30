/**
 * @fileoverview Database service for managing image, edited image, and thumbnail records
 * Provides CRUD operations for all image-related data models with proper error handling
 * and automatic timestamp management.
 * 
 * @author Danny Bernier
 * @version 1.0.0
 */

import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../amplify/data/resource';
import type { ThumbnailSizeName } from '@/types/images';
import { logger } from '@/utils/logger';

// Create component-specific logger
const log = logger.forComponent('DB Service');

// Generate the typed client
const client = generateClient<Schema>();

// ============ IMAGE OPERATIONS ============

/**
 * Input interface for creating a new image record
 */
export interface CreateImageInput {
  title?: string;
  description?: string;
  width: number;
  height: number;
  s3Key: string;
  tags?: string[];
  jsonTags?: Record<string, any>;
}

/**
 * Create a new image record in the database
 * @param input - The image data to store
 * @returns Promise resolving to the created image record
 * @throws Error if creation fails
 */
export const createImage = async (input: CreateImageInput): Promise<Schema['Image']['type']> => {
  try {
    log.devDebug('Input received for createImage', { 
      title: input.title, 
      s3Key: input.s3Key,
      width: input.width,
      height: input.height,
      description: input.description,
      tagsType: typeof input.tags,
      tagsLength: input.tags?.length,
      tags: input.tags,
      jsonTagsType: typeof input.jsonTags,
      jsonTagsKeys: input.jsonTags ? Object.keys(input.jsonTags) : null,
      jsonTags: input.jsonTags
    });

    // Validate input data before sending to GraphQL
    if (!input.s3Key) {
      throw new Error('s3Key is required but missing');
    }
    
    if (!input.width || !input.height) {
      throw new Error(`Invalid dimensions - width: ${input.width}, height: ${input.height}`);
    }

    // Validate tags
    if (input.tags) {
      log.debug('Processing tags array of', input.tags.length, 'tags');
      log.devDebug('Tags validation details', { 
        count: input.tags.length, 
        tags: input.tags,
        allStrings: input.tags.every(tag => typeof tag === 'string')
      });
      
      if (!Array.isArray(input.tags)) {
        throw new Error('tags must be an array');
      }
      
      if (!input.tags.every(tag => typeof tag === 'string')) {
        throw new Error('All tags must be strings');
      }
    }

    // Validate jsonTags
    if (input.jsonTags) {
      log.debug('Processing jsonTags object with', Object.keys(input.jsonTags).length, 'properties');
      log.devDebug('JsonTags validation details', { 
        type: typeof input.jsonTags,
        isObject: typeof input.jsonTags === 'object' && input.jsonTags !== null,
        keys: Object.keys(input.jsonTags),
        values: Object.values(input.jsonTags),
        stringified: JSON.stringify(input.jsonTags)
      });
      
      if (typeof input.jsonTags !== 'object' || input.jsonTags === null) {
        throw new Error('jsonTags must be a valid object');
      }
      
      try {
        JSON.stringify(input.jsonTags);
        log.debug('jsonTags validated as JSON-serializable');
      } catch (jsonError) {
        log.error('jsonTags is not JSON-serializable', jsonError);
        throw new Error('jsonTags must be JSON-serializable');
      }
    }

    const now = new Date().toISOString();
    
    // Workaround for Amplify Gen 2 JSON field issue - stringify jsonTags
    const createPayload = {
      ...input,
      jsonTags: input.jsonTags ? JSON.stringify(input.jsonTags) : undefined,
      created: now,
      lastUpdated: now,
    };
    
    log.devDebug('Final payload for GraphQL create', { 
      payload: createPayload,
      payloadStringified: JSON.stringify(createPayload, null, 2)
    });

    log.debug('Calling client.models.Image.create...');
    const result = await client.models.Image.create(createPayload);
    
    if (result.errors) {
      log.error('GraphQL errors returned', { 
        errors: result.errors,
        errorMessages: result.errors.map(e => e.message),
        fullResult: result
      });
      throw new Error(`Failed to create image: ${result.errors.map(e => e.message).join(', ')}`);
    }
    
    log.info('Image created successfully');
    
    if (!result.data) {
      throw new Error('Failed to create image: No data returned');
    }
    return result.data;
  } catch (error) {
    log.error('Exception in createImage', { 
      error,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      errorStack: error instanceof Error ? error.stack : undefined
    });
    log.devDebug('Failed createImage input data', { inputData: input });
    throw error;
  }
};

/**
 * Get an image record by ID
 * @param id - The unique identifier of the image
 * @returns Promise resolving to the image record or null if not found
 * @throws Error if retrieval fails
 */
export const getImage = async (id: string): Promise<Schema['Image']['type'] | null> => {
  try {
    const result = await client.models.Image.get({ id });
    
    if (result.errors) {
      throw new Error(`Failed to get image: ${result.errors.map(e => e.message).join(', ')}`);
    }
    
    return result.data ?? null;
  } catch (error) {
    log.error('Error getting image:', error);
    throw error;
  }
};

/**
 * List all images with optional limit
 * @param limit - Maximum number of images to return (default: 100)
 * @returns Promise resolving to an array of image records
 * @throws Error if retrieval fails
 */
export const listImages = async (limit?: number): Promise<Schema['Image']['type'][]> => {
  try {
    const result = await client.models.Image.list({
      limit: limit || 100,
    });
    
    if (result.errors) {
      throw new Error(`Failed to list images: ${result.errors.map(e => e.message).join(', ')}`);
    }
    
    return result.data ?? [];
  } catch (error) {
    log.error('Error listing images:', error);
    throw error;
  }
};

/**
 * Update an existing image record
 * @param id - The unique identifier of the image to update
 * @param updates - Partial image data to update
 * @returns Promise resolving to the updated image record
 * @throws Error if update fails
 */
export const updateImage = async (id: string, updates: Partial<CreateImageInput>): Promise<Schema['Image']['type']> => {
  try {
    const result = await client.models.Image.update({
      id,
      ...updates,
      lastUpdated: new Date().toISOString(),
    });
    
    if (result.errors) {
      throw new Error(`Failed to update image: ${result.errors.map(e => e.message).join(', ')}`);
    }
    
    if (!result.data) {
      throw new Error('Failed to update image: No data returned');
    }
    return result.data;
  } catch (error) {
    log.error('Error updating image:', error);
    throw error;
  }
};

/**
 * Delete an image record from the database
 * @param id - The unique identifier of the image to delete
 * @returns Promise resolving to the deleted image record
 * @throws Error if deletion fails
 */
export const deleteImage = async (id: string): Promise<Schema['Image']['type']> => {
  try {
    log.devDebug('Deleting image record', { imageId: id });

    const result = await client.models.Image.delete({ id });
    
    if (result.errors) {
      throw new Error(`Failed to delete image: ${result.errors.map(e => e.message).join(', ')}`);
    }
    
    if (!result.data) {
      throw new Error('Failed to delete image: No data returned');
    }
    return result.data;
  } catch (error) {
    log.error('Error deleting image:', error);
    throw error;
  }
};

// ============ THUMBNAIL OPERATIONS ============

/**
 * Input interface for creating a new thumbnail record
 */
export interface CreateThumbnailInput {
  imageId: string;
  s3Key: string;
  size?: ThumbnailSizeName; // Database enum constraint
}

/**
 * Create a new thumbnail record in the database
 * @param input - The thumbnail data to store
 * @returns Promise resolving to the created thumbnail record
 * @throws Error if creation fails
 */
export const createThumbnail = async (input: CreateThumbnailInput): Promise<Schema['Thumbnail']['type']> => {
  try {
    log.devDebug('Thumbnail input received', { 
      imageId: input.imageId, 
      size: input.size, 
      s3Key: input.s3Key,
      inputType: typeof input,
      fullInput: input
    });

    // Validate input
    if (!input.imageId) {
      throw new Error('imageId is required for thumbnail creation');
    }
    
    if (!input.s3Key) {
      throw new Error('s3Key is required for thumbnail creation');
    }
    
    if (!input.size) {
      throw new Error('size is required for thumbnail creation');
    }

    const now = new Date().toISOString();

    const thumbnailPayload = {
      ...input,
      created: now,
      lastUpdated: now,
    };
    
    log.devDebug('Creating thumbnail with payload', { payload: thumbnailPayload });

    log.debug('Calling client.models.Thumbnail.create for size', input.size);
    const result = await client.models.Thumbnail.create(thumbnailPayload);
    
    if (result.errors) {
      log.error('Thumbnail creation errors', { 
        errors: result.errors,
        errorMessages: result.errors.map(e => e.message)
      });
      throw new Error(`Failed to create thumbnail: ${result.errors.map(e => e.message).join(', ')}`);
    }
    
    log.info('Thumbnail created successfully');
    
    if (!result.data) {
      throw new Error('Failed to create thumbnail: No data returned');
    }
    return result.data;
  } catch (error) {
    log.error('Exception in createThumbnail', { 
      error,
      errorMessage: error instanceof Error ? error.message : 'Unknown error'
    });
    log.devDebug('Failed createThumbnail input data', { inputData: input });
    throw error;
  }
};

/**
 * Get a thumbnail record by ID
 * @param id - The unique identifier of the thumbnail
 * @returns Promise resolving to the thumbnail record or null if not found
 * @throws Error if retrieval fails
 */
export const getThumbnail = async (id: string): Promise<Schema['Thumbnail']['type'] | null> => {
  try {
    const result = await client.models.Thumbnail.get({ id });
    
    if (result.errors) {
      throw new Error(`Failed to get thumbnail: ${result.errors.map(e => e.message).join(', ')}`);
    }
    
    return result.data ?? null;
  } catch (error) {
    log.error('Error getting thumbnail:', error);
    throw error;
  }
};

/**
 * Get a specific thumbnail by image ID and size
 * @param imageId - The ID of the original image
 * @param size - The thumbnail size to retrieve
 * @returns Promise resolving to the thumbnail record or null if not found
 * @throws Error if retrieval fails
 */
export const getThumbnailBySize = async (imageId: string, size: ThumbnailSizeName): Promise<Schema['Thumbnail']['type'] | null> => {
  try {
    const result = await client.models.Thumbnail.list({
      filter: {
        imageId: {
          eq: imageId
        },
        size: {
          eq: size
        }
      }
    });
    
    if (result.errors) {
      throw new Error(`Failed to get thumbnail by size: ${result.errors.map(e => e.message).join(', ')}`);
    }
    
    return (result.data && result.data[0]) ? result.data[0] : null; // Return first match or null
  } catch (error) {
    log.error('Error getting thumbnail by size:', error);
    throw error;
  }
};

/**
 * Update an existing thumbnail record
 * @param id - The unique identifier of the thumbnail to update
 * @param updates - Partial thumbnail data to update
 * @returns Promise resolving to the updated thumbnail record
 * @throws Error if update fails
 */
export const updateThumbnail = async (id: string, updates: Partial<CreateThumbnailInput>): Promise<Schema['Thumbnail']['type']> => {
  try {
    const result = await client.models.Thumbnail.update({
      id,
      ...updates,
      lastUpdated: new Date().toISOString(),
    });
    
    if (result.errors) {
      throw new Error(`Failed to update thumbnail: ${result.errors.map(e => e.message).join(', ')}`);
    }
    
    if (!result.data) {
      throw new Error('Failed to update thumbnail: No data returned');
    }
    return result.data;
  } catch (error) {
    log.error('Error updating thumbnail:', error);
    throw error;
  }
};

/**
 * Get all thumbnails for multiple images at once (for all sizes)
 * @param imageIds - Array of image IDs to get thumbnails for
 * @returns Promise resolving to thumbnails grouped by imageId (array of thumbnails per image)
 * @throws Error if retrieval fails
 */
export const getThumbnailsForImages = async (imageIds: string[]): Promise<Record<string, Schema['Thumbnail']['type'][]>> => {
  try {
    // Get all thumbnails (we'll filter client-side since 'in' filter may not be available)
    const result = await client.models.Thumbnail.list({});
    if (result.errors) {
      throw new Error(`Failed to get thumbnails for images: ${result.errors.map(e => e.message).join(', ')}`);
    }
    // Group thumbnails by imageId for easy lookup, filtering for requested images
    const thumbnailsByImage: Record<string, Schema['Thumbnail']['type'][]> = {};
    (result.data ?? []).forEach(thumbnail => {
      if (thumbnail.imageId && imageIds.includes(thumbnail.imageId)) {
        if (!thumbnailsByImage[thumbnail.imageId]) {
          thumbnailsByImage[thumbnail.imageId] = [];
        }
        thumbnailsByImage[thumbnail.imageId].push(thumbnail);
      }
    });
    return thumbnailsByImage;
  } catch (error) {
    log.error('Error getting thumbnails for images:', error);
    throw error;
  }
};

/**
 * Delete a thumbnail record from the database
 * @param id - The unique identifier of the thumbnail to delete
 * @returns Promise resolving to the deleted thumbnail record
 * @throws Error if deletion fails
 */
export const deleteThumbnail = async (id: string): Promise<Schema['Thumbnail']['type']> => {
  try {
    log.devDebug('Deleting thumbnail record', { thumbnailId: id });

    const result = await client.models.Thumbnail.delete({ id });
    
    if (result.errors) {
      throw new Error(`Failed to delete thumbnail: ${result.errors.map(e => e.message).join(', ')}`);
    }
    
    if (!result.data) {
      throw new Error('Failed to delete thumbnail: No data returned');
    }
    return result.data;
  } catch (error) {
    log.error('Error deleting thumbnail:', error);
    throw error;
  }
};