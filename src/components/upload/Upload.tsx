'use client';

import { useState } from 'react';
import { FileSelectionStep } from './FileSelectionStep';
import { MetadataStep } from './MetadataStep';
import { UploadProgressStep } from './UploadProgressStep';

export interface SelectedFile {
  file: File;
  id: string;
  preview: string;
}

export interface FileMetadata {
  title?: string;
  description?: string;
  tags?: string[];
}

export interface UploadState {
  selectedFiles: SelectedFile[];
  fileMetadata: Record<string, FileMetadata>;
  currentStep: number;
}

export default function Upload() {
  const [uploadState, setUploadState] = useState<UploadState>({
    selectedFiles: [],
    fileMetadata: {},
    currentStep: 1
  });

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

  const resetUpload = () => {
    // Clean up preview URLs
    uploadState.selectedFiles.forEach(file => {
      URL.revokeObjectURL(file.preview);
    });
    
    setUploadState({
      selectedFiles: [],
      fileMetadata: {},
      currentStep: 1
    });
  };

  const renderStepIndicator = () => (
    <div className="wizard-steps">
      <div className="wizard-step">
        <div className={`wizard-step-circle ${
          uploadState.currentStep === 1 ? 'active' : 
          uploadState.currentStep > 1 ? 'completed' : 'inactive'
        }`}>
          1
        </div>
        <span>Select Files</span>
      </div>
      
      <div className={`wizard-step-connector ${
        uploadState.currentStep > 1 ? 'completed' : ''
      }`} />
      
      <div className="wizard-step">
        <div className={`wizard-step-circle ${
          uploadState.currentStep === 2 ? 'active' : 
          uploadState.currentStep > 2 ? 'completed' : 'inactive'
        }`}>
          2
        </div>
        <span>Add Details</span>
      </div>
      
      <div className={`wizard-step-connector ${
        uploadState.currentStep > 2 ? 'completed' : ''
      }`} />
      
      <div className="wizard-step">
        <div className={`wizard-step-circle ${
          uploadState.currentStep === 3 ? 'active' : 'inactive'
        }`}>
          3
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
            onNext={nextStep}
          />
        );
      case 2:
        return (
          <MetadataStep
            selectedFiles={uploadState.selectedFiles}
            fileMetadata={uploadState.fileMetadata}
            onMetadataChange={updateMetadata}
            onNext={nextStep}
            onPrev={prevStep}
          />
        );
      case 3:
        return (
          <UploadProgressStep
            selectedFiles={uploadState.selectedFiles}
            fileMetadata={uploadState.fileMetadata}
            onComplete={resetUpload}
            onPrev={prevStep}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="wizard-container">
      <div className="wizard-header">
        <h1 className="heading-primary">Upload Images</h1>
      </div>
      
      <div className="wizard-content">
        {renderStepIndicator()}
        
        <div className="min-h-96">
          {renderCurrentStep()}
        </div>
      </div>
    </div>
  );
}