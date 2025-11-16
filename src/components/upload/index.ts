/**
 * @fileoverview Upload module exports
 * Provides clean imports for all upload-related components.
 * 
 * @author Danny Bernier
 * @version 1.0.0
 */

// Main upload components
export { default as Upload } from './Upload';
// UploadWizard functionality consolidated into Upload component

// Upload wizard steps
export { FileSelectionStep } from './FileSelectionStep';
export { MetadataStep } from './MetadataStep';
export { UploadProgressStep } from './UploadProgressStep';

// Types (re-export from Upload)
export type { SelectedFile, FileMetadata } from './Upload';