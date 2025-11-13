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
import { SelectedFile, FileMetadata } from './UploadWizard';

interface MetadataStepProps {
  selectedFiles: SelectedFile[];
  fileMetadata: Record<string, FileMetadata>;
  onMetadataChange: (fileId: string, metadata: FileMetadata) => void;
  onNext: () => void;
  onPrev: () => void;
}

export function MetadataStep({ 
  selectedFiles, 
  fileMetadata, 
  onMetadataChange, 
  onNext, 
  onPrev 
}: MetadataStepProps) {
  const [tagInputs, setTagInputs] = useState<Record<string, string>>({});

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
      <div className="text-center py-12">
        <p className="text-caption">No files selected</p>
        <button onClick={onPrev} className="btn btn-secondary mt-4">
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="heading-secondary">
          Add Details ({selectedFiles.length} images)
        </h3>
        <div className="text-caption">
          Step 2 of 3: Add details for each image (optional)
        </div>
      </div>

      {/* Images Grid */}
      <div className="metadata-grid">
        {selectedFiles.map((file, index) => {
          const metadata = fileMetadata[file.id] || {};
          const tagInput = tagInputs[file.id] || '';
          
          return (
            <div key={file.id} className="metadata-item">
              {/* Image Preview */}
              <div className="metadata-image-container">
                <div className="aspect-square rounded-lg overflow-hidden bg-surface border border-border">
                  <Image
                    src={file.preview}
                    alt={file.file.name}
                    width={120}
                    height={120}
                    className="w-full h-full object-cover"
                    unoptimized
                  />
                </div>
                <div className="mt-2 text-center">
                  <p className="text-xs font-medium truncate" title={file.file.name}>
                    {file.file.name}
                  </p>
                  <p className="text-xs text-muted">
                    {(file.file.size / 1024 / 1024).toFixed(1)} MB
                  </p>
                </div>
              </div>

              {/* Form Fields */}
              <div className="metadata-form">
                {/* Title */}
                <div className="metadata-field">
                  <label className="metadata-label">
                    Title
                  </label>
                  <input
                    type="text"
                    value={metadata.title || ''}
                    onChange={(e) => updateMetadata(file.id, 'title', e.target.value)}
                    placeholder="Enter a title for this image"
                    className="form-input text-sm"
                  />
                </div>

                {/* Description */}
                <div className="metadata-field">
                  <label className="metadata-label">
                    Description
                  </label>
                  <textarea
                    value={metadata.description || ''}
                    onChange={(e) => updateMetadata(file.id, 'description', e.target.value)}
                    placeholder="Describe this image..."
                    rows={2}
                    className="form-input resize-none text-sm"
                  />
                </div>

                {/* Tags */}
                <div className="metadata-field">
                  <label className="metadata-label">
                    Tags
                  </label>
                  <div className="space-y-2">
                    {/* Tag Input */}
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        value={tagInput}
                        onChange={(e) => handleTagInputChange(file.id, e.target.value)}
                        onKeyPress={(e) => handleTagInputKeyPress(e, file.id)}
                        placeholder="Add a tag (e.g., 'nature' or 'location=Paris')"
                        className="form-input flex-1 text-sm"
                      />
                      <button
                        onClick={() => addTag(file.id)}
                        disabled={!tagInput.trim()}
                        className="btn btn-secondary text-sm px-3"
                      >
                        Add
                      </button>
                    </div>

                    {/* Helper Text */}
                    <div className="text-xs text-muted">
                      Enter keywords associated with this image. Use "key=value" or "key:value" to add structured metadata.
                    </div>

                    {/* Current Simple Tags */}
                    {metadata.tags && metadata.tags.length > 0 && (
                      <div>
                        <div className="text-xs font-medium text-muted mb-1">General Tags:</div>
                        <div className="flex flex-wrap gap-1">
                          {metadata.tags.map((tag, tagIndex) => (
                            <span key={tagIndex} className="tag text-xs bg-blue-100 text-blue-800 border-blue-200">
                              {tag}
                              <button
                                onClick={() => removeTag(file.id, tag)}
                                className="tag-remove"
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
                        <div className="text-xs font-medium text-muted mb-1">Structured Tags:</div>
                        <div className="flex flex-wrap gap-1">
                          {Object.entries(metadata.jsonTags).map(([key, value]) => (
                            <span key={key} className="tag text-xs bg-green-100 text-green-800 border-green-200">
                              <strong>{key}:</strong> {String(value)}
                              <button
                                onClick={() => removeJsonTag(file.id, key)}
                                className="tag-remove"
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
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-caption">Metadata Progress</span>
          <span className="text-caption">
            {(() => {
              const imagesWithMetadata = selectedFiles.filter(file => {
                const metadata = fileMetadata[file.id];
                return metadata && (metadata.title || metadata.description || (metadata.tags && metadata.tags.length > 0));
              }).length;
              return `${imagesWithMetadata} of ${selectedFiles.length} images have details`;
            })()}
          </span>
        </div>
        <div className="w-full bg-surface rounded-full h-2 border border-border">
          <div 
            className="bg-green-500 h-full rounded-full transition-all duration-300"
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

      {/* Navigation */}
      <div className="flex justify-between items-center pt-6 border-t border-border">
        <button onClick={onPrev} className="btn btn-secondary">
          ← Back to File Selection
        </button>
        
        <button onClick={onNext} className="btn btn-primary">
          Next: Upload Images →
        </button>
      </div>
    </div>
  );
}