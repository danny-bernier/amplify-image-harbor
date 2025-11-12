'use client';

import { useEffect } from 'react';
import { THUMBNAIL_SIZES, ThumbnailSizeName } from '@/types/thumbnail';
import { GalleryImage } from '@/types/gallery';
import styles from './FullscreenPreview.module.css';

interface FullscreenPreviewProps {
  image: GalleryImage;
  isOpen: boolean;
  onClose: () => void;
  onLoadThumbnail: (imageId: string, size: ThumbnailSizeName) => Promise<void>;
}

export default function FullscreenPreview({ 
  image, 
  isOpen, 
  onClose, 
  onLoadThumbnail 
}: FullscreenPreviewProps) {
  // Load large thumbnail when fullscreen opens
  useEffect(() => {
    if (isOpen && !image.largeThumbnail) {
      onLoadThumbnail(image.id, THUMBNAIL_SIZES.LARGE.name);
    }
  }, [isOpen, image.id, image.largeThumbnail, onLoadThumbnail]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          onClose();
        }}
        className={styles.closeButton}
        type="button"
        aria-label="Close fullscreen preview"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <img
        src={image.largeThumbnail?.url || image.url}
        alt={image.description || image.title || 'Fullscreen image'}
        className={styles.image}
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}