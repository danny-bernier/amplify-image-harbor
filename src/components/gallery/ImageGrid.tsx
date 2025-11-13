/**
 * @fileoverview Responsive image grid component with multi-selection support
 * Provides responsive grid layout with intelligent thumbnail sizing,
 * single and multi-selection modes, and performance-optimized rendering.
 * 
 * @author Danny Bernier
 * @version 1.0.0
 */

'use client';

import Image from 'next/image';
import { useEffect, useRef, useState, useCallback } from 'react';
import { ImageGridProps } from '@/types/gallery';
import { THUMBNAIL_SIZES, ThumbnailSizeName } from '@/types/thumbnail';
import { getOptimalThumbnailSize, getBestThumbnail } from '@/utils/thumbnailUtils';
import styles from './ImageGrid.module.css';

export default function ImageGrid({ images, selectedImage, selectedImages, onImageSelect, onLoadThumbnail }: ImageGridProps) {
  const gridRef = useRef<HTMLDivElement>(null);
  const [_, setContainerWidth] = useState(0);
  const [optimalThumbnailSizes, setOptimalThumbnailSizes] = useState<Record<string, ThumbnailSizeName>>({});

  // Use the extracted optimal thumbnail size calculation
  const getOptimalSize = useCallback((displayWidth: number): ThumbnailSizeName => {
    return getOptimalThumbnailSize(displayWidth) as ThumbnailSizeName;
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
    const optimalSize = getOptimalSize(itemWidth);
    
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

  // Get the best available thumbnail for an image using the extracted utility
  const getImageThumbnail = useCallback((image: any) => {
    const optimalSize = optimalThumbnailSizes[image.id];
    return getBestThumbnail(image, optimalSize);
  }, [optimalThumbnailSizes]);

  return (
    <div className={styles.container}>      
      <div className={styles.scrollArea}>
        <div ref={gridRef} className={styles.grid}>
          {images.map((image) => {
            const isSelected = selectedImage?.id === image.id;
            const isMultiSelected = selectedImages.some(img => img.id === image.id);
            const hasMultiSelection = selectedImages.length > 0;
            
            return (
              <div 
                key={image.id} 
                className={`${styles.item} cursor-pointer ${isSelected ? styles.selected : ''} ${isMultiSelected ? styles.multiSelected : ''}`}
                onClick={(e) => {
                  const isCtrlClick = e.ctrlKey || e.metaKey;
                  const isShiftClick = e.shiftKey;
                  
                  if (isCtrlClick || isShiftClick || hasMultiSelection) {
                    // Multi-selection mode
                    onImageSelect(image, true);
                  } else {
                    // Single selection mode
                    if (isSelected) {
                      // Clicking on already selected image deselects it
                      onImageSelect(image, false);
                    } else {
                      onImageSelect(image, false);
                    }
                  }
                }}
              >
                <div className={styles.imageContainer}>
                  <Image
                    src={getImageThumbnail(image).url}
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
            );
          })}
        </div>
      </div>
    </div>
  );
}