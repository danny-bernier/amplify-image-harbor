/**
 * @fileoverview Main gallery component for displaying and managing image collections
 * Provides image grid display, single/multi-selection modes, thumbnails loading,
 * and integration with image inspector components.
 * 
 * @author Danny Bernier
 * @version 1.0.0
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchAuthSession, getCurrentUser } from 'aws-amplify/auth';
import { logger } from '@/utils/logger';
import { listImages } from '@/services/dbService';
import { getHarborImagesFromDbImages } from '@/services/imageService';
import { HarborImage } from '@/types/images';
import styles from './Gallery.module.css';
import ImageGrid from './ImageGrid';
import { ImageInspector } from './image-inspector';
import FullscreenPreview from '@/components/common/FullscreenPreview';

// Create component-specific logger
const log = logger.forComponent('Gallery');

export default function Gallery() {
  const [hImages, setHImages] = useState<HarborImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedHImages, setSelectedHImages] = useState<HarborImage[]>([]);
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);
  const [isFullscreenOpen, setIsFullscreenOpen] = useState(false);
  const [splitRatio, setSplitRatio] = useState(50); // Percentage for top panel vs bottom panel
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    const fetchImages = async () => {
      try {
        setLoading(true);

        // Double-check authentication status
        log.devDebug('Checking current user...');
        const currentUser = await getCurrentUser();
        log.devDebug('Current user:', { userId: currentUser?.userId });

        // Get authentication session to ensure user is authenticated
        log.devDebug('Fetching auth session...');
        const session = await fetchAuthSession();
        log.devDebug('Auth session:', { hasTokens: !!session.tokens });

        if (!session.tokens?.accessToken) {
          log.error('No auth token found in session');
          setError('Please sign in to view your images');
          return;
        }

        log.devDebug('User authenticated, fetching images directly from database...');

        // Use direct database service call instead of API
        const dbImages = await listImages(50);
        log.devDebug('Database images fetched:', { count: dbImages.length });

        // Convert database images to gallery format using S3Image and ThumbnailData
        const harborImages: HarborImage[] = await getHarborImagesFromDbImages(dbImages);

        setHImages(harborImages);
        setError(null);

        log.devDebug(`Loaded ${harborImages.length} images with S3Image and ThumbnailData`);
      } catch (err: any) {
        log.error('Error fetching images:', err);

        // Handle specific authentication errors
        if (err.name === 'NotAuthorizedException' || err.message?.includes('not authorized')) {
          setError('Authentication failed. Please sign in to continue.');
        } else if (err.name === 'NetworkError' || err.message?.includes('network')) {
          setError('Network error. Please check your connection and try again.');
        } else {
          setError('Failed to load images. Please try again.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchImages();
  }, []);

  const handleImageSelect = (hImage: HarborImage, options?: { multi?: boolean; range?: boolean }) => {
    const isMultiSelect = Boolean(options?.multi);
    const isRangeSelect = Boolean(options?.range);

    // SHIFT-range selection (select all items between lastSelectedId and clicked image)
    if (isRangeSelect) {
      // Determine anchor: prefer lastSelectedId, else the last selected image id, else clicked image
      const anchorId = lastSelectedId ?? (selectedHImages.length ? selectedHImages[selectedHImages.length - 1]?.id : null) ?? hImage.id;
      const allIds = hImages.map(img => img.id);
      const anchorIndex = allIds.indexOf(anchorId);
      const targetIndex = allIds.indexOf(hImage.id);
      if (anchorIndex === -1 || targetIndex === -1) {
        // Fallback to single select if indices aren't found
        setSelectedHImages([hImage]);
        setLastSelectedId(hImage.id);
        return;
      }

      const start = Math.min(anchorIndex, targetIndex);
      const end = Math.max(anchorIndex, targetIndex);
      const range = hImages.slice(start, end + 1);

      // Union the computed range with any existing selection (deduplicated).
      // This preserves other selected items (e.g., image 6) while adding the range.
      const existingById = new Map(selectedHImages.map(i => [i.id, i] as [string, HarborImage]));
      const union = [...selectedHImages];
      let addedCount = 0;
      for (const img of range) {
        if (!existingById.has(img.id)) {
          union.push(img);
          addedCount++;
        }
      }
      setSelectedHImages(union);
      log.devDebug('Added range to existing selection (union)', { anchorId, start, end, added: addedCount, total: union.length });

      setLastSelectedId(hImage.id);
      return;
    }

    // Multi-select toggling (Ctrl/Cmd-click)
    if (isMultiSelect) {
      if (selectedHImages.find(img => img.id === hImage.id)) {
        log.devDebug('Deselecting image (multi):', hImage.id);
        setSelectedHImages(prev => prev.filter(img => img.id !== hImage.id));
      } else {
        log.debug('Selecting image (multi):', hImage.id);
        setSelectedHImages(prev => [...prev, hImage]);
        setLastSelectedId(hImage.id);
      }
      return;
    }

    // Default single-select (replace selection)
    log.debug('Selecting single image:', hImage.id);
    setSelectedHImages([hImage]);
    setLastSelectedId(hImage.id);
  };

  const handleClearSelectedHImages = () => {
    setSelectedHImages([]);
  };

  const handleRemoveHImage = (hImageToRemove: HarborImage) => {
    setSelectedHImages(prev => prev.filter(img => img.id !== hImageToRemove.id));
  };

  const handleShareImages = (images: HarborImage[]) => {
    // Placeholder for share functionality
    console.log('Share images:', images);
  };

  const handleDeleteHImages = (images: HarborImage[]) => {
    // Placeholder for delete functionality  
    console.log('Delete images:', images);
  };

  // Drag handlers for resizable splitter
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !containerRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const mouseY = e.clientY - containerRect.top;
    const newRatio = (mouseY / containerRect.height) * 100;

    // Constrain between 15% and 85%
    const constrainedRatio = Math.max(15, Math.min(85, newRatio));
    setSplitRatio(constrainedRatio);
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  if (loading) {
    return (
      <div className="w-full p-4">
        <h1 className="heading-primary">Image Gallery</h1>
        <div className="flex justify-center items-center h-64">
          <div className="text-secondary">Loading images...</div>
        </div>
      </div>
    );
  }

  if (error) {
    const isAuthError = error.includes('Authentication failed') || error.includes('sign in');

    return (
      <div className="w-full p-4">
        <h1 className="heading-primary">Image Gallery</h1>
        <div className="flex justify-center items-center h-64">
          <div className="text-caption text-center">
            <p>{error}</p>
            <div className="mt-4 space-x-2">
              {isAuthError ? (
                <button
                  onClick={() => window.location.href = '/'}
                  className="btn-primary"
                >
                  Go to Sign In
                </button>
              ) : (
                <button
                  onClick={() => window.location.reload()}
                  className="btn-primary"
                >
                  Retry
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (hImages.length === 0) {
    return (
      <div className="w-full p-4">
        <h1 className="heading-primary">Image Gallery</h1>
        <div className="flex justify-center items-center h-64">
          <div className="text-caption text-center">
            <p>No images found.</p>
            <p className="mt-2">Upload some images to get started!</p>
          </div>
        </div>
      </div>
    );
  }

  const hasAnySelection = selectedHImages.length > 0;

  return (
    <div
      ref={containerRef}
      className={`${styles.container} ${hasAnySelection ? styles.hasSelection : ''}`}
      style={hasAnySelection ? {
        '--top-height': `${splitRatio}%`,
        '--bottom-height': `${100 - splitRatio}%`
      } as React.CSSProperties : {}}
    >
      {/* Image Grid Area - Uses ImageGrid component */}
      <div className={styles.top}>
        <ImageGrid
          harborImages={hImages}
          selectedHarborImages={selectedHImages}
          onImageSelect={handleImageSelect}
        />
      </div>

      {/* Resizable Splitter - Shows for both single and multi-image selection */}
      <div
          className={`${styles.splitter} ${isDragging ? styles.splitterDragging : ''}`}
          onMouseDown={handleMouseDown}
        >
          <div className={styles.splitterHandle}>
            <svg className={styles.splitterIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h8M8 8h8M8 16h8" />
            </svg>
          </div>
        </div>

      {/* Inspector Area - Uses unified ImageInspector component */}
      {(selectedHImages.length > 0) && (
        <div className={styles.bottom}>
          <ImageInspector
            selectedImages={selectedHImages}
            onClose={handleClearSelectedHImages}
            onShare={handleShareImages}
            onDelete={handleDeleteHImages}
            onRemoveImage={handleRemoveHImage}
          />
        </div>
      )}

      {/* Fullscreen Preview */}
      {selectedHImages.length === 1 && (() => {
        const s3img = selectedHImages[0].s3image;
        return (
          <FullscreenPreview
            url={ s3img.getUrl() }
            altText={selectedHImages[0].description || selectedHImages[0].title || 'Gallery image'}
            isOpen={isFullscreenOpen}
            onClose={() => setIsFullscreenOpen(false)}
          />
        );
      })()}
    </div>
  );
}