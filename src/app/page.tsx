/**
 * @fileoverview Root page component that redirects to gallery
 * Provides automatic redirect from home page to the gallery view.
 * 
 * @author Danny Bernier
 * @version 1.0.0
 */

import { redirect } from 'next/navigation';

export default function Home() {
  redirect('/gallery');
}
