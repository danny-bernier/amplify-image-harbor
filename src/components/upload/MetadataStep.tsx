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

  const addTag = (fileId: string) => {
    const tagInput = tagInputs[fileId];
    if (!tagInput?.trim()) return;
    
    const currentMetadata = fileMetadata[fileId] || {};
    const currentTags = currentMetadata.tags || [];
    const newTag = tagInput.trim();
    
    if (!currentTags.includes(newTag)) {
      updateMetadata(fileId, 'tags', [...currentTags, newTag]);
    }
    
    setTagInputs(prev => ({ ...prev, [fileId]: '' }));
  };

  const removeTag = (fileId: string, tagToRemove: string) => {
    const currentMetadata = fileMetadata[fileId] || {};
    const currentTags = currentMetadata.tags || [];
    updateMetadata(fileId, 'tags', currentTags.filter(tag => tag !== tagToRemove));
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
                        placeholder="Add a tag"
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

                    {/* Current Tags */}
                    {metadata.tags && metadata.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {metadata.tags.map((tag, tagIndex) => (
                          <span key={tagIndex} className="tag text-xs">
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