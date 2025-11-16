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
import { GalleryImage } from '@/types/gallery';
import {THUMBNAIL_SIZES} from '@/types/images';
import ImageInspectorControlBar from './ImageInspectorControlBar';
import FullscreenPreview from '@/components/common/FullscreenPreview';
import styles from './SingleImageInspector.module.css';

interface SingleImageInspectorProps {
  image: GalleryImage;
  onClose: () => void;
  onShare: (image: GalleryImage) => void;
  onDelete: (image: GalleryImage) => void;
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
  onDelete
}: SingleImageInspectorProps) {
  const [isFullscreenOpen, setIsFullscreenOpen] = useState(false);
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
              <div className={styles.imageWrapper} onClick={() => setIsFullscreenOpen(true)} style={{ cursor: 'pointer' }}>
                <Image
                  src={image.thumbnails.LARGE?.url || image.thumbnails.MEDIUM?.url || image.url}
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
            <h3 className={styles.sectionTitle}>Description:</h3>
            <p className={styles.description}>{image.description}</p>
          </div>
        )}
        
        {/* Basic Info */}
        <div className={styles.section}>
          <div className={styles.infoList}>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Dimensions:</span>
              <span className={styles.infoValue}>{image.width} × {image.height} pixels</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Aspect Ratio:</span>
              <span className={styles.infoValue}>{(image.width / image.height).toFixed(2)}:1</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Created:</span>
              <span className={styles.infoValue}>{formatDate(image.created)}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Last Updated:</span>
              <span className={styles.infoValue}>{formatDate(image.lastUpdated)}</span>
            </div>
          </div>
        </div>

        {/* Regular Tags */}
        {image.tags && image.tags.length > 0 && (
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Tags:</h3>
            <div className={styles.tagList}>
              {image.tags.map((tag, index) => (
                <span key={index} className={styles.tagItem}>
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Structured Tags (Key-Value Pairs) */}
        {image.jsonTags && Object.keys(image.jsonTags).length > 0 && (
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Structured Tags:</h3>
            <div className={styles.tagList}>
              {Object.entries(image.jsonTags).map(([key, value], index) => (
                <span key={index} className={styles.tagItem}>
                  {key}: {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* File Info */}
        <div className={styles.section}>
          <div className={styles.infoList}>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>S3 Key:</span>
              <span className={`${styles.infoValue} ${styles.codeText}`}>{image.s3Key}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Image ID:</span>
              <span className={`${styles.infoValue} ${styles.codeText}`}>{image.id}</span>
            </div>
          </div>
        </div>
            </div>
          )}
        </div>
      </div>

      {/* Fullscreen Preview */}
      <FullscreenPreview
        url={image.url}
        altText={image.description || image.title || 'Image preview'}
        isOpen={isFullscreenOpen}
        onClose={() => setIsFullscreenOpen(false)}
      />
    </div>
  );
}