/**
 * Gallery-related type definitions
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
    onImageSelect: (image: GalleryImage | null) => void;
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