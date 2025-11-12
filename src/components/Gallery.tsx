'use client';

import Image from 'next/image';
import { useState, useEffect } from 'react';
import { fetchAuthSession } from 'aws-amplify/auth';
import { logger } from '@/utils/logger';
import { listImages, getThumbnailBySize } from '@/services/dbService';
import { getFileUrl } from '@/services/s3Service';

// Create component-specific logger
const log = logger.forComponent('Gallery');

interface GalleryImage {
  id: string;
  title: string | null | undefined;
  description: string | null | undefined;
  s3Key: string;
  url: string;
  width: number;
  height: number;
  tags: string[] | null | undefined;
  created: string | null | undefined;
  lastUpdated: string | null | undefined;
  smallThumbnail: { s3Key: string; url: string } | null;
  // Medium and large thumbnails loaded on-demand
  mediumThumbnail?: { s3Key: string; url: string } | null;
  largeThumbnail?: { s3Key: string; url: string } | null;
}

export default function Gallery() {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<GalleryImage | null>(null);
  const [isInspectorExpanded, setIsInspectorExpanded] = useState(false);
  const [isFullscreenOpen, setIsFullscreenOpen] = useState(false);
  const [loadingThumbnails, setLoadingThumbnails] = useState<Record<string, boolean>>({});

  // Helper function to format dates
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'Unknown';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Invalid date';
    }
  };

  // Load medium or large thumbnail on demand
  const loadThumbnailOnDemand = async (imageId: string, size: 'MEDIUM' | 'LARGE') => {
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
            if (size === 'MEDIUM') {
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

  // Fullscreen Modal Component
  const FullscreenModal = ({ image }: { image: GalleryImage }) => {
    // Load large thumbnail when fullscreen opens
    useEffect(() => {
      if (!image.largeThumbnail) {
        loadThumbnailOnDemand(image.id, 'LARGE');
      }
    }, [image.id]);

    return (
      <div className="fullscreen-modal" onClick={() => setIsFullscreenOpen(false)}>
        <div className="fullscreen-content" onClick={(e) => e.stopPropagation()}>
          <button 
            onClick={() => setIsFullscreenOpen(false)}
            className="fullscreen-close-btn"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          
          <Image
            src={image.largeThumbnail?.url || image.url}
            alt={image.description || image.title || 'Fullscreen image'}
            width={image.width}
            height={image.height}
            className="fullscreen-image"
            unoptimized
          />
        </div>
      </div>
    );
  };

  // Inspector Pane Component
  const ImageInspector = ({ image }: { image: GalleryImage }) => {
    // Load medium thumbnail when inspector opens
    useEffect(() => {
      if (!image.mediumThumbnail) {
        loadThumbnailOnDemand(image.id, 'MEDIUM');
      }
    }, [image.id]);

    return (
      <div className={`inspector-panel ${isInspectorExpanded ? 'expanded' : ''}`}>
        <div className="inspector-header">
          <h2 className="heading-secondary">{image.title || 'Untitled Image'}</h2>
          <div className="flex items-center gap-2">
            {/* Expand/Collapse Arrow - only show in bottom panel mode */}
            <button 
              onClick={() => setIsInspectorExpanded(!isInspectorExpanded)}
              className="inspector-expand-btn lg:landscape:hidden"
              title={isInspectorExpanded ? 'Collapse panel' : 'Expand panel'}
            >
              <svg 
                className={`w-5 h-5 transition-transform duration-200 ${isInspectorExpanded ? 'rotate-180' : ''}`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            </button>
            
            <button 
              onClick={() => {
                setSelectedImage(null);
                setIsInspectorExpanded(false);
              }}
              className="inspector-close-btn"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        
        <div className="inspector-content-wrapper">
          {/* Image Preview - takes most space */}
          <div className="inspector-image-container">
            <Image
              src={image.mediumThumbnail?.url || image.url}
              alt={image.description || image.title || 'Image preview'}
              width={image.width}
              height={image.height}
              className={`inspector-image ${!isInspectorExpanded ? 'cursor-pointer' : ''}`}
              onClick={!isInspectorExpanded ? () => setIsFullscreenOpen(true) : undefined}
              unoptimized
            />
          </div>
        
        {/* Description - fixed space below image, only in collapsed mode */}
        {!isInspectorExpanded && image.description && (
          <div className="inspector-description-compact">
            <p className="text-caption">{image.description}</p>
          </div>
        )}
        
        {/* Full description and detailed information - only visible when expanded */}
        <div className={`inspector-details ${isInspectorExpanded ? 'visible' : 'hidden'}`}>
          {/* Description in expanded mode */}
          {image.description && (
            <div className="inspector-section">
              <h3 className="text-primary mb-2">Description</h3>
              <p className="text-caption">{image.description}</p>
            </div>
          )}
          
          {/* Basic Info */}
          <div className="inspector-section">
            <h3 className="text-primary mb-2">Image Details</h3>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-secondary font-medium">Dimensions:</span>
                <span className="ml-2">{image.width} × {image.height} pixels</span>
              </div>
              <div>
                <span className="text-secondary font-medium">Aspect Ratio:</span>
                <span className="ml-2">{(image.width / image.height).toFixed(2)}:1</span>
              </div>
              <div>
                <span className="text-secondary font-medium">Created:</span>
                <span className="ml-2">{formatDate(image.created)}</span>
              </div>
              <div>
                <span className="text-secondary font-medium">Last Updated:</span>
                <span className="ml-2">{formatDate(image.lastUpdated)}</span>
              </div>
            </div>
          </div>

          {/* Tags */}
          {image.tags && image.tags.length > 0 && (
            <div className="inspector-section">
              <h3 className="text-primary mb-2">Tags</h3>
              <div className="flex flex-wrap gap-2">
                {image.tags.map((tag, index) => (
                  <span key={index} className="tag-item">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* File Info */}
          <div className="inspector-section">
            <h3 className="text-primary mb-2">File Information</h3>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-secondary font-medium">S3 Key:</span>
                <span className="ml-2 font-mono text-xs break-all">{image.s3Key}</span>
              </div>
              <div>
                <span className="text-secondary font-medium">Image ID:</span>
                <span className="ml-2 font-mono text-xs">{image.id}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

  useEffect(() => {
    const fetchImages = async () => {
      try {
        setLoading(true);
        
        // Get authentication session to ensure user is authenticated
        log.devDebug('Fetching auth session...');
        const session = await fetchAuthSession();
        log.devDebug('Auth session:', { hasTokens: !!session.tokens });
        
        if (!session.tokens?.accessToken) {
          log.error('No auth token found in session');
          setError('User not authenticated');
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
              const thumbnailRecord = await getThumbnailBySize(dbImage.id, 'SMALL');
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
      } catch (err) {
        log.error('Error fetching images:', err);
        setError('Failed to load images. Please try again.');
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
    return (
      <div className="w-full p-4">
        <h1 className="heading-primary">Image Gallery</h1>
        <div className="flex justify-center items-center h-64">
          <div className="text-caption text-center">
            <p>{error}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="btn-primary mt-4"
            >
              Retry
            </button>
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
    <div className="gallery-container">
      <div className="gallery-main">
        <h1 className="heading-primary">Image Gallery</h1>
        <p className="text-caption mb-6">{images.length} image{images.length !== 1 ? 's' : ''} found</p>
        
        <div className="gallery-grid">
          {images.map((image) => (
            <div 
              key={image.id} 
              className={`gallery-item cursor-pointer ${selectedImage?.id === image.id ? 'selected' : ''}`}
              onClick={() => {
                if (selectedImage?.id === image.id) {
                  setSelectedImage(null);
                  setIsInspectorExpanded(false);
                } else {
                  setSelectedImage(image);
                  setIsInspectorExpanded(false); // Reset to collapsed when selecting new image
                }
              }}
            >
              <Image
                src={image.smallThumbnail?.url || image.url}
                alt={image.description || image.title || 'Uploaded image'}
                width={150}
                height={150}
                className="w-full h-32 object-cover rounded"
                unoptimized // For S3 URLs
              />
              <div className="mt-2">
                {image.title && (
                  <p className="text-caption font-medium truncate">
                    {image.title}
                  </p>
                )}
                {image.description && (
                  <p className="text-caption opacity-75 text-xs mt-1 line-clamp-2">
                    {image.description}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Inspector Panel */}
      {selectedImage && (
        <ImageInspector image={selectedImage} />
      )}
      
      {/* Fullscreen Modal */}
      {selectedImage && isFullscreenOpen && (
        <FullscreenModal image={selectedImage} />
      )}
    </div> 
  );
}