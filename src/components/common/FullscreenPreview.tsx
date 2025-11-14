'use client';

import { GalleryImage } from '@/types/gallery';
import styles from './FullscreenPreview.module.css';

interface FullscreenPreviewProps {
  image: GalleryImage;
  isOpen: boolean;
  onClose: () => void;
}

export default function FullscreenPreview({ 
  image, 
  isOpen, 
  onClose
}: FullscreenPreviewProps) {
  // No thumbnail loading needed since we use image.url directly
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
        aria-label="Close fullsize preview"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <img
        src={image.url}
        alt={image.description || image.title || 'Fullsize image'}
        className={styles.image}
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}