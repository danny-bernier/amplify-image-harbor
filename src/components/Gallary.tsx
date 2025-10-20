'use client';

import Image from 'next/image';
import { useState, useEffect } from 'react';
import { listImages, getSmallThumbnailsForImages, getThumbnailBySize } from '@/services/dbService';
import { getFileUrl } from '@/services/s3Service';

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
      console.log(`Loading ${size} thumbnail on-demand for image ${imageId}...`);
      setLoadingThumbnails(prev => ({ ...prev, [cacheKey]: true }));
      
      const thumbnailData = await getThumbnailBySize(imageId, size);
      if (thumbnailData) {
        const thumbnailUrl = await getFileUrl(thumbnailData.s3Key);
        console.log(`Successfully loaded ${size} thumbnail for image ${imageId}`);
        
        // Update the specific image with the loaded thumbnail
        setImages(prevImages => 
          prevImages.map(img => {
            if (img.id === imageId) {
              const updatedImg = { ...img };
              if (size === 'MEDIUM') {
                updatedImg.mediumThumbnail = { s3Key: thumbnailData.s3Key, url: thumbnailUrl };
              } else {
                updatedImg.largeThumbnail = { s3Key: thumbnailData.s3Key, url: thumbnailUrl };
              }
              return updatedImg;
            }
            return img;
          })
        );
      } else {
        console.warn(`No ${size} thumbnail found for image ${imageId}`);
      }
    } catch (error) {
      console.warn(`Failed to load ${size} thumbnail for image ${imageId}:`, error);
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
        
        // Fetch images from database
        const imageData = await listImages(50); // Limit to 50 for now TODO: pagination or auto-load on scroll etc...
        
        // Get only small thumbnails for all images in one batch call (for gallery grid)
        const imageIds = imageData.map(img => img.id);
        console.log(`Loading small thumbnails for ${imageIds.length} images...`);
        const smallThumbnailsByImage = await getSmallThumbnailsForImages(imageIds);
        console.log(`Loaded ${Object.keys(smallThumbnailsByImage).length} small thumbnails`);
        
        // Get signed URLs for each image and their small thumbnails
        const imagesWithUrls = await Promise.all(
          imageData.map(async (img) => {
            try {
              // Get original image URL
              const url = await getFileUrl(img.s3Key);
              
              // Get small thumbnail for this image from the batch result
              const smallThumbnailData = smallThumbnailsByImage[img.id] || null;
              
              // Get URL for small thumbnail if available
              const smallThumbnail = smallThumbnailData ? {
                s3Key: smallThumbnailData.s3Key,
                url: await getFileUrl(smallThumbnailData.s3Key).catch((err) => {
                  console.warn(`Failed to get small thumbnail URL for ${img.title}:`, err);
                  return '';
                })
              } : null;
              
              return {
                id: img.id,
                title: img.title,
                description: img.description,
                s3Key: img.s3Key,
                url,
                width: img.width,
                height: img.height,
                tags: img.tags,
                created: img.created,
                lastUpdated: img.lastUpdated,
                smallThumbnail,
              };
            } catch (urlError) {
              console.error(`Failed to get URL for ${img.s3Key}:`, urlError);
              return null;
            }
          })
        );
        
        // Filter out any images that failed to get URLs
        const validImages = imagesWithUrls.filter((img) => img !== null) as GalleryImage[];
        setImages(validImages);
        setError(null);
      } catch (err) {
        console.error('Error fetching images:', err);
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