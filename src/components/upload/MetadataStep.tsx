/**
 * @fileoverview Metadata entry step component for upload wizard
 * Provides form interface for entering image titles, descriptions, and tags
 * with bulk operations and individual file customization.
 * 
 * @author Danny Bernier
 * @version 1.0.0
 */

'use client';

import { useState } from 'react';
import Image from 'next/image';
import { SelectedFile, FileMetadata } from './Upload';
import FullscreenPreview from '@/components/common/FullscreenPreview';
import styles from './MetadataStep.module.css';

interface MetadataStepProps {
  selectedFiles: SelectedFile[];
  fileMetadata: Record<string, FileMetadata>;
  onMetadataChange: (fileId: string, metadata: FileMetadata) => void;
}

export function MetadataStep({ 
  selectedFiles, 
  fileMetadata, 
  onMetadataChange 
}: MetadataStepProps) {
  const [tagInputs, setTagInputs] = useState<Record<string, string>>({});
  const [fullscreenImage, setFullscreenImage] = useState<{ url: string; altText: string } | null>(null);

  const handleImageClick = (file: SelectedFile) => {
    const metadata = fileMetadata[file.id];
    const altText = metadata?.title || metadata?.description || file.file.name;
    setFullscreenImage({
      url: file.preview,
      altText: altText
    });
  };

  const updateMetadata = (fileId: string, field: keyof FileMetadata, value: any) => {
    const currentMetadata = fileMetadata[fileId] || {};
    onMetadataChange(fileId, {
      ...currentMetadata,
      [field]: value
    });
  };

  const parseTagEntry = (tagInput: string): { key?: string; value?: string; isSimpleTag: boolean } => {
    const trimmed = tagInput.trim();
    
    // Check for key-value patterns (key=value or key:value)
    const equalMatch = trimmed.match(/^([^=]+)=(.*)$/);
    const colonMatch = trimmed.match(/^([^:]+):(.*)$/);
    
    if (equalMatch) {
      const key = equalMatch[1].trim();
      const value = equalMatch[2].trim();
      return { key, value, isSimpleTag: false };
    }
    
    if (colonMatch) {
      const key = colonMatch[1].trim();
      const value = colonMatch[2].trim();
      return { key, value, isSimpleTag: false };
    }
    
    // Simple tag (no key-value pair)
    return { isSimpleTag: true };
  };

  const addTag = (fileId: string) => {
    const tagInput = tagInputs[fileId];
    if (!tagInput?.trim()) return;
    
    const currentMetadata = fileMetadata[fileId] || {};
    const parsed = parseTagEntry(tagInput);
    
    if (parsed.key && parsed.value !== undefined && !parsed.isSimpleTag) {
      // Handle key-value pair - store in jsonTags
      const currentJsonTags = currentMetadata.jsonTags || {};
      
      // Check if this key already exists
      if (currentJsonTags[parsed.key] !== undefined) {
        return; // Don't add duplicate keys
      }
      
      updateMetadata(fileId, 'jsonTags', {
        ...currentJsonTags,
        [parsed.key]: parsed.value
      });
    } else if (parsed.isSimpleTag) {
      // Handle simple tag - store in tags array
      const currentTags = currentMetadata.tags || [];
      const newTag = tagInput.trim();
      
      if (!currentTags.includes(newTag)) {
        updateMetadata(fileId, 'tags', [...currentTags, newTag]);
      }
    }
    
    setTagInputs(prev => ({ ...prev, [fileId]: '' }));
  };

  const removeTag = (fileId: string, tagToRemove: string) => {
    const currentMetadata = fileMetadata[fileId] || {};
    const currentTags = currentMetadata.tags || [];
    const updatedTags = currentTags.filter(tag => tag !== tagToRemove);
    
    // Update only the tags array
    updateMetadata(fileId, 'tags', updatedTags);
  };

  const removeJsonTag = (fileId: string, keyToRemove: string) => {
    const currentMetadata = fileMetadata[fileId] || {};
    const currentJsonTags = currentMetadata.jsonTags || {};
    
    const updatedJsonTags = { ...currentJsonTags };
    delete updatedJsonTags[keyToRemove];
    
    updateMetadata(fileId, 'jsonTags', Object.keys(updatedJsonTags).length > 0 ? updatedJsonTags : undefined);
  };

  const handleTagInputChange = (fileId: string, value: string) => {
    setTagInputs(prev => ({ ...prev, [fileId]: value }));
  };

  const handleTagInputKeyPress = (e: React.KeyboardEvent, fileId: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag(fileId);
    }
  };

  if (selectedFiles.length === 0) {
    return (
      <div className={styles.emptyState}>
        <p className={styles.emptyStateText}>No files selected</p>
        <p className={styles.emptyStateText}>Please go back and select files to upload.</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Images Grid */}
      <div className={styles.metadataGrid}>
        {selectedFiles.map((file, index) => {
          const metadata = fileMetadata[file.id] || {};
          const tagInput = tagInputs[file.id] || '';
          
          return (
            <div key={file.id} className={styles.metadataItem}>
              {/* Image Preview */}
              <div className={styles.imageContainer}>
                <div 
                  className={styles.imageWrapper}
                  onClick={() => handleImageClick(file)}
                  style={{ cursor: 'pointer' }}
                >
                  <Image
                    src={file.preview}
                    alt={file.file.name}
                    width={120}
                    height={120}
                    className={styles.imagePreview}
                    unoptimized
                  />
                </div>
                <div className={styles.fileInfo}>
                  <p className={styles.fileName} title={file.file.name}>
                    {file.file.name}
                  </p>
                  <p className={styles.fileSize}>
                    {(file.file.size / 1024 / 1024).toFixed(1)} MB
                  </p>
                </div>
              </div>

              {/* Form Fields */}
              <div className={styles.formSection}>
                {/* Title */}
                <div className={styles.formField}>
                  <label className={styles.fieldLabel}>
                    Title
                  </label>
                  <input
                    type="text"
                    value={metadata.title || ''}
                    onChange={(e) => updateMetadata(file.id, 'title', e.target.value)}
                    placeholder="Enter a title for this image"
                    className={styles.fieldInput}
                  />
                </div>

                {/* Description */}
                <div className={styles.formField}>
                  <label className={styles.fieldLabel}>
                    Description
                  </label>
                  <textarea
                    value={metadata.description || ''}
                    onChange={(e) => updateMetadata(file.id, 'description', e.target.value)}
                    placeholder="Describe this image..."
                    rows={2}
                    className={styles.fieldTextarea}
                  />
                </div>

                {/* Tags */}
                <div className={styles.formField}>
                  <label className={styles.fieldLabel}>
                    Tags
                  </label>
                  <div className={styles.tagSection}>
                    {/* Tag Input */}
                    <div className={styles.tagInputContainer}>
                      <input
                        type="text"
                        value={tagInput}
                        onChange={(e) => handleTagInputChange(file.id, e.target.value)}
                        onKeyPress={(e) => handleTagInputKeyPress(e, file.id)}
                        placeholder="Add a tag (e.g., 'nature' or 'location=Paris')"
                        className={styles.tagInput}
                      />
                      <button
                        onClick={() => addTag(file.id)}
                        disabled={!tagInput.trim()}
                        className={styles.tagAddButton}
                      >
                        Add
                      </button>
                    </div>

                    {/* Helper Text */}
                    <div className={styles.tagHelp}>
                      Enter keywords associated with this image. Use "key=value" or "key:value" to add structured metadata.
                    </div>

                    {/* Current Simple Tags */}
                    {metadata.tags && metadata.tags.length > 0 && (
                      <div>
                        <div className={styles.tagSectionTitle}>General Tags:</div>
                        <div className={styles.tagList}>
                          {metadata.tags.map((tag, tagIndex) => (
                            <span key={tagIndex} className={`${styles.tag} ${styles.tagGeneral}`}>
                              {tag}
                              <button
                                onClick={() => removeTag(file.id, tag)}
                                className={styles.tagRemoveButton}
                              >
                                ×
                              </button>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Current JSON Tags (Key-Value Pairs) */}
                    {metadata.jsonTags && Object.keys(metadata.jsonTags).length > 0 && (
                      <div>
                        <div className={styles.tagSectionTitle}>Structured Tags:</div>
                        <div className={styles.tagList}>
                          {Object.entries(metadata.jsonTags).map(([key, value]) => (
                            <span key={key} className={`${styles.tag} ${styles.tagStructured}`}>
                              <strong>{key}:</strong> {String(value)}
                              <button
                                onClick={() => removeJsonTag(file.id, key)}
                                className={styles.tagRemoveButton}
                              >
                                ×
                              </button>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Progress Indicator */}
      <div className={styles.progressSection}>
        <div className={styles.progressHeader}>
          <span className={styles.progressLabel}>Metadata Progress</span>
          <span className={styles.progressText}>
            {(() => {
              const imagesWithMetadata = selectedFiles.filter(file => {
                const metadata = fileMetadata[file.id];
                return metadata && (metadata.title || metadata.description || (metadata.tags && metadata.tags.length > 0));
              }).length;
              return `${imagesWithMetadata} of ${selectedFiles.length} images have details`;
            })()}
          </span>
        </div>
        <div className={styles.progressBar}>
          <div 
            className={styles.progressFill}
            style={{ 
              width: `${selectedFiles.length > 0 ? (() => {
                const imagesWithMetadata = selectedFiles.filter(file => {
                  const metadata = fileMetadata[file.id];
                  return metadata && (metadata.title || metadata.description || (metadata.tags && metadata.tags.length > 0));
                }).length;
                return (imagesWithMetadata / selectedFiles.length) * 100;
              })() : 0}%` 
            }}
          />
        </div>
      </div>

      {/* Fullscreen Preview */}
      {fullscreenImage && (
        <FullscreenPreview
          url={fullscreenImage.url}
          altText={fullscreenImage.altText}
          isOpen={!!fullscreenImage}
          onClose={() => setFullscreenImage(null)}
        />
      )}
    </div>
  );
}