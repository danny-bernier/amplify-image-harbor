'use client';

import { useState, useEffect } from 'react';
import { fetchAuthSession, getCurrentUser } from 'aws-amplify/auth';
import { logger } from '@/utils/logger';
import { listImages, getThumbnailBySize } from '@/services/dbService';
import { getFileUrl } from '@/services/s3Service';
import { THUMBNAIL_SIZES, ThumbnailSizeName } from '@/types/thumbnail';
import { GalleryImage } from '@/types/gallery';
import styles from './Gallery.module.css';
import ImageGrid from './ImageGrid';
import ImageInspector from './ImageInspector';
import FullscreenPreview from './FullscreenPreview';

// Create component-specific logger
const log = logger.forComponent('Gallery');

export default function Gallery() {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<GalleryImage | null>(null);
  const [isInspectorExpanded, setIsInspectorExpanded] = useState(false);
  const [isFullscreenOpen, setIsFullscreenOpen] = useState(false);
  const [loadingThumbnails, setLoadingThumbnails] = useState<Record<string, boolean>>({});

  // Load medium or large thumbnail on demand  
  const loadThumbnailOnDemand = async (imageId: string, size: ThumbnailSizeName) => {
    const cacheKey = `${imageId}-${size}`;
    if (loadingThumbnails[cacheKey]) return; // Already loading

    try {
      log.devDebug(`Loading ${size} thumbnail on-demand for image ${imageId}...`);
      setLoadingThumbnails(prev => ({ ...prev, [cacheKey]: true }));

      // Ensure user is authenticated
      const session = await fetchAuthSession();
      if (!session.tokens?.accessToken) {
        throw new Error('User not authenticated');
      }

      // Use direct database service to get thumbnail
      const thumbnailRecord = await getThumbnailBySize(imageId, size);

      if (!thumbnailRecord) {
        log.devWarn(`No ${size} thumbnail found for image ${imageId}`);
        return;
      }

      // Generate signed URL for the thumbnail
      const thumbnailUrl = await getFileUrl(thumbnailRecord.s3Key);

      const thumbnailData = {
        s3Key: thumbnailRecord.s3Key,
        url: thumbnailUrl
      };

      log.devDebug(`Successfully loaded ${size} thumbnail for image ${imageId} via direct service calls`);

      // Update the specific image with the loaded thumbnail
      setImages(prevImages =>
        prevImages.map(img => {
          if (img.id === imageId) {
            const updatedImg = { ...img };
            if (size === THUMBNAIL_SIZES.MEDIUM.name) {
              updatedImg.mediumThumbnail = { s3Key: thumbnailData.s3Key, url: thumbnailData.url };
            } else {
              updatedImg.largeThumbnail = { s3Key: thumbnailData.s3Key, url: thumbnailData.url };
            }
            return updatedImg;
          }
          return img;
        })
      );
    } catch (error) {
      log.devWarn(`Failed to load ${size} thumbnail for image ${imageId}:`, error);
    } finally {
      setLoadingThumbnails(prev => ({ ...prev, [cacheKey]: false }));
    }
  };

  useEffect(() => {
    const fetchImages = async () => {
      try {
        setLoading(true);

        // Wait a bit for authentication to stabilize
        await new Promise(resolve => setTimeout(resolve, 500));

        // Double-check authentication status
        log.devDebug('Checking current user...');
        const currentUser = await getCurrentUser();
        log.devDebug('Current user:', { userId: currentUser?.userId });

        // Get authentication session to ensure user is authenticated
        log.devDebug('Fetching auth session...');
        const session = await fetchAuthSession();
        log.devDebug('Auth session:', { hasTokens: !!session.tokens });

        if (!session.tokens?.accessToken) {
          log.error('No auth token found in session');
          setError('Please sign in to view your images');
          return;
        }

        log.devDebug('User authenticated, fetching images directly from database...');

        // Use direct database service call instead of API
        const dbImages = await listImages(50);
        log.devDebug('Database images fetched:', { count: dbImages.length });

        // Convert database images to gallery format with URLs
        const galleryImages: GalleryImage[] = await Promise.all(
          dbImages.map(async (dbImage) => {
            // Generate signed URL for original image
            const imageUrl = await getFileUrl(dbImage.s3Key);

            // Try to get small thumbnail for each image
            let smallThumbnail: { s3Key: string; url: string } | null = null;
            try {
              const thumbnailRecord = await getThumbnailBySize(dbImage.id, THUMBNAIL_SIZES.SMALL.name);
              if (thumbnailRecord) {
                const thumbnailUrl = await getFileUrl(thumbnailRecord.s3Key);
                smallThumbnail = {
                  s3Key: thumbnailRecord.s3Key,
                  url: thumbnailUrl
                };
              }
            } catch (error) {
              log.devWarn(`No small thumbnail found for image ${dbImage.id}:`, error);
            }

            return {
              id: dbImage.id,
              title: dbImage.title,
              description: dbImage.description,
              s3Key: dbImage.s3Key,
              url: imageUrl,
              width: dbImage.width,
              height: dbImage.height,
              tags: dbImage.tags?.filter(tag => tag !== null) || null,
              created: dbImage.createdAt,
              lastUpdated: dbImage.updatedAt,
              smallThumbnail
            };
          })
        );

        setImages(galleryImages);
        setError(null);

        log.devDebug(`Loaded ${galleryImages.length} images with URLs via direct service calls`);
      } catch (err: any) {
        log.error('Error fetching images:', err);
        
        // Handle specific authentication errors
        if (err.name === 'NotAuthorizedException' || err.message?.includes('not authorized')) {
          setError('Authentication failed. Please sign in to continue.');
        } else if (err.name === 'NetworkError' || err.message?.includes('network')) {
          setError('Network error. Please check your connection and try again.');
        } else {
          setError('Failed to load images. Please try again.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchImages();
  }, []);

  if (loading) {
    return (
      <div className="w-full p-4">
        <h1 className="heading-primary">Image Gallery</h1>
        <div className="flex justify-center items-center h-64">
          <div className="text-secondary">Loading images...</div>
        </div>
      </div>
    );
  }

  if (error) {
    const isAuthError = error.includes('Authentication failed') || error.includes('sign in');
    
    return (
      <div className="w-full p-4">
        <h1 className="heading-primary">Image Gallery</h1>
        <div className="flex justify-center items-center h-64">
          <div className="text-caption text-center">
            <p>{error}</p>
            <div className="mt-4 space-x-2">
              {isAuthError ? (
                <button
                  onClick={() => window.location.href = '/'}
                  className="btn-primary"
                >
                  Go to Sign In
                </button>
              ) : (
                <button
                  onClick={() => window.location.reload()}
                  className="btn-primary"
                >
                  Retry
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (images.length === 0) {
    return (
      <div className="w-full p-4">
        <h1 className="heading-primary">Image Gallery</h1>
        <div className="flex justify-center items-center h-64">
          <div className="text-caption text-center">
            <p>No images found.</p>
            <p className="mt-2">Upload some images to get started!</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${styles.container} ${selectedImage ? styles.hasSelection : ''}`}>
      {/* Image Grid Area - Uses ImageGrid component */}
      <div className={styles.top}>
        <ImageGrid
          images={images}
          selectedImage={selectedImage}
          onImageSelect={(image) => {
            setSelectedImage(image);
            setIsInspectorExpanded(false);
          }}
        />
      </div>
      
      {/* Inspector Area - Uses ImageInspector component */}
      {selectedImage && (
        <div className={styles.bottom}>
          <ImageInspector
            image={selectedImage}
            isInspectorExpanded={isInspectorExpanded}
            onToggleInfo={() => setIsInspectorExpanded(!isInspectorExpanded)}
            onClose={() => {
              setSelectedImage(null);
              setIsInspectorExpanded(false);
            }}
            onFullscreen={() => setIsFullscreenOpen(true)}
            onLoadThumbnail={loadThumbnailOnDemand}
          />
        </div>
      )}

      {/* Fullscreen Preview */}
      {selectedImage && (
        <FullscreenPreview
          image={selectedImage}
          isOpen={isFullscreenOpen}
          onClose={() => setIsFullscreenOpen(false)}
          onLoadThumbnail={loadThumbnailOnDemand}
        />
      )}
    </div>
  );
}