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
import Image from 'next/image';
import { SelectedFile, FileMetadata } from './UploadWizard';
import { fetchAuthSession } from 'aws-amplify/auth';
import { logger } from '@/utils/logger';
import { uploadService } from '@/services/uploadService';

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
    updateUploadStatus(fileId, { status: 'uploading' });

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

    // Note: uploadService.processImageUploads doesn't support progress tracking
    // This is a limitation of the direct approach for individual files
    updateUploadStatus(fileId, { progress: 50 }); // Simulate progress

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
        return '⏳';
      case 'uploading':
        return '🔄';
      case 'success':
        return '✅';
      case 'error':
        return '❌';
      default:
        return '⏳';
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
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h3 className="heading-secondary">Upload Progress</h3>
        <p className="text-caption mt-2">
          {allCompleted
            ? `Upload completed: ${successCount} successful, ${errorCount} failed`
            : `Uploading ${selectedFiles.length} images to your gallery...`
          }
        </p>
      </div>

      {/* Overall Progress */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-caption">Overall Progress</span>
          <span className="text-caption">{overallProgress}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className={`h-3 rounded-full transition-all duration-300 ${allCompleted
                ? errorCount > 0
                  ? 'bg-yellow-500'
                  : 'bg-green-500'
                : 'bg-blue-500'
              }`}
            style={{ width: `${overallProgress}%` }}
          />
        </div>
      </div>

      {/* Individual File Progress */}
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {selectedFiles.map((file) => {
          const status = uploadStatuses[file.id];
          if (!status) return null;

          return (
            <div key={file.id} className="border rounded-lg p-4 space-y-3">
              <div className="flex items-start space-x-4">
                {/* Thumbnail */}
                <div className="flex-shrink-0">
                  <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden border">
                    <Image
                      src={file.preview}
                      alt={file.file.name}
                      width={64}
                      height={64}
                      className="w-full h-full object-cover"
                      unoptimized
                    />
                  </div>
                </div>

                {/* File Info and Status */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium truncate">
                      {file.file.name}
                    </p>
                    <div className="flex items-center space-x-2">
                      <span className="text-lg">{getStatusIcon(status.status)}</span>
                      <span className="text-sm text-caption">
                        {getStatusText(status.status)}
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  {status.status === 'uploading' && (
                    <div className="mt-2">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${status.progress}%` }}
                        />
                      </div>
                      <p className="text-xs text-caption mt-1">
                        {status.progress}%
                      </p>
                    </div>
                  )}

                  {/* Error Message */}
                  {status.status === 'error' && status.error && (
                    <p className="text-sm text-red-600 mt-1">
                      {status.error}
                    </p>
                  )}

                  {/* Metadata Preview */}
                  {status.status === 'success' && fileMetadata[file.id] && (
                    <div className="mt-2 text-xs text-caption">
                      {fileMetadata[file.id].title && (
                        <p>Title: {fileMetadata[file.id].title}</p>
                      )}
                      {fileMetadata[file.id].tags && fileMetadata[file.id].tags!.length > 0 && (
                        <p>Tags: {fileMetadata[file.id].tags!.join(', ')}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between items-center pt-6 border-t">
        <button
          onClick={onPrev}
          disabled={isUploading}
          className="btn-secondary"
        >
          ← Back to Metadata
        </button>

        <div className="space-x-4">
          {!isUploading && !allCompleted && (
            <button onClick={startUpload} className="btn-primary">
              Start Upload
            </button>
          )}

          {allCompleted && (
            <button onClick={onComplete} className="btn-primary">
              {errorCount > 0 ? 'Continue with Successful Uploads' : 'Complete & View Gallery'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}