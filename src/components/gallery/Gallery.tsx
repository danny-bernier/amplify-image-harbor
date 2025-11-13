/**
 * @fileoverview Main gallery component for displaying and managing image collections
 * Provides image grid display, single/multi-selection modes, thumbnails loading,
 * and integration with image inspector components.
 * 
 * @author Danny Bernier
 * @version 1.0.0
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchAuthSession, getCurrentUser } from 'aws-amplify/auth';
import { logger } from '@/utils/logger';
import { listImages, getThumbnailBySize } from '@/services/dbService';
import { getFileUrl } from '@/services/s3Service';
import { THUMBNAIL_SIZES, ThumbnailSizeName } from '@/types/thumbnail';
import { GalleryImage } from '@/types/gallery';
import styles from './Gallery.module.css';
import ImageGrid from './ImageGrid';
import { ImageInspector } from './image-inspector';
import FullscreenPreview from './FullscreenPreview';

// Create component-specific logger
const log = logger.forComponent('Gallery');

export default function Gallery() {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<GalleryImage | null>(null);
  const [selectedImages, setSelectedImages] = useState<GalleryImage[]>([]);
  const [isFullscreenOpen, setIsFullscreenOpen] = useState(false);
  const [loadingThumbnails, setLoadingThumbnails] = useState<Record<string, boolean>>({});
  const [splitRatio, setSplitRatio] = useState(50); // Percentage for top panel
  const [isDragging, setIsDragging] = useState(false);

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

            // Parse jsonTags if it exists (it's stored as a JSON string in the database)
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

            return {
              id: dbImage.id,
              title: dbImage.title,
              description: dbImage.description,
              s3Key: dbImage.s3Key,
              url: imageUrl,
              width: dbImage.width,
              height: dbImage.height,
              tags: dbImage.tags?.filter(tag => tag !== null) || null,
              jsonTags: parsedJsonTags,
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

  // Multi-selection handlers
  const handleImageSelect = (image: GalleryImage, isMultiSelect: boolean = false) => {
    if (isMultiSelect) {
      // Starting multi-selection or adding to existing multi-selection
      setSelectedImages(prev => {
        // If we have no multi-selection yet but have a single selection, start with that
        if (prev.length === 0 && selectedImage) {
          const isClickingSameAsSelected = selectedImage.id === image.id;
          if (isClickingSameAsSelected) {
            // Ctrl+clicking the same selected image should deselect it
            return [];
          } else {
            // Start multi-selection with previously selected image + new image
            return [selectedImage, image];
          }
        }
        
        // Normal multi-selection toggle behavior
        const isAlreadySelected = prev.some(img => img.id === image.id);
        if (isAlreadySelected) {
          return prev.filter(img => img.id !== image.id);
        } else {
          return [...prev, image];
        }
      });
      // Clear single selection when we start multi-selecting
      setSelectedImage(null);
    } else {
      // Single selection mode
      if (selectedImages.length > 0) {
        // If we have multi-selection, clear it and select single image
        setSelectedImages([]);
        setSelectedImage(image);
      } else {
        // Normal single selection - toggle behavior
        if (selectedImage?.id === image.id) {
          setSelectedImage(null);
        } else {
          setSelectedImage(image);
        }
      }
    }
  };

  const handleClearSelection = () => {
    setSelectedImages([]);
    setSelectedImage(null);
  };

  const handleShareImages = (images: GalleryImage[]) => {
    // Placeholder for share functionality
    console.log('Share images:', images);
  };

  const handleDeleteImages = (images: GalleryImage[]) => {
    // Placeholder for delete functionality  
    console.log('Delete images:', images);
  };

  // Navigation handlers for single image inspection
  const handlePreviousImage = () => {
    if (!selectedImage) return;
    
    const currentIndex = images.findIndex(img => img.id === selectedImage.id);
    if (currentIndex > 0) {
      setSelectedImage(images[currentIndex - 1]);
    }
  };

  const handleNextImage = () => {
    if (!selectedImage) return;
    
    const currentIndex = images.findIndex(img => img.id === selectedImage.id);
    if (currentIndex < images.length - 1) {
      setSelectedImage(images[currentIndex + 1]);
    }
  };

  // Drag handlers for resizable splitter
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !containerRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const mouseY = e.clientY - containerRect.top;
    const newRatio = (mouseY / containerRect.height) * 100;
    
    // Constrain between 15% and 85%
    const constrainedRatio = Math.max(15, Math.min(85, newRatio));
    setSplitRatio(constrainedRatio);
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

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

  const hasAnySelection = selectedImage || selectedImages.length > 0;

  return (
    <div 
      ref={containerRef}
      className={`${styles.container} ${hasAnySelection ? styles.hasSelection : ''}`}
      style={hasAnySelection ? {
        '--top-height': `${splitRatio}%`,
        '--bottom-height': `${100 - splitRatio}%`
      } as React.CSSProperties : {}}
    >
      {/* Image Grid Area - Uses ImageGrid component */}
      <div className={styles.top}>
        <ImageGrid
          images={images}
          selectedImage={selectedImage}
          selectedImages={selectedImages}
          onImageSelect={handleImageSelect}
          onLoadThumbnail={loadThumbnailOnDemand}
        />
      </div>
      
      {/* Resizable Splitter - Shows for both single and multi-image selection */}
      {(selectedImage && selectedImages.length === 0) || selectedImages.length > 0 ? (
        <div 
          className={`${styles.splitter} ${isDragging ? styles.splitterDragging : ''}`}
          onMouseDown={handleMouseDown}
        >
          <div className={styles.splitterHandle}>
            <svg className={styles.splitterIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h8M8 8h8M8 16h8" />
            </svg>
          </div>
        </div>
      ) : null}
      
      {/* Inspector Area - Uses unified ImageInspector component */}
      {(selectedImages.length > 0 || selectedImage) && (
        <div className={styles.bottom}>
          <ImageInspector
            selectedImages={selectedImages.length > 0 ? selectedImages : selectedImage ? [selectedImage] : []}
            onClose={handleClearSelection}
            onShare={handleShareImages}
            onDelete={handleDeleteImages}
            onPrevious={selectedImage ? handlePreviousImage : undefined}
            onNext={selectedImage ? handleNextImage : undefined}
          />
        </div>
      )}

      {/* Fullscreen Preview */}
      {selectedImage && (
        <FullscreenPreview
          image={selectedImage}
          isOpen={isFullscreenOpen}
          onClose={() => setIsFullscreenOpen(false)}
        />
      )}
    </div>
  );
}