'use client';

import styles from './FullscreenPreview.module.css';

interface FullscreenPreviewProps {
  url: string;
  altText: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function FullscreenPreview({ 
  url, 
  altText, 
  isOpen, 
  onClose
}: FullscreenPreviewProps) {
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
        <svg className={styles.buttonIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <img
        src={url}
        alt={altText}
        className={styles.image}
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}