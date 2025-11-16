/**
 * @fileoverview Responsive image grid component with multi-selection support
 * Provides responsive grid layout with intelligent thumbnail sizing,
 * single and multi-selection modes, and performance-optimized rendering.
 * 
 * @author Danny Bernier
 * @version 1.0.0
 */

'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { THUMBNAIL_SIZES, ThumbnailSize } from '@/types/images';
import { getThumbnailSizeForTargetSize, getThumbnailOrOriginal } from '@/utils/imageUtils';
import styles from './ImageGrid.module.css';
import Promisedimage from '@/components/common/PromisedImage';
import type { HarborImage } from '@/types/images';

export interface ImageGridProps {
  harborImages: HarborImage[];
  selectedHarborImages: HarborImage[];
  onImageSelect: (image: HarborImage, isMultiSelect?: boolean) => void;
}

export default function ImageGrid({ harborImages: hImages, selectedHarborImages: selectedImages, onImageSelect }: ImageGridProps) {
  const gridRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number>(0); // used to track if width changed when resizing
  const [targetThumbnailSize, setTargetThumbnailSize] = useState<ThumbnailSize | null>(THUMBNAIL_SIZES.SMALL); // used to track current target size for thumbnails


  // Helper for grid item width calculation
  const getGridItemWidth = (containerWidth: number) => {
    const gap = 16; // 1rem gap in pixels
    const minItemWidth = window.matchMedia('(min-aspect-ratio: 16/9)').matches ? 300 : 250;
    const itemsPerRow = Math.floor((containerWidth + gap) / (minItemWidth + gap));
    return itemsPerRow <= 0 ? minItemWidth : Math.floor((containerWidth - gap * (itemsPerRow - 1)) / itemsPerRow);
  };

  // Update container width and recalculate target thumbnail size
  const updateTargetThumbnailSize = useCallback(() => {
    if (!gridRef.current) return;

    // check if width changed
    const newWidth = gridRef.current.offsetWidth;
    if (newWidth === containerWidth) return; // Width didnt change so no need to check if target size changed

    setContainerWidth(newWidth);
    const newItemWidth = getGridItemWidth(newWidth);
    const newTargetThumbnailSize = getThumbnailSizeForTargetSize(newItemWidth);
    if (newTargetThumbnailSize === targetThumbnailSize) return; // Target size didnt change so no need to update
    setTargetThumbnailSize(newTargetThumbnailSize);
  }, [hImages]);

  // Resize observer to track container size changes
  useEffect(() => {
    if (!gridRef.current) return;

    const resizeObserver = new ResizeObserver(() => {
      updateTargetThumbnailSize();
    });

    resizeObserver.observe(gridRef.current);

    // Initial calculation
    updateTargetThumbnailSize();

    return () => resizeObserver.disconnect();
  }, [updateTargetThumbnailSize]);

  return (
    <div className={styles.container}>
      <div className={styles.scrollArea}>
        <div ref={gridRef} className={styles.grid}>
          {hImages.map((hImage) => {
            const isMultiSelected = selectedImages.some(img => img.id === hImage.id);
            const hasMultiSelection = selectedImages.length > 0;
            return (
              <div
                key={hImage.id}
                className={`${styles.item} cursor-pointer ${isMultiSelected ? styles.multiSelected : ''}`}
                onClick={(e) => {
                  const isCtrlClick = e.ctrlKey || e.metaKey;
                  const isShiftClick = e.shiftKey;
                  if (isCtrlClick || isShiftClick || hasMultiSelection) {
                    onImageSelect(hImage, true);
                  } else {
                    onImageSelect(hImage, false);
                  }
                }}
              >
                <div className={styles.imageContainer}>
                  {(() => {
                    const s3img = getThumbnailOrOriginal(hImage, targetThumbnailSize);
                    return <Promisedimage
                      url={s3img.getUrl()}
                      alt={hImage.description || hImage.title || 'Uploaded image'}
                      width={300}
                      height={225}
                      className={styles.image}
                      unoptimized
                    />;
                  })()}
                </div>
                <div className={styles.content}>
                  {'title' in hImage && hImage.title && (
                    <p className={styles.title}>{hImage.title}</p>
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