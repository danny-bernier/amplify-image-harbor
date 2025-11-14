/**
 * @fileoverview LoadingBar component for displaying progress with status
 * Provides a flexible loading indicator with title, status, image preview, progress bar, and details.
 * Used for file uploads, deletions, and other async operations.
 * 
 * @author Danny Bernier
 * @version 1.0.0
 */

'use client';

import Image from 'next/image';
import styles from './LoadingBar.module.css';

export interface LoadingBarProps {
  /** Main title text (e.g., filename) */
  title: string;
  
  /** Progress percentage (0-100) */
  progress: number;
  
  /** Status icon component or element */
  statusIcon?: React.ReactNode;
  
  /** Status text (e.g., "Waiting...", "Uploading...", "Complete") */
  status?: string;
  
  /** Image URL for preview thumbnail */
  imageUrl?: string;
  
  /** Image alt text */
  imageAlt?: string;
  
  /** Details text shown below progress bar */
  details?: string;
  
  /** Loading bar color variant */
  variant?: 'primary' | 'success' | 'warning' | 'danger';
  
  /** Whether the operation is complete */
  isComplete?: boolean;
  
  /** Whether there was an error */
  hasError?: boolean;
}

export default function LoadingBar({
  title,
  progress,
  statusIcon,
  status,
  imageUrl,
  imageAlt,
  details,
  variant = 'primary',
  isComplete = false,
  hasError = false
}: LoadingBarProps) {
  // Determine progress bar class based on state and variant
  const getProgressBarClass = () => {
    if (hasError) return styles.progressDanger;
    if (isComplete) return styles.progressSuccess;
    
    switch (variant) {
      case 'success': return styles.progressSuccess;
      case 'warning': return styles.progressWarning;
      case 'danger': return styles.progressDanger;
      default: return styles.progressPrimary;
    }
  };

  return (
    <div className={`${styles.container} ${hasError ? styles.containerError : ''}`}>
      {/* Main content area */}
      <div className={styles.content}>
        {/* Image preview (if provided) */}
        {imageUrl && (
          <div className={styles.imagePreview}>
            <Image
              src={imageUrl}
              alt={imageAlt || title}
              fill
              className={styles.image}
              unoptimized
            />
          </div>
        )}
        
        {/* Text content */}
        <div className={styles.textContent}>
          {/* Title and status row */}
          <div className={styles.headerRow}>
            <h3 className={styles.title}>{title}</h3>
            
            {/* Status section */}
            {(statusIcon || status) && (
              <div className={styles.statusSection}>
                {statusIcon && (
                  <div className={styles.statusIcon}>
                    {statusIcon}
                  </div>
                )}
                {status && (
                  <span className={styles.statusText}>
                    {status}
                  </span>
                )}
              </div>
            )}
          </div>
          
          {/* Progress bar */}
          <div className={styles.progressContainer}>
            <div className={styles.progressBackground}>
              <div 
                className={`${styles.progressFill} ${getProgressBarClass()}`}
                style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
              />
            </div>
          </div>
          
          {/* Details (if provided) */}
          {details && (
            <div className={styles.details}>
              {details}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}