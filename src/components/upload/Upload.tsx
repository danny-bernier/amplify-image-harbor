/**
 * @fileoverview Main upload component with multi-step wizard
 * Provides file selection, metadata entry, and upload progress tracking
 * with state management across the upload process.
 * 
 * @author Danny Bernier
 * @version 1.0.0
 */

"use client";

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { FileSelectionStep } from './FileSelectionStep';
import { MetadataStep } from './MetadataStep';
import { UploadProgressStep, UploadProgressStepRef } from './UploadProgressStep';
import styles from './Upload.module.css';

export interface SelectedFile {
  file: File;
  id: string;
  preview: string;
}

export interface FileMetadata {
  title?: string;
  description?: string;
  tags?: string[];
  jsonTags?: Record<string, any>;
}

export interface UploadState {
  selectedFiles: SelectedFile[];
  fileMetadata: Record<string, FileMetadata>;
  currentStep: number;
  isUploading: boolean;
  uploadCompleted: boolean;
}

export default function Upload() {
  const [uploadState, setUploadState] = useState<UploadState>({
    selectedFiles: [],
    fileMetadata: {},
    currentStep: 1,
    isUploading: false,
    uploadCompleted: false
  });

  const uploadProgressRef = useRef<UploadProgressStepRef>(null);
  const router = useRouter();

  const updateFiles = (files: SelectedFile[]) => {
    setUploadState(prev => ({
      ...prev,
      selectedFiles: files
    }));
  };

  const updateMetadata = (fileId: string, metadata: FileMetadata) => {
    setUploadState(prev => ({
      ...prev,
      fileMetadata: {
        ...prev.fileMetadata,
        [fileId]: metadata
      }
    }));
  };

  const nextStep = () => {
    setUploadState(prev => ({
      ...prev,
      currentStep: prev.currentStep + 1
    }));
  };

  const prevStep = () => {
    setUploadState(prev => ({
      ...prev,
      currentStep: prev.currentStep - 1
    }));
  };

  const handleUploadStart = () => {
    setUploadState(prev => ({ ...prev, isUploading: true }));
  };

  const handleUploadComplete = () => {
    setUploadState(prev => ({ ...prev, isUploading: false, uploadCompleted: true }));
  };

  const startUpload = () => {
    uploadProgressRef.current?.startUpload();
  };

  const resetUpload = () => {
    // Clean up preview URLs
    uploadState.selectedFiles.forEach(file => {
      URL.revokeObjectURL(file.preview);
    });
    
    setUploadState({
      selectedFiles: [],
      fileMetadata: {},
      currentStep: 1,
      isUploading: false,
      uploadCompleted: false
    });
  };

  const renderStepIndicator = () => (
    <div className={styles.wizardSteps}>
      <div className={styles.wizardStep}>
        <div className={`${styles.wizardStepCircle} ${
          uploadState.currentStep === 1 ? styles.active : 
          uploadState.currentStep > 1 ? styles.completed : styles.inactive
        }`}>
          {uploadState.currentStep > 1 ? '✓' : '1'}
        </div>
        <span>Select Files</span>
      </div>
      
      <div className={`${styles.wizardStepConnector} ${
        uploadState.currentStep > 1 ? styles.completed : ''
      }`} />
      
      <div className={styles.wizardStep}>
        <div className={`${styles.wizardStepCircle} ${
          uploadState.currentStep === 2 ? styles.active : 
          uploadState.currentStep > 2 ? styles.completed : styles.inactive
        }`}>
          {uploadState.currentStep > 2 ? '✓' : '2'}
        </div>
        <span>Add Details</span>
      </div>
      
      <div className={`${styles.wizardStepConnector} ${
        uploadState.currentStep > 2 ? styles.completed : ''
      }`} />
      
      <div className={styles.wizardStep}>
        <div className={`${styles.wizardStepCircle} ${
          uploadState.currentStep === 3 ? styles.active : 
          uploadState.uploadCompleted ? styles.completed : styles.inactive
        }`}>
          {uploadState.uploadCompleted ? '✓' : '3'}
        </div>
        <span>Upload</span>
      </div>
    </div>
  );

  const renderCurrentStep = () => {
    switch (uploadState.currentStep) {
      case 1:
        return (
          <FileSelectionStep
            selectedFiles={uploadState.selectedFiles}
            onFilesChange={updateFiles}
          />
        );
      case 2:
        return (
          <MetadataStep
            selectedFiles={uploadState.selectedFiles}
            fileMetadata={uploadState.fileMetadata}
            onMetadataChange={updateMetadata}
          />
        );
      case 3:
        return (
          <UploadProgressStep
            ref={uploadProgressRef}
            selectedFiles={uploadState.selectedFiles}
            fileMetadata={uploadState.fileMetadata}
            onUploadStart={handleUploadStart}
            onUploadComplete={handleUploadComplete}
            onComplete={resetUpload}
          />
        );
      default:
        return null;
    }
  };

  const getStepTitle = () => {
    switch (uploadState.currentStep) {
      case 1:
        return "Select Files";
      case 2:
        return `Add Details (${uploadState.selectedFiles.length} image${uploadState.selectedFiles.length !== 1 ? 's' : ''})`;
      case 3:
        return "Upload Progress";
      default:
        return "Upload Images";
    }
  };

  const getStepSubtitle = () => {
    switch (uploadState.currentStep) {
      case 1:
        return "Step 1 of 3: Choose images to upload";
      case 2:
        return "Step 2 of 3: Add details for each image (optional)";
      case 3:
        return "Step 3 of 3: Uploading your images";
      default:
        return "";
    }
  };

  const renderNavigation = () => {
    const canProceedStep1 = uploadState.selectedFiles.length > 0;
    
    return (
      <div className={styles.navigation}>
        <div className={styles.leftNav}>
          {uploadState.currentStep === 2 && (
            <button onClick={prevStep} className={styles.prevButton}>
              ← Back to File Selection
            </button>
          )}
          {uploadState.currentStep === 3 && !uploadState.uploadCompleted && (
            <button 
              onClick={prevStep} 
              disabled={uploadState.isUploading}
              className={styles.prevButton}
            >
              ← Back to Metadata
            </button>
          )}
          {uploadState.currentStep === 3 && uploadState.uploadCompleted && (
            <button onClick={resetUpload} className={styles.prevButton}>
              ← Upload More Files
            </button>
          )}
        </div>
        
        <div className={styles.rightNav}>
          {uploadState.currentStep === 1 && (
            <button
              onClick={nextStep}
              disabled={!canProceedStep1}
              className={styles.nextButton}
            >
              Next: Add Details →
            </button>
          )}
          {uploadState.currentStep === 2 && (
            <button onClick={nextStep} className={styles.nextButton}>
              Next: Upload Images →
            </button>
          )}
          {uploadState.currentStep === 3 && !uploadState.isUploading && !uploadState.uploadCompleted && (
            <button onClick={startUpload} className={styles.nextButton}>
              Start Upload
            </button>
          )}
          {uploadState.currentStep === 3 && uploadState.uploadCompleted && (
            <button onClick={() => { resetUpload(); router.push('/gallery'); }} className={styles.nextButton}>
              Complete & View Gallery
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className={styles.pageContainer}>
      <div className={styles.contentContainer}>
        {renderStepIndicator()}
        
        <div className={styles.header}>
          <h1 className={styles.title}>{getStepTitle()}</h1>
          <p className={styles.subtitle}>{getStepSubtitle()}</p>
        </div>
        
        <div className={styles.divider}></div>
        
        <div className={styles.stepContent}>
          {renderCurrentStep()}
        </div>
        
        <div className={styles.divider}></div>
        {renderNavigation()}
      </div>
    </div>
  );
}