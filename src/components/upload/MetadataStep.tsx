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
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [tagInput, setTagInput] = useState('');

  const currentFile = selectedFiles[currentImageIndex];
  const currentMetadata = fileMetadata[currentFile?.id] || {};

  const updateCurrentMetadata = (field: keyof FileMetadata, value: any) => {
    if (!currentFile) return;
    
    onMetadataChange(currentFile.id, {
      ...currentMetadata,
      [field]: value
    });
  };

  const addTag = () => {
    if (!tagInput.trim() || !currentFile) return;
    
    const currentTags = currentMetadata.tags || [];
    const newTag = tagInput.trim();
    
    if (!currentTags.includes(newTag)) {
      updateCurrentMetadata('tags', [...currentTags, newTag]);
    }
    
    setTagInput('');
  };

  const removeTag = (tagToRemove: string) => {
    const currentTags = currentMetadata.tags || [];
    updateCurrentMetadata('tags', currentTags.filter(tag => tag !== tagToRemove));
  };

  const handleTagInputKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    }
  };

  const goToNextImage = () => {
    if (currentImageIndex < selectedFiles.length - 1) {
      setCurrentImageIndex(currentImageIndex + 1);
      setTagInput('');
    }
  };

  const goToPrevImage = () => {
    if (currentImageIndex > 0) {
      setCurrentImageIndex(currentImageIndex - 1);
      setTagInput('');
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
      {/* Image Navigation */}
      <div className="flex items-center justify-between">
        <h3 className="heading-secondary">
          Add Details ({currentImageIndex + 1} of {selectedFiles.length})
        </h3>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={goToPrevImage}
            disabled={currentImageIndex === 0}
            className="btn btn-secondary text-sm"
          >
            ← Previous
          </button>
          <span className="text-caption px-3">
            {currentImageIndex + 1} / {selectedFiles.length}
          </span>
          <button
            onClick={goToNextImage}
            disabled={currentImageIndex === selectedFiles.length - 1}
            className="btn btn-secondary text-sm"
          >
            Next →
          </button>
        </div>
      </div>

      {/* Current Image and Form */}
      <div className="grid lg:grid-cols-2 gap-8">
        {/* Image Preview */}
        <div className="space-y-4">
          <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden border-2 border-gray-200">
            <Image
              src={currentFile.preview}
              alt={currentFile.file.name}
              width={600}
              height={400}
              className="w-full h-full object-contain"
              unoptimized
            />
          </div>
          
          <div className="text-center">
            <p className="text-caption font-medium">{currentFile.file.name}</p>
            <p className="text-xs text-gray-400">
              {(currentFile.file.size / 1024 / 1024).toFixed(1)} MB
            </p>
          </div>
        </div>

        {/* Metadata Form */}
        <div className="space-y-6">
          {/* Title */}
          <div>
            <label className="form-label">
              Title
            </label>
            <input
              type="text"
              value={currentMetadata.title || ''}
              onChange={(e) => updateCurrentMetadata('title', e.target.value)}
              placeholder="Enter a title for this image"
              className="form-input"
            />
          </div>

          {/* Description */}
          <div>
            <label className="form-label">
              Description
            </label>
            <textarea
              value={currentMetadata.description || ''}
              onChange={(e) => updateCurrentMetadata('description', e.target.value)}
              placeholder="Describe this image..."
              rows={4}
              className="form-input resize-none"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="form-label">
              Tags
            </label>
            <div className="space-y-3">
              {/* Tag Input */}
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={handleTagInputKeyPress}
                  placeholder="Add a tag"
                  className="form-input flex-1"
                />
                <button
                  onClick={addTag}
                  disabled={!tagInput.trim()}
                  className="btn-secondary"
                >
                  Add
                </button>
              </div>

              {/* Current Tags */}
              {currentMetadata.tags && currentMetadata.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {currentMetadata.tags.map((tag, index) => (
                    <span key={index} className="tag">
                      {tag}
                      <button
                        onClick={() => removeTag(tag)}
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

      {/* Progress Indicator */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-caption">Metadata Progress</span>
          <span className="text-caption">
            {Object.keys(fileMetadata).length} of {selectedFiles.length} images completed
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-500 h-2 rounded-full transition-all duration-300"
            style={{ 
              width: `${(Object.keys(fileMetadata).length / selectedFiles.length) * 100}%` 
            }}
          />
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between items-center pt-6 border-t">
        <button onClick={onPrev} className="btn btn-secondary">
          ← Back to File Selection
        </button>
        
        <div className="text-center">
          <p className="text-caption mb-2">
            Step 2 of 3: Add details for each image (optional)
          </p>
          <button onClick={onNext} className="btn btn-primary">
            Next: Upload Images →
          </button>
        </div>
      </div>
    </div>
  );
}