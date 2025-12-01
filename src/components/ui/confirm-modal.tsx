'use client';

import { useState } from 'react';
import { Modal } from './modal';
import { Button } from './button';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'primary';
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
}: ConfirmModalProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleConfirm = async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      await onConfirm();
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (isLoading) return;
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={title} size="sm">
      <p className="text-gray-600 dark:text-gray-300 mb-6">{message}</p>
      <div className="flex justify-end gap-3">
        <Button variant="secondary" onClick={handleClose} disabled={isLoading}>
          {cancelText}
        </Button>
        <Button variant={variant} onClick={handleConfirm} disabled={isLoading}>
          {isLoading ? 'Deleting...' : confirmText}
        </Button>
      </div>
    </Modal>
  );
}
