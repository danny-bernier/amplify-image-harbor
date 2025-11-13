/**
 * @fileoverview Single image inspector component for detailed image viewing
 * Provides full-size image display, metadata information, and image details
 * with responsive design for different screen sizes.
 * 
 * @author Danny Bernier
 * @version 1.0.0
 */

'use client';

import Image from 'next/image';
import { useEffect } from 'react';
import { THUMBNAIL_SIZES } from '@/types/thumbnail';
import { ImageInspectorProps } from '@/types/gallery';
import styles from './ImageInspector.module.css';

// Helper function to format dates
const formatDate = (dateString: string | null | undefined) => {
  if (!dateString) return 'Unknown';
  try {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return 'Invalid date';
  }
};

export default function ImageInspector({ 
  image, 
  isInspectorExpanded: isInfoInspector, 
  onToggleInfo: onToggleInfo, 
  onClose, 
  onFullscreen,
  onLoadThumbnail
}: ImageInspectorProps) {
  // Load large thumbnail when inspector opens for best quality preview
  useEffect(() => {
    if (!image.largeThumbnail) {
      onLoadThumbnail(image.id, THUMBNAIL_SIZES.LARGE.name);
    }
  }, [image.id, image.largeThumbnail, onLoadThumbnail]);

  return (
    <div className={`${styles.panel} ${isInfoInspector ? styles.expanded : ''}`}>
      {/* Main preview area - header and image together */}
      <div className={styles.previewWrapper}>
        <div className={styles.header}>
          <h2 className="heading-secondary">{image.title || 'Untitled Image'}</h2>
          <div className="flex items-center gap-2">
            {/* Info Toggle - toggles between image and details */}
            <button 
              onClick={onToggleInfo}
              className={`${styles.infoToggle} ${isInfoInspector ? styles.infoToggleActive : ''} lg:landscape:hidden`}
              title={isInfoInspector ? 'Show image preview' : 'Show image details'}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" strokeWidth={2}/>
                <line x1="12" y1="16" x2="12" y2="12" strokeWidth={2}/>
                <circle cx="12" cy="8" r="1" fill="currentColor"/>
              </svg>
            </button>
            
            <button 
              onClick={onClose}
              className={styles.closeBtn}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        
        <div className={styles.contentWrapper}>
          {!isInfoInspector ? (
            /* Image Preview Mode */
            <div className={styles.imageContainer}>
              <div className={styles.imageWrapper}>
                <Image
                  src={image.largeThumbnail?.url || image.mediumThumbnail?.url || image.url}
                  alt={image.description || image.title || 'Image preview'}
                  fill
                  className={`${styles.image} cursor-pointer`}
                  onClick={onFullscreen}
                  unoptimized
                />
              </div>
            </div>
          ) : (
            /* Details Mode */
            <div className={styles.detailsContainer}>
        {/* Description in expanded mode */}
        {image.description && (
          <div className={styles.section}>
            <h3 className="text-primary mb-2">Description:</h3>
            <p className="text-caption">{image.description}</p>
          </div>
        )}
        
        {/* Basic Info */}
        <div className={styles.section}>
          <div className="space-y-2 text-sm">
            <div>
              <span className="text-secondary font-medium">Dimensions:</span>
              <span className="ml-2">{image.width} × {image.height} pixels</span>
            </div>
            <div>
              <span className="text-secondary font-medium">Aspect Ratio:</span>
              <span className="ml-2">{(image.width / image.height).toFixed(2)}:1</span>
            </div>
            <div>
              <span className="text-secondary font-medium">Created:</span>
              <span className="ml-2">{formatDate(image.created)}</span>
            </div>
            <div>
              <span className="text-secondary font-medium">Last Updated:</span>
              <span className="ml-2">{formatDate(image.lastUpdated)}</span>
            </div>
          </div>
        </div>

        {/* Regular Tags */}
        {image.tags && image.tags.length > 0 && (
          <div className={styles.section}>
            <h3 className="text-primary mb-2">Tags:</h3>
            <div className="flex flex-wrap gap-2">
              {image.tags.map((tag, index) => (
                <span key={index} className="tag-item">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Structured Tags (Key-Value Pairs) */}
        {image.jsonTags && Object.keys(image.jsonTags).length > 0 && (
          <div className={styles.section}>
            <h3 className="text-primary mb-2">Structured Tags:</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(image.jsonTags).map(([key, value], index) => (
                <span key={index} className="tag-item">
                  {key}: {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* File Info */}
        <div className={styles.section}>
          <div className="space-y-2 text-sm">
            <div>
              <span className="text-secondary font-medium">S3 Key:</span>
              <span className="ml-2 font-mono text-xs break-all">{image.s3Key}</span>
            </div>
            <div>
              <span className="text-secondary font-medium">Image ID:</span>
              <span className="ml-2 font-mono text-xs">{image.id}</span>
            </div>
          </div>
        </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}