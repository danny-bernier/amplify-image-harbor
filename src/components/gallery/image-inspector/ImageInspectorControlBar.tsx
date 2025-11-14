/**
 * @fileoverview Reusable control bar for image inspectors
 * Provides unified header with share, delete, info toggle, and close buttons
 * for both single and multi-image inspection modes.
 * 
 * @author Danny Bernier
 * @version 1.0.0
 */

'use client';

import styles from './ImageInspectorControlBar.module.css';

interface ImageInspectorControlBarProps {
  title: string;
  onShare: () => void;
  onDelete: () => void;
  onClose: () => void;
  onToggleInfo?: () => void;
  showInfoToggle?: boolean;
  isInfoActive?: boolean;
}

export default function ImageInspectorControlBar({
  title,
  onShare,
  onDelete,
  onClose,
  onToggleInfo,
  showInfoToggle = false,
  isInfoActive = false
}: ImageInspectorControlBarProps) {
  return (
    <div className={styles.baseHeader}>
      <div className={styles.titleSection}>
        {/* Share button */}
        <button 
          onClick={onShare}
          className={styles.shareBtn}
          title="Share"
        >
          <svg className={styles.icon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
          </svg>
        </button>
        
        {/* Title/Count */}
        <h2 className={styles.title}>
          {title}
        </h2>
      </div>
      
      <div className={styles.buttonGroup}>
        {/* Info Toggle - only show for single selection */}
        {showInfoToggle && onToggleInfo && (
          <button 
            onClick={onToggleInfo}
            className={`${styles.infoToggle} ${styles.infoToggleHiddenLg} ${isInfoActive ? styles.infoToggleActive : ''}`}
            title={isInfoActive ? 'Show image preview' : 'Show image details'}
          >
            <svg className={styles.icon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" strokeWidth={2}/>
              <line x1="12" y1="16" x2="12" y2="12" strokeWidth={2}/>
              <circle cx="12" cy="8" r="1" fill="currentColor"/>
            </svg>
          </button>
        )}
        
        {/* Delete button */}
        <button 
          onClick={onDelete}
          className={styles.deleteBtn}
          title="Delete"
        >
          <svg className={styles.icon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
        
        {/* Close button */}
        <button 
          onClick={onClose}
          className={styles.closeBtn}
          title="Clear selection"
        >
          <svg className={styles.icon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}