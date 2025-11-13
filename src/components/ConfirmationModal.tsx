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

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmButtonClass?: string;
}

export function ConfirmationModal({
  isOpen,
  title,
  message,
  confirmText = 'Remove',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  confirmButtonClass = 'btn btn-danger'
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
    <div className="confirmation-backdrop" onClick={onCancel}>
      <div 
        className="confirmation-modal"
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking modal content
      >
        <h3 className="confirmation-header">{title}</h3>
        <p className="confirmation-message">{message}</p>
        
        <div className="confirmation-actions">
          <button
            onClick={onCancel}
            className="btn btn-secondary"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className="btn btn-danger-filled"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}