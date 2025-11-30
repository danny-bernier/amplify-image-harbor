/**
 * @fileoverview Responsive image grid component with multi-selection support
 * Provides responsive grid layout with intelligent thumbnail sizing,
 * single and multi-selection modes, and performance-optimized rendering.
 * 
 * @author Danny Bernier
 * @version 1.0.0
 */

'use client';

import { useRef } from 'react';
import { getImageForTargetSize } from '@/utils/imageUtils';
import styles from './ImageGrid.module.css';
import Promisedimage from '@/components/common/PromisedImage';
import type { HarborImage } from '@/types/images';
import { THUMBNAIL_SIZES } from '@/types/images';

export interface ImageGridProps {
  harborImages: HarborImage[];
  selectedHarborImages: HarborImage[];
  onImageSelect: (image: HarborImage, options?: { multi?: boolean; range?: boolean }) => void;
  // imageSize is a sliding scale in pixels (target thumbnail width). Defaults to 300.
  imageSize?: number;
}

export default function ImageGrid({
  harborImages: hImages,
  selectedHarborImages: selectedImages,
  onImageSelect,
  imageSize = THUMBNAIL_SIZES.MEDIUM.value
}: ImageGridProps) {

  const gridRef = useRef<HTMLDivElement>(null);
  // Display dimensions derived from the selected thumbnail size
  const imageWidth = imageSize;
  const imageHeight = Math.round(imageWidth * 0.75); // 4:3 default aspect ratio

  // Ensure the grid never renders items wider than the configured thumbnail width.
  // We set an explicit column width so the browser will fit as many columns
  // as possible given the container size. Using `auto-fill` creates new
  // columns of the fixed thumbnail width; the grid will wrap when there is
  // insufficient space which keeps thumbnails from exceeding `imageWidth`.
  const gridStyle: React.CSSProperties = {
    gridTemplateColumns: `repeat(auto-fill, ${imageWidth}px)`,
    justifyContent: 'center'
  };

  return (
    <div className={styles.container}>
      <div className={styles.scrollArea}>
        <div ref={gridRef} className={styles.grid} style={gridStyle}>
          {hImages.map((hImage) => {
            const isMultiSelected = selectedImages.some(img => img.id === hImage.id);
            const hasMultiSelection = selectedImages.length > 0;
            return (
              <div
                key={hImage.id}
                className={`${styles.item} cursor-pointer ${isMultiSelected ? styles.multiSelected : ''}`}
                onMouseDown={(e) => {
                  // Prevent accidental text selection when the user is doing a Shift+click range selection.
                  if (e.shiftKey) {
                    e.preventDefault();
                  }
                }}
                onClick={(e) => {
                  const isCtrlClick = e.ctrlKey || e.metaKey;
                  const isShiftClick = e.shiftKey;
                  // Single click selects only that image; Ctrl/Cmd-click toggles multi-select
                  // Shift-click requests a range selection from the last-selected anchor to this image.
                  onImageSelect(hImage, { multi: isCtrlClick, range: isShiftClick });
                }}
              >
                <div className={styles.imageContainer}>
                  {(() => {
                    // Select the thumbnail by the configured size name; fall back to original if missing
                    const s3img = getImageForTargetSize(hImage, imageWidth);
                    return <Promisedimage
                      url={s3img.getUrl()}
                      alt={hImage.description || hImage.title || 'Uploaded image'}
                      width={imageWidth}
                      height={imageHeight}
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