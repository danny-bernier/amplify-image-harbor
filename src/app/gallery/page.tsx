/**
 * @fileoverview Gallery page component
 * Provides the main gallery page layout with the Gallery component.
 * 
 * @author Danny Bernier
 * @version 1.0.0
 */

import Gallery from '@/components/gallery/Gallery';
import styles from './page.module.css';

export default function GalleryPage() {
  return (
    <main className={styles.main}>
      <Gallery />
    </main>
  );
}
