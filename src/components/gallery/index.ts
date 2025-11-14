/**
 * @fileoverview Gallery module exports
 * Provides clean imports for all gallery-related components.
 * 
 * @author Danny Bernier
 * @version 1.0.0
 */

// Main gallery component
export { default as Gallery } from './Gallery';

// Gallery sub-components
export { default as ImageGrid } from './ImageGrid';
export { default as FullscreenPreview } from '../common/FullscreenPreview';

// Image inspector components (re-export from subdirectory)
export {
  ImageInspector,
  SingleImageInspector,
  MultiImageInspector,
  ImageInspectorControlBar
} from './image-inspector';