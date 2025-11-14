/**
 * @fileoverview Upload progress step component for upload wizard
 * Provides real-time upload progress tracking, error handling, and completion
 * status for batch file uploads with detailed feedback.
 * 
 * @author Danny Bernier
 * @version 1.0.0
 */

'use client';

import { useState, useEffect } from 'react';
import { SelectedFile, FileMetadata } from './UploadWizard';
import { fetchAuthSession } from 'aws-amplify/auth';
import { logger } from '@/utils/logger';
import { uploadService } from '@/services/uploadService';
import { LoadingBar } from '@/components/common';
import styles from './UploadProgressStep.module.css';

// Create component-specific logger
const log = logger.forComponent('UploadProgressStep');


interface UploadProgressStepProps {
  selectedFiles: SelectedFile[];
  fileMetadata: Record<string, FileMetadata>;
  onComplete: () => void;
  onPrev: () => void;
}

interface UploadStatus {
  fileId: string;
  status: 'pending' | 'uploading' | 'success' | 'error';
  progress: number;
  error?: string;
}

export function UploadProgressStep({
  selectedFiles,
  fileMetadata,
  onComplete,
  onPrev
}: UploadProgressStepProps) {
  const [uploadStatuses, setUploadStatuses] = useState<Record<string, UploadStatus>>({});
  const [isUploading, setIsUploading] = useState(false);
  const [overallProgress, setOverallProgress] = useState(0);

  // Initialize upload statuses
  useEffect(() => {
    const initialStatuses: Record<string, UploadStatus> = {};
    selectedFiles.forEach(file => {
      initialStatuses[file.id] = {
        fileId: file.id,
        status: 'pending',
        progress: 0
      };
    });
    setUploadStatuses(initialStatuses);
  }, [selectedFiles]);

  const updateUploadStatus = (fileId: string, update: Partial<UploadStatus>) => {
    setUploadStatuses(prev => ({
      ...prev,
      [fileId]: { ...prev[fileId], ...update }
    }));
  };

  const uploadSingleFile = async (file: SelectedFile): Promise<void> => {
    const fileId = file.id;
    updateUploadStatus(fileId, { status: 'uploading', progress: 0 });

    try {
      // Direct service calls (full client-side)
      await uploadViaDirectService(file, fileId);
    } catch (error) {
      updateUploadStatus(fileId, {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  };

  const uploadViaDirectService = async (file: SelectedFile, fileId: string): Promise<void> => {
    // Ensure user is authenticated
    const session = await fetchAuthSession();
    if (!session.tokens?.accessToken) {
      throw new Error('User not authenticated');
    }

    // Prepare metadata for uploadService
    const metadata = fileMetadata[fileId] || {};

    // Use uploadService directly (client-side processing)
    log.devDebug(`Starting direct service upload for file: ${file.file.name}`);

    const result = await uploadService.processImageUploads(
      [file.file],
      [metadata],
      {}
    );

    if (result.errors && result.errors.length > 0) {
      throw new Error(result.errors[0].error);
    }

    updateUploadStatus(fileId, {
      status: 'success',
      progress: 100
    });

    log.devDebug(`Direct service upload completed for file: ${file.file.name}`);
  };



  const startUpload = async () => {
    setIsUploading(true);

    try {
      // Upload files sequentially to avoid overwhelming the server
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        await uploadSingleFile(file);

        // Update overall progress
        const completedCount = i + 1;
        const progress = Math.round((completedCount / selectedFiles.length) * 100);
        setOverallProgress(progress);
      }

      // All uploads completed successfully
      setTimeout(() => {
        onComplete();
      }, 1000); // Small delay to show completion state

    } catch (error) {
      log.error('Upload process failed:', error);
      setIsUploading(false);
    }
  };

  const getStatusIcon = (status: UploadStatus['status']) => {
    switch (status) {
      case 'pending':
        return (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" style={{ color: '#6b7280' }}>
            <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
            <path d="M7.5 3a.5.5 0 0 1 .5.5v5.21l3.248 1.856a.5.5 0 0 1-.496.868l-3.5-2A.5.5 0 0 1 7 9V3.5a.5.5 0 0 1 .5-.5z"/>
          </svg>
        );
      case 'uploading':
        return (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" style={{ color: '#3b82f6' }}>
            <path d="M11.251.068a.5.5 0 0 1 .227.58L9.677 6.5H13a.5.5 0 0 1 .364.843l-8 8.5a.5.5 0 0 1-.842-.49L6.323 9.5H3a.5.5 0 0 1-.364-.843l8-8.5a.5.5 0 0 1 .615-.09zM4.157 8.5H7a.5.5 0 0 1 .478.647L6.11 13.59l5.732-6.09H9a.5.5 0 0 1-.478-.647L9.89 2.41 4.157 8.5z"/>
          </svg>
        );
      case 'success':
        return (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" style={{ color: '#10b981' }}>
            <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
            <path d="M10.97 4.97a.235.235 0 0 0-.02.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.061L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-1.071-1.05z"/>
          </svg>
        );
      case 'error':
        return (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" style={{ color: '#ef4444' }}>
            <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
            <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/>
          </svg>
        );
      default:
        return null;
    }
  };

  const getStatusText = (status: UploadStatus['status']) => {
    switch (status) {
      case 'pending':
        return 'Waiting...';
      case 'uploading':
        return 'Uploading...';
      case 'success':
        return 'Complete';
      case 'error':
        return 'Failed';
      default:
        return 'Waiting...';
    }
  };

  const getLoadingBarVariant = (status: UploadStatus['status']): 'primary' | 'success' | 'danger' => {
    switch (status) {
      case 'success':
        return 'success';
      case 'error':
        return 'danger';
      default:
        return 'primary';
    }
  };

  const getDetailsText = (status: UploadStatus) => {
    if (status.status === 'error' && status.error) {
      return status.error;
    }
    
    if (status.status === 'success') {
      return 'Upload complete!';
    }
    
    if (status.status === 'uploading') {
      return 'Uploading...';
    }
    
    return 'Queued for upload...';
  };

  const allCompleted = Object.values(uploadStatuses).every(status =>
    status.status === 'success' || status.status === 'error'
  );

  const successCount = Object.values(uploadStatuses).filter(status =>
    status.status === 'success'
  ).length;

  const errorCount = Object.values(uploadStatuses).filter(status =>
    status.status === 'error'
  ).length;

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <h3 className={styles.title}>Upload Progress</h3>
        <p className={styles.subtitle}>
          {allCompleted
            ? `Upload completed: ${successCount} successful, ${errorCount} failed`
            : `Uploading ${selectedFiles.length} images to your gallery...`
          }
        </p>
      </div>

      {/* Overall Progress */}
      <div className={styles.overallProgress}>
        <div className={styles.progressHeader}>
          <span className={styles.progressLabel}>Overall Progress</span>
          <span className={styles.progressPercentage}>{overallProgress}%</span>
        </div>
        <div className={styles.progressBar}>
          <div
            className={allCompleted
                ? errorCount > 0
                  ? styles.progressFillWarning
                  : styles.progressFillSuccess
                : styles.progressFillPrimary
              }
            style={{ width: `${overallProgress}%` }}
          />
        </div>
      </div>

      {/* Individual File Progress */}
      <div className={styles.fileList}>
        {selectedFiles.map((file) => {
          const status = uploadStatuses[file.id];
          if (!status) return null;

          return (
            <LoadingBar
              key={file.id}
              title={file.file.name}
              progress={status.progress}
              statusIcon={getStatusIcon(status.status)}
              status={getStatusText(status.status)}
              imageUrl={file.preview}
              imageAlt={file.file.name}
              details={getDetailsText(status)}
              variant={getLoadingBarVariant(status.status)}
              isComplete={status.status === 'success'}
              hasError={status.status === 'error'}
            />
          );
        })}
      </div>

      {/* Action Buttons */}
      <div className={styles.navigation}>
        <button
          onClick={onPrev}
          disabled={isUploading}
          className={styles.prevButton}
        >
          ← Back to Metadata
        </button>

        <div className={styles.navigationGroup}>
          {!isUploading && !allCompleted && (
            <button onClick={startUpload} className={styles.startButton}>
              Start Upload
            </button>
          )}

          {allCompleted && (
            <button onClick={onComplete} className={styles.completeButton}>
              {errorCount > 0 ? 'Continue with Successful Uploads' : 'Complete & View Gallery'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}