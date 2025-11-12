'use client';

import Image from 'next/image';
import { ImageGridProps } from '@/types/gallery';
import styles from './ImageGrid.module.css';

export default function ImageGrid({ images, selectedImage, onImageSelect }: ImageGridProps) {  
  return (
    <div className={styles.container}>      
      <div className={styles.scrollArea}>
        <div className={styles.grid}>
          {images.map((image) => (
            <div 
              key={image.id} 
              className={`${styles.item} cursor-pointer ${selectedImage?.id === image.id ? styles.selected : ''}`}
              onClick={() => {
                if (selectedImage?.id === image.id) {
                  onImageSelect(null);
                } else {
                  onImageSelect(image);
                }
              }}
            >
              <Image
                src={image.smallThumbnail?.url || image.url}
                alt={image.description || image.title || 'Uploaded image'}
                width={150}
                height={150}
                className="w-full h-32 object-cover rounded"
                unoptimized // For S3 URLs
              />
              <div className="mt-2">
                {image.title && (
                  <p className="text-caption font-medium truncate">
                    {image.title}
                  </p>
                )}
                {image.description && (
                  <p className="text-caption opacity-75 text-xs mt-1 line-clamp-2">
                    {image.description}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}