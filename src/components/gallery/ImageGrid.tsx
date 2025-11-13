'use client';

import Image from 'next/image';
import { useEffect, useRef, useState, useCallback } from 'react';
import { ImageGridProps } from '@/types/gallery';
import { THUMBNAIL_SIZES, ThumbnailSizeName } from '@/types/thumbnail';
import styles from './ImageGrid.module.css';

export default function ImageGrid({ images, selectedImage, onImageSelect, onLoadThumbnail }: ImageGridProps) {
  const gridRef = useRef<HTMLDivElement>(null);
  const [_, setContainerWidth] = useState(0);
  const [optimalThumbnailSizes, setOptimalThumbnailSizes] = useState<Record<string, ThumbnailSizeName>>({});

  // Calculate optimal thumbnail size based on display dimensions
  const getOptimalThumbnailSize = useCallback((displayWidth: number): ThumbnailSizeName => {
    // Add some buffer for high DPI displays (multiply by device pixel ratio)
    const targetWidth = displayWidth * (window.devicePixelRatio || 1);
    
    if (targetWidth <= THUMBNAIL_SIZES.SMALL.value * 1.2) {
      return THUMBNAIL_SIZES.SMALL.name;
    } else if (targetWidth <= THUMBNAIL_SIZES.MEDIUM.value * 1.2) {
      return THUMBNAIL_SIZES.MEDIUM.name;
    } else {
      return THUMBNAIL_SIZES.LARGE.name;
    }
  }, []);

  // Calculate grid item width based on container width and CSS grid settings
  const calculateGridItemWidth = useCallback((containerWidth: number): number => {
    const gap = 16; // 1rem gap in pixels
    const minItemWidth = window.matchMedia('(min-aspect-ratio: 16/9)').matches ? 300 : 250;
    
    // Calculate how many items fit per row
    const itemsPerRow = Math.floor((containerWidth + gap) / (minItemWidth + gap));
    if (itemsPerRow <= 0) return minItemWidth;
    
    // Calculate actual item width
    return Math.floor((containerWidth - gap * (itemsPerRow - 1)) / itemsPerRow);
  }, []);

  // Update container width and recalculate optimal thumbnail sizes
  const updateOptimalSizes = useCallback(() => {
    if (!gridRef.current) return;
    
    const newWidth = gridRef.current.offsetWidth;
    setContainerWidth(newWidth);
    
    const itemWidth = calculateGridItemWidth(newWidth);
    const optimalSize = getOptimalThumbnailSize(itemWidth);
    
    // Update optimal sizes for all images
    const newOptimalSizes: Record<string, ThumbnailSizeName> = {};
    images.forEach(image => {
      newOptimalSizes[image.id] = optimalSize;
    });
    setOptimalThumbnailSizes(newOptimalSizes);
  }, [images, calculateGridItemWidth, getOptimalThumbnailSize]);

  // Resize observer to track container size changes
  useEffect(() => {
    if (!gridRef.current) return;

    const resizeObserver = new ResizeObserver(() => {
      updateOptimalSizes();
    });

    resizeObserver.observe(gridRef.current);
    
    // Initial calculation
    updateOptimalSizes();

    return () => resizeObserver.disconnect();
  }, [updateOptimalSizes]);

  // Load optimal thumbnails when sizes change
  useEffect(() => {
    Object.entries(optimalThumbnailSizes).forEach(([imageId, targetSize]) => {
      const image = images.find(img => img.id === imageId);
      if (!image) return;

      // Check if we need to load this thumbnail size
      let needsLoading = false;
      
      if (targetSize === THUMBNAIL_SIZES.MEDIUM.name && !image.mediumThumbnail) {
        needsLoading = true;
      } else if (targetSize === THUMBNAIL_SIZES.LARGE.name && !image.largeThumbnail) {
        needsLoading = true;
      }
      
      if (needsLoading) {
        onLoadThumbnail(imageId, targetSize);
      }
    });
  }, [optimalThumbnailSizes, images, onLoadThumbnail]);

  // Get the best available thumbnail for an image
  const getBestThumbnail = useCallback((image: any) => {
    const optimalSize = optimalThumbnailSizes[image.id];
    
    // Try to use the optimal size, fall back to available thumbnails
    if (optimalSize === THUMBNAIL_SIZES.LARGE.name && image.largeThumbnail) {
      return image.largeThumbnail;
    } else if (optimalSize === THUMBNAIL_SIZES.MEDIUM.name && image.mediumThumbnail) {
      return image.mediumThumbnail;
    } else if (image.mediumThumbnail) {
      return image.mediumThumbnail;
    } else if (image.smallThumbnail) {
      return image.smallThumbnail;
    }
    
    // Fallback to original image
    return { url: image.url };
  }, [optimalThumbnailSizes]);

  return (
    <div className={styles.container}>      
      <div className={styles.scrollArea}>
        <div ref={gridRef} className={styles.grid}>
          {images.map((image) => (
            <div 
              key={image.id} 
              className={`${styles.item} cursor-pointer ${selectedImage?.id === image.id ? styles.selected : ''}`}
              onClick={() => {
                if (selectedImage?.id === image.id) {
                  onImageSelect(null);
                } else {
                  onImageSelect(image);
                }
              }}
            >
              <div className={styles.imageContainer}>
                <Image
                  src={getBestThumbnail(image).url}
                  alt={image.description || image.title || 'Uploaded image'}
                  width={300}
                  height={225}
                  className={styles.image}
                  unoptimized // For S3 URLs
                />
              </div>
              <div className={styles.content}>
                {image.title && (
                  <p className={styles.title}>
                    {image.title}
                  </p>
                )}
                {image.description && (
                  <p className={styles.description}>
                    {image.description}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}