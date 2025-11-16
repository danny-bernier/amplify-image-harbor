/**
 * @fileoverview File selection step component for upload wizard
 * Provides drag-and-drop file selection with image preview, validation,
 * and batch file management capabilities.
 * 
 * @author Danny Bernier
 * @version 1.0.0
 */

'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import Image from 'next/image';
import { SelectedFile } from './Upload';
import { ConfirmationModal } from '@/components/common/ConfirmationModal';
import { ACCEPTED_IMAGE_TYPES } from '@/utils/imageUtils';
import styles from './FileSelectionStep.module.css';

interface FileSelectionStepProps {
  selectedFiles: SelectedFile[];
  onFilesChange: (files: SelectedFile[]) => void;
}

export function FileSelectionStep({ selectedFiles, onFilesChange }: FileSelectionStepProps) {
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
      'image/*': ACCEPTED_IMAGE_TYPES
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

  return (
    <div className={styles.container}>
      {/* Selected Images Section */}
      <div className={styles.content}>
        <div className={styles.header}>
          <h3 className={styles.title}>
            Selected Images ({selectedFiles.length})
          </h3>
          {selectedFiles.length > 0 && (
            <button
              onClick={handleClearAllClick}
              className={styles.clearButton}
            >
              Clear All
            </button>
          )}
        </div>

        <div className={styles.fileGrid}>
          {/* Selected Files */}
          {selectedFiles.map((selectedFile) => (
            <div key={selectedFile.id} className={styles.filePreview}>
              <div className={styles.imageWrapper}>
                <Image
                  src={selectedFile.preview}
                  alt={selectedFile.file.name}
                  width={200}
                  height={200}
                  className={styles.previewImage}
                  unoptimized
                />
              </div>

              {/* Remove button */}
              <button
                onClick={() => removeFile(selectedFile.id)}
                className={styles.fileRemove}
                title="Remove image"
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 12 12"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M9 3L3 9M3 3L9 9"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>

              {/* File info */}
              <div className={styles.fileInfo}>
                <p className={styles.fileName} title={selectedFile.file.name}>
                  {selectedFile.file.name}
                </p>
                <p className={styles.fileSize}>
                  {(selectedFile.file.size / 1024 / 1024).toFixed(1)} MB
                </p>
              </div>
            </div>
          ))}

          {/* Add More Dropzone Box */}
          <div
            {...getRootProps()}
            className={`${styles.filePreview} ${styles.dropZone} ${isDragActive || dragActive ? styles.active : ''}`}
          >
            <input {...getInputProps()} />

            <div className={styles.dropZoneContent}>
              <div className={styles.dropZoneInner}>
                <svg
                  className={styles.dropZoneIcon}
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

                <p className={styles.dropZoneText}>
                  {isDragActive || dragActive ? 'Drop here' : 'Add images'}
                </p>
              </div>
            </div>

            {/* Info text below */}
            <div className={styles.fileInfo}>
              <p className={styles.dropZoneSubtext}>
                Click or drag & drop
              </p>
            </div>
          </div>
        </div>

        {selectedFiles.length === 0 && (
          <div className={styles.emptyState}>
            <p>Click the + box above to select your first images</p>
            <p className={styles.dropZoneSubtext}>Supports JPEG, PNG, TIFF, and RAW formats (CR2, NEF, ARW, DNG, etc.)</p>
          </div>
        )}
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