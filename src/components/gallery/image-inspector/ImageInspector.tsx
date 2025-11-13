/**
 * @fileoverview Main ImageInspector component that orchestrates between single and multi-image inspection modes
 * Provides unified interface for Gallery to work with image inspection without needing to handle selection complexity.
 * 
 * @author Danny Bernier
 * @version 1.0.0
 */

'use client';

import { GalleryImage } from '@/types/gallery';
import SingleImageInspector from './SingleImageInspector';
import MultiImageInspector from './MultiImageInspector';

interface ImageInspectorProps {
  selectedImages: GalleryImage[];
  onClose: () => void;
  onShare: (images: GalleryImage[]) => void;
  onDelete: (images: GalleryImage[]) => void;
  onPrevious?: () => void;
  onNext?: () => void;
}

export default function ImageInspector({
  selectedImages,
  onClose,
  onShare,
  onDelete,
  onPrevious,
  onNext
}: ImageInspectorProps) {
  // Determine inspection mode based on selection count
  const isMultiSelection = selectedImages.length > 1;
  const currentImage = selectedImages.length === 1 ? selectedImages[0] : null;

  if (isMultiSelection) {
    return (
      <MultiImageInspector
        selectedImages={selectedImages}
        onClearSelection={onClose}
        onShare={onShare}
        onDelete={onDelete}
      />
    );
  }

  if (currentImage) {
    return (
      <SingleImageInspector
        image={currentImage}
        onClose={onClose}
        onShare={(image) => onShare([image])}
        onDelete={(image) => onDelete([image])}
        onPrevious={onPrevious}
        onNext={onNext}
      />
    );
  }

  // Fallback - should not happen in normal usage
  return null;
}