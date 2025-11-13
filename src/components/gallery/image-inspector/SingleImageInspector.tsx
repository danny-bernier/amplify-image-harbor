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
import { useState } from 'react';
import { THUMBNAIL_SIZES } from '@/types/thumbnail';
import { GalleryImage } from '@/types/gallery';
import ImageInspectorControlBar from './ImageInspectorControlBar';
import styles from './SingleImageInspector.module.css';

interface SingleImageInspectorProps {
  image: GalleryImage;
  onClose: () => void;
  onShare: (image: GalleryImage) => void;
  onDelete: (image: GalleryImage) => void;
  onPrevious?: () => void;
  onNext?: () => void;
}

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

export default function SingleImageInspector({ 
  image, 
  onClose, 
  onShare,
  onDelete,
  onPrevious,
  onNext
}: SingleImageInspectorProps) {
  const [isInfoExpanded, setIsInfoExpanded] = useState(false);

  return (
    <div className={`${styles.panel} ${isInfoExpanded ? styles.expanded : ''}`}>
      {/* Main preview area - header and image together */}
      <div className={styles.previewWrapper}>
        <ImageInspectorControlBar
          title={image.title || 'Untitled Image'}
          onShare={() => onShare(image)}
          onDelete={() => onDelete(image)}
          onClose={onClose}
          onToggleInfo={() => setIsInfoExpanded(!isInfoExpanded)}
          showInfoToggle={true}
          isInfoActive={isInfoExpanded}
        />
        
        <div className={styles.contentWrapper}>
          {!isInfoExpanded ? (
            /* Image Preview Mode */
            <div className={styles.imageContainer}>
              <div className={styles.imageWrapper}>
                <Image
                  src={image.largeThumbnail?.url || image.mediumThumbnail?.url || image.url}
                  alt={image.description || image.title || 'Image preview'}
                  fill
                  className={styles.image}
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