/**
 * @fileoverview Single image inspector component for detailed image viewing
 * Provides full-size image display, metadata information, and image details
 * with responsive design for different screen sizes.
 * 
 * @author Danny Bernier
 * @version 1.0.0
 */

'use client';

import { useState, useRef, useEffect } from 'react';
import { HarborImage } from '@/types/images';
import { logger } from '@/utils/logger';
import ImageInspectorControlBar from './ImageInspectorControlBar';
import FullscreenPreview from '@/components/common/FullscreenPreview';
import styles from './SingleImageInspector.module.css';
import PromisedImage from '@/components/common/PromisedImage';

// Create component-specific logger
const log = logger.forComponent('SingleImageInspector');

/**
 * Component props for `SingleImageInspector`.
 *
 * - `image`: the HarborImage to inspect
 * - `onClose`: callback to clear selection / close the inspector
 * - `onShare`: callback invoked when the user requests sharing
 * - `onDelete`: callback invoked when the user requests deletion
 */

interface SingleImageInspectorProps {
  image: HarborImage;
  onClose: () => void;
  onShare: (image: HarborImage) => void;
  onDelete: (image: HarborImage) => void;
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

/**
 * SingleImageInspector
 *
 * Renders a single image preview with metadata and provides a control bar
 * for actions (share, delete, toggle info). It chooses an optimal thumbnail
 * for the current display size via `getImageForTargetSize` and renders the
 * image using `PromisedImage` which accepts Promise-based URLs.
 */
export default function SingleImageInspector({
  image,
  onClose,
  onShare,
  onDelete
}: SingleImageInspectorProps) {

  // Log that inspector initialized for this image (development-level)
  log.devInfo('Initializing inspector for image', { imageId: image.id, title: image.title });
  const [isFullscreenOpen, setIsFullscreenOpen] = useState(false);
  const [isInfoExpanded, setIsInfoExpanded] = useState(false);
  const imageWrapperRef = useRef<HTMLDivElement | null>(null);

  // Log when the inspected image changes
  useEffect(() => {
    log.devInfo('Inspecting image', { imageId: image.id, title: image.title });
    return () => {
      log.devDebug('Leaving inspector for image', { imageId: image.id });
    };
  }, [image.id]);

  const openFullscreen = () => {
    log.info('Opening fullscreen preview', { imageId: image.id });
    setIsFullscreenOpen(true);
  };

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
              <div
                ref={imageWrapperRef}
                className={styles.imageWrapper}
                onClick={openFullscreen}
                style={{ cursor: 'pointer' }}
              >
                {(() => {
                  const hugeThumb = image.thumbnails?.HUGE ?? null;
                  log.devDebug('Huge thumbnail for image', { imageId: image.id, hugeThumbAvailable: !!hugeThumb });
                  const s3img = hugeThumb ? hugeThumb.image : image.s3image;
                  if (s3img) {
                    const chosenKey = s3img.s3Key ?? '(unknown)';
                    const used = (s3img === image.s3image) ? 'original' : 'huge-thumbnail';
                    log.devDebug('Selected image for inspector', { imageId: image.id, chosenKey, used });
                  } else {
                    log.devDebug('No S3 image available for inspector', { imageId: image.id });
                  }
                  return (
                    <PromisedImage
                      url={s3img.getUrl()}
                      alt={image.description || image.title || 'Image preview'}
                      fill
                      className={styles.image}
                      unoptimized
                    />
                  );
                })()}
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
                    <span className={`${styles.infoValue} ${styles.codeText}`}>{image.s3image?.s3Key}</span>
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
        url={image.s3image.getUrl()}
        altText={image.description || image.title || 'Image preview'}
        isOpen={isFullscreenOpen}
        onClose={() => setIsFullscreenOpen(false)}
      />
    </div>
  );
}