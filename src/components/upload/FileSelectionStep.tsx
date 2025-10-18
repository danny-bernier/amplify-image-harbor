'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import Image from 'next/image';
import { SelectedFile } from './UploadWizard';
import { ConfirmationModal } from '../ConfirmationModal';

interface FileSelectionStepProps {
  selectedFiles: SelectedFile[];
  onFilesChange: (files: SelectedFile[]) => void;
  onNext: () => void;
}

export function FileSelectionStep({ selectedFiles, onFilesChange, onNext }: FileSelectionStepProps) {
  const [dragActive, setDragActive] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles: SelectedFile[] = acceptedFiles.map(file => ({
      file,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      preview: URL.createObjectURL(file)
    }));

    onFilesChange([...selectedFiles, ...newFiles]);
    setDragActive(false);
  }, [selectedFiles, onFilesChange]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': [
        '.jpeg', '.jpg', '.png', '.tiff', '.tif',  // Standard formats
        '.cr2', '.cr3', '.nef', '.arw', '.orf',    // Canon, Nikon, Sony, Olympus RAW
        '.dng', '.raw', '.rwl', '.rw2',            // Adobe DNG and other RAW formats
        '.pef', '.srw', '.raf', '.3fr'             // Pentax, Samsung, Fuji, Hasselblad RAW
      ]
    },
    multiple: true,
    onDragEnter: () => setDragActive(true),
    onDragLeave: () => setDragActive(false)
  });

  const removeFile = (fileId: string) => {
    const fileToRemove = selectedFiles.find(f => f.id === fileId);
    if (fileToRemove) {
      URL.revokeObjectURL(fileToRemove.preview);
    }
    onFilesChange(selectedFiles.filter(f => f.id !== fileId));
  };

  const handleClearAllClick = () => {
    setShowClearConfirm(true);
  };

  const confirmClearAll = () => {
    // Clean up all preview URLs
    selectedFiles.forEach(file => {
      URL.revokeObjectURL(file.preview);
    });
    // Clear the array
    onFilesChange([]);
    setShowClearConfirm(false);
  };

  const cancelClearAll = () => {
    setShowClearConfirm(false);
  };

  const canProceed = selectedFiles.length > 0;

  return (
    <div className="space-y-6">
      {/* Selected Images Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="heading-secondary">
            Selected Images ({selectedFiles.length})
          </h3>
          {selectedFiles.length > 0 && (
            <button 
              onClick={handleClearAllClick}
              className="btn-danger text-sm"
            >
              Clear All
            </button>
          )}
        </div>
        
        <div className="file-grid">
          {/* Selected Files */}
          {selectedFiles.map((selectedFile) => (
            <div key={selectedFile.id} className="file-preview">
              <div className="aspect-square rounded-lg overflow-hidden">
                <Image
                  src={selectedFile.preview}
                  alt={selectedFile.file.name}
                  width={200}
                  height={200}
                  className="w-full h-full object-cover"
                  unoptimized
                />
              </div>
              
              {/* Remove button */}
              <button
                onClick={() => removeFile(selectedFile.id)}
                className="file-remove"
                title="Remove image"
              >
                ×
              </button>
              
              {/* File info */}
              <div className="mt-2 px-2">
                <p className="text-caption truncate" title={selectedFile.file.name}>
                  {selectedFile.file.name}
                </p>
                <p className="text-xs text-muted">
                  {(selectedFile.file.size / 1024 / 1024).toFixed(1)} MB
                </p>
              </div>
            </div>
          ))}
          
          {/* Add More Dropzone Box */}
          <div
            {...getRootProps()}
            className={`file-preview cursor-pointer transition-all ${isDragActive || dragActive ? 'border-primary bg-surface' : 'border-dashed'}`}
            style={{ borderStyle: 'dashed' }}
          >
            <input {...getInputProps()} />
            
            <div className="aspect-square rounded-lg flex items-center justify-center">
              <div className="text-center">
                <svg 
                  className="w-8 h-8 text-muted mx-auto mb-2" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24" 
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M12 4v16m8-8H4" 
                  />
                </svg>
                
                <p className="text-caption font-medium">
                  {isDragActive || dragActive ? 'Drop here' : 'Add images'}
                </p>
              </div>
            </div>
            
            {/* Info text below */}
            <div className="mt-2 px-2">
              <p className="text-caption text-center">
                Click or drag & drop
              </p>
            </div>
          </div>
        </div>
        
        {selectedFiles.length === 0 && (
          <div className="text-center py-8 text-muted">
            <p>Click the + box above to select your first images</p>
            <p className="text-caption mt-1">Supports JPEG, PNG, TIFF, and RAW formats (CR2, NEF, ARW, DNG, etc.)</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex justify-between items-center pt-6 border-t">
        <div>
          <p className="text-caption">
            Step 1 of 3: Select the images you want to upload
          </p>
        </div>
        
        <button
          onClick={onNext}
          disabled={!canProceed}
          className="btn btn-primary"
        >
          Next: Add Details
        </button>
      </div>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={showClearConfirm}
        title="Remove All Images"
        message={`Are you sure you want to remove all ${selectedFiles.length} selected images? This action cannot be undone.`}
        confirmText="Remove All"
        cancelText="Cancel"
        onConfirm={confirmClearAll}
        onCancel={cancelClearAll}
        confirmButtonClass="btn btn-danger"
      />
    </div>
  );
}