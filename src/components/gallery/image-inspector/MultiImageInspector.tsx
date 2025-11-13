/**
 * @fileoverview Multi-image inspector component for batch operations
 * Provides preview grid of selected images with share and delete actions,
 * responsive thumbnail sizing, and batch selection management.
 * 
 * @author Danny Bernier
 * @version 1.0.0
 */

'use client';

import Image from 'next/image';
import { useEffect, useRef, useState, useCallback } from 'react';
import { GalleryImage } from '@/types/gallery';
import { getThumbnailForTargetSize } from '@/utils/thumbnailUtils';
import ImageInspectorControlBar from './ImageInspectorControlBar';
import styles from './MultiImageInspector.module.css';

interface MultiImageInspectorProps {
  selectedImages: GalleryImage[];
  onClearSelection: () => void;
  onShare: (images: GalleryImage[]) => void;
  onDelete: (images: GalleryImage[]) => void;
}

export default function MultiImageInspector({ 
  selectedImages, 
  onClearSelection,
  onShare,
  onDelete
}: MultiImageInspectorProps) {
  const gridRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  const handleShare = () => {
    console.log('Share button clicked for images:', selectedImages.map(img => ({ id: img.id, title: img.title })));
    onShare(selectedImages);
  };

  const handleDelete = () => {
    console.log('Delete button clicked for images:', selectedImages.map(img => ({ id: img.id, title: img.title })));
    onDelete(selectedImages);
  };

  // Calculate preview item width based on container width and CSS grid settings
  const calculatePreviewItemWidth = useCallback((containerWidth: number): number => {
    const gap = 16; // 1rem gap in pixels
    // Use responsive breakpoint logic from CSS
    const minItemWidth = containerWidth <= 640 ? 80 : 120; // Mobile vs desktop
    
    // Calculate how many items fit per row
    const itemsPerRow = Math.floor((containerWidth + gap) / (minItemWidth + gap));
    if (itemsPerRow <= 0) return minItemWidth;
    
    // Calculate actual item width
    return Math.floor((containerWidth - gap * (itemsPerRow - 1)) / itemsPerRow);
  }, []);

  // Update container width when grid size changes
  const updateContainerWidth = useCallback(() => {
    if (!gridRef.current) return;
    const newWidth = gridRef.current.offsetWidth;
    setContainerWidth(newWidth);
  }, []);

  // Resize observer to track container size changes
  useEffect(() => {
    if (!gridRef.current) return;

    const resizeObserver = new ResizeObserver(() => {
      updateContainerWidth();
    });

    resizeObserver.observe(gridRef.current);
    
    // Initial calculation
    updateContainerWidth();

    return () => resizeObserver.disconnect();
  }, [updateContainerWidth]);

  // Get optimal thumbnail for preview item
  const getPreviewThumbnail = useCallback((image: GalleryImage) => {
    if (containerWidth === 0) {
      // Fallback while measuring
      return { url: image.smallThumbnail?.url || image.url };
    }
    
    const itemWidth = calculatePreviewItemWidth(containerWidth);
    return getThumbnailForTargetSize(image, itemWidth);
  }, [containerWidth, calculatePreviewItemWidth]);

  return (
    <div className={styles.panel}>
      <div className={styles.previewWrapper}>
        {/* Header with count, share, delete, and close buttons */}
        <ImageInspectorControlBar
          title={`${selectedImages.length} image${selectedImages.length !== 1 ? 's' : ''} selected`}
          onShare={handleShare}
          onDelete={handleDelete}
          onClose={onClearSelection}
          showInfoToggle={false}
        />
        
        {/* Preview grid of selected images */}
        <div className={styles.contentWrapper}>
          <div ref={gridRef} className={styles.previewGrid}>
            {selectedImages.map((image) => (
              <div key={image.id} className={styles.previewItem}>
                <div className={styles.previewImageWrapper}>
                  <Image
                    src={getPreviewThumbnail(image).url}
                    alt={image.title || 'Selected image'}
                    fill
                    className={styles.previewImage}
                    unoptimized
                  />
                </div>
                <div className={styles.previewTitle}>
                  {image.title || 'Untitled'}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}