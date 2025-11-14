/**
 * @fileoverview Confirmation modal component for user interactions
 * Provides reusable modal dialog for confirming destructive actions
 * with customizable title, message, and action buttons.
 * 
 * @author Danny Bernier
 * @version 1.0.0
 */

'use client';

import { useEffect } from 'react';
import styles from './ConfirmationModal.module.css';

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmButtonClass?: string;
  cancelButtonClass?: string;
}

export function ConfirmationModal({
  isOpen,
  title,
  message,
  confirmText = 'Remove',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  confirmButtonClass = styles.confirmButton,
  cancelButtonClass = styles.cancelButton
}: ConfirmationModalProps) {
  // Handle Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div className={styles.backdrop} onClick={onCancel}>
      <div 
        className={styles.modal}
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking modal content
      >
        <h3 className={styles.header}>{title}</h3>
        <p className={styles.message}>{message}</p>
        
        <div className={styles.actions}>
          <button
            onClick={onCancel}
            className={cancelButtonClass}
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={confirmButtonClass}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}