/**
 * @fileoverview Upload wizard component with step management
 * Provides multi-step upload workflow with file selection, metadata entry,
 * and progress tracking with navigation between steps.
 * 
 * @author Danny Bernier
 * @version 1.0.0
 */

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
  tags?: string[]; // Simple tags (no key-value pairs)
  jsonTags?: Record<string, any>; // Key-value pairs and reserved "tags" array
}

export interface UploadWizardState {
  selectedFiles: SelectedFile[];
  fileMetadata: Record<string, FileMetadata>;
  currentStep: number;
}

export default function UploadWizard() {
  const [wizardState, setWizardState] = useState<UploadWizardState>({
    selectedFiles: [],
    fileMetadata: {},
    currentStep: 1
  });

  const updateFiles = (files: SelectedFile[]) => {
    setWizardState(prev => ({
      ...prev,
      selectedFiles: files
    }));
  };

  const updateMetadata = (fileId: string, metadata: FileMetadata) => {
    setWizardState(prev => ({
      ...prev,
      fileMetadata: {
        ...prev.fileMetadata,
        [fileId]: metadata
      }
    }));
  };

  const nextStep = () => {
    setWizardState(prev => ({
      ...prev,
      currentStep: prev.currentStep + 1
    }));
  };

  const prevStep = () => {
    setWizardState(prev => ({
      ...prev,
      currentStep: prev.currentStep - 1
    }));
  };

  const resetWizard = () => {
    // Clean up preview URLs
    wizardState.selectedFiles.forEach(file => {
      URL.revokeObjectURL(file.preview);
    });
    
    setWizardState({
      selectedFiles: [],
      fileMetadata: {},
      currentStep: 1
    });
  };

  const renderStepIndicator = () => (
    <div className="mb-8">
      <div className="flex items-center justify-between max-w-md mx-auto">
        <div className={`flex items-center ${wizardState.currentStep >= 1 ? 'text-primary' : 'text-secondary'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
            wizardState.currentStep >= 1 ? 'border-primary bg-primary text-white' : 'border-secondary'
          }`}>
            1
          </div>
          <span className="ml-2 text-sm font-medium">Select Files</span>
        </div>
        
        <div className={`flex-1 h-0.5 mx-4 ${wizardState.currentStep >= 2 ? 'bg-primary' : 'bg-gray-300'}`} />
        
        <div className={`flex items-center ${wizardState.currentStep >= 2 ? 'text-primary' : 'text-secondary'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
            wizardState.currentStep >= 2 ? 'border-primary bg-primary text-white' : 'border-secondary'
          }`}>
            2
          </div>
          <span className="ml-2 text-sm font-medium">Add Details</span>
        </div>
        
        <div className={`flex-1 h-0.5 mx-4 ${wizardState.currentStep >= 3 ? 'bg-primary' : 'bg-gray-300'}`} />
        
        <div className={`flex items-center ${wizardState.currentStep >= 3 ? 'text-primary' : 'text-secondary'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
            wizardState.currentStep >= 3 ? 'border-primary bg-primary text-white' : 'border-secondary'
          }`}>
            3
          </div>
          <span className="ml-2 text-sm font-medium">Upload</span>
        </div>
      </div>
    </div>
  );

  const renderCurrentStep = () => {
    switch (wizardState.currentStep) {
      case 1:
        return (
          <FileSelectionStep
            selectedFiles={wizardState.selectedFiles}
            onFilesChange={updateFiles}
            onNext={nextStep}
          />
        );
      case 2:
        return (
          <MetadataStep
            selectedFiles={wizardState.selectedFiles}
            fileMetadata={wizardState.fileMetadata}
            onMetadataChange={updateMetadata}
            onNext={nextStep}
            onPrev={prevStep}
          />
        );
      case 3:
        return (
          <UploadProgressStep
            selectedFiles={wizardState.selectedFiles}
            fileMetadata={wizardState.fileMetadata}
            onComplete={resetWizard}
            onPrev={prevStep}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-6">
      <h1 className="heading-primary text-center">Upload Images</h1>
      
      {renderStepIndicator()}
      
      <div className="min-h-96">
        {renderCurrentStep()}
      </div>
    </div>
  );
}