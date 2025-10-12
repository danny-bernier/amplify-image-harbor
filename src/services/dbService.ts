import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../amplify/data/resource';

// Generate the typed client
const client = generateClient<Schema>();

// ============ IMAGE OPERATIONS ============

export interface CreateImageInput {
  title?: string;
  description?: string;
  width: number;
  height: number;
  s3Key: string;
  tags?: string[];
}

export const createImage = async (input: CreateImageInput) => {
  try {
    const now = new Date().toISOString();
    const result = await client.models.Image.create({
      ...input,
      created: now,
      lastUpdated: now,
    });
    
    if (result.errors) {
      throw new Error(`Failed to create image: ${result.errors.map(e => e.message).join(', ')}`);
    }
    
    return result.data;
  } catch (error) {
    console.error('Error creating image:', error);
    throw error;
  }
};

export const getImage = async (id: string) => {
  try {
    const result = await client.models.Image.get({ id });
    
    if (result.errors) {
      throw new Error(`Failed to get image: ${result.errors.map(e => e.message).join(', ')}`);
    }
    
    return result.data;
  } catch (error) {
    console.error('Error getting image:', error);
    throw error;
  }
};

export const listImages = async (limit?: number) => {
  try {
    const result = await client.models.Image.list({
      limit: limit || 100,
    });
    
    if (result.errors) {
      throw new Error(`Failed to list images: ${result.errors.map(e => e.message).join(', ')}`);
    }
    
    return result.data;
  } catch (error) {
    console.error('Error listing images:', error);
    throw error;
  }
};

export const updateImage = async (id: string, updates: Partial<CreateImageInput>) => {
  try {
    const result = await client.models.Image.update({
      id,
      ...updates,
      lastUpdated: new Date().toISOString(),
    });
    
    if (result.errors) {
      throw new Error(`Failed to update image: ${result.errors.map(e => e.message).join(', ')}`);
    }
    
    return result.data;
  } catch (error) {
    console.error('Error updating image:', error);
    throw error;
  }
};

export const deleteImage = async (id: string) => {
  try {
    const result = await client.models.Image.delete({ id });
    
    if (result.errors) {
      throw new Error(`Failed to delete image: ${result.errors.map(e => e.message).join(', ')}`);
    }
    
    return result.data;
  } catch (error) {
    console.error('Error deleting image:', error);
    throw error;
  }
};

// ============ EDITED OPERATIONS ============

export interface CreateEditedInput {
  imageId: string;
  s3Key: string;
  width: number;
  height: number;
}

export const createEdited = async (input: CreateEditedInput) => {
  try {
    const now = new Date().toISOString();
    const result = await client.models.Edited.create({
      ...input,
      created: now,
      lastUpdated: now,
    });
    
    if (result.errors) {
      throw new Error(`Failed to create edited: ${result.errors.map(e => e.message).join(', ')}`);
    }
    
    return result.data;
  } catch (error) {
    console.error('Error creating edited:', error);
    throw error;
  }
};

export const getEdited = async (id: string) => {
  try {
    const result = await client.models.Edited.get({ id });
    
    if (result.errors) {
      throw new Error(`Failed to get edited: ${result.errors.map(e => e.message).join(', ')}`);
    }
    
    return result.data;
  } catch (error) {
    console.error('Error getting edited:', error);
    throw error;
  }
};

export const listEditedByOriginal = async (imageId: string) => {
  try {
    const result = await client.models.Edited.list({
      filter: {
        imageId: {
          eq: imageId
        }
      }
    });
    
    if (result.errors) {
      throw new Error(`Failed to list edited: ${result.errors.map(e => e.message).join(', ')}`);
    }
    
    return result.data;
  } catch (error) {
    console.error('Error listing edited:', error);
    throw error;
  }
};

export const updateEdited = async (id: string, updates: Partial<CreateEditedInput>) => {
  try {
    const result = await client.models.Edited.update({
      id,
      ...updates,
      lastUpdated: new Date().toISOString(),
    });
    
    if (result.errors) {
      throw new Error(`Failed to update edited: ${result.errors.map(e => e.message).join(', ')}`);
    }
    
    return result.data;
  } catch (error) {
    console.error('Error updating edited:', error);
    throw error;
  }
};

export const deleteEdited = async (id: string) => {
  try {
    const result = await client.models.Edited.delete({ id });
    
    if (result.errors) {
      throw new Error(`Failed to delete edited: ${result.errors.map(e => e.message).join(', ')}`);
    }
    
    return result.data;
  } catch (error) {
    console.error('Error deleting edited:', error);
    throw error;
  }
};

// ============ THUMBNAIL OPERATIONS ============

export interface CreateThumbnailInput {
  imageId: string;
  s3Key: string;
  size?: 'small' | 'medium' | 'large';
}

export const createThumbnail = async (input: CreateThumbnailInput) => {
  try {
    const now = new Date().toISOString();
    const result = await client.models.Thumbnail.create({
      ...input,
      created: now,
      lastUpdated: now,
    });
    
    if (result.errors) {
      throw new Error(`Failed to create thumbnail: ${result.errors.map(e => e.message).join(', ')}`);
    }
    
    return result.data;
  } catch (error) {
    console.error('Error creating thumbnail:', error);
    throw error;
  }
};

export const getThumbnail = async (id: string) => {
  try {
    const result = await client.models.Thumbnail.get({ id });
    
    if (result.errors) {
      throw new Error(`Failed to get thumbnail: ${result.errors.map(e => e.message).join(', ')}`);
    }
    
    return result.data;
  } catch (error) {
    console.error('Error getting thumbnail:', error);
    throw error;
  }
};

export const getThumbnailBySize = async (imageId: string, size: 'small' | 'medium' | 'large') => {
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
    
    return result.data[0] || null; // Return first match or null
  } catch (error) {
    console.error('Error getting thumbnail by size:', error);
    throw error;
  }
};

export const updateThumbnail = async (id: string, updates: Partial<CreateThumbnailInput>) => {
  try {
    const result = await client.models.Thumbnail.update({
      id,
      ...updates,
      lastUpdated: new Date().toISOString(),
    });
    
    if (result.errors) {
      throw new Error(`Failed to update thumbnail: ${result.errors.map(e => e.message).join(', ')}`);
    }
    
    return result.data;
  } catch (error) {
    console.error('Error updating thumbnail:', error);
    throw error;
  }
};

export const deleteThumbnail = async (id: string) => {
  try {
    const result = await client.models.Thumbnail.delete({ id });
    
    if (result.errors) {
      throw new Error(`Failed to delete thumbnail: ${result.errors.map(e => e.message).join(', ')}`);
    }
    
    return result.data;
  } catch (error) {
    console.error('Error deleting thumbnail:', error);
    throw error;
  }
};