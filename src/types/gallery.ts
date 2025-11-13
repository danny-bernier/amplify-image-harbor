/**
 * @fileoverview Gallery-related type definitions
 * Provides TypeScript interfaces for image objects, gallery props,
 * and component interaction patterns.
 * 
 * @author Danny Bernier
 * @version 1.0.0
 */

export interface GalleryImage {
    id: string;
    title: string | null | undefined;
    description: string | null | undefined;
    s3Key: string;
    url: string;
    width: number;
    height: number;
    tags: string[] | null | undefined;
    jsonTags: Record<string, any> | null | undefined;
    created: string | null | undefined;
    lastUpdated: string | null | undefined;
    smallThumbnail: { s3Key: string; url: string } | null;
    // Medium and large thumbnails loaded on-demand
    mediumThumbnail?: { s3Key: string; url: string } | null;
    largeThumbnail?: { s3Key: string; url: string } | null;
}

export interface ImageGridProps {
    images: GalleryImage[];
    selectedImage: GalleryImage | null;
    selectedImages: GalleryImage[];
    onImageSelect: (image: GalleryImage, isMultiSelect?: boolean) => void;
    onLoadThumbnail: (imageId: string, size: any) => Promise<void>; // Using 'any' to avoid circular dependency with ThumbnailSizeName
}

export interface ImageInspectorProps {
    image: GalleryImage;
    isInspectorExpanded: boolean;
    onToggleInfo: () => void;
    onClose: () => void;
    onFullscreen: () => void;
    onLoadThumbnail: (imageId: string, size: any) => Promise<void>; // Using 'any' to avoid circular dependency with ThumbnailSizeName
}