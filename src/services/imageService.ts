
import { HarborImage, S3Image, THUMBNAIL_SIZES, ThumbnailData, ThumbnailSizeKey } from '@/types/images';
import { getThumbnailsForImages } from '@/services/dbService';
import { logger } from '@/utils/logger';

const log = logger.forComponent('imageService');

/**
 * Retrieves thumbnail data for a list of Harbor images.
 * @param images Array of HarborImage objects to retrieve thumbnails for.
 * @returns A promise that resolves to a record mapping image IDs to their thumbnail data.
 */
export async function getThumbnailDataForImages(images: HarborImage[]): Promise<Record<string, ThumbnailData[]>> {
    log.debug(`Fetching thumbnails for ${images.length} images`);
    let thumbnailData: Record<string, ThumbnailData[]> = {};

    getThumbnailsForImages(images.map(img => img.id)).then(dbThumbnailsMap => {
        log.debug(`Fetched thumbnails for ${images.length} images`);
        for (const image of images) {
            log.devDebug(`Processing thumbnails for image ${image.id}`);
            const dbThumbnails = dbThumbnailsMap[image.id] || {};
            thumbnailData[image.id] = Object.entries(dbThumbnails).map(([sizeKey, dbThumbnail]) => ({
                size: THUMBNAIL_SIZES[sizeKey as ThumbnailSizeKey],
                thumbnailId: dbThumbnail.id,
                image: new S3Image({ s3Key: dbThumbnail.s3Key, url: null })
            }));
            log.devDebug(`Processed ${thumbnailData[image.id].length} thumbnails for image ${image.id}`);
        }
    });
    
    log.debug(`Completed fetching thumbnails for ${images.length} images`);
    return thumbnailData;
}

/**
 * Converts an array of database image objects to HarborImage objects.
 * @param dbImages Array of database image objects.
 * @returns Promise that resolves to an array of HarborImage objects.
 */
export async function getHarborImagesFromDbImages(dbImages: any[]): Promise<HarborImage[]> {

  // fetch thumbnails for all images in batch
  const thumbnailsPromise: Promise<Record<string, ThumbnailData[]>> = getThumbnailDataForImages(dbImages.map(img => img.id));
  const harborImages: Record<string, HarborImage> = {};

  for (const dbImage of dbImages) {
    
    log.devDebug(`Converting DB image ${dbImage.id} to HarborImage`);
    let parsedJsonTags: Record<string, any> | null = null;
    if (dbImage.jsonTags) {
      try {
        parsedJsonTags = typeof dbImage.jsonTags === 'string'
          ? JSON.parse(dbImage.jsonTags)
          : dbImage.jsonTags;
      } catch (error) {
        log.devWarn(`Failed to parse jsonTags for image ${dbImage.id}:`, error);
      }
    }
    log.devDebug(`Parsed jsonTags for image ${dbImage.id}:`, parsedJsonTags 
        && parsedJsonTags.length > 50 ? parsedJsonTags.slice(0, 50) + '...' : parsedJsonTags);

    let harborImage: HarborImage = {
      id: dbImage.id,
      s3image: new S3Image({ s3Key: dbImage.s3Key, url: null }),
      thumbnails: null,
      title: dbImage.title,
      description: dbImage.description,
      width: dbImage.width,
      height: dbImage.height,
      tags: dbImage.tags?.filter((tag: string | null) => tag !== null) || null,
      jsonTags: parsedJsonTags,
      created: dbImage.createdAt,
      lastUpdated: dbImage.updatedAt,
    };

    log.devDebug(`Converted DB image ${dbImage.id} to HarborImage`, harborImage);
    harborImages[dbImage.id] = harborImage;
  }

  log.debug('Awaiting thumbnail data for HarborImages...');
  const thumbnailsMap: Record<string, ThumbnailData[]> = await thumbnailsPromise;

  log.debug(`Received ${Object.keys(thumbnailsMap).length} thumbnail data for HarborImages.`);
  for (const dbImage of dbImages) {
    const thumbnails = thumbnailsMap[dbImage.id] || [];
    const harborImage = harborImages[dbImage.id];
    if (harborImage) {
      harborImage.thumbnails = Object.fromEntries(
        Object.keys(THUMBNAIL_SIZES).map(key => [
          key,
          thumbnails.find(t => t.size.name === key) || null
        ])
      ) as { SMALL: ThumbnailData | null; MEDIUM: ThumbnailData | null; LARGE: ThumbnailData | null };
    }
    log.devDebug(`Assigned thumbnails to HarborImage ${dbImage.id}`, harborImage.thumbnails);
  }

  log.debug(`Completed processing thumbnails for ${Object.keys(harborImages).length} HarborImages.`);
  return Object.values(harborImages);
}