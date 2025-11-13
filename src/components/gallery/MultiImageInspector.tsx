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
        <div className={styles.header}>
          <div className={styles.titleSection}>
            {/* Share button */}
            <button 
              onClick={handleShare}
              className={styles.shareBtn}
              title="Share selected images"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
              </svg>
            </button>
            
            {/* Image count */}
            <h2 className="heading-secondary">
              {selectedImages.length} image{selectedImages.length !== 1 ? 's' : ''} selected
            </h2>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Delete button */}
            <button 
              onClick={handleDelete}
              className={styles.deleteBtn}
              title="Delete selected images"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
            
            {/* Clear selection button */}
            <button 
              onClick={onClearSelection}
              className={styles.closeBtn}
              title="Clear selection"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        
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