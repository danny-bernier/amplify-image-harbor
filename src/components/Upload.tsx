'use client';

// import { getCurrentUser } from 'aws-amplify/auth'; TODO

import React, { useState, useRef } from 'react';
import { uploadProtectedOriginal } from '@/services/s3Service';
import { createImage } from '@/services/dbService';

interface ImageMetadata {
  title: string;
  description: string;
  tags: string[];
}

export default function Upload() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<ImageMetadata>({
    title: '',
    description: '',
    tags: []
  });
  const [tagInput, setTagInput] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    const imageFile = files.find(file => file.type.startsWith('image/'));
    
    if (imageFile) {
      handleFileSelect(imageFile);
    }
  };

  const handleFileSelect = (selectedFile: File) => {
    setFile(selectedFile);
    
    // Create preview
    const reader = new FileReader();
    reader.onload = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(selectedFile);

    // Auto-fill title if empty
    if (!metadata.title) {
      const nameWithoutExtension = selectedFile.name.replace(/\.[^/.]+$/, '');
      setMetadata(prev => ({ ...prev, title: nameWithoutExtension }));
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      handleFileSelect(selectedFile);
    }
  };

  const addTag = () => {
    if (tagInput.trim() && !metadata.tags.includes(tagInput.trim())) {
      setMetadata(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()]
      }));
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setMetadata(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleUpload = async () => {
    if (!file) return;

    setIsUploading(true);
    try {
      // Get image dimensions
      const img = new Image();
      const dimensions = await new Promise<{ width: number; height: number }>((resolve) => {
        img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
        img.src = preview!;
      });

      // Upload to S3
      const s3FileName = crypto.randomUUID();
      const s3Key = await uploadProtectedOriginal(file, s3FileName);

      // // Add this before the createImage call in handleUpload: TODO
      // try {
      //   const user = await getCurrentUser();
      //   console.log('Current user:', user);
      // } catch (error) {
      //   console.log('User not authenticated:', error);
      // }

      // Save to database
      await createImage({
        title: metadata.title || file.name,
        description: metadata.description,
        width: dimensions.width,
        height: dimensions.height,
        s3Key: s3Key,
        tags: metadata.tags
      });

      // Reset form
      setFile(null);
      setPreview(null);
      setMetadata({ title: '', description: '', tags: [] });
      
      alert('Image uploaded successfully!');
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="heading-primary">Upload Image</h1>
      
      {/* Drag and Drop Zone */}
      <div
        className={`dropzone ${isDragOver ? 'dropzone-active' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileInputChange}
          className="hidden"
        />
        
        {preview ? (
          <div className="space-y-4">
            <img 
              src={preview} 
              alt="Preview" 
              className="preview-image"
            />
            <p className="text-caption">{file?.name}</p>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setFile(null);
                setPreview(null);
              }}
              className="btn-danger"
            >
              Remove
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <svg className="icon-upload" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <div>
              <p className="text-primary">Drop an image here</p>
              <p className="text-secondary mt-2">or click to select a file</p>
            </div>
          </div>
        )}
      </div>

      {/* Metadata Form */}
      {file && (
        <div className="mt-8 space-y-6">
          <div>
            <label className="form-label">
              Title
            </label>
            <input
              type="text"
              value={metadata.title}
              onChange={(e) => setMetadata(prev => ({ ...prev, title: e.target.value }))}
              className="form-input"
              placeholder="Enter image title"
            />
          </div>

          <div>
            <label className="form-label">
              Description
            </label>
            <textarea
              value={metadata.description}
              onChange={(e) => setMetadata(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
              className="form-input"
              placeholder="Enter image description"
            />
          </div>

          <div>
            <label className="form-label">
              Tags
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                className="form-input"
                placeholder="Add a tag"
              />
              <button
                type="button"
                onClick={addTag}
                className="btn-secondary"
              >
                Add
              </button>
            </div>
            {metadata.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {metadata.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="tag-item"
                  >
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

          <button
            onClick={handleUpload}
            disabled={isUploading || !metadata.title}
            className="btn-primary w-full py-3 px-4"
          >
            {isUploading ? 'Uploading...' : 'Upload Image'}
          </button>
        </div>
      )}
    </div>
  );
}